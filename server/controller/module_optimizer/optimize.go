package module_optimizer

import (
	"crypto/sha256"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"server/middleware"
	"server/models"
	"server/services/module_optimizer"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// OptimizeRequest represents the optimization request parameters
type OptimizeRequest struct {
	Category    string                   `json:"category" binding:"required,oneof=ATTACK DEFENSE SUPPORT"`
	Preferences *OptimizationPreferences `json:"preferences"`
	Constraints OptimizationConstraints  `json:"constraints"`
}

// OptimizationPreferences contains priority attributes and desired levels
type OptimizationPreferences struct {
	PriorityAttributes []string       `json:"priority_attributes"`
	DesiredLevels      map[string]int `json:"desired_levels"`
	ExcludedAttributes []string       `json:"excluded_attributes"`
}

// OptimizationConstraints contains optimization constraints
type OptimizationConstraints struct {
	MaxSolutions int    `json:"max_solutions" binding:"omitempty,min=1,max=60"`
	SortMode     string `json:"sort_mode" binding:"omitempty,oneof=ByScore ByTotalAttr"`
}

// OptimizeResponse represents the optimization results
type OptimizeResponse struct {
	Solutions []ModuleCombination  `json:"solutions"`
	Metadata  OptimizationMetadata `json:"metadata"`
}

// ModuleCombination represents a single optimized module combination
type ModuleCombination struct {
	Rank           int            `json:"rank"`
	Score          float64        `json:"score"`
	PriorityLevel  int            `json:"priority_level"`
	TotalAttrValue int            `json:"total_attr_value"`
	Modules        []ModuleInfo   `json:"modules"`
	AttrBreakdown  map[string]int `json:"attr_breakdown"`
}

// ModuleInfo represents basic module information in a combination
type ModuleInfo struct {
	ID         uint              `json:"id"`
	UUID       string            `json:"uuid"`
	Name       string            `json:"name"`
	Quality    int               `json:"quality"`
	Attributes []ModuleAttribute `json:"attributes"`
}

// ModuleAttribute describes an attribute on a recommended module
type ModuleAttribute struct {
	ID     uint   `json:"id"`
	PartID int    `json:"part_id"`
	Name   string `json:"name"`
	Value  int    `json:"value"`
	Type   string `json:"type"`
}

// OptimizationMetadata contains metadata about the optimization run
type OptimizationMetadata struct {
	TotalModules     int    `json:"total_modules"`
	ProcessingTimeMs int    `json:"processing_time_ms"`
	Algorithm        string `json:"algorithm"`
	CacheHit         bool   `json:"cache_hit"`
}

// OptimizeModules runs the optimization algorithm and returns ranked combinations
func OptimizeModules(c *gin.Context) {
	dbi, exists := c.Get("db")
	if !exists {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"code":    "db_not_found",
				"message": "Database connection not found",
			},
		})
		return
	}
	db := dbi.(*gorm.DB)

	currentUser, exists := c.Get("user")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": gin.H{
				"code":    "unauthorized",
				"message": "User not authenticated",
			},
		})
		return
	}
	user := currentUser.(*models.User)

	var req OptimizeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": gin.H{
				"code":    "validation_error",
				"message": err.Error(),
			},
		})
		return
	}

	// Set defaults
	if req.Constraints.MaxSolutions == 0 {
		req.Constraints.MaxSolutions = 10
	}
	if req.Constraints.SortMode == "" {
		req.Constraints.SortMode = "ByScore"
	}

	// Generate request hash for caching
	requestHash := generateRequestHash(user.ID, &req)

	// Check cache first
	var cachedResult models.OptimizationResult
	err := db.Where("user_id = ? AND request_hash = ? AND (expires_at IS NULL OR expires_at > ?)",
		user.ID, requestHash, time.Now()).
		Order("created_at DESC").
		First(&cachedResult).Error

	if err == nil {
		// Cache hit - return cached result
		log.Printf("[OptimizeController] Cache HIT for user_id=%d, request_hash=%s", user.ID, requestHash)
		middleware.RecordOptimization(int64(cachedResult.ProcessingTimeMS), true)

		var combinations []ModuleCombination
		if err := json.Unmarshal(cachedResult.Combinations, &combinations); err == nil {
			// Ensure combinations contain attribute data (older cache entries may not)
			if err := hydrateModuleAttributes(db, combinations); err != nil {
				log.Printf("[OptimizeController] Failed to hydrate module attributes for cached result user_id=%d: %v", user.ID, err)
			}
			c.JSON(http.StatusOK, OptimizeResponse{
				Solutions: combinations,
				Metadata: OptimizationMetadata{
					TotalModules:     0, // Not tracked in cache
					ProcessingTimeMs: cachedResult.ProcessingTimeMS,
					Algorithm:        "hybrid-greedy-local-search",
					CacheHit:         true,
				},
			})
			return
		}
		log.Printf("[OptimizeController] Cache hit but unmarshal failed for user_id=%d: %v", user.ID, err)
	}

	// Cache miss - run optimization
	startTime := time.Now()
	log.Printf("[OptimizeController] Cache miss for user_id=%d, request_hash=%s", user.ID, requestHash)

	// Get user's modules for the category
	var modules []models.Module
	if err := db.Where("user_id = ? AND category = ?", user.ID, req.Category).
		Preload("Parts").
		Find(&modules).Error; err != nil {
		log.Printf("[OptimizeController] Database error fetching modules for user_id=%d: %v", user.ID, err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"code":    "db_error",
				"message": "Failed to fetch modules",
			},
		})
		return
	}

	log.Printf("[OptimizeController] Fetched %d modules for user_id=%d, category=%s", len(modules), user.ID, req.Category)

	// Validate sufficient modules
	if len(modules) < 4 {
		log.Printf("[OptimizeController] Insufficient modules for user_id=%d: need 4, got %d", user.ID, len(modules))
		c.JSON(http.StatusBadRequest, gin.H{
			"error": gin.H{
				"code":    "insufficient_modules",
				"message": fmt.Sprintf("Need at least 4 modules in category %s, found %d", req.Category, len(modules)),
			},
		})
		return
	}

	// Convert preferences to service layer type
	var servicePrefs *module_optimizer.OptimizationPreferences
	if req.Preferences != nil {
		servicePrefs = &module_optimizer.OptimizationPreferences{
			PriorityAttributes: req.Preferences.PriorityAttributes,
			DesiredLevels:      req.Preferences.DesiredLevels,
			ExcludedAttributes: req.Preferences.ExcludedAttributes,
		}
	}

	// Run optimization
	log.Printf("[OptimizeController] Starting optimization for user_id=%d", user.ID)
	optimizer := module_optimizer.NewOptimizer()
	solutions, err := optimizer.Optimize(
		modules,
		req.Category,
		servicePrefs,
		req.Constraints.MaxSolutions,
		req.Constraints.SortMode,
	)
	if err != nil {
		log.Printf("[OptimizeController] Optimization failed for user_id=%d: %v", user.ID, err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"code":    "optimization_failed",
				"message": err.Error(),
			},
		})
		return
	}

	processingTime := time.Since(startTime)
	processingTimeMs := int(processingTime.Milliseconds())
	log.Printf("[OptimizeController] Optimization complete for user_id=%d: found %d solutions in %dms",
		user.ID, len(solutions), processingTimeMs)

	// Record metrics
	middleware.RecordOptimization(int64(processingTimeMs), false)

	// Convert solutions to response format
	combinations := make([]ModuleCombination, len(solutions))
	for i, sol := range solutions {
		moduleInfos := make([]ModuleInfo, len(sol.Modules))
		for j, m := range sol.Modules {
			attributes := make([]ModuleAttribute, len(m.Parts))
			for k, part := range m.Parts {
				attributes[k] = ModuleAttribute{
					ID:     part.ID,
					PartID: part.PartID,
					Name:   part.Name,
					Value:  part.Value,
					Type:   part.Type,
				}
			}

			moduleInfos[j] = ModuleInfo{
				ID:         m.ID,
				UUID:       m.UUID,
				Name:       m.Name,
				Quality:    m.Quality,
				Attributes: attributes,
			}
		}

		combinations[i] = ModuleCombination{
			Rank:           i + 1,
			Score:          sol.Score,
			PriorityLevel:  sol.PriorityLevel,
			TotalAttrValue: sol.TotalAttrValue,
			Modules:        moduleInfos,
			AttrBreakdown:  sol.AttrBreakdown,
		}
	}

	// Cache the result
	go cacheOptimizationResult(db, user.ID, requestHash, req, combinations, processingTimeMs)

	c.JSON(http.StatusOK, OptimizeResponse{
		Solutions: combinations,
		Metadata: OptimizationMetadata{
			TotalModules:     len(modules),
			ProcessingTimeMs: processingTimeMs,
			Algorithm:        "hybrid-greedy-local-search",
			CacheHit:         false,
		},
	})
}

// generateRequestHash creates a hash of the optimization parameters for caching
func generateRequestHash(userID uint, req *OptimizeRequest) string {
	h := sha256.New()

	// Include user ID
	fmt.Fprintf(h, "user:%d|", userID)

	// Include category
	fmt.Fprintf(h, "cat:%s|", req.Category)

	// Include preferences if present
	if req.Preferences != nil {
		if len(req.Preferences.PriorityAttributes) > 0 {
			fmt.Fprintf(h, "priority:%v|", req.Preferences.PriorityAttributes)
		}
		if len(req.Preferences.DesiredLevels) > 0 {
			fmt.Fprintf(h, "levels:%v|", req.Preferences.DesiredLevels)
		}
		if len(req.Preferences.ExcludedAttributes) > 0 {
			fmt.Fprintf(h, "excluded:%v|", req.Preferences.ExcludedAttributes)
		}
	}

	// Include constraints
	fmt.Fprintf(h, "max:%d|sort:%s", req.Constraints.MaxSolutions, req.Constraints.SortMode)

	return fmt.Sprintf("%x", h.Sum(nil)[:16])
}

// cacheOptimizationResult stores the optimization result in the database for caching and history
func cacheOptimizationResult(db *gorm.DB, userID uint, requestHash string, req OptimizeRequest, combinations []ModuleCombination, processingTimeMs int) {
	log.Printf("[OptimizeController] Caching result for user_id=%d, request_hash=%s", userID, requestHash)

	combinationsJSON, err := json.Marshal(combinations)
	if err != nil {
		log.Printf("[OptimizeController] Failed to marshal combinations for caching: %v", err)
		return // Silent failure for caching
	}

	var priorityAttrsJSON, desiredLevelsJSON, excludedAttrsJSON []byte
	if req.Preferences != nil {
		if len(req.Preferences.PriorityAttributes) > 0 {
			priorityAttrsJSON, _ = json.Marshal(req.Preferences.PriorityAttributes)
		}
		if len(req.Preferences.DesiredLevels) > 0 {
			desiredLevelsJSON, _ = json.Marshal(req.Preferences.DesiredLevels)
		}
		if len(req.Preferences.ExcludedAttributes) > 0 {
			excludedAttrsJSON, _ = json.Marshal(req.Preferences.ExcludedAttributes)
		}
	}

	expiresAt := time.Now().Add(1 * time.Hour)

	result := models.OptimizationResult{
		UserID:             userID,
		RequestHash:        requestHash,
		Category:           req.Category,
		PriorityAttributes: priorityAttrsJSON,
		DesiredLevels:      desiredLevelsJSON,
		ExcludedAttributes: excludedAttrsJSON,
		SortMode:           req.Constraints.SortMode,
		Combinations:       combinationsJSON,
		ProcessingTimeMS:   processingTimeMs,
		ExpiresAt:          &expiresAt,
	}

	if err := db.Create(&result).Error; err != nil {
		log.Printf("[OptimizeController] Failed to cache result for user_id=%d: %v", userID, err)
	} else {
		log.Printf("[OptimizeController] Successfully cached result for user_id=%d (expires: %s)", userID, expiresAt.Format(time.RFC3339))
	}
}

// hydrateModuleAttributes ensures cached module combinations include attribute details
func hydrateModuleAttributes(db *gorm.DB, combinations []ModuleCombination) error {
	missingIDs := make(map[uint]struct{})
	for _, combo := range combinations {
		for _, module := range combo.Modules {
			if len(module.Attributes) == 0 {
				missingIDs[module.ID] = struct{}{}
			}
		}
	}

	if len(missingIDs) == 0 {
		return nil
	}

	ids := make([]uint, 0, len(missingIDs))
	for id := range missingIDs {
		ids = append(ids, id)
	}

	var parts []models.ModulePart
	if err := db.Where("module_id IN ?", ids).Find(&parts).Error; err != nil {
		return err
	}

	partsByModule := make(map[uint][]ModuleAttribute)
	for _, part := range parts {
		partsByModule[part.ModuleID] = append(partsByModule[part.ModuleID], ModuleAttribute{
			ID:     part.ID,
			PartID: part.PartID,
			Name:   part.Name,
			Value:  part.Value,
			Type:   part.Type,
		})
	}

	for i := range combinations {
		for j := range combinations[i].Modules {
			module := &combinations[i].Modules[j]
			if len(module.Attributes) == 0 {
				module.Attributes = partsByModule[module.ID]
			}
		}
	}

	return nil
}

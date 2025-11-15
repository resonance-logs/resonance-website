package module_optimizer

import (
	"encoding/json"
	"fmt"
	"net/http"
	"server/models"
	"server/services/module_optimizer"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// BackfillModulesRequest represents the backfill request
type BackfillModulesRequest struct {
	PlayerID *int64 `json:"player_id" binding:"omitempty"` // Optional: specific player, otherwise use current user's local player
}

// BackfillModulesResponse represents the backfill result
type BackfillModulesResponse struct {
	Summary ImportSummary `json:"summary"`
	Errors  []ImportError `json:"errors,omitempty"`
	Message string        `json:"message"`
}

// CharSerializeData represents the parsed CharSerialize JSON structure
// This is a simplified version - expand as needed based on actual protobuf structure
type CharSerializeData struct {
	Mod         *ModData         `json:"Mod"`
	ItemPackage *ItemPackageData `json:"ItemPackage"`
}

type ModData struct {
	ModInfos map[string]*ModInfo `json:"ModInfos"`
}

type ModInfo struct {
	InitLinkNums []int `json:"InitLinkNums"`
}

type ItemPackageData struct {
	Packages map[string]*PackageData `json:"Packages"`
}

type PackageData struct {
	Items map[string]*ItemData `json:"Items"`
}

type ItemData struct {
	ConfigId   int             `json:"ConfigId"`
	Uuid       string          `json:"Uuid"` // Changed to string to handle both numeric and string UUIDs in JSON
	Quality    int             `json:"Quality"`
	ModNewAttr *ModNewAttrData `json:"ModNewAttr"`
}

type ModNewAttrData struct {
	ModParts []int `json:"ModParts"`
}

// BackfillModules extracts modules from stored CharSerializeJSON and imports them
// This allows users to sync their modules from previously uploaded encounters
func BackfillModules(c *gin.Context) {
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

	var req BackfillModulesRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		// Allow empty body - just backfill from latest encounter
		req = BackfillModulesRequest{}
	}

	// Get the most recent DetailedPlayerData for this user
	var playerData models.DetailedPlayerData
	var err error

	if req.PlayerID != nil {
		// Specific player ID requested - verify user owns this player data
		err = db.Where("player_id = ? AND user_id = ?", *req.PlayerID, user.ID).
			Order("last_seen_ms DESC").
			First(&playerData).Error
	} else {
		// Get latest player data for this user
		err = db.Where("user_id = ?", user.ID).
			Order("last_seen_ms DESC").
			First(&playerData).Error
	}

	if err == gorm.ErrRecordNotFound {
		c.JSON(http.StatusNotFound, gin.H{
			"error": gin.H{
				"code":    "no_data",
				"message": "No character data found. Please upload an encounter first.",
			},
		})
		return
	}

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"code":    "db_error",
				"message": "Failed to fetch character data",
			},
		})
		return
	}

	// Parse CharSerializeJSON
	var charSerialize CharSerializeData
	if err := json.Unmarshal([]byte(playerData.CharSerializeJSON), &charSerialize); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"code":    "parse_error",
				"message": fmt.Sprintf("Failed to parse character data: %v", err),
			},
		})
		return
	}

	// Extract modules from the parsed data
	modules := extractModulesFromCharSerialize(&charSerialize)

	if len(modules) == 0 {
		c.JSON(http.StatusOK, BackfillModulesResponse{
			Summary: ImportSummary{
				Added:   0,
				Updated: 0,
				Errors:  0,
			},
			Message: "No modules found in character data",
		})
		return
	}

	// Use import service to process modules with "backfill" source
	importService := module_optimizer.NewImportService(db)
	result := importService.ImportModulesWithSource(user.ID, convertToImportData(modules), "backfill")

	// Convert service errors to controller errors
	errors := make([]ImportError, len(result.ErrorList))
	for i, e := range result.ErrorList {
		errors[i] = ImportError{
			Index: e.Index,
			UUID:  e.UUID,
			Error: e.Error,
		}
	}

	c.JSON(http.StatusOK, BackfillModulesResponse{
		Summary: ImportSummary{
			Added:   result.Added,
			Updated: result.Updated,
			Errors:  result.Errors,
		},
		Errors:  errors,
		Message: fmt.Sprintf("Backfilled %d modules from character data", result.Added+result.Updated),
	})
}

// extractModulesFromCharSerialize parses CharSerialize and extracts module information
func extractModulesFromCharSerialize(charSerialize *CharSerializeData) []ModuleImportPayload {
	var modules []ModuleImportPayload

	if charSerialize == nil || charSerialize.ItemPackage == nil || charSerialize.Mod == nil {
		return modules
	}

	modInfos := charSerialize.Mod.ModInfos
	if modInfos == nil {
		return modules
	}

	// Iterate through all packages (inventories)
	for _, pkg := range charSerialize.ItemPackage.Packages {
		if pkg == nil || pkg.Items == nil {
			continue
		}

		// Iterate through items in this package
		for key, item := range pkg.Items {
			if item == nil || item.ModNewAttr == nil {
				continue
			}

			// Check if this is a module (has ModParts)
			if len(item.ModNewAttr.ModParts) == 0 {
				continue
			}

			// Get the module info for this item
			modInfo := modInfos[key]
			if modInfo == nil {
				continue
			}

			// Build module payload
			module := ModuleImportPayload{
				UUID:     item.Uuid, // Already a string
				ConfigID: item.ConfigId,
				Quality:  item.Quality,
				Name:     module_optimizer.GetModuleName(item.ConfigId),
				Category: module_optimizer.GetModuleCategory(item.ConfigId),
				Parts:    []PartImportPayload{},
			}

			// Extract parts (attributes)
			partCount := len(item.ModNewAttr.ModParts)
			valueCount := len(modInfo.InitLinkNums)
			maxParts := partCount
			if valueCount < maxParts {
				maxParts = valueCount
			}

			for i := 0; i < maxParts; i++ {
				partID := item.ModNewAttr.ModParts[i]
				value := modInfo.InitLinkNums[i]

				part := PartImportPayload{
					PartID: partID,
					Name:   module_optimizer.GetAttributeName(partID),
					Value:  value,
					Type:   module_optimizer.GetAttributeType(module_optimizer.GetAttributeName(partID)),
				}

				module.Parts = append(module.Parts, part)
			}

			// Only add if we have at least one part
			if len(module.Parts) > 0 {
				modules = append(modules, module)
			}
		}
	}

	return modules
}

// convertToImportData converts ModuleImportPayload to the format expected by ImportService
func convertToImportData(modules []ModuleImportPayload) []interface{} {
	result := make([]interface{}, len(modules))
	for i, m := range modules {
		// Convert to map[string]interface{} for import service
		parts := make([]interface{}, len(m.Parts))
		for j, p := range m.Parts {
			parts[j] = map[string]interface{}{
				"part_id": p.PartID,
				"name":    p.Name,
				"value":   p.Value,
				"type":    p.Type,
			}
		}

		result[i] = map[string]interface{}{
			"uuid":      m.UUID,
			"name":      m.Name,
			"config_id": m.ConfigID,
			"quality":   m.Quality,
			"category":  m.Category,
			"parts":     parts,
		}
	}
	return result
}

package module_optimizer

import (
	"net/http"
	"server/models"
	"server/services/module_optimizer"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// ImportModulesRequest represents the module import request
type ImportModulesRequest struct {
	Version string                `json:"version" binding:"required"`
	Modules []ModuleImportPayload `json:"modules" binding:"required"`
}

// ModuleImportPayload represents a single module to import
type ModuleImportPayload struct {
	UUID     string              `json:"uuid" binding:"required"`
	Name     string              `json:"name" binding:"required"`
	ConfigID int                 `json:"config_id" binding:"required"`
	Quality  int                 `json:"quality" binding:"required,min=1,max=5"`
	Category string              `json:"category" binding:"required,oneof=ATTACK DEFENSE SUPPORT"`
	Parts    []PartImportPayload `json:"parts" binding:"required"`
}

// PartImportPayload represents a module part to import
type PartImportPayload struct {
	PartID int    `json:"part_id" binding:"required"`
	Name   string `json:"name" binding:"required"`
	Value  int    `json:"value" binding:"required,min=1"`
	Type   string `json:"type" binding:"required,oneof=basic special"`
}

// ImportModulesResponse represents the import result
type ImportModulesResponse struct {
	Summary ImportSummary `json:"summary"`
	Errors  []ImportError `json:"errors,omitempty"`
}

// ImportSummary contains import statistics
type ImportSummary struct {
	Added   int `json:"added"`
	Updated int `json:"updated"`
	Errors  int `json:"errors"`
}

// ImportError represents an error for a specific module
type ImportError struct {
	Index int    `json:"index"`
	UUID  string `json:"uuid"`
	Error string `json:"error"`
}

// ImportModules handles bulk module import with validation and deduplication
func ImportModules(c *gin.Context) {
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

	var req ImportModulesRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": gin.H{
				"code":    "validation_error",
				"message": err.Error(),
			},
		})
		return
	}

	// Validate version
	if req.Version != "1.0" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": gin.H{
				"code":    "invalid_version",
				"message": "Unsupported import version. Expected 1.0",
			},
		})
		return
	}

	// Use import service to process modules
	importService := module_optimizer.NewImportService(db)
	result := importService.ImportModules(user.ID, req.Modules)

	// Convert service errors to controller errors
	errors := make([]ImportError, len(result.ErrorList))
	for i, e := range result.ErrorList {
		errors[i] = ImportError{
			Index: e.Index,
			UUID:  e.UUID,
			Error: e.Error,
		}
	}

	c.JSON(http.StatusOK, ImportModulesResponse{
		Summary: ImportSummary{
			Added:   result.Added,
			Updated: result.Updated,
			Errors:  result.Errors,
		},
		Errors: errors,
	})
}

// ExportModules exports user's modules in JSON format
func ExportModules(c *gin.Context) {
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

	// Get category filter from query params
	category := c.Query("category")

	// Fetch user's modules
	query := db.Where("user_id = ?", user.ID)
	if category != "" && category != "ALL" {
		query = query.Where("category = ?", category)
	}

	var modules []models.Module
	if err := query.Preload("Parts").Find(&modules).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"code":    "db_error",
				"message": "Failed to fetch modules",
			},
		})
		return
	}

	// Convert to export format
	exportModules := make([]map[string]interface{}, len(modules))
	for i, module := range modules {
		parts := make([]map[string]interface{}, len(module.Parts))
		for j, part := range module.Parts {
			parts[j] = map[string]interface{}{
				"part_id": part.PartID,
				"name":    part.Name,
				"value":   part.Value,
				"type":    part.Type,
			}
		}

		exportModules[i] = map[string]interface{}{
			"uuid":      module.UUID,
			"name":      module.Name,
			"config_id": module.ConfigID,
			"quality":   module.Quality,
			"category":  module.Category,
			"parts":     parts,
		}
	}

	exportData := map[string]interface{}{
		"version":     "1.0",
		"exported_at": time.Now().Format("2006-01-02T15:04:05Z07:00"),
		"modules":     exportModules,
	}

	// Set content disposition header for download
	c.Header("Content-Disposition", "attachment; filename=modules-export.json")
	c.JSON(http.StatusOK, exportData)
}

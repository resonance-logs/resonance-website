package module_optimizer

import (
	"encoding/json"
	"net/http"
	"strconv"

	"server/models"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// SaveBuildRequest represents the request to save a build
type SaveBuildRequest struct {
	Name          string         `json:"name" binding:"required,min=1,max=255"`
	ModuleIDs     []string       `json:"module_ids" binding:"required,len=4"`
	Score         float64        `json:"score" binding:"required"`
	AttrBreakdown map[string]int `json:"attr_breakdown" binding:"required"`
	PriorityLevel int            `json:"priority_level,omitempty"`
	Notes         *string        `json:"notes,omitempty"`
}

// UpdateBuildRequest represents the request to update a build
type UpdateBuildRequest struct {
	Name  *string `json:"name,omitempty" binding:"omitempty,min=1,max=255"`
	Notes *string `json:"notes,omitempty"`
}

// GetBuilds retrieves all saved builds for the user
func GetBuilds(c *gin.Context) {
	dbi, _ := c.Get("db")
	db := dbi.(*gorm.DB)

	userIdi, _ := c.Get("user")
	user := userIdi.(*models.User)

	// Fetch all saved builds for user
	var builds []models.SavedBuild
	err := db.Where("user_id = ?", user.ID).
		Order("created_at DESC").
		Find(&builds).Error

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"code":    "internal_error",
				"message": "Failed to retrieve saved builds",
			},
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"builds": builds,
	})
}

// GetBuild retrieves a specific saved build with full module details
func GetBuild(c *gin.Context) {
	dbi, _ := c.Get("db")
	db := dbi.(*gorm.DB)

	userIdi, _ := c.Get("user")
	user := userIdi.(*models.User)

	// Parse ID parameter
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": gin.H{
				"code":    "bad_request",
				"message": "Invalid build ID",
			},
		})
		return
	}

	// Fetch saved build
	var build models.SavedBuild
	err = db.Where("id = ? AND user_id = ?", id, user.ID).First(&build).Error

	if err == gorm.ErrRecordNotFound {
		c.JSON(http.StatusNotFound, gin.H{
			"error": gin.H{
				"code":    "not_found",
				"message": "Saved build not found",
			},
		})
		return
	}

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"code":    "internal_error",
				"message": "Failed to retrieve saved build",
			},
		})
		return
	}

	// Extract module UUIDs from JSONB
	var moduleUUIDs []string
	if err := json.Unmarshal(build.ModuleIDs, &moduleUUIDs); err != nil {
		// If unmarshal fails, set empty array
		moduleUUIDs = []string{}
	}

	// Fetch full module details
	var modules []models.Module
	if len(moduleUUIDs) > 0 {
		db.Where("uuid IN ? AND user_id = ?", moduleUUIDs, user.ID).
			Preload("Parts").
			Find(&modules)
	}

	// Return build with modules
	c.JSON(http.StatusOK, gin.H{
		"build": gin.H{
			"id":             build.ID,
			"user_id":        build.UserID,
			"name":           build.Name,
			"module_ids":     build.ModuleIDs,
			"score":          build.Score,
			"attr_breakdown": build.AttrBreakdown,
			"priority_level": build.PriorityLevel,
			"notes":          build.Notes,
			"created_at":     build.CreatedAt,
			"updated_at":     build.UpdatedAt,
			"modules":        modules,
		},
	})
}

// SaveBuild creates a new saved build
func SaveBuild(c *gin.Context) {
	dbi, _ := c.Get("db")
	db := dbi.(*gorm.DB)

	userIdi, _ := c.Get("user")
	user := userIdi.(*models.User)

	// Parse request
	var req SaveBuildRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": gin.H{
				"code":    "bad_request",
				"message": err.Error(),
			},
		})
		return
	}

	// Validate exactly 4 module IDs
	if len(req.ModuleIDs) != 4 {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": gin.H{
				"code":    "validation_error",
				"message": "Exactly 4 module IDs are required",
			},
		})
		return
	}

	// Verify all modules exist and belong to user
	var count int64
	db.Model(&models.Module{}).
		Where("uuid IN ? AND user_id = ?", req.ModuleIDs, user.ID).
		Count(&count)

	if count != 4 {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": gin.H{
				"code":    "validation_error",
				"message": "One or more module IDs are invalid",
			},
		})
		return
	}

	// Marshal module IDs and attr breakdown to JSONB
	moduleIDsJSON, err := json.Marshal(req.ModuleIDs)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"code":    "internal_error",
				"message": "Failed to serialize module IDs",
			},
		})
		return
	}

	attrBreakdownJSON, err := json.Marshal(req.AttrBreakdown)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"code":    "internal_error",
				"message": "Failed to serialize attribute breakdown",
			},
		})
		return
	}

	// Create saved build
	build := models.SavedBuild{
		UserID:        user.ID,
		Name:          req.Name,
		ModuleIDs:     moduleIDsJSON,
		Score:         req.Score,
		AttrBreakdown: attrBreakdownJSON,
		PriorityLevel: req.PriorityLevel,
		Notes:         req.Notes,
	}

	// Save to database
	if err := db.Create(&build).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"code":    "internal_error",
				"message": "Failed to save build",
			},
		})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"build": build,
	})
}

// UpdateBuild updates an existing saved build (name and notes only)
func UpdateBuild(c *gin.Context) {
	dbi, _ := c.Get("db")
	db := dbi.(*gorm.DB)

	userIdi, _ := c.Get("user")
	user := userIdi.(*models.User)

	// Parse ID parameter
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": gin.H{
				"code":    "bad_request",
				"message": "Invalid build ID",
			},
		})
		return
	}

	// Parse request
	var req UpdateBuildRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": gin.H{
				"code":    "bad_request",
				"message": err.Error(),
			},
		})
		return
	}

	// Fetch existing build
	var build models.SavedBuild
	err = db.Where("id = ? AND user_id = ?", id, user.ID).First(&build).Error

	if err == gorm.ErrRecordNotFound {
		c.JSON(http.StatusNotFound, gin.H{
			"error": gin.H{
				"code":    "not_found",
				"message": "Saved build not found",
			},
		})
		return
	}

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"code":    "internal_error",
				"message": "Failed to retrieve saved build",
			},
		})
		return
	}

	// Update fields
	if req.Name != nil {
		build.Name = *req.Name
	}
	if req.Notes != nil {
		build.Notes = req.Notes
	}

	// Save changes
	if err := db.Save(&build).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"code":    "internal_error",
				"message": "Failed to update build",
			},
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"build": build,
	})
}

// DeleteBuild removes a saved build
func DeleteBuild(c *gin.Context) {
	dbi, _ := c.Get("db")
	db := dbi.(*gorm.DB)

	userIdi, _ := c.Get("user")
	user := userIdi.(*models.User)

	// Parse ID parameter
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": gin.H{
				"code":    "bad_request",
				"message": "Invalid build ID",
			},
		})
		return
	}

	// Delete saved build
	result := db.Where("id = ? AND user_id = ?", id, user.ID).Delete(&models.SavedBuild{})

	if result.RowsAffected == 0 {
		c.JSON(http.StatusNotFound, gin.H{
			"error": gin.H{
				"code":    "not_found",
				"message": "Saved build not found",
			},
		})
		return
	}

	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"code":    "internal_error",
				"message": "Failed to delete build",
			},
		})
		return
	}

	c.Status(http.StatusNoContent)
}

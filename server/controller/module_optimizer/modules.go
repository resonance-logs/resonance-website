package module_optimizer

import (
	"net/http"
	"server/models"
	"server/services/module_optimizer"
	"strconv"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// GetModulesRequest represents the query parameters for getting modules
type GetModulesRequest struct {
	Category string `form:"category" binding:"omitempty,oneof=ATTACK DEFENSE SUPPORT"`
	Quality  int    `form:"quality" binding:"omitempty,min=1,max=5"`
	Limit    int    `form:"limit" binding:"omitempty,min=1,max=1000"`
	Offset   int    `form:"offset" binding:"omitempty,min=0"`
}

// GetModulesResponse represents the response for getting modules
type GetModulesResponse struct {
	Modules []models.Module `json:"modules"`
	Total   int64           `json:"total"`
	Limit   int             `json:"limit"`
	Offset  int             `json:"offset"`
}

// AddModuleRequest represents the request to add a new module
type AddModuleRequest struct {
	UUID     string          `json:"uuid" binding:"required"`
	Name     string          `json:"name" binding:"required"`
	ConfigID int             `json:"config_id" binding:"required"`
	Quality  int             `json:"quality" binding:"required,min=1,max=5"`
	Category string          `json:"category" binding:"required,oneof=ATTACK DEFENSE SUPPORT"`
	Parts    []AddModulePart `json:"parts" binding:"required,min=1,max=10"`
}

// AddModulePart represents a module part in add request
type AddModulePart struct {
	PartID int    `json:"part_id" binding:"required"`
	Name   string `json:"name" binding:"required"`
	Value  int    `json:"value" binding:"required,min=1"`
	Type   string `json:"type" binding:"required,oneof=basic special"`
}

// UpdateModuleRequest represents the request to update a module
type UpdateModuleRequest struct {
	Name     *string         `json:"name"`
	Quality  *int            `json:"quality" binding:"omitempty,min=1,max=5"`
	Category *string         `json:"category" binding:"omitempty,oneof=ATTACK DEFENSE SUPPORT"`
	Parts    []AddModulePart `json:"parts" binding:"omitempty,min=1,max=10"`
}

// GetModules retrieves the user's module collection with optional filters
func GetModules(c *gin.Context) {
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

	currentUser, exists := c.Get("current_user")
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

	var req GetModulesRequest
	if err := c.ShouldBindQuery(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": gin.H{
				"code":    "validation_error",
				"message": err.Error(),
			},
		})
		return
	}

	// Set default pagination
	if req.Limit == 0 {
		req.Limit = 50
	}

	// Build query
	query := db.Where("user_id = ?", user.ID)

	if req.Category != "" {
		query = query.Where("category = ?", req.Category)
	}

	if req.Quality > 0 {
		query = query.Where("quality = ?", req.Quality)
	}

	// Get total count
	var total int64
	if err := query.Model(&models.Module{}).Count(&total).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"code":    "db_error",
				"message": "Failed to count modules",
			},
		})
		return
	}

	// Get modules with parts
	var modules []models.Module
	if err := query.
		Preload("Parts").
		Limit(req.Limit).
		Offset(req.Offset).
		Order("quality DESC, name ASC").
		Find(&modules).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"code":    "db_error",
				"message": "Failed to fetch modules",
			},
		})
		return
	}

	c.JSON(http.StatusOK, GetModulesResponse{
		Modules: modules,
		Total:   total,
		Limit:   req.Limit,
		Offset:  req.Offset,
	})
}

// AddModule creates a new module in the user's collection
func AddModule(c *gin.Context) {
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

	currentUser, exists := c.Get("current_user")
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

	var req AddModuleRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": gin.H{
				"code":    "validation_error",
				"message": err.Error(),
			},
		})
		return
	}

	// Use module service to create module
	moduleService := module_optimizer.NewModuleService(db)
	module, err := moduleService.CreateModule(user.ID, req.UUID, req.Name, req.ConfigID, req.Quality, req.Category, req.Parts)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": gin.H{
				"code":    "create_failed",
				"message": err.Error(),
			},
		})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"module": module,
	})
}

// GetModule retrieves a single module by ID
func GetModule(c *gin.Context) {
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

	currentUser, exists := c.Get("current_user")
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

	moduleID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": gin.H{
				"code":    "invalid_id",
				"message": "Invalid module ID",
			},
		})
		return
	}

	var module models.Module
	if err := db.
		Where("id = ? AND user_id = ?", moduleID, user.ID).
		Preload("Parts").
		First(&module).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{
				"error": gin.H{
					"code":    "not_found",
					"message": "Module not found",
				},
			})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"code":    "db_error",
				"message": "Failed to fetch module",
			},
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"module": module,
	})
}

// UpdateModule updates an existing module
func UpdateModule(c *gin.Context) {
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

	currentUser, exists := c.Get("current_user")
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

	moduleID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": gin.H{
				"code":    "invalid_id",
				"message": "Invalid module ID",
			},
		})
		return
	}

	var req UpdateModuleRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": gin.H{
				"code":    "validation_error",
				"message": err.Error(),
			},
		})
		return
	}

	// Use module service to update module
	moduleService := module_optimizer.NewModuleService(db)
	module, err := moduleService.UpdateModule(user.ID, uint(moduleID), req.Name, req.Quality, req.Category, req.Parts)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{
				"error": gin.H{
					"code":    "not_found",
					"message": "Module not found",
				},
			})
			return
		}
		c.JSON(http.StatusBadRequest, gin.H{
			"error": gin.H{
				"code":    "update_failed",
				"message": err.Error(),
			},
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"module": module,
	})
}

// DeleteModule removes a module from the user's collection
func DeleteModule(c *gin.Context) {
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

	currentUser, exists := c.Get("current_user")
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

	moduleID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": gin.H{
				"code":    "invalid_id",
				"message": "Invalid module ID",
			},
		})
		return
	}

	// Use module service to delete module
	moduleService := module_optimizer.NewModuleService(db)
	if err := moduleService.DeleteModule(user.ID, uint(moduleID)); err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{
				"error": gin.H{
					"code":    "not_found",
					"message": "Module not found",
				},
			})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"code":    "delete_failed",
				"message": err.Error(),
			},
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Module deleted successfully",
	})
}

package customization

import (
	"net/http"
	"strings"

	apiErrors "server/controller"
	"server/models"

	"github.com/gin-gonic/gin"
	"gorm.io/datatypes"
	"gorm.io/gorm"
)

type CustomizationResponse struct {
	Customization datatypes.JSONMap `json:"customization"`
}

type UpdateCustomizationRequest struct {
	EncounterTableEntryTheme *string `json:"encounterTableEntryTheme"`
}

var allowedThemes = map[string]struct{}{
	"default":                {},
	"blossoming-sakura-tree": {},
	"starry-night":           {},
	"summer-sunset":          {},
	"cyberpunk":              {},
	"green-oasis":            {},
}

// GET /api/v1/customization
func GetCustomization(c *gin.Context) {
	user, ok := getUser(c)
	if !ok {
		return
	}

	custom := user.Customization
	if custom == nil {
		custom = datatypes.JSONMap{}
	}

	c.JSON(http.StatusOK, CustomizationResponse{Customization: custom})
}

// PUT /api/v1/customization
func UpdateCustomization(c *gin.Context) {
	db, ok := getDB(c)
	if !ok {
		return
	}

	user, ok := getUser(c)
	if !ok {
		return
	}

	if user.AmountSpentUSD < 3 {
		c.JSON(http.StatusForbidden, apiErrors.NewErrorResponse(http.StatusForbidden, "Customization unlock requires at least $3 spent"))
		return
	}

	var req UpdateCustomizationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, apiErrors.NewErrorResponse(http.StatusBadRequest, "Invalid request body", err.Error()))
		return
	}

	// Initialize customization map if nil
	if user.Customization == nil {
		user.Customization = datatypes.JSONMap{}
	}

	if req.EncounterTableEntryTheme != nil {
		theme := strings.TrimSpace(*req.EncounterTableEntryTheme)
		if theme == "" {
			delete(user.Customization, "encounterTableEntryTheme")
		} else {
			if _, ok := allowedThemes[theme]; !ok {
				c.JSON(http.StatusBadRequest, apiErrors.NewErrorResponse(http.StatusBadRequest, "Invalid encounterTableEntryTheme value"))
				return
			}
			user.Customization["encounterTableEntryTheme"] = theme
		}
	}

	if err := db.Save(user).Error; err != nil {
		c.JSON(http.StatusInternalServerError, apiErrors.NewErrorResponse(http.StatusInternalServerError, "Failed to update customization", err.Error()))
		return
	}

	c.JSON(http.StatusOK, CustomizationResponse{Customization: user.Customization})
}

func getDB(c *gin.Context) (*gorm.DB, bool) {
	dbAny, ok := c.Get("db")
	if !ok {
		c.JSON(http.StatusInternalServerError, apiErrors.NewErrorResponse(http.StatusInternalServerError, "Database not available in context"))
		return nil, false
	}
	db, ok := dbAny.(*gorm.DB)
	if !ok {
		c.JSON(http.StatusInternalServerError, apiErrors.NewErrorResponse(http.StatusInternalServerError, "Invalid database in context"))
		return nil, false
	}
	return db, true
}

func getUser(c *gin.Context) (*models.User, bool) {
	userAny, exists := c.Get("user")
	if !exists {
		c.JSON(http.StatusUnauthorized, apiErrors.NewErrorResponse(http.StatusUnauthorized, "Not authenticated"))
		return nil, false
	}

	user, ok := userAny.(*models.User)
	if !ok {
		c.JSON(http.StatusInternalServerError, apiErrors.NewErrorResponse(http.StatusInternalServerError, "Invalid user data"))
		return nil, false
	}

	return user, true
}

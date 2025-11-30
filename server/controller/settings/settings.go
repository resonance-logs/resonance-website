package settings

import (
	"net/http"

	apiErrors "server/controller"
	"server/models"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type GetSettingsResponse struct {
	AnonymizeUploader bool `json:"anonymize_uploader"`
	AnonymizePlayers  bool `json:"anonymize_players"`
}

// GET /api/v1/settings
func GetSettings(c *gin.Context) {
	userAny, exists := c.Get("user")
	if !exists {
		c.JSON(http.StatusUnauthorized, apiErrors.NewErrorResponse(http.StatusUnauthorized, "Not authenticated"))
		return
	}

	user, ok := userAny.(*models.User)
	if !ok {
		c.JSON(http.StatusInternalServerError, apiErrors.NewErrorResponse(http.StatusInternalServerError, "Invalid user data"))
		return
	}

	c.JSON(http.StatusOK, GetSettingsResponse{
		AnonymizeUploader: user.AnonymizeUploader,
		AnonymizePlayers:  user.AnonymizePlayers,
	})
}

type UpdateSettingsRequest struct {
	AnonymizeUploader *bool `json:"anonymize_uploader"`
	AnonymizePlayers  *bool `json:"anonymize_players"`
}

type UpdateSettingsResponse struct {
	AnonymizeUploader bool `json:"anonymize_uploader"`
	AnonymizePlayers  bool `json:"anonymize_players"`
}

// PUT /api/v1/settings
func UpdateSettings(c *gin.Context) {
	dbAny, ok := c.Get("db")
	if !ok {
		c.JSON(http.StatusInternalServerError, apiErrors.NewErrorResponse(http.StatusInternalServerError, "Database not available in context"))
		return
	}
	db := dbAny.(*gorm.DB)

	userAny, exists := c.Get("user")
	if !exists {
		c.JSON(http.StatusUnauthorized, apiErrors.NewErrorResponse(http.StatusUnauthorized, "Not authenticated"))
		return
	}

	user, ok := userAny.(*models.User)
	if !ok {
		c.JSON(http.StatusInternalServerError, apiErrors.NewErrorResponse(http.StatusInternalServerError, "Invalid user data"))
		return
	}

	var req UpdateSettingsRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, apiErrors.NewErrorResponse(http.StatusBadRequest, "Invalid request body", err.Error()))
		return
	}

	// Update settings if provided
	if req.AnonymizeUploader != nil {
		user.AnonymizeUploader = *req.AnonymizeUploader
	}
	if req.AnonymizePlayers != nil {
		user.AnonymizePlayers = *req.AnonymizePlayers
	}

	if err := db.Save(user).Error; err != nil {
		c.JSON(http.StatusInternalServerError, apiErrors.NewErrorResponse(http.StatusInternalServerError, "Failed to update settings", err.Error()))
		return
	}

	c.JSON(http.StatusOK, UpdateSettingsResponse{
		AnonymizeUploader: user.AnonymizeUploader,
		AnonymizePlayers:  user.AnonymizePlayers,
	})
}

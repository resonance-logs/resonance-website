package tracking

import (
	"net/http"
	"time"

	"server/models"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type TrackAppUpdateRequest struct {
	ClientID string `json:"clientId" binding:"required"`
	Version  string `json:"version" binding:"required"`
	Platform string `json:"platform" binding:"required"`
}

// TrackAppUpdate upserts an app user based on ClientID.
func TrackAppUpdate(c *gin.Context) {
	dbVal, exists := c.Get("db")
	if !exists {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "database not available"})
		return
	}
	db, ok := dbVal.(*gorm.DB)
	if !ok {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "database configuration error"})
		return
	}

	var req TrackAppUpdateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	appUser := models.AppUser{
		ClientID:        req.ClientID,
		LastSeenVersion: req.Version,
		Platform:        req.Platform,
		LastSeenAt:      time.Now(),
	}

	// Upsert: try to find by ClientID, if exists update, else create
	result := db.Where(models.AppUser{ClientID: req.ClientID}).Assign(models.AppUser{
		LastSeenVersion: req.Version,
		Platform:        req.Platform,
		LastSeenAt:      time.Now(),
	}).FirstOrCreate(&appUser)

	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": result.Error.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"status": "ok"})
}

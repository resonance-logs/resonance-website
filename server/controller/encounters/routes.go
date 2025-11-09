package encounters

import (
	"server/middleware"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// SetupCombatRoutes registers all combat-related routes
func SetupCombatRoutes(router *gin.RouterGroup, db *gorm.DB) {
	// Add database to context
	router.Use(func(c *gin.Context) {
		c.Set("db", db)
		c.Next()
	})

	// Upload routes (API key authenticated)
	upload := router.Group("/upload")
	upload.Use(middleware.APIKeyAuth())
	{
		upload.POST("/encounters", UploadEncounters) // POST /api/upload/encounters
	}

	// Public read endpoints (no API key required)
	// List, detail, skill aggregates, distinct scenes
	router.GET("/encounter", GetEncounters)
	router.GET("/encounter/scenes", GetEncounterScenes)
	router.GET("/encounter/:id", GetEncounterByID)
	router.GET("/encounter/:id/skill/:skillId", GetEncounterSkill)
}

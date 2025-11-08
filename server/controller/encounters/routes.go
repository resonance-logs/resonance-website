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

	// Encounter routes
	encounters := router.Group("/encounters")
	{
		encounters.GET("", GetEncounters)                     // GET /api/encounters
		encounters.GET("/recent", GetRecentEncounters)        // GET /api/encounters/recent
		encounters.GET("/:id", GetEncounterByID)              // GET /api/encounters/:id
		encounters.GET("/:id/attempts", GetEncounterAttempts) // GET /api/encounters/:id/attempts
		encounters.GET("/:id/summary", GetEncounterSummary)   // GET /api/encounters/:id/summary
		encounters.GET("/:id/bosses", GetEncounterBosses)     // GET /api/encounters/:id/bosses
		encounters.GET("/:id/deaths", GetDeathEvents)         // GET /api/encounters/:id/deaths
		encounters.GET("/:id/stats", GetEncounterStats)       // GET /api/encounters/:id/stats
		encounters.GET("/:id/skills", GetSkillStats)          // GET /api/encounters/:id/skills
	}

	// Entity routes
	entities := router.Group("/entities")
	{
		entities.GET("", GetEntities)                          // GET /api/entities
		entities.GET("/:id", GetEntityByID)                    // GET /api/entities/:id
		entities.GET("/:id/encounters", GetEntityEncounters)   // GET /api/entities/:id/encounters
		entities.GET("/:id/stats", GetEntityStats)             // GET /api/entities/:id/stats
		entities.GET("/:id/performance", GetEntityPerformance) // GET /api/entities/:id/performance
	}

	// Reports stats route
	reports := router.Group("/reports")
	{
		reports.GET("/:reportId/stats", GetReportStats) // GET /api/reports/:id/stats
	}

	// Upload routes (API key authenticated)
	upload := router.Group("/upload")
	upload.Use(middleware.APIKeyAuth())
	{
		upload.POST("/encounters", UploadEncounters) // POST /api/upload/encounters
	}
}

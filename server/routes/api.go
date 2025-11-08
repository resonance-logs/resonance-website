package routes

import (
	"server/controller/encounters"
	"server/db"

	"github.com/gin-gonic/gin"
)

// RegisterAPIRoutes registers all API v1 routes
func RegisterAPIRoutes(router *gin.Engine) {
	// Attach auth middleware globally for /api/v1 to populate current user when session exists.
	rg := router.Group("/api/v1")
	// Lightweight ping endpoint under API group for health checks from the frontend
	rg.GET("/ping", func(c *gin.Context) {
		c.JSON(200, gin.H{"message": "pong"})
	})

	// Register auth routes
	RegisterAuthRoutes(rg)
	RegisterCharacterRoutes(rg)
	RegisterApiKeyRoutes(rg)

	// Initialize database connection for combat routes
	dbConn, _ := db.InitDB()
	if dbConn != nil {
		encounters.SetupCombatRoutes(rg, dbConn)
	}
}

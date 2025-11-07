package routes

import (
	"server/controller/encounters"
	"server/db"

	"github.com/gin-gonic/gin"
)

// RegisterAPIRoutes registers all API v1 routes
func RegisterAPIRoutes(router *gin.Engine) {
	rg := router.Group("/api/v1")
	RegisterReportRoutes(rg)
	RegisterCharacterRoutes(rg)

	// Initialize database connection for combat routes
	dbConn, _ := db.InitDB()
	if dbConn != nil {
		encounters.SetupCombatRoutes(rg, dbConn)
	}
}

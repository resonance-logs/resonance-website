package groups

import (
	cc "server/controller/player"
	"server/middleware"

	"github.com/gin-gonic/gin"
)

// RegisterPlayerRoutes registers player-related routes under /api/v1/player
func RegisterPlayerRoutes(rg *gin.RouterGroup) {
	playerGroup := rg.Group("/player")

	// Public endpoints with caching
	playerGroup.Use(middleware.CacheMiddleware())
	{
		playerGroup.GET("/top10", cc.GetTop10Players)
	}

	// Authenticated endpoints (no caching for user-specific data)
	// Use user id path param but still require auth and verify inside controller
	playerGroup.GET("/detailed-playerdata/:id", middleware.RequireAuth(), cc.GetDetailedPlayerData)
}

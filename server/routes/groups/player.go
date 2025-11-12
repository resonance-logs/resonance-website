package groups

import (
	cc "server/controller/player"
	"server/middleware"

	"github.com/gin-gonic/gin"
)

// RegisterPlayerRoutes registers player-related routes under /api/v1/player
func RegisterPlayerRoutes(rg *gin.RouterGroup) {
	playerGroup := rg.Group("/player")
	playerGroup.Use(middleware.CacheMiddleware())
	{
		playerGroup.GET("/top10", cc.GetTop10Players)
	}
}

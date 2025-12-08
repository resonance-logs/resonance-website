package groups

import (
	cc "server/controller/entity"
	"server/middleware"

	"github.com/gin-gonic/gin"
)

// RegisterEntityRoutes registers entity-related routes under /api/v1/entities
func RegisterEntityRoutes(rg *gin.RouterGroup) {
	entityGroup := rg.Group("/entities")

	// Public endpoint - data comes from Redis cache
	entityGroup.GET("", cc.GetEntities)

	// Admin endpoint to manually trigger refresh
	adminGroup := entityGroup.Group("")
	adminGroup.Use(middleware.AuthMiddleware(true))
	{
		adminGroup.POST("/refresh", cc.RefreshEntities)
	}
}

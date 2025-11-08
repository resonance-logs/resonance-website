package routes

import (
	"server/controller/auth"
	"server/middleware"

	"github.com/gin-gonic/gin"
)

// RegisterApiKeyRoutes registers API key management endpoints under /api/v1
func RegisterApiKeyRoutes(rg *gin.RouterGroup) {
	rgAuthenticated := rg.Group("/apikey")
	rgAuthenticated.Use(middleware.RequireAuth())
	{
		rgAuthenticated.GET("", auth.GetApiKeyMeta)
		rgAuthenticated.POST("", auth.GenerateApiKey)
	}
}

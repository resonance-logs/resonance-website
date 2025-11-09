package groups

import (
	cc "server/controller/apikey"
	"server/middleware"

	"github.com/gin-gonic/gin"
)

// RegisterApiKeyRoutes registers API key management endpoints under /api/v1
func RegisterApiKeyRoutes(rg *gin.RouterGroup) {
	apiKeyGroup := rg.Group("/apikey")
	{
		apiKeyGroup.GET("", middleware.RequireAuth(), cc.GetApiKeyMeta)
		apiKeyGroup.POST("", middleware.RequireAuth(), cc.GenerateApiKey)
	}
}

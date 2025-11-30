package groups

import (
	cc "server/controller/settings"
	"server/middleware"

	"github.com/gin-gonic/gin"
)

// RegisterSettingsRoutes registers all settings-related routes
func RegisterSettingsRoutes(rg *gin.RouterGroup) {
	settingsGroup := rg.Group("/settings")
	settingsGroup.Use(middleware.RequireAuth())
	{
		settingsGroup.GET("", cc.GetSettings)
		settingsGroup.PUT("", cc.UpdateSettings)
	}
}

package groups

import (
	cc "server/controller/auth"
	"server/middleware"

	"github.com/gin-gonic/gin"
)

// RegisterAuthRoutes registers all authentication-related routes
func RegisterAuthRoutes(rg *gin.RouterGroup) {
	authGroup := rg.Group("/auth")
	{
		authGroup.GET("/discord/url", cc.GetDiscordAuthURL)
		authGroup.GET("/discord/callback", cc.HandleDiscordCallback)
		authGroup.POST("/logout", cc.Logout)

		authGroup.GET("/me", middleware.RequireAuth(), cc.GetCurrentUser)
	}
}

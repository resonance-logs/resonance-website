package routes

import (
	"server/controller/auth"
	"server/middleware"

	"github.com/gin-gonic/gin"
)

// RegisterAuthRoutes registers all authentication-related routes
func RegisterAuthRoutes(rg *gin.RouterGroup) {
	authGroup := rg.Group("/auth")
	{
		// Public routes
		authGroup.GET("/discord/url", auth.GetDiscordAuthURL)
		authGroup.POST("/discord/callback", auth.HandleDiscordCallback)
		authGroup.POST("/logout", auth.Logout)

		// Protected routes
		authGroup.GET("/me", middleware.RequireAuth(), auth.GetCurrentUser)
	}
}

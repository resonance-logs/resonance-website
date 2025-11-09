package routes

import (
	"server/routes/groups"

	"github.com/gin-gonic/gin"
)

func RegisterAPIRoutes(router *gin.Engine) {
	// Attach auth middleware globally for /api/v1 to populate current user when session exists.
	rg := router.Group("/api/v1")

	groups.RegisterAuthRoutes(rg)
	groups.RegisterApiKeyRoutes(rg)
	groups.RegisterCombatRoutes(rg)
	groups.RegisterUploadRoutes(rg)

}

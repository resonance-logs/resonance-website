package groups

import (
	cc "server/controller/encounter"
	"server/middleware"

	"github.com/gin-gonic/gin"
)

func RegisterCombatRoutes(rg *gin.RouterGroup) {
	combatGroup := rg.Group("/encounter")
	combatGroup.Use(middleware.CacheMiddleware())
	combatGroup.Use(middleware.OptionalAuth()) // Attach user if authenticated (for ownership checks)
	{
		combatGroup.GET("", cc.GetEncounters)
		combatGroup.GET("/scenes", cc.GetEncounterScenes)
		combatGroup.GET("/:id", cc.GetEncounterByID)
	}
}

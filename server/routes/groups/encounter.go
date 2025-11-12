package groups

import (
	cc "server/controller/encounter"
	"server/middleware"

	"github.com/gin-gonic/gin"
)

func RegisterCombatRoutes(rg *gin.RouterGroup) {
	combatGroup := rg.Group("/encounter")
	combatGroup.Use(middleware.CacheMiddleware())
	{
		combatGroup.GET("", cc.GetEncounters)
		combatGroup.GET("/scenes", cc.GetEncounterScenes)
		combatGroup.GET("/:id/:playerId", cc.GetPlayerSkillStats)
		combatGroup.GET("/:id", cc.GetEncounterByID)
	}
}

package groups

import (
	cc "server/controller/encounter"

	"github.com/gin-gonic/gin"
)

// SetupCombatRoutes registers all combat-related routes
func RegisterCombatRoutes(rg *gin.RouterGroup) {
	combatGroup := rg.Group("/encounter")
	{
		combatGroup.GET("", cc.GetEncounters)
		combatGroup.GET("/scenes", cc.GetEncounterScenes)
		combatGroup.GET("/:id/:playerId", cc.GetPlayerSkillStats)
		combatGroup.GET("/:id", cc.GetEncounterByID)
	}
}

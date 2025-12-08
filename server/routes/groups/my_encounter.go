package groups

import (
	cc "server/controller/encounter"
	"server/middleware"

	"github.com/gin-gonic/gin"
)

func RegisterMyEncounterRoutes(rg *gin.RouterGroup) {
	myEncounterGroup := rg.Group("/my-encounter")
	myEncounterGroup.Use(middleware.RequireAuth()) // Require authentication
	{
		myEncounterGroup.GET("", cc.GetMyEncounters)
		myEncounterGroup.GET("/:id", cc.GetMyEncounterByID)
	}
}

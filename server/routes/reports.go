package routes

import (
	rc "server/controller/reports"

	"github.com/gin-gonic/gin"
)

func RegisterReportRoutes(rg *gin.RouterGroup) {
	reports := rg.Group("/reports")
	{
		reports.POST("/", rc.UploadReport)
		reports.GET("/:reportId", rc.GetReport)
		reports.GET("/:reportId/status", rc.GetStatus)
		reports.GET("/:reportId/fights/:fightId", rc.GetFight)
	}
}

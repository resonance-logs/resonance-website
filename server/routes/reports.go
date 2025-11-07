package routes

import (
    rc "server/controller/reports"

    "github.com/gin-gonic/gin"
)

func RegisterReportRoutes(rg *gin.RouterGroup) {
    rg.POST("/reports", rc.UploadReport)
    rg.GET("/reports", rc.ListReports)
    rg.GET("/reports/:reportId", rc.GetReport)
    rg.GET("/reports/:reportId/status", rc.GetStatus)
    rg.GET("/reports/:reportId/fights/:fightId", rc.GetFight)
}


package routes

import (
	rc "server/controller/reports"

	"github.com/gin-gonic/gin"
)

func RegisterReportRoutes(rg *gin.RouterGroup) {
	// Require authentication for uploading new reports via RequireAuth helper
	rg.POST("/reports", func(c *gin.Context) {
		if _, ok := RequireAuth(c); !ok {
			return
		}
		rc.UploadReport(c)
	})
	rg.GET("/reports", rc.ListReports)
	rg.GET("/reports/:reportId", rc.GetReport)
	rg.GET("/reports/:reportId/status", rc.GetStatus)
	rg.GET("/reports/:reportId/fights/:fightId", rc.GetFight)
}

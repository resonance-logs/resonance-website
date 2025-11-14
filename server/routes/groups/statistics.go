package groups

import (
	cc "server/controller/statistics"
	"server/middleware"

	"github.com/gin-gonic/gin"
)

// RegisterStatisticsRoutes registers endpoints under /statistics
func RegisterStatisticsRoutes(rg *gin.RouterGroup) {
	g := rg.Group("/statistics")
	g.Use(middleware.CacheMiddleware())
	{
		g.GET("", cc.GetOverview)
		g.GET("/classes", cc.GetClassStats)
		g.GET("/total", cc.GetTotals)
	}
}

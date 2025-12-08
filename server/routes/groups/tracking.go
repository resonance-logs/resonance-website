package groups

import (
	cc "server/controller/tracking"

	"github.com/gin-gonic/gin"
)

// RegisterTrackingRoutes registers endpoints under /tracking
func RegisterTrackingRoutes(rg *gin.RouterGroup) {
	g := rg.Group("/tracking")
	{
		g.POST("/app-update", cc.TrackAppUpdate)
	}
}

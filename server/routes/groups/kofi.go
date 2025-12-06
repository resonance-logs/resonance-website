package groups

import (
	cc "server/controller/kofi"

	"github.com/gin-gonic/gin"
)

// RegisterKofiRoutes registers Ko-fi webhook endpoints under /api/v1/kofi
func RegisterKofiRoutes(rg *gin.RouterGroup) {
	g := rg.Group("/kofi")
	g.POST("/webhook", cc.HandleWebhook)
}

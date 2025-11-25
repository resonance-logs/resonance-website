package groups

import (
	cc "server/controller/module"

	"github.com/gin-gonic/gin"
)

func RegisterModuleRoutes(rg *gin.RouterGroup) {
	g := rg.Group("/module")
	g.GET("/getModuleData/:charId", cc.GetModuleData)
}

package groups

import (
	cc "server/controller/customization"
	"server/middleware"

	"github.com/gin-gonic/gin"
)

func RegisterCustomizationRoutes(rg *gin.RouterGroup) {
	g := rg.Group("/customization")
	g.Use(middleware.RequireAuth())
	{
		g.GET("", cc.GetCustomization)
		g.PUT("", cc.UpdateCustomization)
	}
}

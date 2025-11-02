package routes

import (
	"github.com/gin-gonic/gin"
)

// RegisterAPIRoutes registers all API v1 routes
func RegisterAPIRoutes(router *gin.Engine) {
	rg := router.Group("/api/v1")
	RegisterReportRoutes(rg)
	RegisterCharacterRoutes(rg)
}

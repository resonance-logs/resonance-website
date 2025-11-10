package groups

import (
	cc "server/controller/upload"
	"server/middleware"

	"github.com/gin-gonic/gin"
)

func RegisterUploadRoutes(rg *gin.RouterGroup) {
	uploadGroup := rg.Group("/upload")

	{
		// Accept authentication via either cookie (web session) or API key header
		uploadGroup.POST("/", middleware.EitherAuth(), cc.UploadEncounters)
	}
}

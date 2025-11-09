package groups

import (
	cc "server/controller/upload"

	"github.com/gin-gonic/gin"
)

func RegisterUploadRoutes(rg *gin.RouterGroup) {
	uploadGroup := rg.Group("/upload")

	{
		uploadGroup.POST("/", cc.UploadEncounters)
	}
}

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
		uploadGroup.POST("/check", middleware.EitherAuth(), cc.CheckDuplicates)
		// Separate endpoint for syncing player data independently from encounters
		uploadGroup.POST("/player-data", middleware.EitherAuth(), cc.SyncPlayerData)
	}
}

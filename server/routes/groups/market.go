package groups

import (
	"server/controller/market"

	"github.com/gin-gonic/gin"
)

// RegisterMarketRoutes registers market-related routes.
func RegisterMarketRoutes(rg *gin.RouterGroup) {
	marketGroup := rg.Group("/market")
	{
		// Internal endpoint for market data uploads from the client
		marketGroup.POST("/upload", market.UploadMarketData)
	}
}

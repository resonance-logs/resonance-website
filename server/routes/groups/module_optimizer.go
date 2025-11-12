package groups

import (
	cc "server/controller/module_optimizer"

	"github.com/gin-gonic/gin"
)

// RegisterModuleOptimizerRoutes registers all module optimizer routes
func RegisterModuleOptimizerRoutes(rg *gin.RouterGroup) {
	g := rg.Group("/module-optimizer")

	// Module CRUD endpoints (Phase 3 - User Story 1)
	g.GET("/modules", cc.GetModules)
	g.POST("/modules", cc.AddModule)
	g.GET("/modules/:id", cc.GetModule)
	g.PUT("/modules/:id", cc.UpdateModule)
	g.DELETE("/modules/:id", cc.DeleteModule)

	// Module import/export endpoints (Phase 5 - User Story 3)
	g.POST("/modules/import", cc.ImportModules)
	g.GET("/modules/export", cc.ExportModules)

	// Optimization endpoint (Phase 3 - User Story 1)
	g.POST("/optimize", cc.OptimizeModules)

	// History endpoints (Phase 6 - User Story 4)
	g.GET("/history", cc.GetHistory)
	g.GET("/history/:id", cc.GetHistoryItem)
	g.DELETE("/history/:id", cc.DeleteHistoryItem)

	// Saved builds endpoints (Phase 6 - User Story 4)
	g.GET("/builds", cc.GetBuilds)
	g.POST("/builds", cc.SaveBuild)
	g.GET("/builds/:id", cc.GetBuild)
	g.PUT("/builds/:id", cc.UpdateBuild)
	g.DELETE("/builds/:id", cc.DeleteBuild)
}

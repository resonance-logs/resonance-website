package encounters

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type SceneListResponse struct {
	Scenes []string `json:"scenes"`
}

// GET /api/v1/encounter/scenes
func GetEncounterScenes(c *gin.Context) {
	dbAny, ok := c.Get("db")
	if !ok {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "db unavailable"})
		return
	}
	db := dbAny.(*gorm.DB)

	var rows []string
	if err := db.
		Table("encounters").
		Select("DISTINCT scene_name").
		Where("scene_name IS NOT NULL AND scene_name <> ''").
		Order("scene_name ASC").
		Pluck("scene_name", &rows).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to load scenes"})
		return
	}
	c.JSON(http.StatusOK, SceneListResponse{Scenes: rows})
}

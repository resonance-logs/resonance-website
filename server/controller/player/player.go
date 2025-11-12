package player

import (
	"net/http"
	"strconv"
	"strings"
	"time"

	apiErrors "server/controller"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type PlayerTopRow struct {
	Name        *string    `json:"name,omitempty"`
	ActorID     int64      `json:"actorId"`
	ClassID     *int64     `json:"classId,omitempty"`
	ClassSpec   *int64     `json:"classSpec,omitempty"`
	DPS         float64    `json:"dps"`
	EncounterID int64      `json:"encounterId"`
	SceneName   *string    `json:"sceneName,omitempty"`
	StartedAt   *time.Time `json:"startedAt,omitempty"`
}

type GetTop10PlayersResponse struct {
	Players []PlayerTopRow `json:"players"`
}

// GET /api/v1/player/top10
// Query params: scene_name (required), class_id (optional), class_spec (optional)
func GetTop10Players(c *gin.Context) {
	dbAny, ok := c.Get("db")
	if !ok {
		c.JSON(http.StatusInternalServerError, apiErrors.NewErrorResponse(http.StatusInternalServerError, "Database not available in context"))
		return
	}
	db := dbAny.(*gorm.DB)

	sceneName := strings.TrimSpace(c.Query("scene_name"))
	if sceneName == "" {
		c.JSON(http.StatusBadRequest, apiErrors.NewErrorResponse(http.StatusBadRequest, "Missing required query param: scene_name"))
		return
	}

	var classID *int64
	if v := strings.TrimSpace(c.Query("class_id")); v != "" {
		if n, err := strconv.ParseInt(v, 10, 64); err == nil {
			classID = &n
		} else {
			c.JSON(http.StatusBadRequest, apiErrors.NewErrorResponse(http.StatusBadRequest, "Invalid class_id"))
			return
		}
	}

	var classSpec *int64
	if v := strings.TrimSpace(c.Query("class_spec")); v != "" {
		if n, err := strconv.ParseInt(v, 10, 64); err == nil {
			classSpec = &n
		} else {
			c.JSON(http.StatusBadRequest, apiErrors.NewErrorResponse(http.StatusBadRequest, "Invalid class_spec"))
			return
		}
	}

	// Build base query joining encounters
	q := db.Table("actor_encounter_stats").Select("actor_encounter_stats.name, actor_encounter_stats.actor_id, actor_encounter_stats.class_id, actor_encounter_stats.class_spec, actor_encounter_stats.dps, actor_encounter_stats.encounter_id, encounters.scene_name, encounters.started_at").
		Joins("JOIN encounters ON encounters.id = actor_encounter_stats.encounter_id").
		Where("actor_encounter_stats.is_player = ?", true).
		Where("LOWER(encounters.scene_name) = LOWER(?)", sceneName)

	if classID != nil {
		q = q.Where("actor_encounter_stats.class_id = ?", *classID)
	}
	if classSpec != nil {
		q = q.Where("actor_encounter_stats.class_spec = ?", *classSpec)
	}

	var rows []PlayerTopRow
	if err := q.Order("actor_encounter_stats.dps DESC").Limit(10).Find(&rows).Error; err != nil {
		c.JSON(http.StatusInternalServerError, apiErrors.NewErrorResponse(http.StatusInternalServerError, "Failed to query top players", err.Error()))
		return
	}

	c.JSON(http.StatusOK, GetTop10PlayersResponse{Players: rows})
}

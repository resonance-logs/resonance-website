package player

import (
	"net/http"
	"strconv"
	"strings"
	"time"

	apiErrors "server/controller"
	"server/models"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type PlayerTopRow struct {
	models.ActorEncounterStat
	HPS       *float64   `json:"hps,omitempty"`
	SceneName *string    `json:"sceneName,omitempty"`
	StartedAt *time.Time `json:"startedAt,omitempty"`
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

	// Build base query joining encounters. Use Model so GORM knows the destination
	// model and can map selected columns into the embedded struct fields.
	q := db.Model(&models.ActorEncounterStat{}).
		Joins("JOIN encounters ON encounters.id = actor_encounter_stats.encounter_id").
		Where("actor_encounter_stats.is_player = ?", true).
		Where("LOWER(encounters.scene_name) = LOWER(?)", sceneName).
		Where("actor_encounter_stats.name IS NOT NULL AND actor_encounter_stats.name <> ''")

	if classID != nil {
		q = q.Where("actor_encounter_stats.class_id = ?", *classID)
	}
	if classSpec != nil {
		q = q.Where("actor_encounter_stats.class_spec = ?", *classSpec)
	}

	// ability_score range: expect format "min,max" where either side can be omitted
	if v := strings.TrimSpace(c.Query("ability_score")); v != "" {
		parts := strings.Split(v, ",")
		if len(parts) >= 1 {
			if s := strings.TrimSpace(parts[0]); s != "" {
				if n, err := strconv.ParseInt(s, 10, 64); err == nil {
					q = q.Where("actor_encounter_stats.ability_score >= ?", n)
				} else {
					c.JSON(http.StatusBadRequest, apiErrors.NewErrorResponse(http.StatusBadRequest, "Invalid ability_score min value"))
					return
				}
			}
		}
		if len(parts) >= 2 {
			if s := strings.TrimSpace(parts[1]); s != "" {
				if n, err := strconv.ParseInt(s, 10, 64); err == nil {
					q = q.Where("actor_encounter_stats.ability_score <= ?", n)
				} else {
					c.JSON(http.StatusBadRequest, apiErrors.NewErrorResponse(http.StatusBadRequest, "Invalid ability_score max value"))
					return
				}
			}
		}
	}

	// duration range on encounters: expect format "min,max" (seconds)
	if v := strings.TrimSpace(c.Query("duration")); v != "" {
		parts := strings.Split(v, ",")
		if len(parts) >= 1 {
			if s := strings.TrimSpace(parts[0]); s != "" {
				if f, err := strconv.ParseFloat(s, 64); err == nil {
					q = q.Where("encounters.duration >= ?", f)
				} else {
					c.JSON(http.StatusBadRequest, apiErrors.NewErrorResponse(http.StatusBadRequest, "Invalid duration min value"))
					return
				}
			}
		}
		if len(parts) >= 2 {
			if s := strings.TrimSpace(parts[1]); s != "" {
				if f, err := strconv.ParseFloat(s, 64); err == nil {
					q = q.Where("encounters.duration <= ?", f)
				} else {
					c.JSON(http.StatusBadRequest, apiErrors.NewErrorResponse(http.StatusBadRequest, "Invalid duration max value"))
					return
				}
			}
		}
	}

	// Optional numeric filters for DPS and HPS
	hasDPSFilter := false
	hasHPSFilter := false
	var dpsVal float64
	var hpsVal float64
	if v := strings.TrimSpace(c.Query("dps")); v != "" {
		if f, err := strconv.ParseFloat(v, 64); err == nil {
			dpsVal = f
			hasDPSFilter = true
			q = q.Where("actor_encounter_stats.dps >= ?", dpsVal)
		} else {
			c.JSON(http.StatusBadRequest, apiErrors.NewErrorResponse(http.StatusBadRequest, "Invalid dps value"))
			return
		}
	}
	if v := strings.TrimSpace(c.Query("hps")); v != "" {
		if f, err := strconv.ParseFloat(v, 64); err == nil {
			hpsVal = f
			hasHPSFilter = true
			// compute hps as heal_dealt / encounters.duration (guard against zero duration)
			hpsExpr := "(CASE WHEN encounters.duration > 0 THEN CAST(actor_encounter_stats.heal_dealt AS double precision) / encounters.duration ELSE 0 END)"
			q = q.Where(hpsExpr+" >= ?", hpsVal)
		} else {
			c.JSON(http.StatusBadRequest, apiErrors.NewErrorResponse(http.StatusBadRequest, "Invalid hps value"))
			return
		}
	}

	// Adjust ordering: if only hps filter provided, order by computed hps, otherwise default to dps
	orderExpr := "actor_encounter_stats.dps DESC"
	if hasHPSFilter && !hasDPSFilter {
		orderExpr = "(CASE WHEN encounters.duration > 0 THEN CAST(actor_encounter_stats.heal_dealt AS double precision) / encounters.duration ELSE 0 END) DESC"
	}

	// Select all actor columns plus encounter scene/start and computed HPS.
	// Alias encounter columns explicitly so mapping to `PlayerTopRow` fields is deterministic.
	q = q.Select("actor_encounter_stats.*, encounters.scene_name AS scene_name, encounters.started_at AS started_at, (CASE WHEN encounters.duration > 0 THEN CAST(actor_encounter_stats.heal_dealt AS double precision) / encounters.duration ELSE 0 END) AS hps")

	var rows []PlayerTopRow
	if err := q.Order(orderExpr).Limit(10).Find(&rows).Error; err != nil {
		c.JSON(http.StatusInternalServerError, apiErrors.NewErrorResponse(http.StatusInternalServerError, "Failed to query top players", err.Error()))
		return
	}

	c.JSON(http.StatusOK, GetTop10PlayersResponse{Players: rows})
}

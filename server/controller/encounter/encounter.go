package encounter

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"net/http"
	"sort"
	"strconv"
	"strings"
	"time"

	"server/cache"
	apiErrors "server/controller"
	"server/models"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type GetEncountersResponse struct {
	Encounters []models.Encounter `json:"encounters"`
	Count      int64              `json:"count"`
}

// GET /api/v1/encounter
func GetEncounters(c *gin.Context) {
	dbAny, ok := c.Get("db")
	if !ok {
		c.JSON(http.StatusInternalServerError, apiErrors.NewErrorResponse(http.StatusInternalServerError, "Database not available in context"))
		return
	}
	db := dbAny.(*gorm.DB)

	// Params
	limit := 30
	if v := c.Query("limit"); v != "" {
		if n, err := strconv.Atoi(v); err == nil && n > 0 && n <= 200 {
			limit = n
		}
	}
	offset := 0
	if v := c.Query("offset"); v != "" {
		if n, err := strconv.Atoi(v); err == nil && n >= 0 {
			offset = n
		}
	}
	orderBy := strings.ToLower(c.DefaultQuery("orderBy", "duration"))
	sortDir := strings.ToLower(c.DefaultQuery("sort", "asc"))
	if sortDir != "asc" && sortDir != "desc" {
		sortDir = "asc"
	}

	// Build filter base
	base := db.Model(&models.Encounter{})

	// Simple filters using GORM's Where
	if userID := c.Query("user_id"); userID != "" {
		base = base.Where("encounters.user_id = ?", userID)
	}
	if sceneID := c.Query("scene_id"); sceneID != "" {
		base = base.Where("encounters.scene_id = ?", sceneID)
	}
	if sceneName := c.Query("scene_name"); sceneName != "" {
		base = base.Where("LOWER(encounters.scene_name) = LOWER(?)", sceneName)
	}

	// Filters requiring joins - use GORM's Joins for better query building
	if monsterName := c.Query("monster_name"); monsterName != "" {
		base = base.Joins("JOIN encounter_bosses ON encounter_bosses.encounter_id = encounters.id").
			Where("LOWER(encounter_bosses.monster_name) = LOWER(?)", monsterName).
			Distinct()
	}
	if classID := c.Query("class_id"); classID != "" {
		base = base.Joins("JOIN actor_encounter_stats ON actor_encounter_stats.encounter_id = encounters.id").
			Where("actor_encounter_stats.class_id = ?", classID).
			Distinct()
	}
	if classSpec := c.Query("class_spec"); classSpec != "" {
		base = base.Joins("JOIN actor_encounter_stats ON actor_encounter_stats.encounter_id = encounters.id").
			Where("actor_encounter_stats.class_spec = ?", classSpec).
			Distinct()
	}
	if playerName := c.Query("player_name"); playerName != "" {
		base = base.Joins("JOIN actor_encounter_stats ON actor_encounter_stats.encounter_id = encounters.id").
			Where("LOWER(actor_encounter_stats.name) LIKE LOWER(?)", "%"+playerName+"%").
			Distinct()
	}

	// Build a deterministic cache key based on the request's canonicalized query params
	// Collect and sort query params to produce a canonical string
	q := c.Request.URL.Query()
	keys := make([]string, 0, len(q))
	for k := range q {
		keys = append(keys, k)
	}
	sort.Strings(keys)
	var parts []string
	for _, k := range keys {
		vals := q[k]
		sort.Strings(vals)
		parts = append(parts, k+"="+strings.Join(vals, ","))
	}
	canonical := c.FullPath() + "?" + strings.Join(parts, "&")
	h := sha256.Sum256([]byte(canonical))
	hash := hex.EncodeToString(h[:])

	// include a version key so we can invalidate cheaply from writers
	var versionStr string
	if cacheAny, ok := c.Get("cache"); ok {
		if cc, ok := cacheAny.(cache.Cache); ok {
			if b, found, _ := cc.Get(c.Request.Context(), cache.VersionKey("encounter")); found {
				versionStr = string(b)
			} else {
				versionStr = "0"
			}
		}
	} else {
		versionStr = "0"
	}

	cacheKey := "encounters:v" + versionStr + ":list:" + hash

	// TTL for listing responses - short lived
	ttl := 30 * time.Second

	// Try to get or compute via cache. The loader executes the DB work and returns JSON bytes.
	if cacheAny, ok := c.Get("cache"); ok {
		if cc, ok := cacheAny.(cache.Cache); ok {
			data, err := cc.GetOrCompute(c.Request.Context(), cacheKey, ttl, func() ([]byte, error) {
				// Count before pagination
				var total int64
				if err := base.Count(&total).Error; err != nil {
					return nil, err
				}

				sortDirUpper := strings.ToUpper(sortDir)

				// Order using GORM's clause builder where possible
				switch orderBy {
				case "dps":
				case "date", "startedat":
					base = base.Order("encounters.started_at " + sortDirUpper)
				default: // duration
					base = base.Order("encounters.duration " + sortDirUpper)
				}

				// Fetch encounters with preloaded relationships in a single query
				var encs []models.Encounter
				if err := base.Limit(limit).Offset(offset).
					Preload("Bosses").
					Preload("Players", func(db *gorm.DB) *gorm.DB {
						return db.Where("actor_encounter_stats.is_player = ?", true)
					}).
					Preload("User", func(db *gorm.DB) *gorm.DB {
						return db.Select("id", "discord_username", "discord_global_name", "discord_avatar_url")
					}).
					Find(&encs).Error; err != nil {
					return nil, err
				}

				resp := GetEncountersResponse{Encounters: encs, Count: total}
				return json.Marshal(resp)
			})
			if err != nil {
				c.JSON(http.StatusInternalServerError, apiErrors.NewErrorResponse(http.StatusInternalServerError, "Failed to query encounters", err.Error()))
				return
			}
			// success - return bytes as JSON
			c.Data(http.StatusOK, "application/json; charset=utf-8", data)
			return
		}
	}

	// Fallback to original non-cached path if cache not available
	var total int64
	if err := base.Count(&total).Error; err != nil {
		c.JSON(http.StatusInternalServerError, apiErrors.NewErrorResponse(http.StatusInternalServerError, "Failed to count encounters", err.Error()))
		return
	}

	sortDirUpper := strings.ToUpper(sortDir)
	switch orderBy {
	case "dps":
	case "date", "startedat":
		base = base.Order("encounters.started_at " + sortDirUpper)
	default:
		base = base.Order("encounters.duration " + sortDirUpper)
	}

	var encs []models.Encounter
	if err := base.Limit(limit).Offset(offset).
		Preload("Bosses").
		Preload("Players", func(db *gorm.DB) *gorm.DB {
			return db.Where("actor_encounter_stats.is_player = ?", true)
		}).
		Preload("User", func(db *gorm.DB) *gorm.DB {
			return db.Select("id", "discord_username", "discord_global_name", "discord_avatar_url")
		}).
		Find(&encs).Error; err != nil {
		c.JSON(http.StatusInternalServerError, apiErrors.NewErrorResponse(http.StatusInternalServerError, "Failed to query encounters", err.Error()))
		return
	}

	c.JSON(http.StatusOK, GetEncountersResponse{Encounters: encs, Count: total})
}

type GetEncounterByIDResponse struct {
	Encounter models.Encounter `json:"encounter"`
}

// GET /api/v1/encounter/:id
func GetEncounterByID(c *gin.Context) {
	dbAny, ok := c.Get("db")
	if !ok {
		c.JSON(http.StatusInternalServerError, apiErrors.NewErrorResponse(http.StatusInternalServerError, "Database not available in context"))
		return
	}
	db := dbAny.(*gorm.DB)

	id := c.Param("id")

	var enc models.Encounter
	// Return the raw model. preload common relations so JSON has nested data.
	if err := db.
		Preload("Bosses").
		Preload("Players", func(db *gorm.DB) *gorm.DB {
			return db.Where("actor_encounter_stats.is_player = ?", true)
		}).
		Preload("Attempts").
		Preload("DeathEvents").
		Preload("User").
		Where("id = ?", id).
		First(&enc).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, apiErrors.NewErrorResponse(http.StatusNotFound, "Encounter not found"))
			return
		}
		c.JSON(http.StatusInternalServerError, apiErrors.NewErrorResponse(http.StatusInternalServerError, "Failed to load encounter", err.Error()))
		return
	}

	c.JSON(http.StatusOK, GetEncounterByIDResponse{Encounter: enc})
}

type GetEncounterScenesResponse struct {
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
	c.JSON(http.StatusOK, GetEncounterScenesResponse{Scenes: rows})
}

type GetEncounterPlayerSkillStatsResponse struct {
	DamageSkillStats []models.DamageSkillStat `json:"damageSkillStats"`
	HealSkillStats   []models.HealSkillStat   `json:"healSkillStats"`
}

// GET /api/v1/encounter/:id/:playerId
func GetPlayerSkillStats(c *gin.Context) {
	dbAny, ok := c.Get("db")
	if !ok {
		c.JSON(http.StatusInternalServerError, apiErrors.NewErrorResponse(http.StatusInternalServerError, "Database not available in context"))
		return
	}
	db := dbAny.(*gorm.DB)

	idStr := c.Param("id")
	playerStr := c.Param("playerId")

	// validate params
	if idStr == "" || playerStr == "" {
		c.JSON(http.StatusBadRequest, apiErrors.NewErrorResponse(http.StatusBadRequest, "Missing id or playerId"))
		return
	}

	// parse to int64
	encID, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, apiErrors.NewErrorResponse(http.StatusBadRequest, "Invalid encounter id", err.Error()))
		return
	}
	playerID, err := strconv.ParseInt(playerStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, apiErrors.NewErrorResponse(http.StatusBadRequest, "Invalid playerId", err.Error()))
		return
	}

	// Query damage skill stats grouped by skill_id with aggregated values
	var dmgStats []models.DamageSkillStat
	if err := db.Table("damage_skill_stats").
		Select("skill_id, "+
			"SUM(hits) as hits, "+
			"SUM(total_value) as total_value, "+
			"SUM(crit_hits) as crit_hits, "+
			"SUM(lucky_hits) as lucky_hits, "+
			"SUM(crit_total) as crit_total, "+
			"SUM(lucky_total) as lucky_total ").
		Where("encounter_id = ? AND attacker_id = ?", encID, playerID).
		Group("skill_id").
		Find(&dmgStats).Error; err != nil {
		c.JSON(http.StatusInternalServerError, apiErrors.NewErrorResponse(http.StatusInternalServerError, "Failed to query damage skill stats", err.Error()))
		return
	}

	// Query heal skill stats grouped by skill_id with aggregated values
	var healStats []models.HealSkillStat
	if err := db.Table("heal_skill_stats").
		Select("skill_id, "+
			"SUM(hits) as hits, "+
			"SUM(total_value) as total_value, "+
			"SUM(crit_hits) as crit_hits, "+
			"SUM(lucky_hits) as lucky_hits, "+
			"SUM(crit_total) as crit_total, "+
			"SUM(lucky_total) as lucky_total ").
		Where("encounter_id = ? AND healer_id = ?", encID, playerID).
		Group("skill_id").
		Find(&healStats).Error; err != nil {
		c.JSON(http.StatusInternalServerError, apiErrors.NewErrorResponse(http.StatusInternalServerError, "Failed to query heal skill stats", err.Error()))
		return
	}

	c.JSON(http.StatusOK, GetEncounterPlayerSkillStatsResponse{DamageSkillStats: dmgStats, HealSkillStats: healStats})
}

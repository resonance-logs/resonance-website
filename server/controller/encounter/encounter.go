package encounter

import (
	"fmt"
	"net/http"
	"strconv"
	"strings"

	apiErrors "server/controller"
	"server/models"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// CLASS_MAP maps class IDs to class names for anonymization
var CLASS_MAP = map[int64]string{
	1:  "Stormblade",
	2:  "Frost Mage",
	4:  "Wind Knight",
	5:  "Verdant Oracle",
	9:  "Heavy Guardian",
	11: "Marksman",
	12: "Shield Knight",
	13: "Beat Performer",
}

// anonymizePlayers replaces player names with "{ClassName} #N" and remaps actorIds sequentially
// Returns the anonymized players and a mapping from old actorId to new actorId
func anonymizePlayers(players []models.ActorEncounterStat) ([]models.ActorEncounterStat, map[int64]int64) {
	// Create a mapping from old actorId to new sequential actorId
	actorIdMap := make(map[int64]int64)
	nextId := int64(1)

	// First pass: build the mapping
	for _, p := range players {
		if _, exists := actorIdMap[p.ActorID]; !exists {
			actorIdMap[p.ActorID] = nextId
			nextId++
		}
	}

	// Track count per class for naming
	classCount := make(map[int64]int)

	// Second pass: anonymize
	result := make([]models.ActorEncounterStat, len(players))
	for i, p := range players {
		result[i] = p

		// Get class name
		className := "Player"
		if p.ClassID != nil {
			if name, ok := CLASS_MAP[*p.ClassID]; ok {
				className = name
			}
		}

		// Increment class count and create anonymous name
		classKey := int64(0)
		if p.ClassID != nil {
			classKey = *p.ClassID
		}
		classCount[classKey]++
		anonymousName := fmt.Sprintf("%s #%d", className, classCount[classKey])
		result[i].Name = &anonymousName

		// Remap actorId
		result[i].ActorID = actorIdMap[p.ActorID]
	}

	return result, actorIdMap
}

// anonymizeDamageSkillStats remaps attacker IDs in damage skill stats using the provided mapping
func anonymizeDamageSkillStats(stats []models.DamageSkillStat, actorIdMap map[int64]int64) []models.DamageSkillStat {
	result := make([]models.DamageSkillStat, len(stats))
	for i, s := range stats {
		result[i] = s
		if newId, ok := actorIdMap[s.AttackerID]; ok {
			result[i].AttackerID = newId
		}
	}
	return result
}

// anonymizeHealSkillStats remaps healer IDs in heal skill stats using the provided mapping
func anonymizeHealSkillStats(stats []models.HealSkillStat, actorIdMap map[int64]int64) []models.HealSkillStat {
	result := make([]models.HealSkillStat, len(stats))
	for i, s := range stats {
		result[i] = s
		if newId, ok := actorIdMap[s.HealerID]; ok {
			result[i].HealerID = newId
		}
		if s.TargetID != nil {
			if newId, ok := actorIdMap[*s.TargetID]; ok {
				result[i].TargetID = &newId
			}
		}
	}
	return result
}

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

	// Get the requesting user (if authenticated) to handle ownership checks
	var requestingUserID uint
	if userAny, exists := c.Get("user"); exists {
		if reqUser, ok := userAny.(*models.User); ok {
			requestingUserID = reqUser.ID
		}
	}

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
		// Join with users table to check anonymize_players setting
		// Exclude encounters where uploader has anonymize_players enabled (unless requester is the owner)
		base = base.Joins("JOIN actor_encounter_stats ON actor_encounter_stats.encounter_id = encounters.id").
			Joins("LEFT JOIN users ON users.id = encounters.user_id").
			Where("LOWER(actor_encounter_stats.name) LIKE LOWER(?)", "%"+playerName+"%").
			Where("(users.anonymize_players = false OR users.anonymize_players IS NULL OR encounters.user_id = ?)", requestingUserID).
			Distinct()
	}

	// Count before pagination
	var total int64
	if err := base.Count(&total).Error; err != nil {
		c.JSON(http.StatusInternalServerError, apiErrors.NewErrorResponse(http.StatusInternalServerError, "Failed to count encounters", err.Error()))
		return
	}

	sortDirUpper := strings.ToUpper(sortDir)

	// Order using GORM's clause builder where possible
	switch orderBy {
	case "dps":
		// For complex expressions, we still need raw SQL
		// I assume this doesn't work so im commenting it out
		// base = base.Order(gorm.Expr("CASE WHEN EXTRACT(EPOCH FROM (COALESCE(ended_at, NOW()) - started_at)) > 0 THEN total_dmg / EXTRACT(EPOCH FROM (COALESCE(ended_at, NOW()) - started_at)) ELSE 0 END " + sortDir))
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
			return db.Select("id", "discord_username", "discord_global_name", "discord_avatar_url", "anonymize_uploader", "anonymize_players")
		}).
		Find(&encs).Error; err != nil {
		c.JSON(http.StatusInternalServerError, apiErrors.NewErrorResponse(http.StatusInternalServerError, "Failed to query encounters", err.Error()))
		return
	}

	// Anonymize user data and player data based on user settings
	// Skip anonymization if the requesting user owns the encounter
	for i := range encs {
		if encs[i].User != nil {
			// Skip anonymization for the owner's own encounters
			if encs[i].User.ID == requestingUserID {
				continue
			}

			// Anonymize players if enabled
			if encs[i].User.AnonymizePlayers && len(encs[i].Players) > 0 {
				encs[i].Players, _ = anonymizePlayers(encs[i].Players)
			}

			// Anonymize uploader if enabled
			if encs[i].User.AnonymizeUploader {
				encs[i].User = &models.User{
					ID:              encs[i].User.ID,
					DiscordUsername: "Anonymous",
				}
			}
		}
	}

	c.JSON(http.StatusOK, GetEncountersResponse{Encounters: encs, Count: total})
}

type GetEncounterByIDResponse struct {
	Encounter        models.Encounter         `json:"encounter"`
	DamageSkillStats []models.DamageSkillStat `json:"damageSkillStats"`
	HealSkillStats   []models.HealSkillStat   `json:"healSkillStats"`
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
		Preload("DungeonSegments").
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

	// Get the requesting user (if authenticated) to skip anonymization for their own encounters
	var requestingUserID uint
	if userAny, exists := c.Get("user"); exists {
		if reqUser, ok := userAny.(*models.User); ok {
			requestingUserID = reqUser.ID
		}
	}

	// Anonymize user data and player data based on user settings
	// Skip anonymization if the requesting user owns the encounter
	var actorIdMap map[int64]int64
	isOwner := enc.User != nil && enc.User.ID == requestingUserID
	shouldAnonymizePlayers := !isOwner && enc.User != nil && enc.User.AnonymizePlayers && len(enc.Players) > 0

	if enc.User != nil && !isOwner {
		// Anonymize players if enabled
		if shouldAnonymizePlayers {
			enc.Players, actorIdMap = anonymizePlayers(enc.Players)
		}

		// Anonymize uploader if enabled
		if enc.User.AnonymizeUploader {
			enc.User = &models.User{
				ID:              enc.User.ID,
				DiscordUsername: "Anonymous",
			}
		}
	}

	var dmgStats []models.DamageSkillStat
	if err := db.Table("damage_skill_stats").
		Where("encounter_id = ?", enc.ID).
		Find(&dmgStats).Error; err != nil {
		c.JSON(http.StatusInternalServerError, apiErrors.NewErrorResponse(http.StatusInternalServerError, "Failed to load damage skill stats", err.Error()))
		return
	}

	var healStats []models.HealSkillStat
	if err := db.Table("heal_skill_stats").
		Where("encounter_id = ?", enc.ID).
		Find(&healStats).Error; err != nil {
		c.JSON(http.StatusInternalServerError, apiErrors.NewErrorResponse(http.StatusInternalServerError, "Failed to load heal skill stats", err.Error()))
		return
	}

	// Anonymize skill stats if player anonymization is enabled
	if shouldAnonymizePlayers && actorIdMap != nil {
		dmgStats = anonymizeDamageSkillStats(dmgStats, actorIdMap)
		healStats = anonymizeHealSkillStats(healStats, actorIdMap)
	}

	c.JSON(http.StatusOK, GetEncounterByIDResponse{Encounter: enc, DamageSkillStats: dmgStats, HealSkillStats: healStats})
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

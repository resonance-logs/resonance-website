package encounter

import (
	"net/http"
	"strconv"

	apiErrors "server/controller"
	"server/models"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type GetMyEncountersResponse struct {
	Encounters []models.Encounter `json:"encounters"`
	Count      int64              `json:"count"`
}

// GET /api/v1/my-encounter
// Returns encounters owned by the authenticated user (un-anonymized)
func GetMyEncounters(c *gin.Context) {
	dbAny, ok := c.Get("db")
	if !ok {
		c.JSON(http.StatusInternalServerError, apiErrors.NewErrorResponse(http.StatusInternalServerError, "Database not available in context"))
		return
	}
	db := dbAny.(*gorm.DB)

	// Get authenticated user (required)
	userAny, exists := c.Get("user")
	if !exists {
		c.JSON(http.StatusUnauthorized, apiErrors.NewErrorResponse(http.StatusUnauthorized, "Authentication required"))
		return
	}
	reqUser, ok := userAny.(*models.User)
	if !ok || reqUser == nil {
		c.JSON(http.StatusUnauthorized, apiErrors.NewErrorResponse(http.StatusUnauthorized, "Authentication required"))
		return
	}
	userID := reqUser.ID

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

	sortByAllowed := map[string]string{
		"dps":       "encounters.total_dmg DESC",
		"date":      "encounters.started_at DESC",
		"startedAt": "encounters.started_at",
		"duration":  "encounters.duration",
	}
	sortBy := "encounters.started_at"
	if v := c.Query("orderBy"); v != "" {
		if col, ok := sortByAllowed[v]; ok {
			sortBy = col
		}
	}
	sortDir := "DESC"
	if v := c.Query("sort"); v == "asc" {
		sortDir = "ASC"
	}

	// Base query: encounters owned by this user (uploader OR in encounter_owners)
	base := db.Model(&models.Encounter{}).
		Where("encounters.user_id = ? OR encounters.id IN (SELECT encounter_id FROM encounter_owners WHERE user_id = ?)", userID, userID)

	// Optional filters
	if sceneID := c.Query("scene_id"); sceneID != "" {
		base = base.Where("encounters.scene_id = ?", sceneID)
	}
	if sceneName := c.Query("scene_name"); sceneName != "" {
		base = base.Where("LOWER(encounters.scene_name) = LOWER(?)", sceneName)
	}

	// maxHp: filter by encounters with at least one boss having the specified max_hp
	if maxHp := c.Query("maxHp"); maxHp != "" {
		if hp, err := strconv.ParseInt(maxHp, 10, 64); err == nil {
			base = base.Where("EXISTS (SELECT 1 FROM encounter_bosses eb WHERE eb.encounter_id = encounters.id AND eb.max_hp = ?)", hp)
		}
	}

	// Count before pagination
	var total int64
	if err := base.Count(&total).Error; err != nil {
		c.JSON(http.StatusInternalServerError, apiErrors.NewErrorResponse(http.StatusInternalServerError, "Failed to count encounters", err.Error()))
		return
	}

	var encs []models.Encounter
	if err := base.
		Preload("Bosses").
		Preload("Players", func(db *gorm.DB) *gorm.DB {
			return db.Where("actor_encounter_stats.is_player = ?", true)
		}).
		Order(sortBy + " " + sortDir).
		Limit(limit).
		Offset(offset).
		Find(&encs).Error; err != nil {
		c.JSON(http.StatusInternalServerError, apiErrors.NewErrorResponse(http.StatusInternalServerError, "Failed to query encounters", err.Error()))
		return
	}

	// Enrich player data and attach current user (no anonymization since user owns these)
	// First, gather encounter IDs to batch-query encounter_owners for the requesting user
	encIDs := make([]int64, len(encs))
	for i := range encs {
		encIDs[i] = encs[i].ID
	}

	// Query encounter_owners for the requesting user for all these encounters
	var owners []models.EncounterOwner
	if len(encIDs) > 0 {
		db.Where("user_id = ? AND encounter_id IN ?", userID, encIDs).Find(&owners)
	}
	// Build a map: encounterID -> localPlayerID (if present)
	ownerLocalPlayerMap := make(map[int64]*int64)
	for _, o := range owners {
		ownerLocalPlayerMap[o.EncounterID] = o.LocalPlayerID
	}

	for i := range encs {
		encs[i].User = reqUser
		if len(encs[i].Players) > 0 {
			if err := attachPlayerUsers(db, encs[i].Players); err != nil {
				c.JSON(http.StatusInternalServerError, apiErrors.NewErrorResponse(http.StatusInternalServerError, "Failed to load player identities", err.Error()))
				return
			}
		}
		// Override IsLocalPlayer based on encounter_owner's LocalPlayerID
		if localPlayerID, ok := ownerLocalPlayerMap[encs[i].ID]; ok && localPlayerID != nil {
			encs[i].LocalPlayerID = localPlayerID
			for j := range encs[i].Players {
				encs[i].Players[j].IsLocalPlayer = (encs[i].Players[j].ActorID == *localPlayerID)
			}
		}
	}

	c.JSON(http.StatusOK, GetMyEncountersResponse{Encounters: encs, Count: total})
}

type GetMyEncounterByIDResponse struct {
	Encounter        models.Encounter          `json:"encounter"`
	DamageSkillStats []models.DamageSkillStat  `json:"damageSkillStats"`
	HealSkillStats   []models.HealSkillStat    `json:"healSkillStats"`
	EncounterBuffs   []EncounterEntityBuffsDto `json:"encounter_buffs,omitempty"`
}

// GET /api/v1/my-encounter/:id
// Returns a single encounter owned by the authenticated user (un-anonymized)
func GetMyEncounterByID(c *gin.Context) {
	dbAny, ok := c.Get("db")
	if !ok {
		c.JSON(http.StatusInternalServerError, apiErrors.NewErrorResponse(http.StatusInternalServerError, "Database not available in context"))
		return
	}
	db := dbAny.(*gorm.DB)

	// Get authenticated user (required)
	userAny, exists := c.Get("user")
	if !exists {
		c.JSON(http.StatusUnauthorized, apiErrors.NewErrorResponse(http.StatusUnauthorized, "Authentication required"))
		return
	}
	reqUser, ok := userAny.(*models.User)
	if !ok || reqUser == nil {
		c.JSON(http.StatusUnauthorized, apiErrors.NewErrorResponse(http.StatusUnauthorized, "Authentication required"))
		return
	}
	userID := reqUser.ID

	id := c.Param("id")

	var enc models.Encounter
	if err := db.
		Preload("Bosses").
		Preload("Players", func(db *gorm.DB) *gorm.DB {
			return db.Where("actor_encounter_stats.is_player = ?", true)
		}).
		Preload("Attempts").
		Preload("DeathEvents").
		Preload("DungeonSegments").
		Where("id = ?", id).
		First(&enc).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, apiErrors.NewErrorResponse(http.StatusNotFound, "Encounter not found"))
			return
		}
		c.JSON(http.StatusInternalServerError, apiErrors.NewErrorResponse(http.StatusInternalServerError, "Failed to load encounter", err.Error()))
		return
	}

	// Check ownership via user_id or encounter_owners table
	isOwner := (enc.UserID == userID) || isUserEncounterOwner(db, enc.ID, userID)
	if !isOwner {
		c.JSON(http.StatusForbidden, apiErrors.NewErrorResponse(http.StatusForbidden, "You do not own this encounter"))
		return
	}

	// Attach current user
	enc.User = reqUser

	// Enrich player data (no anonymization since user owns this)
	if len(enc.Players) > 0 {
		if err := attachPlayerUsers(db, enc.Players); err != nil {
			c.JSON(http.StatusInternalServerError, apiErrors.NewErrorResponse(http.StatusInternalServerError, "Failed to load player identities", err.Error()))
			return
		}
	}

	// Override IsLocalPlayer based on encounter_owner's LocalPlayerID for the requesting user
	var owner models.EncounterOwner
	if err := db.Where("user_id = ? AND encounter_id = ?", userID, enc.ID).First(&owner).Error; err == nil && owner.LocalPlayerID != nil {
		enc.LocalPlayerID = owner.LocalPlayerID
		for i := range enc.Players {
			enc.Players[i].IsLocalPlayer = (enc.Players[i].ActorID == *owner.LocalPlayerID)
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

	// Load encounter buffs
	var encounterBuffs []models.EncounterBuff
	if err := db.Table("encounter_buffs").
		Where("encounter_id = ?", enc.ID).
		Find(&encounterBuffs).Error; err != nil {
		c.JSON(http.StatusInternalServerError, apiErrors.NewErrorResponse(http.StatusInternalServerError, "Failed to load encounter buffs", err.Error()))
		return
	}

	c.JSON(http.StatusOK, GetMyEncounterByIDResponse{
		Encounter:        enc,
		DamageSkillStats: dmgStats,
		HealSkillStats:   healStats,
		EncounterBuffs:   groupBuffsByEntity(encounterBuffs),
	})
}

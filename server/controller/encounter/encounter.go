package encounter

import (
	"encoding/json"
	"fmt"
	"net/http"
	"sort"
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

// attachPlayerUsers enriches player stats with linked user info when we can map player names to stored player data.
func attachPlayerUsers(db *gorm.DB, players []models.ActorEncounterStat) error {
	if len(players) == 0 {
		return nil
	}

	nameSet := make(map[string]struct{})
	names := make([]string, 0, len(players))
	for _, p := range players {
		if p.Name == nil {
			continue
		}
		name := strings.TrimSpace(*p.Name)
		if name == "" {
			continue
		}
		if _, exists := nameSet[name]; exists {
			continue
		}
		nameSet[name] = struct{}{}
		names = append(names, name)
	}

	if len(names) == 0 {
		return nil
	}

	type playerNameToUser struct {
		PlayerName string
		UserID     uint
	}

	var mappings []playerNameToUser
	if err := db.
		Table("detailed_playerdata").
		Select("player_name", "user_id").
		Where("player_name IN ? AND user_id IS NOT NULL", names).
		Find(&mappings).Error; err != nil {
		return err
	}

	if len(mappings) == 0 {
		return nil
	}

	nameToUserID := make(map[string]uint, len(mappings))
	userIDSet := make(map[uint]struct{})
	for _, m := range mappings {
		nameToUserID[m.PlayerName] = m.UserID
		userIDSet[m.UserID] = struct{}{}
	}

	if len(userIDSet) == 0 {
		return nil
	}

	userIDs := make([]uint, 0, len(userIDSet))
	for id := range userIDSet {
		userIDs = append(userIDs, id)
	}

	var users []models.User
	if err := db.
		Model(&models.User{}).
		Select("id", "discord_username", "discord_global_name", "discord_avatar_url", "customization").
		Where("id IN ?", userIDs).
		Find(&users).Error; err != nil {
		return err
	}

	if len(users) == 0 {
		return nil
	}

	userByID := make(map[uint]models.User, len(users))
	for _, u := range users {
		userByID[u.ID] = u
	}

	for i := range players {
		if players[i].Name == nil {
			continue
		}
		name := strings.TrimSpace(*players[i].Name)
		if name == "" {
			continue
		}
		uid, ok := nameToUserID[name]
		if !ok {
			continue
		}
		if u, exists := userByID[uid]; exists {
			players[i].LinkedUser = &models.PlayerUser{
				ID:                u.ID,
				DiscordUsername:   u.DiscordUsername,
				DiscordGlobalName: u.DiscordGlobalName,
				DiscordAvatarURL:  u.DiscordAvatarURL,
				Customization:     u.Customization,
			}
		}
	}

	return nil
}

// isUserEncounterOwner checks if a user is an owner of an encounter.
// A user is an owner if they are the original uploader (UserID) or if they are in the encounter_owners table.
func isUserEncounterOwner(db *gorm.DB, encounterID int64, userID uint) bool {
	if userID == 0 {
		return false
	}

	// First check via pre-loaded owners (if available)
	// Otherwise query the database
	var count int64
	db.Model(&models.EncounterOwner{}).
		Where("encounter_id = ? AND user_id = ?", encounterID, userID).
		Count(&count)
	return count > 0
}

// resolveEncounterDisplay determines the main uploader based on rules:
// Public > Supported > Original
// It updates enc.User to the main uploader and anonymizes any users in the structure as needed
func resolveEncounterDisplay(enc *models.Encounter) {
	if enc == nil {
		return
	}

	// Collect all candidates
	uniqueUsers := make(map[uint]*models.User)
	if enc.User != nil {
		uniqueUsers[enc.UserID] = enc.User
	}
	for i := range enc.Owners {
		if enc.Owners[i].User != nil {
			uniqueUsers[enc.Owners[i].UserID] = enc.Owners[i].User
		}
	}

	if len(uniqueUsers) == 0 {
		return
	}

	candidates := make([]*models.User, 0, len(uniqueUsers))
	for _, u := range uniqueUsers {
		candidates = append(candidates, u)
	}

	// Sort candidates to find the Main Uploader
	sort.Slice(candidates, func(i, j int) bool {
		u1 := candidates[i]
		u2 := candidates[j]

		// 1. Anonymity (Public > Anonymous)
		// We want false < true (Public comes first) => !u1.AnonymizeUploader
		if u1.AnonymizeUploader != u2.AnonymizeUploader {
			return !u1.AnonymizeUploader
		}

		// 2. Amount Spent (High > Low)
		if u1.AmountSpentUSD != u2.AmountSpentUSD {
			return u1.AmountSpentUSD > u2.AmountSpentUSD
		}

		// 3. Original Uploader (True > False)
		isOriginal1 := u1.ID == enc.UserID
		isOriginal2 := u2.ID == enc.UserID
		if isOriginal1 != isOriginal2 {
			return isOriginal1
		}

		// Tie-breaker: ID
		return u1.ID < u2.ID
	})

	// Set main user
	enc.User = candidates[0]

	// Anonymize the main user if needed (although if they won, they likely aren't anon, unless all are)
	if enc.User.AnonymizeUploader {
		enc.User = &models.User{
			ID:              enc.User.ID,
			DiscordUsername: "Anonymous",
			Customization:   enc.User.Customization,
		}
	}

	// Anonymize sub-uploaders in the Owners list
	for i := range enc.Owners {
		if enc.Owners[i].User != nil && enc.Owners[i].User.AnonymizeUploader {
			enc.Owners[i].User = &models.User{
				ID:              enc.Owners[i].User.ID,
				DiscordUsername: "Anonymous",
				Customization:   enc.Owners[i].User.Customization,
			}
		}
	}
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

	// Simple filters using GORM's Where
	if userID := c.Query("user_id"); userID != "" {
		// Include encounters where the user is the uploader OR is in the encounter_owners table
		base = base.Where(
			"encounters.user_id = ? OR encounters.id IN (SELECT encounter_id FROM encounter_owners WHERE user_id = ?)",
			userID, userID,
		)
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
		// Exclude encounters where uploader has anonymize_players enabled
		base = base.Joins("JOIN actor_encounter_stats ON actor_encounter_stats.encounter_id = encounters.id").
			Joins("LEFT JOIN users ON users.id = encounters.user_id").
			Where("LOWER(actor_encounter_stats.name) LIKE LOWER(?)", "%"+playerName+"%").
			Where("(users.anonymize_players = false OR users.anonymize_players IS NULL)").
			Distinct()
	}

	// log_id: filter by encounter ID directly
	if logID := c.Query("log_id"); logID != "" {
		base = base.Where("encounters.id = ?", logID)
	}

	// user_search: filter by uploader's or co-owner's discord username/global name (respects anonymize_uploader)
	if userSearch := c.Query("user_search"); userSearch != "" {
		searchPattern := "%" + userSearch + "%"
		// Match encounters where either:
		// 1. The uploader matches and is not anonymous, OR
		// 2. A co-owner matches and is not anonymous
		base = base.Where(`(
			EXISTS (
				SELECT 1 FROM users u1 
				WHERE u1.id = encounters.user_id 
				AND (u1.anonymize_uploader = false OR u1.anonymize_uploader IS NULL)
				AND (LOWER(u1.discord_global_name) LIKE LOWER(?) OR LOWER(u1.discord_username) LIKE LOWER(?))
			)
			OR EXISTS (
				SELECT 1 FROM encounter_owners eo 
				JOIN users u2 ON u2.id = eo.user_id 
				WHERE eo.encounter_id = encounters.id 
				AND (u2.anonymize_uploader = false OR u2.anonymize_uploader IS NULL)
				AND (LOWER(u2.discord_global_name) LIKE LOWER(?) OR LOWER(u2.discord_username) LIKE LOWER(?))
			)
		)`, searchPattern, searchPattern, searchPattern, searchPattern)
	}

	// exclude_anonymous: if true, exclude encounters from uploaders with anonymize_uploader or anonymize_players enabled
	if excludeAnon := c.Query("exclude_anonymous"); excludeAnon == "true" {
		// Need to join users if not already joined
		base = base.Joins("LEFT JOIN users uploader ON uploader.id = encounters.user_id").
			Where("(uploader.anonymize_uploader = false OR uploader.anonymize_uploader IS NULL)").
			Where("(uploader.anonymize_players = false OR uploader.anonymize_players IS NULL)")
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
			return db.Select("id", "discord_username", "discord_global_name", "discord_avatar_url", "anonymize_uploader", "anonymize_players", "customization", "amount_spent_usd")
		}).
		Preload("Owners.User").
		Find(&encs).Error; err != nil {
		c.JSON(http.StatusInternalServerError, apiErrors.NewErrorResponse(http.StatusInternalServerError, "Failed to query encounters", err.Error()))
		return
	}

	// Enrich player data and anonymize when required by uploader settings
	for i := range encs {
		// Resolve multi-owner display first (determines encs[i].User)
		resolveEncounterDisplay(&encs[i])

		// Public routes: always apply anonymization based on uploader settings (no owner exception)
		shouldAnonymizePlayers := encs[i].User != nil && encs[i].User.AnonymizePlayers

		if !shouldAnonymizePlayers && len(encs[i].Players) > 0 {
			if err := attachPlayerUsers(db, encs[i].Players); err != nil {
				c.JSON(http.StatusInternalServerError, apiErrors.NewErrorResponse(http.StatusInternalServerError, "Failed to load player identities", err.Error()))
				return
			}
		}

		if encs[i].User != nil {
			if shouldAnonymizePlayers && len(encs[i].Players) > 0 {
				encs[i].Players, _ = anonymizePlayers(encs[i].Players)
			}
			// User Anonymization is handled inside resolveEncounterDisplay
		}
	}

	c.JSON(http.StatusOK, GetEncountersResponse{Encounters: encs, Count: total})
}

type GetEncounterByIDResponse struct {
	Encounter        models.Encounter          `json:"encounter"`
	DamageSkillStats []models.DamageSkillStat  `json:"damageSkillStats"`
	HealSkillStats   []models.HealSkillStat    `json:"healSkillStats"`
	EncounterBuffs   []EncounterEntityBuffsDto `json:"encounter_buffs,omitempty"`
}

// DTO types for grouped buff structure matching frontend expectations
type EncounterEntityBuffsDto struct {
	EntityUid  int64              `json:"entityUid"`
	EntityName string             `json:"entityName"`
	Buffs      []EncounterBuffDto `json:"buffs"`
}

type EncounterBuffDto struct {
	BuffId          int64           `json:"buffId"`
	BuffName        string          `json:"buffName"`
	BuffNameLong    *string         `json:"buffNameLong,omitempty"`
	TotalDurationMs int64           `json:"totalDurationMs"`
	Events          json.RawMessage `json:"events"`
}

// groupBuffsByEntity transforms flat EncounterBuff rows into grouped structure
func groupBuffsByEntity(buffs []models.EncounterBuff) []EncounterEntityBuffsDto {
	entityMap := make(map[int64]*EncounterEntityBuffsDto)

	for _, b := range buffs {
		entity, exists := entityMap[b.ActorID]
		if !exists {
			entityName := ""
			if b.EntityName != nil {
				entityName = *b.EntityName
			}
			entity = &EncounterEntityBuffsDto{
				EntityUid:  b.ActorID,
				EntityName: entityName,
				Buffs:      []EncounterBuffDto{},
			}
			entityMap[b.ActorID] = entity
		}

		buffName := ""
		if b.BuffName != nil {
			buffName = *b.BuffName
		}
		entity.Buffs = append(entity.Buffs, EncounterBuffDto{
			BuffId:          b.BuffID,
			BuffName:        buffName,
			BuffNameLong:    b.BuffNameLong,
			TotalDurationMs: b.TotalDurationMs,
			Events:          json.RawMessage(b.Events),
		})
	}

	result := make([]EncounterEntityBuffsDto, 0, len(entityMap))
	for _, entity := range entityMap {
		result = append(result, *entity)
	}
	return result
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
		Preload("Owners.User").
		Where("id = ?", id).
		First(&enc).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, apiErrors.NewErrorResponse(http.StatusNotFound, "Encounter not found"))
			return
		}
		c.JSON(http.StatusInternalServerError, apiErrors.NewErrorResponse(http.StatusInternalServerError, "Failed to load encounter", err.Error()))
		return
	}

	// Resolve multi-owner display
	resolveEncounterDisplay(&enc)

	// Public route: always apply anonymization based on uploader settings (no owner exception)
	var actorIdMap map[int64]int64
	shouldAnonymizePlayers := enc.User != nil && enc.User.AnonymizePlayers && len(enc.Players) > 0

	if !shouldAnonymizePlayers && len(enc.Players) > 0 {
		if err := attachPlayerUsers(db, enc.Players); err != nil {
			c.JSON(http.StatusInternalServerError, apiErrors.NewErrorResponse(http.StatusInternalServerError, "Failed to load player identities", err.Error()))
			return
		}
	}

	if enc.User != nil {
		// Anonymize players if enabled
		if shouldAnonymizePlayers {
			enc.Players, actorIdMap = anonymizePlayers(enc.Players)
		}
		// User Anonymization is handled inside resolveEncounterDisplay
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

	// Load encounter buffs
	var encounterBuffs []models.EncounterBuff
	if err := db.Table("encounter_buffs").
		Where("encounter_id = ?", enc.ID).
		Find(&encounterBuffs).Error; err != nil {
		c.JSON(http.StatusInternalServerError, apiErrors.NewErrorResponse(http.StatusInternalServerError, "Failed to load encounter buffs", err.Error()))
		return
	}

	c.JSON(http.StatusOK, GetEncounterByIDResponse{Encounter: enc, DamageSkillStats: dmgStats, HealSkillStats: healStats, EncounterBuffs: groupBuffsByEntity(encounterBuffs)})
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

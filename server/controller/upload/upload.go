package upload

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strconv"
	"strings"
	"time"

	apiErrors "server/controller"
	"server/lib"
	"server/models"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

// Minimum client version required for uploads
const MinClientVersion = "0.17.1"

// Buff payload safety limits
const (
	maxBuffEntitiesPerEncounter = 9999999
	maxBuffsPerEntity           = 9999999
	maxBuffEventsPerBuff        = 9999999
)

// addEncounterOwner adds a user as an owner of an encounter.
// Uses upsert semantics - if the user is already an owner, this is a no-op.
// If isOriginalUploader is true, it marks this user as the original uploader.
func addEncounterOwner(tx *gorm.DB, encounterID int64, userID uint, isOriginalUploader bool, localPlayerID *int64) error {
	owner := models.EncounterOwner{
		EncounterID:        encounterID,
		UserID:             userID,
		LocalPlayerID:      localPlayerID,
		IsOriginalUploader: isOriginalUploader,
	}

	// Use upsert: if the (encounter_id, user_id) pair already exists, preserve original uploader flag
	// and fill local_player_id if it was previously null.
	result := tx.Clauses(clause.OnConflict{
		Columns: []clause.Column{{Name: "encounter_id"}, {Name: "user_id"}},
		DoUpdates: clause.Assignments(map[string]interface{}{
			"is_original_uploader": gorm.Expr("encounter_owners.is_original_uploader OR EXCLUDED.is_original_uploader"),
			"local_player_id":      gorm.Expr("COALESCE(encounter_owners.local_player_id, EXCLUDED.local_player_id)"),
		}),
	}).Create(&owner)

	return result.Error
}

// parseVersion parses a semantic version string (e.g., "0.15.1") into its components.
// Returns major, minor, patch and an error if parsing fails.
func parseVersion(version string) (int, int, int, error) {
	// Strip any leading 'v' if present
	version = strings.TrimPrefix(version, "v")

	parts := strings.Split(version, ".")
	if len(parts) < 3 {
		return 0, 0, 0, fmt.Errorf("invalid version format: %s", version)
	}

	major, err := strconv.Atoi(parts[0])
	if err != nil {
		return 0, 0, 0, fmt.Errorf("invalid major version: %s", parts[0])
	}

	minor, err := strconv.Atoi(parts[1])
	if err != nil {
		return 0, 0, 0, fmt.Errorf("invalid minor version: %s", parts[1])
	}

	// Handle patch version which might have additional suffixes (e.g., "1-beta")
	patchStr := strings.Split(parts[2], "-")[0]
	patch, err := strconv.Atoi(patchStr)
	if err != nil {
		return 0, 0, 0, fmt.Errorf("invalid patch version: %s", patchStr)
	}

	return major, minor, patch, nil
}

// isVersionAtLeast checks if version is >= minVersion.
// Returns true if version >= minVersion, false otherwise.
func isVersionAtLeast(version, minVersion string) bool {
	vMajor, vMinor, vPatch, err := parseVersion(version)
	if err != nil {
		return false
	}

	minMajor, minMinor, minPatch, err := parseVersion(minVersion)
	if err != nil {
		return false
	}

	if vMajor > minMajor {
		return true
	}
	if vMajor < minMajor {
		return false
	}
	// vMajor == minMajor
	if vMinor > minMinor {
		return true
	}
	if vMinor < minMinor {
		return false
	}
	// vMinor == minMinor
	return vPatch >= minPatch
}

// ConvertToEncounterInput converts EncounterIn to lib.EncounterInput for deduplication
func ConvertToEncounterInput(e EncounterIn) lib.EncounterInput {
	bosses := make([]lib.BossInput, len(e.EncounterBosses))
	for i, b := range e.EncounterBosses {
		bosses[i] = lib.BossInput{MonsterName: b.MonsterName}
	}

	actors := make([]lib.ActorStatInput, len(e.ActorEncounterStats))
	for i, a := range e.ActorEncounterStats {
		actors[i] = lib.ActorStatInput{
			ActorID:     a.ActorID,
			DamageDealt: a.DamageDealt,
			IsPlayer:    a.IsPlayer,
		}
	}

	return lib.EncounterInput{
		StartedAtMs:         e.StartedAtMs,
		TotalDmg:            e.TotalDmg,
		SceneID:             e.SceneID,
		SceneName:           e.SceneName,
		EncounterBosses:     bosses,
		ActorEncounterStats: actors,
		AttemptsCount:       len(e.Attempts),
	}
}

// Incoming payload structures (omit IDs; server assigns IDs)
type EncounterIn struct {
	StartedAtMs   int64   `json:"startedAtMs"`
	EndedAtMs     *int64  `json:"endedAtMs"`
	LocalPlayerID *int64  `json:"localPlayerId"`
	TotalDmg      *int64  `json:"totalDmg"`
	TotalHeal     *int64  `json:"totalHeal"`
	SceneID       *int64  `json:"sceneId"`
	SceneName     *string `json:"sceneName"`
	SourceHash    *string `json:"sourceHash"`

	Attempts            []AttemptIn              `json:"attempts"`
	DeathEvents         []DeathEventIn           `json:"deathEvents"`
	ActorEncounterStats []ActorEncounterStatIn   `json:"actorEncounterStats"`
	DamageSkillStats    []DamageSkillStatIn      `json:"damageSkillStats"`
	HealSkillStats      []HealSkillStatIn        `json:"healSkillStats"`
	Entities            []EntityIn               `json:"entities"`
	EncounterBosses     []EncounterBossIn        `json:"encounterBosses"`
	DetailedPlayerData  []DetailedPlayerDataIn   `json:"detailedPlayerData"`
	DungeonSegments     []DungeonSegmentIn       `json:"dungeonSegments"`
	EncounterBuffs      []EncounterEntityBuffsIn `json:"encounterBuffs"`
}

type AttemptIn struct {
	AttemptIndex int     `json:"attemptIndex"`
	StartedAtMs  int64   `json:"startedAtMs"`
	EndedAtMs    *int64  `json:"endedAtMs"`
	Reason       *string `json:"reason"`
	BossHpStart  *int64  `json:"bossHpStart"`
	BossHpEnd    *int64  `json:"bossHpEnd"`
	TotalDeaths  int     `json:"totalDeaths"`
}

type DungeonSegmentIn struct {
	SegmentType       string  `json:"segmentType"`
	BossEntityID      *int64  `json:"bossEntityId"`
	BossMonsterTypeID *int64  `json:"bossMonsterTypeId"`
	BossName          *string `json:"bossName"`
	StartedAtMs       int64   `json:"startedAtMs"`
	EndedAtMs         *int64  `json:"endedAtMs"`
	TotalDamage       int64   `json:"totalDamage"`
	HitCount          int64   `json:"hitCount"`
}

type BuffEventIn struct {
	StartMs    int64 `json:"startMs"`
	EndMs      int64 `json:"endMs"`
	DurationMs int64 `json:"durationMs"`
	StackCount int64 `json:"stackCount"`
}

type EncounterBuffIn struct {
	BuffID          int64         `json:"buffId"`
	BuffName        *string       `json:"buffName"`
	BuffNameLong    *string       `json:"buffNameLong"`
	TotalDurationMs int64         `json:"totalDurationMs"`
	Events          []BuffEventIn `json:"events"`
}

type EncounterEntityBuffsIn struct {
	EntityUID  int64             `json:"entityUid"`
	EntityName *string           `json:"entityName"`
	Buffs      []EncounterBuffIn `json:"buffs"`
}

type DeathEventIn struct {
	TimestampMs   int64  `json:"timestampMs"`
	ActorID       int64  `json:"actorId"`
	KillerID      *int64 `json:"killerId"`
	SkillID       *int64 `json:"skillId"`
	IsLocalPlayer bool   `json:"isLocalPlayer"`
	AttemptIndex  int    `json:"attemptIndex"`
}

type ActorEncounterStatIn struct {
	ActorID     int64  `json:"actorId"`
	ClassSpec   *int64 `json:"classSpec"`
	DamageDealt int64  `json:"damageDealt"`
	HealDealt   int64  `json:"healDealt"`
	DamageTaken int64  `json:"damageTaken"`
	HitsDealt   int64  `json:"hitsDealt"`
	HitsHeal    int64  `json:"hitsHeal"`
	HitsTaken   int64  `json:"hitsTaken"`

	// Crit stats
	CritHitsDealt  *int64 `json:"critHitsDealt"`
	CritHitsHeal   *int64 `json:"critHitsHeal"`
	CritHitsTaken  *int64 `json:"critHitsTaken"`
	CritTotalDealt *int64 `json:"critTotalDealt"`
	CritTotalHeal  *int64 `json:"critTotalHeal"`
	CritTotalTaken *int64 `json:"critTotalTaken"`

	// Lucky stats
	LuckyHitsDealt  *int64 `json:"luckyHitsDealt"`
	LuckyHitsHeal   *int64 `json:"luckyHitsHeal"`
	LuckyHitsTaken  *int64 `json:"luckyHitsTaken"`
	LuckyTotalDealt *int64 `json:"luckyTotalDealt"`
	LuckyTotalHeal  *int64 `json:"luckyTotalHeal"`
	LuckyTotalTaken *int64 `json:"luckyTotalTaken"`

	// Boss-specific stats
	BossDamageDealt     *int64 `json:"bossDamageDealt"`
	BossHitsDealt       *int64 `json:"bossHitsDealt"`
	BossCritHitsDealt   *int64 `json:"bossCritHitsDealt"`
	BossLuckyHitsDealt  *int64 `json:"bossLuckyHitsDealt"`
	BossCritTotalDealt  *int64 `json:"bossCritTotalDealt"`
	BossLuckyTotalDealt *int64 `json:"bossLuckyTotalDealt"`

	// Performance snapshot
	DPS      *float64 `json:"dps"`
	Duration *float64 `json:"duration"`

	Name          *string `json:"name"`
	ClassID       *int64  `json:"classId"`
	AbilityScore  *int64  `json:"abilityScore"`
	Level         *int    `json:"level"`
	IsPlayer      bool    `json:"isPlayer"`
	IsLocalPlayer bool    `json:"isLocalPlayer"`
	Attributes    *string `json:"attributes"`
	Revives       *int64  `json:"revives"`
}

type DamageSkillStatIn struct {
	AttackerID      int64   `json:"attackerId"`
	DefenderID      *int64  `json:"defenderId"`
	SkillID         int64   `json:"skillId"`
	Hits            int64   `json:"hits"`
	TotalValue      int64   `json:"totalValue"`
	CritHits        int64   `json:"critHits"`
	LuckyHits       int64   `json:"luckyHits"`
	CritTotal       int64   `json:"critTotal"`
	LuckyTotal      int64   `json:"luckyTotal"`
	HpLossTotal     int64   `json:"hpLossTotal"`
	ShieldLossTotal int64   `json:"shieldLossTotal"`
	HitDetails      *string `json:"hitDetails"`
	MonsterName     *string `json:"monsterName"`
}

type HealSkillStatIn struct {
	HealerID    int64   `json:"healerId"`
	TargetID    *int64  `json:"targetId"`
	SkillID     int64   `json:"skillId"`
	Hits        int64   `json:"hits"`
	TotalValue  int64   `json:"totalValue"`
	CritHits    int64   `json:"critHits"`
	LuckyHits   int64   `json:"luckyHits"`
	CritTotal   int64   `json:"critTotal"`
	LuckyTotal  int64   `json:"luckyTotal"`
	HealDetails *string `json:"healDetails"`
	MonsterName *string `json:"monsterName"`
}

type EntityIn struct {
	EntityID     *int64  `json:"entityId"`
	Name         *string `json:"name"`
	ClassID      *int64  `json:"classId"`
	ClassSpec    *int64  `json:"classSpec"`
	AbilityScore *int64  `json:"abilityScore"`
	Level        *int    `json:"level"`
}

type EncounterBossIn struct {
	MonsterName string `json:"monsterName"`
	Hits        int64  `json:"hits"`
	TotalDamage int64  `json:"totalDamage"`
	MaxHP       *int64 `json:"maxHp"`
	IsDefeated  bool   `json:"isDefeated"`
}

type DetailedPlayerDataIn struct {
	PlayerID           int64   `json:"playerId"`
	LastSeenMs         int64   `json:"lastSeenMs"`
	CharSerializeJSON  string  `json:"charSerializeJson"`
	ProfessionListJSON *string `json:"professionListJson"`
	TalentNodeIDsJSON  *string `json:"talentNodeIdsJson"`
}

type UploadEncountersRequest struct {
	SchemaVersion *int          `json:"schemaVersion"`
	Encounters    []EncounterIn `json:"encounters"`
	ClientVersion *string       `json:"clientVersion"`
}

type UploadEncountersResponse struct {
	Ingested int     `json:"ingested"`
	IDs      []int64 `json:"ids"`
}

type CheckDuplicatesRequest struct {
	// Legacy: array of source hashes for exact matching
	Hashes []string `json:"hashes"`
	// New: candidates with full metadata for party fingerprint + time window matching
	Candidates []DuplicateCandidate `json:"candidates"`
}

// DuplicateCandidate contains metadata for party-based duplicate detection
type DuplicateCandidate struct {
	SourceHash  string   `json:"sourceHash"`
	StartedAtMs int64    `json:"startedAtMs"`
	SceneID     *int64   `json:"sceneId"`
	SceneName   *string  `json:"sceneName"`
	Bosses      []string `json:"bosses"`    // Boss monster names
	PlayerIDs   []int64  `json:"playerIds"` // ActorIDs of players
}

type DuplicateInfo struct {
	Hash        string `json:"hash"`
	EncounterID int64  `json:"encounterId"`
	// MatchType indicates how the duplicate was found: "exact" or "party"
	MatchType string `json:"matchType,omitempty"`
}

type CheckDuplicatesResponse struct {
	Duplicates []DuplicateInfo `json:"duplicates"`
	Missing    []string        `json:"missing"`
}

// partyFingerprintWindow is the time window (in seconds) for party matching
const partyFingerprintWindow = 60

// CheckDuplicates handles POST /api/v1/upload/check - preflight check for duplicate encounters
// Supports both legacy hash-only checks and new candidate-based party matching
func CheckDuplicates(c *gin.Context) {
	// Get db and user from context
	dbAny, exists := c.Get("db")
	if !exists {
		c.JSON(http.StatusInternalServerError, apiErrors.NewErrorResponse(http.StatusInternalServerError, "Database not available in context"))
		return
	}
	db := dbAny.(*gorm.DB)

	userAny, exists := c.Get("user")
	if !exists {
		c.JSON(http.StatusUnauthorized, apiErrors.NewErrorResponse(http.StatusUnauthorized, "Unauthorized"))
		return
	}
	user := userAny.(*models.User)

	// Bind JSON
	var req CheckDuplicatesRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, apiErrors.NewErrorResponse(http.StatusBadRequest, "Invalid request payload", err.Error()))
		return
	}

	// Require at least one of hashes or candidates
	if len(req.Hashes) == 0 && len(req.Candidates) == 0 {
		c.JSON(http.StatusBadRequest, apiErrors.NewErrorResponse(http.StatusBadRequest, "No hashes or candidates provided"))
		return
	}

	totalItems := len(req.Hashes) + len(req.Candidates)
	if totalItems > 50 {
		c.JSON(http.StatusBadRequest, apiErrors.NewErrorResponse(http.StatusBadRequest, "Too many items (max 50)"))
		return
	}

	duplicatesMap := make(map[string]DuplicateInfo)
	dedupeConfig := lib.DefaultDedupeConfig()

	// --- Legacy hash-based exact matching ---
	if len(req.Hashes) > 0 {
		var existingEncounters []models.Encounter
		err := db.Where("source_hash IN ? OR fingerprint IN ?", req.Hashes, req.Hashes).
			Select("id, source_hash, fingerprint").
			Find(&existingEncounters).Error
		if err != nil {
			c.JSON(http.StatusInternalServerError, apiErrors.NewErrorResponse(http.StatusInternalServerError, "Failed to check duplicates", err.Error()))
			return
		}

		for _, enc := range existingEncounters {
			// Add the requesting user as an owner of this encounter
			if err := addEncounterOwner(db, enc.ID, user.ID, false, nil); err != nil {
				log.Printf("[CheckDuplicates] WARN: Failed to add owner for encounter %d: %v", enc.ID, err)
			} else {
				log.Printf("[CheckDuplicates] Added user %d as owner of encounter %d (exact match)", user.ID, enc.ID)
			}

			if enc.SourceHash != nil && *enc.SourceHash != "" {
				duplicatesMap[*enc.SourceHash] = DuplicateInfo{Hash: *enc.SourceHash, EncounterID: enc.ID, MatchType: "exact"}
			}
			if enc.Fingerprint != nil && *enc.Fingerprint != "" {
				duplicatesMap[*enc.Fingerprint] = DuplicateInfo{Hash: *enc.Fingerprint, EncounterID: enc.ID, MatchType: "exact"}
			}
		}
	}

	// --- New candidate-based party fingerprint + time window matching ---
	for _, candidate := range req.Candidates {
		// Skip if already matched by exact hash
		if _, found := duplicatesMap[candidate.SourceHash]; found {
			continue
		}

		// Compute party fingerprint for this candidate
		bossInputs := make([]lib.BossInput, len(candidate.Bosses))
		for i, name := range candidate.Bosses {
			bossInputs[i] = lib.BossInput{MonsterName: name}
		}
		actorInputs := make([]lib.ActorStatInput, len(candidate.PlayerIDs))
		for i, id := range candidate.PlayerIDs {
			actorInputs[i] = lib.ActorStatInput{ActorID: id, IsPlayer: true}
		}
		encInput := lib.EncounterInput{
			StartedAtMs:         candidate.StartedAtMs,
			SceneID:             candidate.SceneID,
			SceneName:           candidate.SceneName,
			EncounterBosses:     bossInputs,
			ActorEncounterStats: actorInputs,
		}
		partyFingerprint := lib.ComputePartyFingerprint(encInput, dedupeConfig)

		// Query for encounters with matching party_fingerprint within time window
		candidateTime := time.UnixMilli(candidate.StartedAtMs)
		windowStart := candidateTime.Add(-time.Duration(partyFingerprintWindow) * time.Second)
		windowEnd := candidateTime.Add(time.Duration(partyFingerprintWindow) * time.Second)

		var partyMatches []models.Encounter
		err := db.Where("party_fingerprint = ? AND started_at BETWEEN ? AND ?", partyFingerprint, windowStart, windowEnd).
			Select("id, party_fingerprint").
			Preload("User").
			Find(&partyMatches).Error
		if err != nil {
			log.Printf("[CheckDuplicates] WARN: Failed to query party matches: %v", err)
			continue
		}

		if len(partyMatches) > 0 {
			// Found a party match - take the first one
			match := partyMatches[0]

			// Party match found - add as owner regardless of anonymization settings
			if err := addEncounterOwner(db, match.ID, user.ID, false, nil); err != nil {
				log.Printf("[CheckDuplicates] WARN: Failed to add owner for party match encounter %d: %v", match.ID, err)
			} else {
				log.Printf("[CheckDuplicates] Added user %d as owner of encounter %d (party match)", user.ID, match.ID)
			}
			duplicatesMap[candidate.SourceHash] = DuplicateInfo{Hash: candidate.SourceHash, EncounterID: match.ID, MatchType: "party"}
		}
	}

	// Build response
	duplicates := make([]DuplicateInfo, 0, len(duplicatesMap))
	for _, info := range duplicatesMap {
		duplicates = append(duplicates, info)
	}

	// Compute missing hashes (from legacy hashes only for backward compatibility)
	missing := make([]string, 0)
	for _, hash := range req.Hashes {
		if _, found := duplicatesMap[hash]; !found {
			missing = append(missing, hash)
		}
	}
	// Also add missing candidates (by source hash)
	for _, candidate := range req.Candidates {
		if _, found := duplicatesMap[candidate.SourceHash]; !found {
			missing = append(missing, candidate.SourceHash)
		}
	}

	c.JSON(http.StatusOK, CheckDuplicatesResponse{
		Duplicates: duplicates,
		Missing:    missing,
	})
}

// UploadEncounters handles POST /api/upload/encounters (with API key auth)
func UploadEncounters(c *gin.Context) {
	// Get db and user from context
	dbAny, exists := c.Get("db")
	if !exists {
		log.Printf("[UploadEncounters] ERROR: Database not available in context")
		c.JSON(http.StatusInternalServerError, apiErrors.NewErrorResponse(http.StatusInternalServerError, "Database not available in context"))
		return
	}
	txdb := dbAny.(*gorm.DB)

	userAny, exists := c.Get("user")
	if !exists {
		log.Printf("[UploadEncounters] ERROR: Unauthorized - user not in context")
		c.JSON(http.StatusUnauthorized, apiErrors.NewErrorResponse(http.StatusUnauthorized, "Unauthorized"))
		return
	}
	user := userAny.(*models.User)

	// Bind JSON
	var req UploadEncountersRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		log.Printf("[UploadEncounters] ERROR: Invalid request payload (user_id=%d) - %v", user.ID, err)
		c.JSON(http.StatusBadRequest, apiErrors.NewErrorResponse(http.StatusBadRequest, "Invalid request payload", err.Error()))
		return
	}
	if len(req.Encounters) == 0 {
		log.Printf("[UploadEncounters] ERROR: No encounters provided in request (user_id=%d)", user.ID)
		c.JSON(http.StatusBadRequest, apiErrors.NewErrorResponse(http.StatusBadRequest, "No encounters provided"))
		return
	}
	if len(req.Encounters) > 1 {
		log.Printf("[UploadEncounters] ERROR: Too many encounters in request (%d) (user_id=%d)", len(req.Encounters), user.ID)
		c.JSON(http.StatusBadRequest, apiErrors.NewErrorResponse(http.StatusBadRequest, "Too many encounters in one request (max 1)"))
		return
	}

	// Validate client version - require >= MinClientVersion
	if req.ClientVersion == nil || *req.ClientVersion == "" {
		log.Printf("[UploadEncounters] ERROR: Client version is missing (user_id=%d)", user.ID)
		c.JSON(http.StatusBadRequest, apiErrors.NewErrorResponse(http.StatusBadRequest, "Your Resonance Logs client is outdated. Please download the latest version from https://github.com/resonance-logs/resonance-logs/releases/latest"))
		return
	}
	if !isVersionAtLeast(*req.ClientVersion, MinClientVersion) {
		log.Printf("[UploadEncounters] ERROR: Client version %s is too old (min: %s) (user_id=%d)", *req.ClientVersion, MinClientVersion, user.ID)
		c.JSON(http.StatusBadRequest, apiErrors.NewErrorResponse(http.StatusBadRequest, fmt.Sprintf("Your Resonance Logs client (v%s) is outdated. Please download version %s or later from https://github.com/resonance-logs/resonance-logs/releases/latest", *req.ClientVersion, MinClientVersion)))
		return
	}

	// Validate incoming encounters against upload policy.
	if err := validateUploadPolicy(req.Encounters); err != nil {
		log.Printf("[UploadEncounters] ERROR: Upload policy validation failed (user_id=%d) - %v", user.ID, err)
		c.JSON(http.StatusBadRequest, apiErrors.NewErrorResponse(http.StatusBadRequest, err.Error()))
		return
	}

	if err := validateEncounterBuffs(req.Encounters); err != nil {
		log.Printf("[UploadEncounters] ERROR: Buff payload validation failed (user_id=%d) - %v", user.ID, err)
		c.JSON(http.StatusBadRequest, apiErrors.NewErrorResponse(http.StatusBadRequest, err.Error()))
		return
	}

	createdIDs := make([]int64, 0, len(req.Encounters))
	dedupeConfig := lib.DefaultDedupeConfig()

	// Get API key from header for source hash computation
	apiKey := c.GetHeader("X-Api-Key")

	err := txdb.Transaction(func(tx *gorm.DB) error {
		for _, e := range req.Encounters {
			// Compute server-side fingerprint and player set hash
			encInput := ConvertToEncounterInput(e)
			fingerprint := lib.ComputeEncounterFingerprint(encInput, dedupeConfig)
			playerSetHash := lib.ComputePlayerSetHash(encInput)
			partyFingerprint := lib.ComputePartyFingerprint(encInput, dedupeConfig)

			// Compute server-side source hash (matching client's compute_encounter_hash)
			attemptInputs := make([]lib.AttemptHashInput, len(e.Attempts))
			for i, a := range e.Attempts {
				attemptInputs[i] = lib.AttemptHashInput{
					AttemptIndex: a.AttemptIndex,
					StartedAtMs:  a.StartedAtMs,
					EndedAtMs:    a.EndedAtMs,
				}
			}
			actorIDs := make([]int64, 0, len(e.ActorEncounterStats))
			for _, stat := range e.ActorEncounterStats {
				actorIDs = append(actorIDs, stat.ActorID)
			}
			serverSourceHash := lib.ComputeSourceHash(
				e.StartedAtMs,
				e.EndedAtMs,
				e.LocalPlayerID,
				e.SceneID,
				e.SceneName,
				attemptInputs,
				actorIDs,
				apiKey,
			)

			// Use server-computed hash for deduplication if client didn't provide one,
			// or log a warning if they differ
			sourceHashToUse := &serverSourceHash
			if e.SourceHash != nil && *e.SourceHash != "" {
				if *e.SourceHash != serverSourceHash {
					log.Printf("[UploadEncounters] WARN: source_hash mismatch - client: %s, server: %s", *e.SourceHash, serverSourceHash)
				}
				// Still use client's hash to maintain backward compatibility
				sourceHashToUse = e.SourceHash
			}

			// Check for exact duplicates (by fingerprint or source_hash) - GLOBAL scope (cross-user)
			var existing models.Encounter

			// Build query: check fingerprint OR source_hash
			query := tx.Where("fingerprint = ?", fingerprint)
			if sourceHashToUse != nil && *sourceHashToUse != "" {
				query = query.Or("source_hash = ?", *sourceHashToUse)
			}

			err := query.Select("id, user_id").Preload("User").First(&existing).Error
			if err == nil {
				// Exact duplicate found (either by fingerprint or source_hash)
				// Add this user as an owner if not already
				if err := addEncounterOwner(tx, existing.ID, user.ID, false, e.LocalPlayerID); err != nil {
					log.Printf("[UploadEncounters] WARN: Failed to add owner for encounter %d: %v", existing.ID, err)
				}
				createdIDs = append(createdIDs, existing.ID)
				// Optionally update client version on existing encounter if provided
				if req.ClientVersion != nil {
					if err := tx.Model(&existing).Update("client_version", req.ClientVersion).Error; err != nil {
						return err
					}
				}
				continue
			} else if err != gorm.ErrRecordNotFound {
				// DB error (not just "not found")
				return err
			}

			// No exact duplicate found - check for party match (same party uploaded with different settings)
			// Look for encounters with the same party_fingerprint within time window (±60s)
			encounterTime := time.UnixMilli(e.StartedAtMs)
			windowStart := encounterTime.Add(-time.Duration(partyFingerprintWindow) * time.Second)
			windowEnd := encounterTime.Add(time.Duration(partyFingerprintWindow) * time.Second)

			var partyMatch models.Encounter
			err = tx.Where("party_fingerprint = ? AND started_at BETWEEN ? AND ?", partyFingerprint, windowStart, windowEnd).
				Preload("User").
				First(&partyMatch).Error

			if err == nil {
				// Found a party match - add as owner to existing encounter regardless of anonymization settings
				log.Printf("[UploadEncounters] Party match found for user %d on encounter %d", user.ID, partyMatch.ID)
				if err := addEncounterOwner(tx, partyMatch.ID, user.ID, false, e.LocalPlayerID); err != nil {
					log.Printf("[UploadEncounters] WARN: Failed to add owner for party match encounter %d: %v", partyMatch.ID, err)
				}
				createdIDs = append(createdIDs, partyMatch.ID)
				if req.ClientVersion != nil {
					if err := tx.Model(&partyMatch).Update("client_version", req.ClientVersion).Error; err != nil {
						return err
					}
				}
				continue
			} else if err != gorm.ErrRecordNotFound {
				return err
			}

			// No exact duplicate found - try fuzzy matching
			// Query candidates: same player set hash (fast lookup)
			var candidates []models.Encounter
			err = tx.Where("player_set_hash = ?", playerSetHash).
				Preload("Players").
				Preload("Bosses").
				Preload("Attempts").
				Preload("User").
				Find(&candidates).Error
			if err != nil && err != gorm.ErrRecordNotFound {
				return err
			}

			// Check fuzzy similarity against candidates
			fuzzyDuplicateFound := false
			for _, candidate := range candidates {
				sim := lib.ComputeFuzzySimilarity(encInput, candidate)
				if lib.IsFuzzyDuplicate(sim, dedupeConfig) {
					// Fuzzy duplicate found - add as owner regardless of anonymization settings
					log.Printf("[UploadEncounters] Fuzzy match found for user %d on encounter %d", user.ID, candidate.ID)
					if err := addEncounterOwner(tx, candidate.ID, user.ID, false, e.LocalPlayerID); err != nil {
						log.Printf("[UploadEncounters] WARN: Failed to add owner for fuzzy match encounter %d: %v", candidate.ID, err)
					}
					createdIDs = append(createdIDs, candidate.ID)
					if req.ClientVersion != nil {
						if err := tx.Model(&candidate).Update("client_version", req.ClientVersion).Error; err != nil {
							return err
						}
					}
					fuzzyDuplicateFound = true
					break
				}
			}
			if fuzzyDuplicateFound {
				continue
			}

			// No duplicate found - proceed with insertion

			// Create encounter with fingerprint, player_set_hash, and party_fingerprint
			var endedAtPtr *time.Time
			var duration float64
			if e.EndedAtMs != nil {
				t := time.UnixMilli(*e.EndedAtMs)
				endedAtPtr = &t
				duration = t.Sub(time.UnixMilli(e.StartedAtMs)).Seconds()
			}
			// Default totals to 0 if nil
			td := int64(0)
			if e.TotalDmg != nil {
				td = *e.TotalDmg
			}
			th := int64(0)
			if e.TotalHeal != nil {
				th = *e.TotalHeal
			}
			encounter := models.Encounter{
				StartedAt:        time.UnixMilli(e.StartedAtMs),
				EndedAt:          endedAtPtr,
				Duration:         duration,
				LocalPlayerID:    e.LocalPlayerID,
				TotalDmg:         td,
				TotalHeal:        th,
				SceneID:          e.SceneID,
				SceneName:        e.SceneName,
				SourceHash:       sourceHashToUse,
				Fingerprint:      &fingerprint,
				PlayerSetHash:    &playerSetHash,
				PartyFingerprint: &partyFingerprint,
				UserID:           user.ID,
				ClientVersion:    req.ClientVersion,
			}

			// Create with unique constraint handling (in case of race condition on fingerprint unique index)
			if err := tx.Create(&encounter).Error; err != nil {
				// Check if it's a unique constraint violation on fingerprint
				if strings.Contains(err.Error(), "duplicate") || strings.Contains(err.Error(), "unique") {
					// Race condition: another concurrent upload created the same fingerprint
					// Re-query for the existing encounter
					var raceExisting models.Encounter
					rerr := tx.Where("fingerprint = ?", fingerprint).Select("id").First(&raceExisting).Error
					if rerr == nil {
						// Add as owner
						if err := addEncounterOwner(tx, raceExisting.ID, user.ID, false, e.LocalPlayerID); err != nil {
							log.Printf("[UploadEncounters] WARN: Failed to add owner for race encounter %d: %v", raceExisting.ID, err)
						}
						createdIDs = append(createdIDs, raceExisting.ID)
						continue
					}
				}
				// Other DB error
				return err
			}
			createdIDs = append(createdIDs, encounter.ID)

			// Add the uploader as the original owner
			if err := addEncounterOwner(tx, encounter.ID, user.ID, true, e.LocalPlayerID); err != nil {
				log.Printf("[UploadEncounters] WARN: Failed to add original owner for encounter %d: %v", encounter.ID, err)
			}

			// Attempts
			if len(e.Attempts) > 0 {
				attempts := make([]models.Attempt, 0, len(e.Attempts))
				for _, a := range e.Attempts {
					attempts = append(attempts, models.Attempt{
						EncounterID:  encounter.ID,
						AttemptIndex: a.AttemptIndex,
						StartedAt:    time.UnixMilli(a.StartedAtMs),
						EndedAt: func() *time.Time {
							if a.EndedAtMs != nil {
								t := time.UnixMilli(*a.EndedAtMs)
								return &t
							}
							return nil
						}(),
						Reason:      a.Reason,
						BossHpStart: a.BossHpStart,
						BossHpEnd:   a.BossHpEnd,
						TotalDeaths: a.TotalDeaths,
					})
				}
				if err := tx.CreateInBatches(&attempts, 1000).Error; err != nil {
					return err
				}
			}

			// Dungeon segments
			if len(e.DungeonSegments) > 0 {
				segments := make([]models.DungeonSegment, 0, len(e.DungeonSegments))
				for _, seg := range e.DungeonSegments {
					startedAt := time.UnixMilli(seg.StartedAtMs)
					segmentType := strings.ToLower(strings.TrimSpace(seg.SegmentType))
					if segmentType != "boss" && segmentType != "trash" {
						segmentType = seg.SegmentType
					}

					segment := models.DungeonSegment{
						EncounterID:       encounter.ID,
						SegmentType:       segmentType,
						BossEntityID:      seg.BossEntityID,
						BossMonsterTypeID: seg.BossMonsterTypeID,
						BossName:          seg.BossName,
						StartedAt:         startedAt,
						TotalDamage:       seg.TotalDamage,
						HitCount:          seg.HitCount,
					}

					if seg.EndedAtMs != nil {
						endedAt := time.UnixMilli(*seg.EndedAtMs)
						segment.EndedAt = &endedAt
					}

					segments = append(segments, segment)
				}

				if err := tx.CreateInBatches(&segments, 1000).Error; err != nil {
					return err
				}
			}

			// Death events
			if len(e.DeathEvents) > 0 {
				des := make([]models.DeathEvent, 0, len(e.DeathEvents))
				for _, d := range e.DeathEvents {
					des = append(des, models.DeathEvent{
						EncounterID: encounter.ID,
						Timestamp:   time.UnixMilli(d.TimestampMs),
						ActorID:     d.ActorID,
						KillerID:    d.KillerID,
						SkillID: func() *int64 {
							if d.SkillID != nil {
								v := int64(*d.SkillID)
								return &v
							}
							return nil
						}(),
						IsLocalPlayer: d.IsLocalPlayer,
						AttemptIndex:  d.AttemptIndex,
					})
				}
				if err := tx.CreateInBatches(&des, 1000).Error; err != nil {
					return err
				}
			}

			// Actor encounter stats
			if len(e.ActorEncounterStats) > 0 {
				stats := make([]models.ActorEncounterStat, 0, len(e.ActorEncounterStats))
				for _, s := range e.ActorEncounterStats {
					stat := models.ActorEncounterStat{
						EncounterID:   encounter.ID,
						ActorID:       s.ActorID,
						ClassSpec:     s.ClassSpec,
						DamageDealt:   s.DamageDealt,
						HealDealt:     s.HealDealt,
						DamageTaken:   s.DamageTaken,
						HitsDealt:     s.HitsDealt,
						HitsHeal:      s.HitsHeal,
						HitsTaken:     s.HitsTaken,
						Name:          s.Name,
						ClassID:       s.ClassID,
						AbilityScore:  s.AbilityScore,
						Level:         s.Level,
						IsPlayer:      s.IsPlayer,
						IsLocalPlayer: s.IsLocalPlayer,
					}

					// Optional fields from v2 schema
					if s.CritHitsDealt != nil {
						stat.CritHitsDealt = *s.CritHitsDealt
					}
					if s.CritHitsHeal != nil {
						stat.CritHitsHeal = *s.CritHitsHeal
					}
					if s.CritHitsTaken != nil {
						stat.CritHitsTaken = *s.CritHitsTaken
					}
					if s.CritTotalDealt != nil {
						stat.CritTotalDealt = *s.CritTotalDealt
					}
					if s.CritTotalHeal != nil {
						stat.CritTotalHeal = *s.CritTotalHeal
					}
					if s.CritTotalTaken != nil {
						stat.CritTotalTaken = *s.CritTotalTaken
					}
					if s.LuckyHitsDealt != nil {
						stat.LuckyHitsDealt = *s.LuckyHitsDealt
					}
					if s.LuckyHitsHeal != nil {
						stat.LuckyHitsHeal = *s.LuckyHitsHeal
					}
					if s.LuckyHitsTaken != nil {
						stat.LuckyHitsTaken = *s.LuckyHitsTaken
					}
					if s.LuckyTotalDealt != nil {
						stat.LuckyTotalDealt = *s.LuckyTotalDealt
					}
					if s.LuckyTotalHeal != nil {
						stat.LuckyTotalHeal = *s.LuckyTotalHeal
					}
					if s.LuckyTotalTaken != nil {
						stat.LuckyTotalTaken = *s.LuckyTotalTaken
					}
					if s.BossDamageDealt != nil {
						stat.BossDamageDealt = *s.BossDamageDealt
					}
					if s.BossHitsDealt != nil {
						stat.BossHitsDealt = *s.BossHitsDealt
					}
					if s.BossCritHitsDealt != nil {
						stat.BossCritHitsDealt = *s.BossCritHitsDealt
					}
					if s.BossLuckyHitsDealt != nil {
						stat.BossLuckyHitsDealt = *s.BossLuckyHitsDealt
					}
					if s.BossCritTotalDealt != nil {
						stat.BossCritTotalDealt = *s.BossCritTotalDealt
					}
					if s.BossLuckyTotalDealt != nil {
						stat.BossLuckyTotalDealt = *s.BossLuckyTotalDealt
					}
					if s.DPS != nil {
						stat.DPS = *s.DPS
					}
					if s.Duration != nil {
						stat.Duration = *s.Duration
					}
					if s.Revives != nil {
						stat.Revives = *s.Revives
					}
					if s.Attributes != nil {
						// Store attributes as JSONB
						stat.Attributes = []byte(*s.Attributes)
					}

					stats = append(stats, stat)
				}
				if err := tx.CreateInBatches(&stats, 1000).Error; err != nil {
					return err
				}
			}

			// Damage skill stats - batch insert to avoid exceeding PostgreSQL's 65535 parameter limit
			if len(e.DamageSkillStats) > 0 {
				dss := make([]models.DamageSkillStat, 0, len(e.DamageSkillStats))
				for _, s := range e.DamageSkillStats {
					stat := models.DamageSkillStat{
						EncounterID:     encounter.ID,
						AttackerID:      s.AttackerID,
						DefenderID:      s.DefenderID,
						SkillID:         s.SkillID,
						Hits:            s.Hits,
						TotalValue:      s.TotalValue,
						CritHits:        s.CritHits,
						LuckyHits:       s.LuckyHits,
						CritTotal:       s.CritTotal,
						LuckyTotal:      s.LuckyTotal,
						HpLossTotal:     s.HpLossTotal,
						ShieldLossTotal: s.ShieldLossTotal,
						MonsterName:     s.MonsterName,
					}
					if s.HitDetails != nil {
						// Store hit details as JSONB
						stat.HitDetails = []byte(*s.HitDetails)
					}
					dss = append(dss, stat)
				}
				if err := tx.CreateInBatches(&dss, 1000).Error; err != nil {
					return err
				}
			}

			// Heal skill stats - batch insert to avoid exceeding PostgreSQL's 65535 parameter limit
			if len(e.HealSkillStats) > 0 {
				hss := make([]models.HealSkillStat, 0, len(e.HealSkillStats))
				for _, s := range e.HealSkillStats {
					stat := models.HealSkillStat{
						EncounterID: encounter.ID,
						HealerID:    s.HealerID,
						TargetID:    s.TargetID,
						SkillID:     s.SkillID,
						Hits:        s.Hits,
						TotalValue:  s.TotalValue,
						CritHits:    s.CritHits,
						LuckyHits:   s.LuckyHits,
						CritTotal:   s.CritTotal,
						LuckyTotal:  s.LuckyTotal,
						MonsterName: s.MonsterName,
					}
					if s.HealDetails != nil {
						// Store heal details as JSONB
						stat.HealDetails = []byte(*s.HealDetails)
					}
					hss = append(hss, stat)
				}
				if err := tx.CreateInBatches(&hss, 1000).Error; err != nil {
					return err
				}
			}

			// Buff timelines (players only)
			if len(e.EncounterBuffs) > 0 {
				buffs := make([]models.EncounterBuff, 0)
				for _, entityBuff := range e.EncounterBuffs {
					if len(entityBuff.Buffs) == 0 {
						continue
					}

					for _, buff := range entityBuff.Buffs {
						if len(buff.Events) == 0 {
							continue
						}

						evBytes, err := json.Marshal(buff.Events)
						if err != nil {
							return err
						}

						total := buff.TotalDurationMs
						if total <= 0 {
							var sum int64
							for _, ev := range buff.Events {
								sum += ev.DurationMs
							}
							total = sum
						}

						buffs = append(buffs, models.EncounterBuff{
							EncounterID:     encounter.ID,
							ActorID:         entityBuff.EntityUID,
							BuffID:          buff.BuffID,
							BuffName:        buff.BuffName,
							BuffNameLong:    buff.BuffNameLong,
							TotalDurationMs: total,
							Events:          evBytes,
							EntityName:      entityBuff.EntityName,
						})
					}
				}

				if len(buffs) > 0 {
					if err := tx.CreateInBatches(&buffs, 1000).Error; err != nil {
						return err
					}
				}
			}

			// Entities (global table, no encounter_id)
			if len(e.Entities) > 0 {
				uploaderID := user.ID
				ents := make([]models.Entity, 0, len(e.Entities))
				now := time.Now()
				for _, en := range e.Entities {
					ents = append(ents, models.Entity{
						EntityID:      en.EntityID,
						UserID:        &uploaderID,
						Name:          en.Name,
						ClassID:       en.ClassID,
						ClassSpec:     en.ClassSpec,
						AbilityScore:  en.AbilityScore,
						Level:         en.Level,
						FirstSeen:     &now,
						LastSeen:      &now,
						LocalPlayerID: e.LocalPlayerID,
					})
				}
				// Best-effort insert; duplicates may occur in MVP
				_ = tx.CreateInBatches(&ents, 1000).Error
			}

			// Encounter bosses
			if len(e.EncounterBosses) > 0 {
				bosses := make([]models.EncounterBoss, 0, len(e.EncounterBosses))
				for _, b := range e.EncounterBosses {
					bosses = append(bosses, models.EncounterBoss{
						EncounterID: encounter.ID,
						MonsterName: b.MonsterName,
						Hits:        b.Hits,
						TotalDamage: b.TotalDamage,
						MaxHP:       b.MaxHP,
						IsDefeated:  b.IsDefeated,
					})
				}
				if err := tx.CreateInBatches(&bosses, 1000).Error; err != nil {
					return err
				}
			}

			// Detailed player data
			if len(e.DetailedPlayerData) > 0 {
				playerData := make([]models.DetailedPlayerData, 0, len(e.DetailedPlayerData))
				for _, pd := range e.DetailedPlayerData {
					data := models.DetailedPlayerData{
						PlayerID:          pd.PlayerID,
						UserID:            &user.ID,
						LastSeenMs:        pd.LastSeenMs,
						CharSerializeJSON: pd.CharSerializeJSON,
					}
					if pd.ProfessionListJSON != nil {
						data.ProfessionListJSON = *pd.ProfessionListJSON
					}
					if pd.TalentNodeIDsJSON != nil {
						data.TalentNodeIDsJSON = *pd.TalentNodeIDsJSON
					}

					meta := extractPlayerMetadata(pd.CharSerializeJSON)
					if meta.playerName != nil {
						data.PlayerName = meta.playerName
					}
					if meta.abilityScore != nil {
						data.AbilityScore = meta.abilityScore
					}
					if meta.regionID != nil {
						data.RegionID = meta.regionID
					}

					playerData = append(playerData, data)
				}
				// Use upsert to handle updates to existing player data
				for _, pd := range playerData {
					if err := tx.Save(&pd).Error; err != nil {
						return err
					}
				}
			}
		}

		// Increment user's upload counter
		if err := tx.Model(&models.User{}).Where("id = ?", user.ID).UpdateColumn("encounters_uploaded", gorm.Expr("encounters_uploaded + ?", len(createdIDs))).Error; err != nil {
			return err
		}
		return nil
	})

	if err != nil {
		log.Printf("[UploadEncounters] ERROR: Transaction failed (user_id=%d) - %v", user.ID, err)
		c.JSON(http.StatusInternalServerError, apiErrors.NewErrorResponse(http.StatusInternalServerError, "Failed to ingest encounters", err.Error()))
		return
	}

	log.Printf("[UploadEncounters] SUCCESS: Ingested %d encounter(s), IDs: %v", len(createdIDs), createdIDs)
	c.JSON(http.StatusOK, UploadEncountersResponse{Ingested: len(createdIDs), IDs: createdIDs})
}

// validateUploadPolicy ensures encounters conform to allowed scenes and boss HP rules.
func validateUploadPolicy(encs []EncounterIn) error {
	allowedScenes := map[int64]int64{
		1333:  0,
		1033:  0,
		1123:  0,
		6009:  0,
		1223:  0,
		6023:  0,
		13003: 0,
		30150: 0,
		30160: 0,
		30170: 0,
		30175: 0,
	}

	for idx, e := range encs {
		log.Printf("[validateUploadPolicy] Processing encounter %d: SceneID=%v, StartedAtMs=%d, EndedAtMs=%v, NumBosses=%d",
			idx,
			func() int64 {
				if e.SceneID != nil {
					return *e.SceneID
				}
				return -1
			}(),
			e.StartedAtMs,
			func() int64 {
				if e.EndedAtMs != nil {
					return *e.EndedAtMs
				}
				return -1
			}(),
			len(e.EncounterBosses))

		// Validate encounter duration is at least 30 seconds
		if e.EndedAtMs == nil {
			return fmt.Errorf("encounter missing end time at index %d", idx)
		}
		durationMs := *e.EndedAtMs - e.StartedAtMs
		if durationMs < 30000 { // 30 seconds in milliseconds
			return fmt.Errorf("encounter duration must be at least 30 seconds (was %d ms) at index %d", durationMs, idx)
		}

		if e.SceneID == nil {
			return fmt.Errorf("encounter missing scene_id at index %d", idx)
		}
		minHp, ok := allowedScenes[*e.SceneID]
		if !ok {
			return fmt.Errorf("scene not allowed for upload: %d", *e.SceneID)
		}

		// Validate scene name matches expected format
		if err := validateScene(*e.SceneID, e.SceneName); err != nil {
			return fmt.Errorf("scene validation failed at index %d: %w", idx, err)
		}

		if len(e.EncounterBosses) == 0 {
			return fmt.Errorf("encounter missing detected boss(es) at index %d", idx)
		}

		// Validate at least one boss meets minimum HP requirement and total damage exceeds boss max HP
		found := false
		for _, b := range e.EncounterBosses {
			max := int64(0)
			if b.MaxHP != nil {
				max = *b.MaxHP
			}
			if max >= minHp {
				found = true
				// Validate total damage exceeds this boss's max HP
				if e.TotalDmg != nil && *e.TotalDmg <= max {
					return fmt.Errorf("total damage (%d) must exceed boss max HP (%d) at index %d", *e.TotalDmg, max, idx)
				}
				break
			}
		}
		if !found {
			return fmt.Errorf("encounter does not contain a qualifying boss (max_hp requirement) at index %d", idx)
		}
	}
	return nil
}

// validateEncounterBuffs enforces reasonable bounds on buff payload size and values
// to prevent pathological uploads from overwhelming the API.
func validateEncounterBuffs(encs []EncounterIn) error {
	for encIdx, enc := range encs {
		if len(enc.EncounterBuffs) > maxBuffEntitiesPerEncounter {
			return fmt.Errorf("too many buffed entities in encounter %d (max %d)", encIdx, maxBuffEntitiesPerEncounter)
		}

		for entityIdx, eb := range enc.EncounterBuffs {
			if len(eb.Buffs) > maxBuffsPerEntity {
				return fmt.Errorf("too many buffs for entity %d in encounter %d (max %d)", entityIdx, encIdx, maxBuffsPerEntity)
			}

			for buffIdx, b := range eb.Buffs {
				if len(b.Events) == 0 {
					continue
				}
				if len(b.Events) > maxBuffEventsPerBuff {
					return fmt.Errorf("too many buff events for buff %d on entity %d (encounter %d)", buffIdx, entityIdx, encIdx)
				}

				var total int64
				for eventIdx, ev := range b.Events {
					if ev.DurationMs < 0 {
						return fmt.Errorf("negative buff duration (entity %d buff %d event %d)", entityIdx, buffIdx, eventIdx)
					}
					if ev.EndMs < ev.StartMs {
						return fmt.Errorf("buff event end before start (entity %d buff %d event %d)", entityIdx, buffIdx, eventIdx)
					}
					total += ev.DurationMs
				}

				if total <= 0 {
					return fmt.Errorf("buff %d on entity %d has zero total duration (encounter %d)", buffIdx, entityIdx, encIdx)
				}
			}
		}
	}
	return nil
}

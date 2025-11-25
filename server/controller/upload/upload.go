package upload

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	apiErrors "server/controller"
	"server/lib"
	"server/models"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// Minimum client version required for uploads
const MinClientVersion = "0.15.1"

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

	Attempts            []AttemptIn            `json:"attempts"`
	DeathEvents         []DeathEventIn         `json:"deathEvents"`
	ActorEncounterStats []ActorEncounterStatIn `json:"actorEncounterStats"`
	DamageSkillStats    []DamageSkillStatIn    `json:"damageSkillStats"`
	HealSkillStats      []HealSkillStatIn      `json:"healSkillStats"`
	Entities            []EntityIn             `json:"entities"`
	EncounterBosses     []EncounterBossIn      `json:"encounterBosses"`
	DetailedPlayerData  []DetailedPlayerDataIn `json:"detailedPlayerData"`
	DungeonSegments     []DungeonSegmentIn     `json:"dungeonSegments"`
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
	Hashes []string `json:"hashes"`
}

type DuplicateInfo struct {
	Hash        string `json:"hash"`
	EncounterID int64  `json:"encounterId"`
}

type CheckDuplicatesResponse struct {
	Duplicates []DuplicateInfo `json:"duplicates"`
	Missing    []string        `json:"missing"`
}

// CheckDuplicates handles POST /api/v1/upload/check - preflight check for duplicate encounters
func CheckDuplicates(c *gin.Context) {
	// Get db and user from context
	dbAny, exists := c.Get("db")
	if !exists {
		c.JSON(http.StatusInternalServerError, apiErrors.NewErrorResponse(http.StatusInternalServerError, "Database not available in context"))
		return
	}
	db := dbAny.(*gorm.DB)

	_, exists = c.Get("user")
	if !exists {
		c.JSON(http.StatusUnauthorized, apiErrors.NewErrorResponse(http.StatusUnauthorized, "Unauthorized"))
		return
	}

	// Bind JSON
	var req CheckDuplicatesRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, apiErrors.NewErrorResponse(http.StatusBadRequest, "Invalid request payload", err.Error()))
		return
	}

	if len(req.Hashes) == 0 {
		c.JSON(http.StatusBadRequest, apiErrors.NewErrorResponse(http.StatusBadRequest, "No hashes provided"))
		return
	}

	if len(req.Hashes) > 50 {
		c.JSON(http.StatusBadRequest, apiErrors.NewErrorResponse(http.StatusBadRequest, "Too many hashes (max 50)"))
		return
	}

	// Query for existing encounters with these hashes (check both source_hash and fingerprint)
	// Note: Cross-user check (no user_id filter) for global deduplication
	var existingEncounters []models.Encounter
	err := db.Where("source_hash IN ? OR fingerprint IN ?", req.Hashes, req.Hashes).
		Select("id, source_hash, fingerprint").
		Find(&existingEncounters).Error
	if err != nil {
		c.JSON(http.StatusInternalServerError, apiErrors.NewErrorResponse(http.StatusInternalServerError, "Failed to check duplicates", err.Error()))
		return
	}

	// Build response - map input hash to encounter ID
	duplicatesMap := make(map[string]int64)
	for _, enc := range existingEncounters {
		if enc.SourceHash != nil && *enc.SourceHash != "" {
			duplicatesMap[*enc.SourceHash] = enc.ID
		}
		if enc.Fingerprint != nil && *enc.Fingerprint != "" {
			duplicatesMap[*enc.Fingerprint] = enc.ID
		}
	}

	duplicates := make([]DuplicateInfo, 0, len(duplicatesMap))
	for hash, id := range duplicatesMap {
		duplicates = append(duplicates, DuplicateInfo{Hash: hash, EncounterID: id})
	}

	missing := make([]string, 0)
	for _, hash := range req.Hashes {
		if _, found := duplicatesMap[hash]; !found {
			missing = append(missing, hash)
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
		c.JSON(http.StatusInternalServerError, apiErrors.NewErrorResponse(http.StatusInternalServerError, "Database not available in context"))
		return
	}
	txdb := dbAny.(*gorm.DB)

	userAny, exists := c.Get("user")
	if !exists {
		c.JSON(http.StatusUnauthorized, apiErrors.NewErrorResponse(http.StatusUnauthorized, "Unauthorized"))
		return
	}
	user := userAny.(*models.User)

	// Bind JSON
	var req UploadEncountersRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, apiErrors.NewErrorResponse(http.StatusBadRequest, "Invalid request payload", err.Error()))
		return
	}
	if len(req.Encounters) == 0 {
		c.JSON(http.StatusBadRequest, apiErrors.NewErrorResponse(http.StatusBadRequest, "No encounters provided"))
		return
	}
	// Validate incoming encounters against upload policy.
	if err := validateUploadPolicy(req.Encounters); err != nil {
		c.JSON(http.StatusBadRequest, apiErrors.NewErrorResponse(http.StatusBadRequest, err.Error()))
		return
	}
    
	if len(req.Encounters) > 1 {
		c.JSON(http.StatusBadRequest, apiErrors.NewErrorResponse(http.StatusBadRequest, "Too many encounters in one request (max 1)"))
		return
	}

	// Validate client version - require >= MinClientVersion
	if req.ClientVersion == nil || *req.ClientVersion == "" {
		c.JSON(http.StatusBadRequest, apiErrors.NewErrorResponse(http.StatusBadRequest, "Client version is required. Please update to the latest version of Resonance Logs."))
		return
	}
	if !isVersionAtLeast(*req.ClientVersion, MinClientVersion) {
		c.JSON(http.StatusBadRequest, apiErrors.NewErrorResponse(http.StatusBadRequest, fmt.Sprintf("Client version %s is too old. Please update to version %s or later.", *req.ClientVersion, MinClientVersion)))
		return
	}

	createdIDs := make([]int64, 0, len(req.Encounters))
	dedupeConfig := lib.DefaultDedupeConfig()

	err := txdb.Transaction(func(tx *gorm.DB) error {
		for _, e := range req.Encounters {
			// Compute server-side fingerprint and player set hash
			encInput := ConvertToEncounterInput(e)
			fingerprint := lib.ComputeEncounterFingerprint(encInput, dedupeConfig)
			playerSetHash := lib.ComputePlayerSetHash(encInput)

			// Check for exact duplicates (by fingerprint or source_hash) - GLOBAL scope (cross-user)
			var existing models.Encounter

			// Build query: check fingerprint OR source_hash
			query := tx.Where("fingerprint = ?", fingerprint)
			if e.SourceHash != nil && *e.SourceHash != "" {
				query = query.Or("source_hash = ?", *e.SourceHash)
			}

			err := query.Select("id").First(&existing).Error
			if err == nil {
				// Exact duplicate found (either by fingerprint or source_hash), skip insertion
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

			// No exact duplicate found - try fuzzy matching
			// Query candidates: same player set hash (fast lookup)
			var candidates []models.Encounter
			err = tx.Where("player_set_hash = ?", playerSetHash).
				Preload("Players").
				Preload("Bosses").
				Preload("Attempts").
				Find(&candidates).Error
			if err != nil && err != gorm.ErrRecordNotFound {
				return err
			}

			// Check fuzzy similarity against candidates
			fuzzyDuplicateFound := false
			for _, candidate := range candidates {
				sim := lib.ComputeFuzzySimilarity(encInput, candidate)
				if lib.IsFuzzyDuplicate(sim, dedupeConfig) {
					// Fuzzy duplicate found - skip insertion and return existing ID
					createdIDs = append(createdIDs, candidate.ID)
					// Optionally update client version on fuzzy matched encounter
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

			// Create encounter with fingerprint and player_set_hash
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
				StartedAt:     time.UnixMilli(e.StartedAtMs),
				EndedAt:       endedAtPtr,
				Duration:      duration,
				LocalPlayerID: e.LocalPlayerID,
				TotalDmg:      td,
				TotalHeal:     th,
				SceneID:       e.SceneID,
				SceneName:     e.SceneName,
				SourceHash:    e.SourceHash,
				Fingerprint:   &fingerprint,
				PlayerSetHash: &playerSetHash,
				UserID:        user.ID,
				ClientVersion: req.ClientVersion,
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
						createdIDs = append(createdIDs, raceExisting.ID)
						continue
					}
				}
				// Other DB error
				return err
			}
			createdIDs = append(createdIDs, encounter.ID)

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
				if err := tx.Create(&attempts).Error; err != nil {
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

				if err := tx.Create(&segments).Error; err != nil {
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
				if err := tx.Create(&des).Error; err != nil {
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
				if err := tx.Create(&stats).Error; err != nil {
					return err
				}
			}

			// Damage skill stats
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
				if err := tx.Create(&dss).Error; err != nil {
					return err
				}
			}

			// Heal skill stats
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
				if err := tx.Create(&hss).Error; err != nil {
					return err
				}
			}

			// Entities (global table, no encounter_id)
			if len(e.Entities) > 0 {
				ents := make([]models.Entity, 0, len(e.Entities))
				now := time.Now()
				for _, en := range e.Entities {
					ents = append(ents, models.Entity{
						EntityID:     en.EntityID,
						Name:         en.Name,
						ClassID:      en.ClassID,
						ClassSpec:    en.ClassSpec,
						AbilityScore: en.AbilityScore,
						Level:        en.Level,
						FirstSeen:    &now,
						LastSeen:     &now,
					})
				}
				// Best-effort insert; duplicates may occur in MVP
				_ = tx.Create(&ents).Error
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
				if err := tx.Create(&bosses).Error; err != nil {
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

					// Extract ability_score and player_name from CharSerializeJSON
					if pd.CharSerializeJSON != "" {
						var charData map[string]interface{}
						if err := json.Unmarshal([]byte(pd.CharSerializeJSON), &charData); err == nil {
							// Extract player_name from CharBase.Name
							if charBaseRaw, ok := charData["CharBase"]; ok {
								if charBaseMap, ok := charBaseRaw.(map[string]interface{}); ok {
									if name, ok := charBaseMap["Name"].(string); ok && name != "" {
										data.PlayerName = &name
									}
								}
							}

							// Extract ability_score from FightPoint.AbilityScore
							if fightPointRaw, ok := charData["FightPoint"]; ok {
								if fightPointMap, ok := fightPointRaw.(map[string]interface{}); ok {
									if abilityScore, ok := fightPointMap["AbilityScore"].(float64); ok {
										score := int64(abilityScore)
										data.AbilityScore = &score
									}
								}
							}
						}
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
		c.JSON(http.StatusInternalServerError, apiErrors.NewErrorResponse(http.StatusInternalServerError, "Failed to ingest encounters", err.Error()))
		return
	}

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
		if e.SceneID == nil {
			return fmt.Errorf("encounter missing scene_id at index %d", idx)
		}
		minHp, ok := allowedScenes[*e.SceneID]
		if !ok {
			return fmt.Errorf("scene not allowed for upload: %d", *e.SceneID)
		}
		if len(e.EncounterBosses) == 0 {
			return fmt.Errorf("encounter missing detected boss(es) at index %d", idx)
		}
		found := false
		for _, b := range e.EncounterBosses {
			max := int64(0)
			if b.MaxHP != nil {
				max = *b.MaxHP
			}
			if max >= minHp {
				found = true
				break
			}
		}
		if !found {
			return fmt.Errorf("encounter does not contain a qualifying boss (max_hp requirement) at index %d", idx)
		}
	}
	return nil
}

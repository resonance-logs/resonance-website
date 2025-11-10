package upload

import (
	"net/http"
	"time"

	apiErrors "server/controller"
	"server/models"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// Incoming payload structures (omit IDs; server assigns IDs)
type EncounterIn struct {
	StartedAtMs   int64   `json:"startedAtMs"`
	EndedAtMs     *int64  `json:"endedAtMs"`
	LocalPlayerID *int64  `json:"localPlayerId"`
	TotalDmg      *int64  `json:"totalDmg"`
	TotalHeal     *int64  `json:"totalHeal"`
	SceneID       *int64  `json:"sceneId"`
	SceneName     *string `json:"sceneName"`

	Attempts            []AttemptIn            `json:"attempts"`
	DeathEvents         []DeathEventIn         `json:"deathEvents"`
	ActorEncounterStats []ActorEncounterStatIn `json:"actorEncounterStats"`
	DamageSkillStats    []DamageSkillStatIn    `json:"damageSkillStats"`
	HealSkillStats      []HealSkillStatIn      `json:"healSkillStats"`
	Entities            []EntityIn             `json:"entities"`
	EncounterBosses     []EncounterBossIn      `json:"encounterBosses"`
	DetailedPlayerData  []DetailedPlayerDataIn `json:"detailedPlayerData"`
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
	AttackerID      int64  `json:"attackerId"`
	DefenderID      *int64 `json:"defenderId"`
	SkillID         int64  `json:"skillId"`
	Hits            int64  `json:"hits"`
	TotalValue      int64  `json:"totalValue"`
	CritHits        int64  `json:"critHits"`
	LuckyHits       int64  `json:"luckyHits"`
	CritTotal       int64  `json:"critTotal"`
	LuckyTotal      int64  `json:"luckyTotal"`
	HpLossTotal     int64  `json:"hpLossTotal"`
	ShieldLossTotal int64  `json:"shieldLossTotal"`
	// HitDetails omitted for now
	MonsterName *string `json:"monsterName"`
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
}

type UploadEncountersResponse struct {
	Ingested int     `json:"ingested"`
	IDs      []int64 `json:"ids"`
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
	if len(req.Encounters) > 10 {
		c.JSON(http.StatusBadRequest, apiErrors.NewErrorResponse(http.StatusBadRequest, "Too many encounters in one request (max 10)"))
		return
	}

	createdIDs := make([]int64, 0, len(req.Encounters))

	err := txdb.Transaction(func(tx *gorm.DB) error {
		for _, e := range req.Encounters {
			// Create encounter
			var endedAtPtr *time.Time
			if e.EndedAtMs != nil {
				t := time.UnixMilli(*e.EndedAtMs)
				endedAtPtr = &t
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
				LocalPlayerID: e.LocalPlayerID,
				TotalDmg:      td,
				TotalHeal:     th,
				SceneID:       e.SceneID,
				SceneName:     e.SceneName,
				UserID:        user.ID,
			}
			if err := tx.Create(&encounter).Error; err != nil {
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
					dss = append(dss, models.DamageSkillStat{
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
					})
				}
				if err := tx.Create(&dss).Error; err != nil {
					return err
				}
			}

			// Heal skill stats
			if len(e.HealSkillStats) > 0 {
				hss := make([]models.HealSkillStat, 0, len(e.HealSkillStats))
				for _, s := range e.HealSkillStats {
					hss = append(hss, models.HealSkillStat{
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
					})
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
						LastSeenMs:        pd.LastSeenMs,
						CharSerializeJSON: pd.CharSerializeJSON,
					}
					if pd.ProfessionListJSON != nil {
						data.ProfessionListJSON = *pd.ProfessionListJSON
					}
					if pd.TalentNodeIDsJSON != nil {
						data.TalentNodeIDsJSON = *pd.TalentNodeIDsJSON
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

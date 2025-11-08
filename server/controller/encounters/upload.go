package encounters

import (
	"net/http"
	"time"

	"server/controller/reports"
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
	DeathEvents         []DeathEventIn         `json:"death_events"`
	ActorEncounterStats []ActorEncounterStatIn `json:"actor_encounter_stats"`
	DamageSkillStats    []DamageSkillStatIn    `json:"damage_skill_stats"`
	HealSkillStats      []HealSkillStatIn      `json:"heal_skill_stats"`
	Entities            []EntityIn             `json:"entities"`
	EncounterBosses     []EncounterBossIn      `json:"encounter_bosses"`
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
	ActorID       int64   `json:"actorId"`
	ClassSpec     *int64  `json:"classSpec"`
	DamageDealt   int64   `json:"damageDealt"`
	HealDealt     int64   `json:"healDealt"`
	DamageTaken   int64   `json:"damageTaken"`
	HitsDealt     int64   `json:"hitsDealt"`
	HitsHeal      int64   `json:"hitsHeal"`
	HitsTaken     int64   `json:"hitsTaken"`
	Name          *string `json:"name"`
	ClassID       *int64  `json:"classId"`
	AbilityScore  *int64  `json:"abilityScore"`
	Level         *int    `json:"level"`
	IsPlayer      bool    `json:"isPlayer"`
	IsLocalPlayer bool    `json:"isLocalPlayer"`
	// Attributes omitted for now in upload to reduce payload; can be added later
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

type UploadEncountersRequest struct {
	Encounters []EncounterIn `json:"encounters"`
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
		c.JSON(http.StatusInternalServerError, reports.NewErrorResponse(http.StatusInternalServerError, "Database not available in context"))
		return
	}
	txdb := dbAny.(*gorm.DB)

	userAny, exists := c.Get("user")
	if !exists {
		c.JSON(http.StatusUnauthorized, reports.NewErrorResponse(http.StatusUnauthorized, "Unauthorized"))
		return
	}
	user := userAny.(*models.User)

	// Bind JSON
	var req UploadEncountersRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, reports.NewErrorResponse(http.StatusBadRequest, "Invalid request payload", err.Error()))
		return
	}
	if len(req.Encounters) == 0 {
		c.JSON(http.StatusBadRequest, reports.NewErrorResponse(http.StatusBadRequest, "No encounters provided"))
		return
	}
	if len(req.Encounters) > 10 {
		c.JSON(http.StatusBadRequest, reports.NewErrorResponse(http.StatusBadRequest, "Too many encounters in one request (max 10)"))
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
					stats = append(stats, models.ActorEncounterStat{
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
					})
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
		}

		// Increment user's upload counter
		if err := tx.Model(&models.User{}).Where("id = ?", user.ID).UpdateColumn("encounters_uploaded", gorm.Expr("encounters_uploaded + ?", len(createdIDs))).Error; err != nil {
			return err
		}
		return nil
	})

	if err != nil {
		c.JSON(http.StatusInternalServerError, reports.NewErrorResponse(http.StatusInternalServerError, "Failed to ingest encounters", err.Error()))
		return
	}

	c.JSON(http.StatusOK, UploadEncountersResponse{Ingested: len(createdIDs), IDs: createdIDs})
}

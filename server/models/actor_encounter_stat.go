package models

import (
	"gorm.io/datatypes"
)

// ActorEncounterStat aggregates per-actor stats for an encounter.
type ActorEncounterStat struct {
	ID          int64  `gorm:"primaryKey;autoIncrement;column:id" json:"id"`
	ActorID     int64  `gorm:"column:actor_id;index;not null" json:"actorId"`
	ClassSpec   *int64 `gorm:"column:class_spec" json:"classSpec,omitempty"`
	DamageDealt int64  `gorm:"column:damage_dealt" json:"damageDealt"`
	HealDealt   int64  `gorm:"column:heal_dealt" json:"healDealt"`
	DamageTaken int64  `gorm:"column:damage_taken" json:"damageTaken"`
	HitsDealt   int64  `gorm:"column:hits_dealt" json:"hitsDealt"`
	HitsHeal    int64  `gorm:"column:hits_heal" json:"hitsHeal"`
	HitsTaken   int64  `gorm:"column:hits_taken" json:"hitsTaken"`

	// Crit stats
	CritHitsDealt  int64 `gorm:"column:crit_hits_dealt;default:0" json:"critHitsDealt"`
	CritHitsHeal   int64 `gorm:"column:crit_hits_heal;default:0" json:"critHitsHeal"`
	CritHitsTaken  int64 `gorm:"column:crit_hits_taken;default:0" json:"critHitsTaken"`
	CritTotalDealt int64 `gorm:"column:crit_total_dealt;default:0" json:"critTotalDealt"`
	CritTotalHeal  int64 `gorm:"column:crit_total_heal;default:0" json:"critTotalHeal"`
	CritTotalTaken int64 `gorm:"column:crit_total_taken;default:0" json:"critTotalTaken"`

	// Lucky stats
	LuckyHitsDealt  int64 `gorm:"column:lucky_hits_dealt;default:0" json:"luckyHitsDealt"`
	LuckyHitsHeal   int64 `gorm:"column:lucky_hits_heal;default:0" json:"luckyHitsHeal"`
	LuckyHitsTaken  int64 `gorm:"column:lucky_hits_taken;default:0" json:"luckyHitsTaken"`
	LuckyTotalDealt int64 `gorm:"column:lucky_total_dealt;default:0" json:"luckyTotalDealt"`
	LuckyTotalHeal  int64 `gorm:"column:lucky_total_heal;default:0" json:"luckyTotalHeal"`
	LuckyTotalTaken int64 `gorm:"column:lucky_total_taken;default:0" json:"luckyTotalTaken"`

	// Boss-specific stats
	BossDamageDealt     int64 `gorm:"column:boss_damage_dealt;default:0" json:"bossDamageDealt"`
	BossHitsDealt       int64 `gorm:"column:boss_hits_dealt;default:0" json:"bossHitsDealt"`
	BossCritHitsDealt   int64 `gorm:"column:boss_crit_hits_dealt;default:0" json:"bossCritHitsDealt"`
	BossLuckyHitsDealt  int64 `gorm:"column:boss_lucky_hits_dealt;default:0" json:"bossLuckyHitsDealt"`
	BossCritTotalDealt  int64 `gorm:"column:boss_crit_total_dealt;default:0" json:"bossCritTotalDealt"`
	BossLuckyTotalDealt int64 `gorm:"column:boss_lucky_total_dealt;default:0" json:"bossLuckyTotalDealt"`

	// Performance snapshot
	DPS      float64 `gorm:"column:dps;default:0" json:"dps"`
	Duration float64 `gorm:"column:duration;default:0" json:"duration"`

	Name          *string        `gorm:"column:name;size:255" json:"name,omitempty"`
	ClassID       *int64         `gorm:"column:class_id" json:"classId,omitempty"`
	AbilityScore  *int64         `gorm:"column:ability_score" json:"abilityScore,omitempty"`
	Level         *int           `gorm:"column:level" json:"level,omitempty"`
	IsPlayer      bool           `gorm:"column:is_player" json:"isPlayer"`
	IsLocalPlayer bool           `gorm:"column:is_local_player" json:"isLocalPlayer"`
	Attributes    datatypes.JSON `gorm:"column:attributes;type:jsonb" json:"attributes,omitempty"`
	Revives       int64          `gorm:"column:revives" json:"revives"`

	// Foreign Key To Encounter
	EncounterID int64      `gorm:"column:encounter_id;index;not null;constraint:OnDelete:CASCADE" json:"encounterId"`
	Encounter   *Encounter `gorm:"foreignKey:EncounterID;references:ID" json:"-"`
}

func (ActorEncounterStat) TableName() string {
	return "actor_encounter_stats"
}

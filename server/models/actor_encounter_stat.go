package models

import (
	"gorm.io/datatypes"
)

// ActorEncounterStat aggregates per-actor stats for an encounter.
type ActorEncounterStat struct {
	ID            int64          `gorm:"primaryKey;autoIncrement;column:id" json:"id"`
	EncounterID   int64          `gorm:"column:encounter_id;index;not null" json:"encounterId"`
	ActorID       int64          `gorm:"column:actor_id;index;not null" json:"actorId"`
	ClassSpec     *int64         `gorm:"column:class_spec" json:"classSpec,omitempty"`
	DamageDealt   int64          `gorm:"column:damage_dealt" json:"damageDealt"`
	HealDealt     int64          `gorm:"column:heal_dealt" json:"healDealt"`
	DamageTaken   int64          `gorm:"column:damage_taken" json:"damageTaken"`
	HitsDealt     int64          `gorm:"column:hits_dealt" json:"hitsDealt"`
	HitsHeal      int64          `gorm:"column:hits_heal" json:"hitsHeal"`
	HitsTaken     int64          `gorm:"column:hits_taken" json:"hitsTaken"`
	Name          *string        `gorm:"column:name;size:255" json:"name,omitempty"`
	ClassID       *int64         `gorm:"column:class_id" json:"classId,omitempty"`
	AbilityScore  *int64         `gorm:"column:ability_score" json:"abilityScore,omitempty"`
	Level         *int           `gorm:"column:level" json:"level,omitempty"`
	IsPlayer      bool           `gorm:"column:is_player" json:"isPlayer"`
	IsLocalPlayer bool           `gorm:"column:is_local_player" json:"isLocalPlayer"`
	Attributes    datatypes.JSON `gorm:"column:attributes;type:jsonb" json:"attributes,omitempty"`
	Revives       int64          `gorm:"column:revives" json:"revives"`
}

func (ActorEncounterStat) TableName() string {
	return "actor_encounter_stats"
}

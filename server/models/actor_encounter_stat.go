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
	DamageDealt   int64          `gorm:"column:damage_dealt;default:0" json:"damageDealt"`
	HealDealt     int64          `gorm:"column:heal_dealt;default:0" json:"healDealt"`
	DamageTaken   int64          `gorm:"column:damage_taken;default:0" json:"damageTaken"`
	HitsDealt     int64          `gorm:"column:hits_dealt;default:0" json:"hitsDealt"`
	HitsHeal      int64          `gorm:"column:hits_heal;default:0" json:"hitsHeal"`
	HitsTaken     int64          `gorm:"column:hits_taken;default:0" json:"hitsTaken"`
	Name          *string        `gorm:"column:name;size:255" json:"name,omitempty"`
	ClassID       *int64         `gorm:"column:class_id" json:"classId,omitempty"`
	AbilityScore  *int64         `gorm:"column:ability_score" json:"abilityScore,omitempty"`
	Level         *int           `gorm:"column:level" json:"level,omitempty"`
	IsPlayer      bool           `gorm:"column:is_player;default:true" json:"isPlayer"`
	IsLocalPlayer bool           `gorm:"column:is_local_player;default:false" json:"isLocalPlayer"`
	Attributes    datatypes.JSON `gorm:"column:attributes;type:jsonb" json:"attributes,omitempty"`
	Revives       int64          `gorm:"column:revives;default:0" json:"revives"`
}

func (ActorEncounterStat) TableName() string {
	return "actor_encounter_stats"
}

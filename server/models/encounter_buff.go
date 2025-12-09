package models

import (
	"time"

	"gorm.io/datatypes"
)

// EncounterBuff stores per-encounter buff timelines for player entities.
type EncounterBuff struct {
	EncounterID     int64          `gorm:"primaryKey;column:encounter_id;index" json:"encounterId"`
	ActorID         int64          `gorm:"primaryKey;column:actor_id;index" json:"actorId"`
	BuffID          int64          `gorm:"primaryKey;column:buff_id;index" json:"buffId"`
	BuffName        *string        `gorm:"column:buff_name;size:128" json:"buffName,omitempty"`
	BuffNameLong    *string        `gorm:"column:buff_name_long;size:255" json:"buffNameLong,omitempty"`
	TotalDurationMs int64          `gorm:"column:total_duration_ms;default:0" json:"totalDurationMs"`
	Events          datatypes.JSON `gorm:"column:events;type:jsonb" json:"events"`
	EntityName      *string        `gorm:"column:entity_name;size:255" json:"entityName,omitempty"`
	Encounter       *Encounter     `gorm:"foreignKey:EncounterID;references:ID" json:"-"`

	// Timestamps
	CreatedAt time.Time `gorm:"column:created_at;autoCreateTime" json:"createdAt"`
	UpdatedAt time.Time `gorm:"column:updated_at;autoUpdateTime" json:"updatedAt"`
}

func (EncounterBuff) TableName() string {
	return "encounter_buffs"
}

package models

import (
	"time"

	"gorm.io/datatypes"
)

// Entity represents a known entity (player or NPC) snapshot.
type Entity struct {
	ID           int64          `gorm:"primaryKey;autoIncrement;column:id" json:"id"`
	EntityID     *int64         `gorm:"column:entity_id;index" json:"entityId,omitempty"`
	Name         *string        `gorm:"column:name;size:255" json:"name,omitempty"`
	ClassID      *int64         `gorm:"column:class_id" json:"classId,omitempty"`
	ClassSpec    *int64         `gorm:"column:class_spec" json:"classSpec,omitempty"`
	AbilityScore *int64         `gorm:"column:ability_score" json:"abilityScore,omitempty"`
	Level        *int           `gorm:"column:level" json:"level,omitempty"`
	FirstSeen    *time.Time     `gorm:"column:first_seen" json:"firstSeen,omitempty"`
	LastSeen     *time.Time     `gorm:"column:last_seen" json:"lastSeen,omitempty"`
	Attributes   datatypes.JSON `gorm:"column:attributes;type:jsonb" json:"attributes,omitempty"`
}

func (Entity) TableName() string {
	return "entities"
}

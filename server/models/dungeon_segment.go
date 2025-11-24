package models

import "time"

// DungeonSegment represents a discrete boss or trash segment within an encounter.
type DungeonSegment struct {
	ID                int64      `gorm:"primaryKey;autoIncrement;column:id" json:"id"`
	EncounterID       int64      `gorm:"column:encounter_id;index;not null;constraint:OnDelete:CASCADE" json:"encounterId"`
	SegmentType       string     `gorm:"column:segment_type;size:16" json:"segmentType"`
	BossEntityID      *int64     `gorm:"column:boss_entity_id" json:"bossEntityId,omitempty"`
	BossMonsterTypeID *int64     `gorm:"column:boss_monster_type_id" json:"bossMonsterTypeId,omitempty"`
	BossName          *string    `gorm:"column:boss_name;size:255" json:"bossName,omitempty"`
	StartedAt         time.Time  `gorm:"column:started_at" json:"startedAt"`
	EndedAt           *time.Time `gorm:"column:ended_at" json:"endedAt,omitempty"`
	TotalDamage       int64      `gorm:"column:total_damage" json:"totalDamage"`
	HitCount          int64      `gorm:"column:hit_count" json:"hitCount"`
	CreatedAt         time.Time  `gorm:"column:created_at;autoCreateTime" json:"createdAt"`
	UpdatedAt         time.Time  `gorm:"column:updated_at;autoUpdateTime" json:"updatedAt"`
	Encounter         *Encounter `gorm:"foreignKey:EncounterID;references:ID" json:"-"`
}

// TableName sets the insert table name for this struct type.
func (DungeonSegment) TableName() string {
	return "dungeon_segments"
}

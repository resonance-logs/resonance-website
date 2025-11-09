package models

import "time"

// DeathEvent represents a death occurrence.
type DeathEvent struct {
	ID            int64      `gorm:"primaryKey;autoIncrement;column:id" json:"id"`
	Timestamp     time.Time  `gorm:"column:timestamp;index;not null" json:"timestamp"`
	ActorID       int64      `gorm:"column:actor_id;not null" json:"actorId"`
	KillerID      *int64     `gorm:"column:killer_id" json:"killerId,omitempty"`
	SkillID       *int64     `gorm:"column:skill_id" json:"skillId,omitempty"`
	IsLocalPlayer bool       `gorm:"column:is_local_player;default:false" json:"isLocalPlayer"`
	AttemptIndex  int        `gorm:"column:attempt_index;default:1" json:"attemptIndex"`
	
	// Foreign Key To Encounter
	EncounterID   int64      `gorm:"column:encounter_id;index;not null;constraint:OnDelete:CASCADE" json:"encounterId"`
	Encounter     *Encounter `gorm:"foreignKey:EncounterID;references:ID" json:"-"`
}

func (DeathEvent) TableName() string {
	return "death_events"
}

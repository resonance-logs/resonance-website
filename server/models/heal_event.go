package models

import "time"

// HealEvent records a healing event.
type HealEvent struct {
	ID           int64     `gorm:"primaryKey;autoIncrement;column:id" json:"id"`
	EncounterID  int64     `gorm:"column:encounter_id;index;not null" json:"encounterId"`
	Timestamp    time.Time `gorm:"column:timestamp;index;not null" json:"timestamp"`
	HealerID     int64     `gorm:"column:healer_id;not null" json:"healerId"`
	TargetID     *int64    `gorm:"column:target_id;index" json:"targetId,omitempty"`
	SkillID      *int64    `gorm:"column:skill_id" json:"skillId,omitempty"`
	Value        int64     `gorm:"column:value;not null" json:"value"`
	IsCrit       bool      `gorm:"column:is_crit;default:false" json:"isCrit"`
	IsLucky      bool      `gorm:"column:is_lucky;default:false" json:"isLucky"`
	AttemptIndex int       `gorm:"column:attempt_index;default:1" json:"attemptIndex"`
}

func (HealEvent) TableName() string {
	return "heal_events"
}

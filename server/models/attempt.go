package models

import "time"

// Attempt represents an individual attempt within an encounter.
type Attempt struct {
	ID           int64      `gorm:"primaryKey;autoIncrement;column:id" json:"id"`
	AttemptIndex int        `gorm:"column:attempt_index;not null" json:"attemptIndex"`
	StartedAt    time.Time  `gorm:"column:started_at;not null" json:"startedAt"`
	EndedAt      *time.Time `gorm:"column:ended_at" json:"endedAt,omitempty"`
	Reason       *string    `gorm:"column:reason;size:32" json:"reason,omitempty"`
	BossHpStart  *int64     `gorm:"column:boss_hp_start" json:"bossHpStart,omitempty"`
	BossHpEnd    *int64     `gorm:"column:boss_hp_end" json:"bossHpEnd,omitempty"`
	TotalDeaths  int        `gorm:"column:total_deaths;default:0" json:"totalDeaths"`

	// Foreign Key To Encounter
	EncounterID  int64      `gorm:"column:encounter_id;index;not null;constraint:OnDelete:CASCADE" json:"encounterId"`
	Encounter    *Encounter `gorm:"foreignKey:EncounterID;references:ID" json:"-"`
}

func (Attempt) TableName() string {
	return "attempts"
}

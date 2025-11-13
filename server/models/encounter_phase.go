package models

import "time"

// EncounterPhase represents a phase within a boss encounter (mob phase or boss phase)
type EncounterPhase struct {
	ID          int64      `gorm:"primaryKey;autoIncrement;column:id" json:"id"`
	EncounterID int64      `gorm:"column:encounter_id;index;not null;constraint:OnDelete:CASCADE" json:"encounterId"`
	PhaseType   string     `gorm:"column:phase_type;size:10;not null" json:"phaseType"` // 'mob' or 'boss'
	StartTime   time.Time  `gorm:"column:start_time;not null" json:"startTime"`
	EndTime     *time.Time `gorm:"column:end_time" json:"endTime,omitempty"`
	Outcome     string     `gorm:"column:outcome;size:10;default:unknown;not null" json:"outcome"` // 'success', 'wipe', 'unknown'

	// Foreign key relationship
	Encounter *Encounter `gorm:"foreignKey:EncounterID;references:ID" json:"-"`
}

// TableName sets the insert table name for this struct type
func (EncounterPhase) TableName() string {
	return "encounter_phases"
}

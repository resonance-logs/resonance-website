package models

import "time"

// EncounterOwner represents a many-to-many relationship between encounters and users.
// This allows multiple users to "own" the same encounter (e.g., party members who all uploaded the same log).
type EncounterOwner struct {
	EncounterID int64     `gorm:"primaryKey;column:encounter_id" json:"encounterId"`
	UserID      uint      `gorm:"primaryKey;column:user_id" json:"userId"`
	CreatedAt   time.Time `gorm:"column:created_at;autoCreateTime" json:"createdAt"`

	// Whether this user is the original uploader
	IsOriginalUploader bool `gorm:"column:is_original_uploader;default:false" json:"isOriginalUploader"`

	// Relationships
	Encounter *Encounter `gorm:"foreignKey:EncounterID;references:ID;constraint:OnDelete:CASCADE" json:"-"`
	User      *User      `gorm:"foreignKey:UserID;references:ID;constraint:OnDelete:CASCADE" json:"-"`
}

// TableName sets the table name for this model
func (EncounterOwner) TableName() string {
	return "encounter_owners"
}

package models

import (
	"time"
)

// Module represents an equipment module in user's collection
type Module struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	UUID      string    `gorm:"uniqueIndex;size:64;not null" json:"uuid" binding:"required"`
	Name      string    `gorm:"size:255;not null" json:"name" binding:"required"`
	ConfigID  int       `gorm:"not null" json:"config_id" binding:"required"`
	Quality   int       `gorm:"not null" json:"quality" binding:"required,min=1,max=5"`
	Category  string    `gorm:"size:20;not null" json:"category" binding:"required,oneof=ATTACK DEFENSE SUPPORT"`
	Source    string    `gorm:"size:20;not null;default:'manual'" json:"source"` // manual, import, backfill
	UserID    uint      `gorm:"index;not null" json:"user_id"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`

	// Relationships
	User  *User        `gorm:"foreignKey:UserID" json:"user,omitempty"`
	Parts []ModulePart `gorm:"foreignKey:ModuleID;constraint:OnDelete:CASCADE" json:"parts,omitempty"`
}

// TableName sets the table name for Module
func (Module) TableName() string {
	return "modules"
}

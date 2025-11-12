package models

import (
	"time"
)

// ModulePart represents a single attribute on a module
type ModulePart struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	ModuleID  uint      `gorm:"index;not null" json:"module_id"`
	PartID    int       `gorm:"not null" json:"part_id" binding:"required"`
	Name      string    `gorm:"size:255;not null" json:"name" binding:"required"`
	Value     int       `gorm:"not null" json:"value" binding:"required,min=1"`
	Type      string    `gorm:"size:20;not null" json:"type" binding:"required,oneof=basic special"`
	CreatedAt time.Time `json:"created_at"`

	// Relationships
	Module *Module `gorm:"foreignKey:ModuleID" json:"module,omitempty"`
}

// TableName sets the table name for ModulePart
func (ModulePart) TableName() string {
	return "module_parts"
}

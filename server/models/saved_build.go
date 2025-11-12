package models

import (
	"time"

	"gorm.io/datatypes"
)

// SavedBuild represents a user-bookmarked equipment combination
type SavedBuild struct {
	ID            uint           `gorm:"primaryKey" json:"id"`
	UserID        uint           `gorm:"index;not null" json:"user_id"`
	Name          string         `gorm:"size:255;not null" json:"name" binding:"required,min=1,max=255"`
	ModuleIDs     datatypes.JSON `gorm:"type:jsonb;not null" json:"module_ids" binding:"required"`
	Score         float64        `gorm:"type:decimal(10,2);not null" json:"score"`
	AttrBreakdown datatypes.JSON `gorm:"type:jsonb;not null" json:"attr_breakdown"`
	PriorityLevel int            `gorm:"default:0" json:"priority_level"`
	Notes         *string        `gorm:"type:text" json:"notes,omitempty"`
	CreatedAt     time.Time      `json:"created_at"`
	UpdatedAt     time.Time      `json:"updated_at"`

	// Relationships
	User *User `gorm:"foreignKey:UserID" json:"user,omitempty"`
}

// TableName sets the table name for SavedBuild
func (SavedBuild) TableName() string {
	return "saved_builds"
}

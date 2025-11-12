package models

import (
	"time"

	"gorm.io/datatypes"
)

// OptimizationResult stores optimization results for caching and history
type OptimizationResult struct {
	ID                 uint           `gorm:"primaryKey" json:"id"`
	UserID             uint           `gorm:"index;not null" json:"user_id"`
	RequestHash        string         `gorm:"size:64;index;not null" json:"request_hash"`
	Category           string         `gorm:"size:20;not null" json:"category"`
	PriorityAttributes datatypes.JSON `gorm:"type:jsonb" json:"priority_attributes,omitempty"`
	DesiredLevels      datatypes.JSON `gorm:"type:jsonb" json:"desired_levels,omitempty"`
	ExcludedAttributes datatypes.JSON `gorm:"type:jsonb" json:"excluded_attributes,omitempty"`
	SortMode           string         `gorm:"size:20;not null" json:"sort_mode"`
	Combinations       datatypes.JSON `gorm:"type:jsonb;not null" json:"combinations"`
	ProcessingTimeMS   int            `gorm:"not null" json:"processing_time_ms"`
	CreatedAt          time.Time      `gorm:"index" json:"created_at"`
	ExpiresAt          *time.Time     `gorm:"index" json:"expires_at,omitempty"`

	// Relationships
	User *User `gorm:"foreignKey:UserID" json:"user,omitempty"`
}

// TableName sets the table name for OptimizationResult
func (OptimizationResult) TableName() string {
	return "optimization_results"
}

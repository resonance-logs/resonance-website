package models

import "time"

// AppUser tracks unique installations of the desktop application.
type AppUser struct {
	ID              uint      `gorm:"primaryKey" json:"id"`
	ClientID        string    `gorm:"uniqueIndex;size:64" json:"client_id"`
	LastSeenVersion string    `gorm:"size:32" json:"last_seen_version"`
	Platform        string    `gorm:"size:32" json:"platform"`
	LastSeenAt      time.Time `json:"last_seen_at"`
	CreatedAt       time.Time `json:"created_at"`
	UpdatedAt       time.Time `json:"updated_at"`
}

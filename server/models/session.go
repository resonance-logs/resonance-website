package models

import "time"

// Session represents a login session bound to a user and persisted server-side.
type Session struct {
	ID           uint       `gorm:"primaryKey" json:"id"`
	UserID       uint       `gorm:"index" json:"user_id"`
	SessionToken string     `gorm:"uniqueIndex;size:128" json:"-"`
	ExpiresAt    time.Time  `json:"expires_at"`
	CreatedAt    time.Time  `json:"created_at"`
	UpdatedAt    time.Time  `json:"updated_at"`
	RevokedAt    *time.Time `json:"revoked_at,omitempty"`
}

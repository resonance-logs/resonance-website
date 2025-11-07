package models

import "time"

// APIToken represents a long-lived token for programmatic access.
// Only the hash is stored; the raw token is shown once at creation.
type APIToken struct {
	ID        uint       `gorm:"primaryKey" json:"id"`
	UserID    uint       `gorm:"index" json:"user_id"`
	Name      string     `gorm:"size:255" json:"name"`
	TokenHash string     `gorm:"size:255;uniqueIndex" json:"-"`
	Scopes    string     `gorm:"size:1024" json:"scopes"`
	ExpiresAt *time.Time `json:"expires_at,omitempty"`
	CreatedAt time.Time  `json:"created_at"`
	RevokedAt *time.Time `json:"revoked_at,omitempty"`
}

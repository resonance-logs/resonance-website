package models

import (
	"time"
)

// ApiKey stores a hashed API key for a user. Plaintext is never stored.
// A user should have at most one active (non-revoked) key at a time.
// KeyHash should be computed using a strong hash (e.g., HMAC-SHA256 with a server-side secret pepper).
// We index KeyHash for quick lookup during API-key authentication.
//
// Security note: plaintext keys are only ever returned at generation time.
// After that, only metadata is available via the API.
//
// GORM will auto-migrate this schema; do not add SQL migrations.
//
// Unique index on KeyHash ensures no duplicates; UserID can have multiple historical (revoked) keys.

type ApiKey struct {
	ID         uint       `gorm:"primaryKey" json:"id"`
	UserID     uint       `gorm:"index;not null" json:"user_id"`
	User       *User      `gorm:"constraint:OnDelete:CASCADE" json:"-"`
	KeyHash    string     `gorm:"uniqueIndex;size:128;not null" json:"-"`
	CreatedAt  time.Time  `json:"created_at"`
	UpdatedAt  time.Time  `json:"updated_at"`
	RevokedAt  *time.Time `gorm:"index" json:"revoked_at,omitempty"`
	LastUsedAt *time.Time `json:"last_used_at,omitempty"`
}

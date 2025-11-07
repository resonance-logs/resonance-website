package models

import "time"

// User represents an authenticated user in the system, backed primarily by a Discord identity.
type User struct {
	ID                uint      `gorm:"primaryKey" json:"id"`
	DiscordUserID     string    `gorm:"uniqueIndex;size:64" json:"discord_user_id"`
	DiscordUsername   string    `gorm:"size:255" json:"discord_username"`
	DiscordGlobalName string    `gorm:"size:255" json:"discord_global_name"`
	AvatarURL         string    `gorm:"size:512" json:"avatar_url"`
	Email             string    `gorm:"size:255" json:"email,omitempty"`
	Role              string    `gorm:"size:32;default:user" json:"role"`
	CreatedAt         time.Time `json:"created_at"`
	UpdatedAt         time.Time `json:"updated_at"`
	LastLoginAt       time.Time `json:"last_login_at"`
}

package models

import "time"

// User represents an authenticated user in the system, backed primarily by a Discord identity.
type User struct {
	ID uint `gorm:"primaryKey" json:"id"`
	// OAuth tokens obtained from Discord. Stored as text in DB; omitted from JSON responses for safety.
	DiscordAccessToken  string    `gorm:"size:2048" json:"-"`
	DiscordRefreshToken string    `gorm:"size:2048" json:"-"`
	DiscordUserID       string    `gorm:"uniqueIndex;size:64" json:"discord_user_id"`
	// Cached Discord user data to avoid API calls on every request
	DiscordUsername    string  `gorm:"size:255" json:"discord_username"`
	DiscordGlobalName  *string `gorm:"size:255" json:"discord_global_name,omitempty"`
	DiscordAvatarURL   *string `gorm:"size:512" json:"discord_avatar_url,omitempty"`
	Role               string  `gorm:"size:32;default:user" json:"role"`
	CreatedAt          time.Time `json:"created_at"`
	UpdatedAt          time.Time `json:"updated_at"`
	// Nullable last-login timestamp
	LastLoginAt *time.Time `json:"last_login_at,omitempty"`
}

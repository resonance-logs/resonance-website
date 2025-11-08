package models

import "time"

// Encounter represents a combat encounter.
type Encounter struct {
	ID            int64      `gorm:"primaryKey;autoIncrement;column:id" json:"id"`
	StartedAt     time.Time  `gorm:"column:started_at;not null" json:"startedAt"`
	EndedAt       *time.Time `gorm:"column:ended_at" json:"endedAt,omitempty"`
	LocalPlayerID *int64     `gorm:"column:local_player_id;index" json:"localPlayerId,omitempty"`
	TotalDmg      int64      `gorm:"column:total_dmg;default:0" json:"totalDmg"`
	TotalHeal     int64      `gorm:"column:total_heal;default:0" json:"totalHeal"`
	SceneID       *int64     `gorm:"column:scene_id" json:"sceneId,omitempty"`
	SceneName     *string    `gorm:"column:scene_name;size:255" json:"sceneName,omitempty"`
	// Ownership
	UserID uint `gorm:"column:user_id;index" json:"-"`
}

// TableName sets the insert table name for this struct type
func (Encounter) TableName() string {
	return "encounters"
}

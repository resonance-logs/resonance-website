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
	SceneID       *string    `gorm:"column:scene_id;size:255" json:"sceneId,omitempty"`
	SceneName     *string    `gorm:"column:scene_name;size:255" json:"sceneName,omitempty"`
}

// TableName sets the insert table name for this struct type
func (Encounter) TableName() string {
	return "encounters"
}

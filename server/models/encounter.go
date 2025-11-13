package models

import "time"

// Encounter represents a combat encounter.
type Encounter struct {
	ID            int64      `gorm:"primaryKey;autoIncrement;column:id" json:"id"`
	StartedAt     time.Time  `gorm:"column:started_at;not null" json:"startedAt"`
	EndedAt       *time.Time `gorm:"column:ended_at" json:"endedAt,omitempty"`
	Duration      float64    `gorm:"column:duration;default:0" json:"duration"`
	LocalPlayerID *int64     `gorm:"column:local_player_id;index" json:"localPlayerId,omitempty"`
	TotalDmg      int64      `gorm:"column:total_dmg;default:0" json:"totalDmg"`
	TotalHeal     int64      `gorm:"column:total_heal;default:0" json:"totalHeal"`
	SceneID       *int64     `gorm:"column:scene_id" json:"sceneId,omitempty"`
	SceneName     *string    `gorm:"column:scene_name;size:255" json:"sceneName,omitempty"`
	SourceHash    *string    `gorm:"column:source_hash;size:64;index:idx_user_source_hash,composite:user_id" json:"sourceHash,omitempty"`

	// Deduplication fields
	Fingerprint   *string `gorm:"column:fingerprint;size:64;index:idx_fingerprint;uniqueIndex:uniq_fingerprint" json:"fingerprint,omitempty"`
	PlayerSetHash *string `gorm:"column:player_set_hash;size:64;index:idx_player_set_hash" json:"playerSetHash,omitempty"`

	// Ownership
	UserID uint  `gorm:"column:user_id;index;index:idx_user_source_hash,composite:user_id" json:"-"`
	User   *User `gorm:"foreignKey:UserID" json:"user,omitempty"`

	// Related data
	Bosses           []EncounterBoss      `gorm:"foreignKey:EncounterID" json:"bosses,omitempty"`
	Players          []ActorEncounterStat `gorm:"foreignKey:EncounterID" json:"players,omitempty"`
	Attempts         []Attempt            `gorm:"foreignKey:EncounterID" json:"attempts,omitempty"`
	DamageSkillStats []DamageSkillStat    `gorm:"foreignKey:EncounterID" json:"damageSkillStats,omitempty"`
	HealSkillStats   []HealSkillStat      `gorm:"foreignKey:EncounterID" json:"healSkillStats,omitempty"`
	DeathEvents      []DeathEvent         `gorm:"foreignKey:EncounterID" json:"deathEvents,omitempty"`
	Phases           []EncounterPhase     `gorm:"foreignKey:EncounterID" json:"phases,omitempty"`
}

// TableName sets the insert table name for this struct type
func (Encounter) TableName() string {
	return "encounters"
}

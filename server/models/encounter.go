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
	// PartyFingerprint is a hash of the encounter without uploader-specific data (scene, bosses, players, time)
	// Used to detect when party members upload the same encounter
	PartyFingerprint *string `gorm:"column:party_fingerprint;size:64;index:idx_party_fingerprint" json:"partyFingerprint,omitempty"`
	// Client version of the uploader application (e.g. "0.15.0")
	ClientVersion *string `gorm:"column:client_version;size:64;index:idx_client_version" json:"clientVersion,omitempty"`

	// Ownership - UserID is the original uploader
	UserID uint  `gorm:"column:user_id;index;index:idx_user_source_hash,composite:user_id" json:"-"`
	User   *User `gorm:"foreignKey:UserID" json:"user,omitempty"`

	// Owners - many-to-many relationship for all users who have claim to this encounter
	Owners []EncounterOwner `gorm:"foreignKey:EncounterID;constraint:OnDelete:CASCADE" json:"owners,omitempty"`

	// Related data
	Bosses           []EncounterBoss      `gorm:"foreignKey:EncounterID;constraint:OnDelete:CASCADE" json:"bosses,omitempty"`
	Players          []ActorEncounterStat `gorm:"foreignKey:EncounterID;constraint:OnDelete:CASCADE" json:"players,omitempty"`
	Attempts         []Attempt            `gorm:"foreignKey:EncounterID;constraint:OnDelete:CASCADE" json:"attempts,omitempty"`
	DamageSkillStats []DamageSkillStat    `gorm:"foreignKey:EncounterID;constraint:OnDelete:CASCADE" json:"damageSkillStats,omitempty"`
	HealSkillStats   []HealSkillStat      `gorm:"foreignKey:EncounterID;constraint:OnDelete:CASCADE" json:"healSkillStats,omitempty"`
	DeathEvents      []DeathEvent         `gorm:"foreignKey:EncounterID;constraint:OnDelete:CASCADE" json:"deathEvents,omitempty"`
	DungeonSegments  []DungeonSegment     `gorm:"foreignKey:EncounterID;constraint:OnDelete:CASCADE" json:"dungeonSegments,omitempty"`
	EncounterBuffs   []EncounterBuff      `gorm:"foreignKey:EncounterID;constraint:OnDelete:CASCADE" json:"encounterBuffs,omitempty"`

	// Timestamps
	CreatedAt time.Time `gorm:"column:created_at;autoCreateTime" json:"createdAt"`
	UpdatedAt time.Time `gorm:"column:updated_at;autoUpdateTime" json:"updatedAt"`
}

// TableName sets the insert table name for this struct type
func (Encounter) TableName() string {
	return "encounters"
}

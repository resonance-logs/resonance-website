package models

import "time"

// DetailedPlayerData stores extended player metadata including character build information.
// This table is keyed by player_id and stores JSON serialized character and profession data.
type DetailedPlayerData struct {
	PlayerID           int64   `gorm:"primaryKey;column:player_id" json:"playerId"`
	UserID             *uint   `gorm:"column:user_id;index" json:"userId,omitempty"`
	LastSeenMs         int64   `gorm:"column:last_seen_ms;not null" json:"lastSeenMs"`
	CharSerializeJSON  string  `gorm:"column:char_serialize_json;type:text;not null" json:"charSerializeJson"`
	ProfessionListJSON string  `gorm:"column:profession_list_json;type:text" json:"professionListJson,omitempty"`
	TalentNodeIDsJSON  string  `gorm:"column:talent_node_ids_json;type:text" json:"talentNodeIdsJson,omitempty"`
	RegionID           *int64  `gorm:"column:region_id;index" json:"regionId,omitempty"`
	AbilityScore       *int64  `gorm:"column:ability_score;index" json:"abilityScore,omitempty"`
	PlayerName         *string `gorm:"column:player_name;index" json:"playerName,omitempty"`

	// Timestamps
	CreatedAt time.Time `gorm:"column:created_at;autoCreateTime" json:"createdAt"`
	UpdatedAt time.Time `gorm:"column:updated_at;autoUpdateTime" json:"updatedAt"`

	// Relationship
	User *User `gorm:"foreignKey:UserID" json:"user,omitempty"`
}

func (DetailedPlayerData) TableName() string {
	return "detailed_playerdata"
}

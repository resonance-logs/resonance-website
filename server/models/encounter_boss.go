package models

// EncounterBoss stores boss info per encounter.
type EncounterBoss struct {
	ID          int64  `gorm:"primaryKey;autoIncrement;column:id" json:"id"`
	EncounterID int64  `gorm:"column:encounter_id;index;not null" json:"encounterId"`
	MonsterName string `gorm:"column:monster_name;size:255;not null" json:"monsterName"`
	Hits        int64  `gorm:"column:hits;default:0" json:"hits"`
	TotalDamage int64  `gorm:"column:total_damage;default:0" json:"totalDamage"`
	MaxHP       *int64 `gorm:"column:max_hp" json:"maxHp,omitempty"`
	IsDefeated  bool   `gorm:"column:is_defeated;default:false" json:"isDefeated"`
}

func (EncounterBoss) TableName() string {
	return "encounter_bosses"
}

package models

import "gorm.io/datatypes"

// HealSkillStat aggregates heals per skill/healer/target.
type HealSkillStat struct {
	ID          int64          `gorm:"primaryKey;autoIncrement;column:id" json:"id"`
	EncounterID int64          `gorm:"column:encounter_id;index;not null" json:"encounterId"`
	HealerID    int64          `gorm:"column:healer_id;index;not null" json:"healerId"`
	TargetID    *int64         `gorm:"column:target_id;index" json:"targetId,omitempty"`
	SkillID     int64          `gorm:"column:skill_id;index;not null" json:"skillId"`
	Hits        int64          `gorm:"column:hits;default:0" json:"hits"`
	TotalValue  int64          `gorm:"column:total_value;default:0" json:"totalValue"`
	CritHits    int64          `gorm:"column:crit_hits;default:0" json:"critHits"`
	LuckyHits   int64          `gorm:"column:lucky_hits;default:0" json:"luckyHits"`
	CritTotal   int64          `gorm:"column:crit_total;default:0" json:"critTotal"`
	LuckyTotal  int64          `gorm:"column:lucky_total;default:0" json:"luckyTotal"`
	HealDetails datatypes.JSON `gorm:"column:heal_details;type:jsonb" json:"healDetails,omitempty"`
	MonsterName *string        `gorm:"column:monster_name;size:255" json:"monsterName,omitempty"`
}

func (HealSkillStat) TableName() string {
	return "heal_skill_stats"
}

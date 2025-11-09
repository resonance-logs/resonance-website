package models

import "gorm.io/datatypes"

// DamageSkillStat aggregates damage per skill/attacker/defender.
type DamageSkillStat struct {
	ID              int64          `gorm:"primaryKey;autoIncrement;column:id" json:"id"`
	AttackerID      int64          `gorm:"column:attacker_id;index;not null" json:"attackerId"`
	DefenderID      *int64         `gorm:"column:defender_id;index" json:"defenderId,omitempty"`
	SkillID         int64          `gorm:"column:skill_id;index;not null" json:"skillId"`
	Hits            int64          `gorm:"column:hits;default:0" json:"hits"`
	TotalValue      int64          `gorm:"column:total_value;default:0" json:"totalValue"`
	CritHits        int64          `gorm:"column:crit_hits;default:0" json:"critHits"`
	LuckyHits       int64          `gorm:"column:lucky_hits;default:0" json:"luckyHits"`
	CritTotal       int64          `gorm:"column:crit_total;default:0" json:"critTotal"`
	LuckyTotal      int64          `gorm:"column:lucky_total;default:0" json:"luckyTotal"`
	HpLossTotal     int64          `gorm:"column:hp_loss_total;default:0" json:"hpLossTotal"`
	ShieldLossTotal int64          `gorm:"column:shield_loss_total;default:0" json:"shieldLossTotal"`
	HitDetails      datatypes.JSON `gorm:"column:hit_details;type:jsonb" json:"hitDetails,omitempty"`
	MonsterName     *string        `gorm:"column:monster_name;size:255" json:"monsterName,omitempty"`

	// Foreign Key To Encounter
	EncounterID     int64          `gorm:"column:encounter_id;index;not null;constraint:OnDelete:CASCADE" json:"encounterId"`
	Encounter       *Encounter     `gorm:"foreignKey:EncounterID;references:ID" json:"-"`
}

func (DamageSkillStat) TableName() string {
	return "damage_skill_stats"
}

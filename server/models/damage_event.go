package models

import "time"

// DamageEvent records a single damage event.
type DamageEvent struct {
	ID            int64     `gorm:"primaryKey;autoIncrement;column:id" json:"id"`
	EncounterID   int64     `gorm:"column:encounter_id;index;not null" json:"encounterId"`
	Timestamp     time.Time `gorm:"column:timestamp;index;not null" json:"timestamp"`
	AttackerID    int64     `gorm:"column:attacker_id;not null" json:"attackerId"`
	DefenderID    *int64    `gorm:"column:defender_id;index" json:"defenderId,omitempty"`
	SkillID       *int64    `gorm:"column:skill_id" json:"skillId,omitempty"`
	Value         int64     `gorm:"column:value;not null" json:"value"`
	IsCrit        bool      `gorm:"column:is_crit;default:false" json:"isCrit"`
	IsLucky       bool      `gorm:"column:is_lucky;default:false" json:"isLucky"`
	HpLoss        int64     `gorm:"column:hp_loss;default:0" json:"hpLoss"`
	ShieldLoss    int64     `gorm:"column:shield_loss;default:0" json:"shieldLoss"`
	IsBoss        bool      `gorm:"column:is_boss;default:false" json:"isBoss"`
	MonsterName   *string   `gorm:"column:monster_name;size:255" json:"monsterName,omitempty"`
	DefenderMaxHP *int64    `gorm:"column:defender_max_hp" json:"defenderMaxHp,omitempty"`
	AttemptIndex  int       `gorm:"column:attempt_index;default:1" json:"attemptIndex"`
}

func (DamageEvent) TableName() string {
	return "damage_events"
}

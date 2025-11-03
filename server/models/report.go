package models

import (
	"time"
)

// Report represents a combat log report stored in the database
type Report struct {
	ID        uint      `gorm:"primaryKey;autoIncrement" json:"-"`
	ReportID  string    `gorm:"uniqueIndex;type:varchar(255);not null" json:"reportId"`
	Title     string    `gorm:"type:varchar(500)" json:"title"`
	Owner     string    `gorm:"type:varchar(255)" json:"owner"`
	StartTime time.Time `gorm:"type:datetime" json:"startTime,omitempty"`
	EndTime   time.Time `gorm:"type:datetime" json:"endTime,omitempty"`
	CreatedAt time.Time `gorm:"autoCreateTime" json:"-"`
	UpdatedAt time.Time `gorm:"autoUpdateTime" json:"-"`
	Fights    []Fight   `gorm:"foreignKey:ReportID;references:ReportID" json:"fights,omitempty"`
}

// FightSummary is a lightweight DTO for listing fights (not stored directly)
type FightSummary struct {
	ID        int    `json:"id"`
	Name      string `json:"name"`
	StartTime string `json:"startTime,omitempty"`
	EndTime   string `json:"endTime,omitempty"`
	Duration  int64  `json:"duration,omitempty"`
	Boss      bool   `json:"boss"`
	Kill      bool   `json:"kill"`
}

// Fight represents a single encounter/fight within a report
type Fight struct {
	ID              uint                `gorm:"primaryKey;autoIncrement" json:"-"`
	ReportID        string              `gorm:"type:varchar(255);not null;index" json:"-"`
	FightID         int                 `gorm:"not null" json:"id"`
	Name            string              `gorm:"type:varchar(255)" json:"name"`
	StartTime       time.Time           `gorm:"type:datetime" json:"startTime,omitempty"`
	EndTime         time.Time           `gorm:"type:datetime" json:"endTime,omitempty"`
	Duration        int64               `json:"duration"`
	Boss            bool                `gorm:"default:false" json:"boss"`
	Kill            bool                `gorm:"default:false" json:"kill"`
	CreatedAt       time.Time           `gorm:"autoCreateTime" json:"-"`
	UpdatedAt       time.Time           `gorm:"autoUpdateTime" json:"-"`
	Players         []PlayerPerformance `gorm:"foreignKey:FightDBID;references:ID" json:"players,omitempty"`
	Report          *Report             `gorm:"foreignKey:ReportID;references:ReportID" json:"-"`
}

// PlayerPerformance represents a player's performance in a fight
type PlayerPerformance struct {
	ID           uint      `gorm:"primaryKey;autoIncrement" json:"-"`
	FightDBID    uint      `gorm:"not null;index" json:"-"`
	PlayerID     int       `gorm:"not null" json:"id"`
	Name         string    `gorm:"type:varchar(255)" json:"name"`
	Class        string    `gorm:"type:varchar(100)" json:"class"`
	DamageTotal  int64     `gorm:"default:0" json:"damageTotal"`
	DamageDPS    float64   `gorm:"type:decimal(15,2);default:0" json:"damageDps"`
	HealingTotal int64     `gorm:"default:0" json:"healingTotal"`
	HealingHPS   float64   `gorm:"type:decimal(15,2);default:0" json:"healingHps"`
	CreatedAt    time.Time `gorm:"autoCreateTime" json:"-"`
	UpdatedAt    time.Time `gorm:"autoUpdateTime" json:"-"`
	Fight        *Fight    `gorm:"foreignKey:FightDBID;references:ID" json:"-"`
}

// Status represents processing status for a report
type Status struct {
	ID        uint      `gorm:"primaryKey;autoIncrement" json:"-"`
	ReportID  string    `gorm:"uniqueIndex;type:varchar(255);not null" json:"reportId"`
	Status    string    `gorm:"type:varchar(50);default:'processing'" json:"status"` // processing, completed, failed
	Progress  int       `gorm:"default:0" json:"progress"`
	Message   string    `gorm:"type:text" json:"message,omitempty"`
	CreatedAt time.Time `gorm:"autoCreateTime" json:"-"`
	UpdatedAt time.Time `gorm:"autoUpdateTime" json:"-"`
}

package models

import (
	"time"

	"gorm.io/datatypes"
)

// ReportRow is the persisted representation of a report stored in Postgres.
type ReportRow struct {
	ID             int64          `gorm:"primaryKey;autoIncrement;column:id" json:"id"`
	ReportID       string         `gorm:"column:report_id;uniqueIndex;not null" json:"reportId"`
	Title          *string        `gorm:"column:title" json:"title,omitempty"`
	Owner          *string        `gorm:"column:owner" json:"owner,omitempty"`
	StartTime      *time.Time     `gorm:"column:start_time" json:"startTime,omitempty"`
	EndTime        *time.Time     `gorm:"column:end_time" json:"endTime,omitempty"`
	FightSummaries datatypes.JSON `gorm:"column:fight_summaries;type:jsonb" json:"fights,omitempty"`
	Fights         datatypes.JSON `gorm:"column:fights;type:jsonb" json:"-"`
	Status         string         `gorm:"column:status;default:'queued'" json:"status"`
	Progress       int            `gorm:"column:progress;default:0" json:"progress"`
	Message        *string        `gorm:"column:message" json:"message,omitempty"`
	CreatedAt      time.Time      `gorm:"column:created_at;autoCreateTime" json:"createdAt"`
	UpdatedAt      time.Time      `gorm:"column:updated_at;autoUpdateTime" json:"updatedAt"`
}

func (ReportRow) TableName() string {
	return "reports"
}

package models

type Report struct {
    ReportID  string         `json:"reportId"`
    Title     string         `json:"title"`
    Owner     string         `json:"owner"`
    StartTime string         `json:"startTime,omitempty"`
    EndTime   string         `json:"endTime,omitempty"`
    CreatedAt string         `json:"createdAt,omitempty"`
    UpdatedAt string         `json:"updatedAt,omitempty"`
    Fights    []FightSummary `json:"fights,omitempty"`
}

type FightSummary struct {
	ID        int    `json:"id"`
	Name      string `json:"name"`
	StartTime string `json:"startTime,omitempty"`
	EndTime   string `json:"endTime,omitempty"`
	Duration  int64  `json:"duration,omitempty"`
	Boss      bool   `json:"boss"`
	Kill      bool   `json:"kill"`
}

type Fight struct {
	ID       int                 `json:"id"`
	Name     string              `json:"name"`
	Duration int64               `json:"duration"`
	Players  []PlayerPerformance `json:"players,omitempty"`
}

type PlayerPerformance struct {
	ID     int    `json:"id"`
	Name   string `json:"name"`
	Class  string `json:"class"`
	Damage struct {
		Total int64   `json:"total"`
		DPS   float64 `json:"dps"`
	} `json:"damage"`
	Healing struct {
		Total int64   `json:"total"`
		HPS   float64 `json:"hps"`
	} `json:"healing"`
}

// Status represents processing status for a report
type Status struct {
	Status   string `json:"status"` // processing, completed, failed
	Progress int    `json:"progress"`
	Message  string `json:"message,omitempty"`
}

const (
	StatusQueued     = "queued"
	StatusProcessing = "processing"
	StatusCompleted  = "completed"
	StatusFailed     = "failed"
)

// Report represents a single report, which contains multiple fights.
// It is the top-level object for a log file.

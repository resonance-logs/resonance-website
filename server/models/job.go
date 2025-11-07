package models

import "time"

const (
	JobStatusQueued   = "queued"
	JobStatusRunning  = "running"
	JobStatusFailed   = "failed"
	JobStatusComplete = "complete"
)

// Job represents a background task that needs to be run.
type Job struct {
	ID          string    `json:"id" gorm:"primaryKey"`
	Type        string    `json:"type"`
	Payload     string    `json:"payload"` // JSON-encoded payload
	Status      string    `json:"status"`
	LastError   string    `json:"lastError,omitempty"`
	RetryCount  int       `json:"retryCount"`
	MaxRetries  int       `json:"maxRetries"`
	LastAttempt *time.Time `json:"lastAttempt,omitempty"`
	CreatedAt   time.Time `json:"createdAt"`
	UpdatedAt   time.Time `json:"updatedAt"`
}

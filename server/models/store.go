package models

import "errors"

// ErrNotFound is returned by store read operations when a record is missing.
var ErrNotFound = errors.New("not found")

// ReportStore defines the minimal store interface used by controllers.
// Methods return an error so callers can distinguish between not-found and
// other failures.
type ReportStore interface {
	SaveReport(r *Report) error
	GetReport(id string) (*Report, error)

	SaveFight(reportID string, f *Fight) error
	GetFight(reportID string, fightID int) (*Fight, error)

	SetStatus(reportID string, st *Status) error
	GetStatus(reportID string) (*Status, error)
}

// NoopReportStore is a minimal implementation used when no persistent store
// is configured. It intentionally performs no writes and returns not-found
// for reads.
type NoopReportStore struct{}

func (n *NoopReportStore) SaveReport(r *Report) error                { return nil }
func (n *NoopReportStore) GetReport(id string) (*Report, error)      { return nil, ErrNotFound }
func (n *NoopReportStore) SaveFight(reportID string, f *Fight) error { return nil }
func (n *NoopReportStore) GetFight(reportID string, fightID int) (*Fight, error) {
	return nil, ErrNotFound
}
func (n *NoopReportStore) SetStatus(reportID string, st *Status) error { return nil }
func (n *NoopReportStore) GetStatus(reportID string) (*Status, error)  { return nil, ErrNotFound }

// Store is the package-level ReportStore used by controllers. The application
// should replace this with a GORM-backed implementation during startup when
// a database is configured.
var Store ReportStore = &NoopReportStore{}

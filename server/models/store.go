package models

import (
	"sort"
	"sync"
	"time"
)

// ReportStore defines the minimal store interface used by controllers.
// Methods return an error so callers can distinguish between not-found and
// other failures.
type ReportStore interface {
	SaveReport(r *Report) error
	GetReport(reportID string) (*Report, error)
	SaveFight(reportID string, fight *Fight) error
	GetFight(reportID string, fightID int) (*Fight, error)
	SetStatus(reportID string, status Status) error
	GetStatus(reportID string) (*Status, error)
	ListReports(page, pageSize int, filters ReportFilters, sortOpt SortOptions) ([]*Report, int, error)
}

// ReportFilters defines the available filters for listing reports.
type ReportFilters struct {
	Owner     string
	Status    string
	StartDate string
	EndDate   string
}

// SortOptions defines the available sorting options for listing reports.
type SortOptions struct {
	SortBy    string // title | owner | created_at
	SortOrder string // asc | desc
}

// Store is the default store used by controllers. It can be overridden at runtime
// (e.g., in main.go) to a GORM-backed implementation when a database is configured.
var Store ReportStore = NewMemoryReportStore()

// MemoryReportStore is a simple in-memory store suitable for development.
type MemoryReportStore struct {
	mu       sync.RWMutex
	reports  map[string]*Report
	statuses map[string]*Status
	fights   map[string][]*Fight // reportID -> fights
}

func NewMemoryReportStore() *MemoryReportStore {
	return &MemoryReportStore{
		reports:  make(map[string]*Report),
		statuses: make(map[string]*Status),
		fights:   make(map[string][]*Fight),
	}
}

func (s *MemoryReportStore) SaveReport(r *Report) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	// set timestamps
	now := time.Now()
	if _, exists := s.reports[r.ReportID]; !exists {
		r.CreatedAt = now.Format(time.RFC3339)
	}
	r.UpdatedAt = now.Format(time.RFC3339)
	s.reports[r.ReportID] = r
	return nil
}

func (s *MemoryReportStore) GetReport(reportID string) (*Report, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	if r, ok := s.reports[reportID]; ok {
		return r, nil
	}
	return nil, ErrNotFound
}

func (s *MemoryReportStore) SaveFight(reportID string, fight *Fight) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.fights[reportID] = append(s.fights[reportID], fight)
	return nil
}

func (s *MemoryReportStore) GetFight(reportID string, fightID int) (*Fight, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	fights := s.fights[reportID]
	for _, f := range fights {
		if f.ID == fightID {
			return f, nil
		}
	}
	return nil, ErrNotFound
}

func (s *MemoryReportStore) SetStatus(reportID string, status Status) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	st := status // copy
	s.statuses[reportID] = &st
	return nil
}

func (s *MemoryReportStore) GetStatus(reportID string) (*Status, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	if st, ok := s.statuses[reportID]; ok {
		return st, nil
	}
	return nil, ErrNotFound
}

func (s *MemoryReportStore) ListReports(page, pageSize int, filters ReportFilters, sortOpt SortOptions) ([]*Report, int, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	// collect
	all := make([]*Report, 0, len(s.reports))
	for _, r := range s.reports {
		all = append(all, r)
	}

	// filter
	filtered := make([]*Report, 0, len(all))
	var startTS, endTS *time.Time
	if filters.StartDate != "" {
		if t, err := parseDate(filters.StartDate); err == nil {
			startTS = &t
		}
	}
	if filters.EndDate != "" {
		if t, err := parseDate(filters.EndDate); err == nil {
			endTS = &t
		}
	}
	for _, r := range all {
		if filters.Owner != "" && r.Owner != filters.Owner {
			continue
		}
		if filters.Status != "" {
			if st, ok := s.statuses[r.ReportID]; !ok || st.Status != filters.Status {
				continue
			}
		}
		// parse report createdAt
		rt, err := parseDate(r.CreatedAt)
		if err == nil {
			if startTS != nil && rt.Before(*startTS) {
				continue
			}
			if endTS != nil && rt.After(*endTS) {
				continue
			}
		}
		filtered = append(filtered, r)
	}

	// sort
	sort.Slice(filtered, func(i, j int) bool {
		asc := sortOpt.SortOrder == "asc"
		switch sortOpt.SortBy {
		case "title":
			if asc {
				return filtered[i].Title < filtered[j].Title
			}
			return filtered[i].Title > filtered[j].Title
		case "owner":
			if asc {
				return filtered[i].Owner < filtered[j].Owner
			}
			return filtered[i].Owner > filtered[j].Owner
		default: // created_at
			ti, _ := parseDate(filtered[i].CreatedAt)
			tj, _ := parseDate(filtered[j].CreatedAt)
			if asc {
				return ti.Before(tj)
			}
			return ti.After(tj)
		}
	})

	total := len(filtered)
	if pageSize <= 0 {
		pageSize = 10
	}
	if page <= 0 {
		page = 1
	}
	start := (page - 1) * pageSize
	if start >= total {
		return []*Report{}, total, nil
	}
	end := start + pageSize
	if end > total {
		end = total
	}
	return filtered[start:end], total, nil
}

func parseDate(s string) (time.Time, error) {
	// Try RFC3339 first, then YYYY-MM-DD
	if t, err := time.Parse(time.RFC3339, s); err == nil {
		return t, nil
	}
	return time.Parse("2006-01-02", s)
}

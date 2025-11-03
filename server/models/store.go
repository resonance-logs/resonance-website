package models

import (
	"sync"
)

// InMemoryStore is a simple thread-safe in-memory store for reports and statuses.
type InMemoryStore struct {
	mu       sync.RWMutex
	reports  map[string]*Report
	fights   map[string]map[int]*Fight
	statuses map[string]*Status
}

func NewInMemoryStore() *InMemoryStore {
	return &InMemoryStore{
		reports:  make(map[string]*Report),
		fights:   make(map[string]map[int]*Fight),
		statuses: make(map[string]*Status),
	}
}

func (s *InMemoryStore) SaveReport(r *Report) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.reports[r.ReportID] = r
}

func (s *InMemoryStore) GetReport(id string) (*Report, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	r, ok := s.reports[id]
	return r, ok
}

func (s *InMemoryStore) SaveFight(reportID string, f *Fight) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.fights[reportID] == nil {
		s.fights[reportID] = make(map[int]*Fight)
	}
	s.fights[reportID][f.FightID] = f
}

func (s *InMemoryStore) GetFight(reportID string, fightID int) (*Fight, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	m, ok := s.fights[reportID]
	if !ok {
		return nil, false
	}
	f, ok := m[fightID]
	return f, ok
}

func (s *InMemoryStore) SetStatus(reportID string, st *Status) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.statuses[reportID] = st
}

func (s *InMemoryStore) GetStatus(reportID string) (*Status, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	st, ok := s.statuses[reportID]
	return st, ok
}

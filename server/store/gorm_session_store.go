package store

import (
	"context"
	"time"

	"server/models"

	"gorm.io/gorm"
)

// SessionStore defines persistence operations for sessions.
type SessionStore interface {
	CreateSession(ctx context.Context, session *models.Session) error
	GetByToken(ctx context.Context, token string) (*models.Session, error)
	RevokeSession(ctx context.Context, token string) error
}

type GormSessionStore struct {
	db *gorm.DB
}

func NewGormSessionStore(db *gorm.DB) *GormSessionStore {
	return &GormSessionStore{db: db}
}

func (s *GormSessionStore) CreateSession(ctx context.Context, session *models.Session) error {
	return s.db.WithContext(ctx).Create(session).Error
}

func (s *GormSessionStore) GetByToken(ctx context.Context, token string) (*models.Session, error) {
	var session models.Session
	if err := s.db.WithContext(ctx).
		Where("session_token = ? AND (revoked_at IS NULL) AND expires_at > ?", token, time.Now()).
		First(&session).Error; err != nil {
		return nil, err
	}
	return &session, nil
}

func (s *GormSessionStore) RevokeSession(ctx context.Context, token string) error {
	return s.db.WithContext(ctx).
		Model(&models.Session{}).
		Where("session_token = ? AND revoked_at IS NULL", token).
		Update("revoked_at", time.Now()).Error
}

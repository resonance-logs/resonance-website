package store

import (
	"context"

	"server/models"

	"gorm.io/gorm"
)

// APITokenStore defines persistence operations for API tokens.
type APITokenStore interface {
	Create(ctx context.Context, token *models.APIToken) error
	GetByHash(ctx context.Context, hash string) (*models.APIToken, error)
	Revoke(ctx context.Context, id uint) error
}

type GormAPITokenStore struct {
	db *gorm.DB
}

func NewGormAPITokenStore(db *gorm.DB) *GormAPITokenStore {
	return &GormAPITokenStore{db: db}
}

func (s *GormAPITokenStore) Create(ctx context.Context, token *models.APIToken) error {
	return s.db.WithContext(ctx).Create(token).Error
}

func (s *GormAPITokenStore) GetByHash(ctx context.Context, hash string) (*models.APIToken, error) {
	var token models.APIToken
	if err := s.db.WithContext(ctx).Where("token_hash = ?", hash).First(&token).Error; err != nil {
		return nil, err
	}
	return &token, nil
}

func (s *GormAPITokenStore) Revoke(ctx context.Context, id uint) error {
	return s.db.WithContext(ctx).
		Model(&models.APIToken{}).
		Where("id = ?", id).
		Update("revoked_at", gorm.Expr("NOW()")).Error
}

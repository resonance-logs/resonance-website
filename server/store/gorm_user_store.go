package store

import (
	"context"

	"server/models"

	"gorm.io/gorm"
)

// UserStore defines persistence operations for users.
type UserStore interface {
	GetByID(ctx context.Context, id uint) (*models.User, error)
	GetByDiscordID(ctx context.Context, discordID string) (*models.User, error)
	CreateOrUpdateFromDiscord(ctx context.Context, u *models.User) (*models.User, error)
}

type GormUserStore struct {
	db *gorm.DB
}

func NewGormUserStore(db *gorm.DB) *GormUserStore {
	return &GormUserStore{db: db}
}

func (s *GormUserStore) GetByID(ctx context.Context, id uint) (*models.User, error) {
	var user models.User
	if err := s.db.WithContext(ctx).First(&user, id).Error; err != nil {
		return nil, err
	}
	return &user, nil
}

func (s *GormUserStore) GetByDiscordID(ctx context.Context, discordID string) (*models.User, error) {
	var user models.User
	if err := s.db.WithContext(ctx).Where("discord_user_id = ?", discordID).First(&user).Error; err != nil {
		return nil, err
	}
	return &user, nil
}

// CreateOrUpdateFromDiscord upserts a user using Discord identity as the stable key.
func (s *GormUserStore) CreateOrUpdateFromDiscord(ctx context.Context, u *models.User) (*models.User, error) {
	var existing models.User
	err := s.db.WithContext(ctx).Where("discord_user_id = ?", u.DiscordUserID).First(&existing).Error
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			if err := s.db.WithContext(ctx).Create(u).Error; err != nil {
				return nil, err
			}
			return u, nil
		}
		return nil, err
	}

	existing.DiscordUsername = u.DiscordUsername
	existing.DiscordGlobalName = u.DiscordGlobalName
	existing.DiscordAccessToken = u.DiscordAccessToken
	existing.DiscordRefreshToken = u.DiscordRefreshToken
	existing.LastLoginAt = u.LastLoginAt

	if err := s.db.WithContext(ctx).Save(&existing).Error; err != nil {
		return nil, err
	}
	return &existing, nil
}

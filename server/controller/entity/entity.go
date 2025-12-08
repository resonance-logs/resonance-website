package entity

import (
	"net/http"
	"strconv"
	"strings"

	apiErrors "server/controller"
	"server/middleware"
	"server/models"

	"github.com/gin-gonic/gin"
	"gorm.io/datatypes"
	"gorm.io/gorm"
)

// EntityLeaderboardEntry represents a single entity in the leaderboard
type EntityLeaderboardEntry struct {
	EntityID     int64             `json:"entityId"`
	Name         *string           `json:"name,omitempty"`
	ClassID      *int64            `json:"classId,omitempty"`
	ClassSpec    *int64            `json:"classSpec,omitempty"`
	AbilityScore *int64            `json:"abilityScore,omitempty"`
	Level        *int              `json:"level,omitempty"`
	LinkedUser   *EntityLinkedUser `json:"user,omitempty"`
	UserID       *uint             `json:"userId,omitempty"` // Stored in cache, used to fetch user details on read
}

// EntityLinkedUser represents the linked user info for a leaderboard entry
type EntityLinkedUser struct {
	ID                uint              `json:"id"`
	DiscordUsername   string            `json:"discord_username"`
	DiscordGlobalName *string           `json:"discord_global_name,omitempty"`
	DiscordAvatarURL  *string           `json:"discord_avatar_url,omitempty"`
	Customization     datatypes.JSONMap `json:"customization,omitempty"`
}

// GetEntitiesResponse is the response for GET /api/v1/entities
type GetEntitiesResponse struct {
	Entities  []EntityLeaderboardEntry `json:"entities"`
	Total     int64                    `json:"total"`
	UpdatedAt string                   `json:"updatedAt,omitempty"`
}

// GET /api/v1/entities
// Query params: classId (optional)
// Returns the top 50 entities from Redis cache
func GetEntities(c *gin.Context) {
	// Parse filter params
	var classID *int64
	if v := strings.TrimSpace(c.Query("classId")); v != "" {
		if n, err := strconv.ParseInt(v, 10, 64); err == nil {
			classID = &n
		} else {
			c.JSON(http.StatusBadRequest, apiErrors.NewErrorResponse(http.StatusBadRequest, "Invalid classId"))
			return
		}
	}

	// Try to get from Redis cache
	redisClient := middleware.GetRedisClient()
	if redisClient != nil {
		cached, err := GetCachedLeaderboard(redisClient, classID)
		if err == nil && cached != nil {
			// If we have cached entities, we need to populate the user info on demand
			if len(cached.Entities) > 0 {
				dbAny, ok := c.Get("db")
				if ok {
					db := dbAny.(*gorm.DB)
					populateUserDetails(db, cached.Entities)
				}
			}

			c.JSON(http.StatusOK, GetEntitiesResponse{
				Entities:  cached.Entities,
				Total:     cached.Total,
				UpdatedAt: cached.UpdatedAt.Format("2006-01-02T15:04:05Z07:00"),
			})
			return
		}
	}

	// Cache miss or Redis not available - return empty with message
	// The background job should populate this
	c.JSON(http.StatusOK, GetEntitiesResponse{
		Entities: []EntityLeaderboardEntry{},
		Total:    0,
	})
}

// populateUserDetails fetches user data for the given entities and populates LinkedUser
func populateUserDetails(db *gorm.DB, entries []EntityLeaderboardEntry) {
	userIDSet := make(map[uint]struct{})
	for _, e := range entries {
		if e.UserID != nil {
			userIDSet[*e.UserID] = struct{}{}
		}
	}

	if len(userIDSet) == 0 {
		return
	}

	userIDs := make([]uint, 0, len(userIDSet))
	for id := range userIDSet {
		userIDs = append(userIDs, id)
	}

	var users []models.User
	if err := db.Model(&models.User{}).
		Select("id", "discord_username", "discord_global_name", "discord_avatar_url", "customization", "anonymize_uploader").
		Where("id IN ?", userIDs).
		Find(&users).Error; err != nil {
		return // Silently fail if DB error, just won't show user info
	}

	userByID := make(map[uint]models.User)
	for _, u := range users {
		userByID[u.ID] = u
	}

	for i := range entries {
		if entries[i].UserID != nil {
			if u, exists := userByID[*entries[i].UserID]; exists {
				if u.AnonymizeUploader {
					continue
				}
				entries[i].LinkedUser = &EntityLinkedUser{
					ID:                u.ID,
					DiscordUsername:   u.DiscordUsername,
					DiscordGlobalName: u.DiscordGlobalName,
					DiscordAvatarURL:  u.DiscordAvatarURL,
					Customization:     u.Customization,
				}
			}
		}
	}
}

// POST /api/v1/entities/refresh (admin only)
// Manually triggers a refresh of all leaderboard caches
func RefreshEntities(c *gin.Context) {
	dbAny, ok := c.Get("db")
	if !ok {
		c.JSON(http.StatusInternalServerError, apiErrors.NewErrorResponse(http.StatusInternalServerError, "Database not available in context"))
		return
	}
	db := dbAny.(*gorm.DB)

	redisClient := middleware.GetRedisClient()
	if redisClient == nil {
		c.JSON(http.StatusInternalServerError, apiErrors.NewErrorResponse(http.StatusInternalServerError, "Redis not available"))
		return
	}

	// Check if user is admin
	userAny, exists := c.Get("user")
	if !exists {
		c.JSON(http.StatusUnauthorized, apiErrors.NewErrorResponse(http.StatusUnauthorized, "Authentication required"))
		return
	}
	user, ok := userAny.(*models.User)
	if !ok || user.Role != "admin" {
		c.JSON(http.StatusForbidden, apiErrors.NewErrorResponse(http.StatusForbidden, "Admin access required"))
		return
	}

	// Run refresh in background
	go func() {
		RefreshAllLeaderboards(db, redisClient)
	}()

	c.JSON(http.StatusOK, gin.H{"message": "Leaderboard refresh started"})
}

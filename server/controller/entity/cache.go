package entity

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"time"

	"server/models"

	"github.com/redis/go-redis/v9"
	"gorm.io/gorm"
)

const (
	// Cache key prefix for entity leaderboard
	EntityLeaderboardKeyPrefix = "entity_leaderboard:"
	// TTL for cached leaderboard data (2 hours)
	EntityLeaderboardTTL = 2 * time.Hour
)

// CachedLeaderboard represents the cached leaderboard data
type CachedLeaderboard struct {
	Entities  []EntityLeaderboardEntry `json:"entities"`
	Total     int64                    `json:"total"`
	UpdatedAt time.Time                `json:"updatedAt"`
}

// getCacheKey generates the Redis key for a given class/spec filter
func getCacheKey(classID *int64) string {
	if classID != nil {
		return fmt.Sprintf("%sclass_%d", EntityLeaderboardKeyPrefix, *classID)
	}
	return EntityLeaderboardKeyPrefix + "all"
}

// ComputeAndCacheLeaderboard computes the leaderboard for a class and caches it
func ComputeAndCacheLeaderboard(db *gorm.DB, redisClient *redis.Client, classID *int64) error {
	ctx := context.Background()

	// First, get total count of unique entities matching filters
	countSQL := "SELECT COUNT(DISTINCT entity_id) FROM entities WHERE entity_id IS NOT NULL AND ability_score IS NOT NULL AND ability_score < 70000"
	countArgs := []interface{}{}
	if classID != nil {
		countSQL += " AND class_id = ?"
		countArgs = append(countArgs, *classID)
	}

	var totalCount int64
	if err := db.Raw(countSQL, countArgs...).Scan(&totalCount).Error; err != nil {
		return fmt.Errorf("failed to count entities: %w", err)
	}

	// Build the query for top 50
	querySQL := `
		SELECT * FROM (
			SELECT DISTINCT ON (entity_id)
				id, entity_id, name, class_id, class_spec, ability_score, level, first_seen, last_seen, attributes
			FROM entities
			WHERE entity_id IS NOT NULL AND ability_score IS NOT NULL AND ability_score < 70000
	`
	queryArgs := []interface{}{}
	if classID != nil {
		querySQL += " AND class_id = ?"
		queryArgs = append(queryArgs, *classID)
	}

	querySQL += `
			ORDER BY entity_id, last_seen DESC
		) sub
		ORDER BY ability_score DESC NULLS LAST
		LIMIT 50
	`

	var entities []models.Entity
	if err := db.Raw(querySQL, queryArgs...).Scan(&entities).Error; err != nil {
		return fmt.Errorf("failed to query entities: %w", err)
	}

	// Build entries
	entries := make([]EntityLeaderboardEntry, len(entities))
	entityIDs := make([]int64, 0, len(entities))

	for i, e := range entities {
		if e.EntityID == nil {
			continue
		}
		entries[i] = EntityLeaderboardEntry{
			EntityID:     *e.EntityID,
			Name:         e.Name,
			ClassID:      e.ClassID,
			ClassSpec:    e.ClassSpec,
			AbilityScore: e.AbilityScore,
			Level:        e.Level,
		}
		entityIDs = append(entityIDs, *e.EntityID)
	}

	// Fetch linked user IDs only
	if len(entityIDs) > 0 {
		type playerUserMapping struct {
			PlayerID int64
			UserID   uint
		}
		var mappings []playerUserMapping
		if err := db.Table("detailed_playerdata").
			Select("player_id, user_id").
			Where("player_id IN ? AND user_id IS NOT NULL", entityIDs).
			Find(&mappings).Error; err == nil && len(mappings) > 0 {

			playerToUser := make(map[int64]uint)
			for _, m := range mappings {
				playerToUser[m.PlayerID] = m.UserID
			}

			// Assign UserID to entries
			for i := range entries {
				if uid, ok := playerToUser[entries[i].EntityID]; ok {
					entries[i].UserID = &uid
				}
			}
		}
	}

	// Cache the result with actual total count
	cached := CachedLeaderboard{
		Entities:  entries,
		Total:     totalCount, // Total unique entities, not just 50
		UpdatedAt: time.Now(),
	}

	data, err := json.Marshal(cached)
	if err != nil {
		return fmt.Errorf("failed to marshal leaderboard: %w", err)
	}

	cacheKey := getCacheKey(classID)
	if err := redisClient.Set(ctx, cacheKey, data, EntityLeaderboardTTL).Err(); err != nil {
		return fmt.Errorf("failed to cache leaderboard: %w", err)
	}

	log.Printf("Cached entity leaderboard: %s (%d entries)", cacheKey, len(entries))
	return nil
}

// GetCachedLeaderboard retrieves the cached leaderboard from Redis
func GetCachedLeaderboard(redisClient *redis.Client, classID *int64) (*CachedLeaderboard, error) {
	ctx := context.Background()
	cacheKey := getCacheKey(classID)

	data, err := redisClient.Get(ctx, cacheKey).Bytes()
	if err != nil {
		return nil, err
	}

	var cached CachedLeaderboard
	if err := json.Unmarshal(data, &cached); err != nil {
		return nil, err
	}

	return &cached, nil
}

// RefreshAllLeaderboards refreshes all leaderboard caches
// Should be called by a background job every 1-2 hours
func RefreshAllLeaderboards(db *gorm.DB, redisClient *redis.Client) error {
	log.Println("Starting entity leaderboard refresh...")
	startTime := time.Now()

	// Class IDs to cache
	classIDs := []int64{1, 2, 4, 5, 9, 11, 12, 13}

	// Cache "all" (no filter)
	if err := ComputeAndCacheLeaderboard(db, redisClient, nil); err != nil {
		log.Printf("Failed to cache 'all' leaderboard: %v", err)
	}

	// Cache each class
	for _, classID := range classIDs {
		cid := classID // copy for pointer
		if err := ComputeAndCacheLeaderboard(db, redisClient, &cid); err != nil {
			log.Printf("Failed to cache class %d leaderboard: %v", classID, err)
		}
	}

	log.Printf("Entity leaderboard refresh completed in %v", time.Since(startTime))
	return nil
}

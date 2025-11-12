package module_optimizer

import (
	"context"
	"crypto/sha256"
	"encoding/json"
	"fmt"
	"time"

	"github.com/redis/go-redis/v9"
)

// OptimizationCache handles caching of optimization results
type OptimizationCache struct {
	redis *redis.Client
}

// NewOptimizationCache creates a new cache instance
func NewOptimizationCache(redisClient *redis.Client) *OptimizationCache {
	return &OptimizationCache{
		redis: redisClient,
	}
}

// GenerateKey creates a cache key from optimization parameters
func (c *OptimizationCache) GenerateKey(
	userID int,
	category string,
	priorityAttrs []string,
	desiredLevels map[string]int,
	excludedAttrs []string,
	sortMode string,
) string {
	// Create deterministic hash of parameters
	h := sha256.New()
	fmt.Fprintf(h, "%d:%s:%v:%v:%v:%s",
		userID, category, priorityAttrs, desiredLevels, excludedAttrs, sortMode)
	return fmt.Sprintf("opt:%x", h.Sum(nil)[:8])
}

// Get retrieves a cached optimization result
func (c *OptimizationCache) Get(ctx context.Context, key string) (interface{}, error) {
	val, err := c.redis.Get(ctx, key).Result()
	if err == redis.Nil {
		return nil, nil // Cache miss
	}
	if err != nil {
		return nil, err
	}

	var result interface{}
	if err := json.Unmarshal([]byte(val), &result); err != nil {
		return nil, err
	}
	return result, nil
}

// Set stores an optimization result in cache
func (c *OptimizationCache) Set(
	ctx context.Context,
	key string,
	result interface{},
	ttl time.Duration,
) error {
	data, err := json.Marshal(result)
	if err != nil {
		return err
	}
	return c.redis.Set(ctx, key, data, ttl).Err()
}

// Invalidate removes a cached result
func (c *OptimizationCache) Invalidate(ctx context.Context, key string) error {
	return c.redis.Del(ctx, key).Err()
}

// InvalidateUserCache clears all optimization cache entries for a user
func (c *OptimizationCache) InvalidateUserCache(ctx context.Context, userID int) error {
	// Scan for all keys matching user's optimization results
	pattern := "opt:*"
	iter := c.redis.Scan(ctx, 0, pattern, 0).Iterator()

	for iter.Next(ctx) {
		// Delete each matching key
		if err := c.redis.Del(ctx, iter.Val()).Err(); err != nil {
			return err
		}
	}

	return iter.Err()
}

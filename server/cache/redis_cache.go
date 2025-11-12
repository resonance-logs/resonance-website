package cache

import (
	"context"
	"errors"
	"time"

	"github.com/google/uuid"
	"github.com/redis/go-redis/v9"
	"golang.org/x/sync/singleflight"
)

type RedisCache struct {
	client *redis.Client
	group  singleflight.Group
}

// NewRedisCache creates a Redis-backed cache from a Redis connection URL (e.g. redis://:pass@host:6379/0)
func NewRedisCache(redisURL string, opts ...func(*redis.Options)) (*RedisCache, error) {
	if redisURL == "" {
		return nil, errors.New("empty redis url")
	}
	opt, err := redis.ParseURL(redisURL)
	if err != nil {
		return nil, err
	}
	// apply optional modifications
	for _, f := range opts {
		f(opt)
	}
	client := redis.NewClient(opt)
	// basic ping to verify
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := client.Ping(ctx).Err(); err != nil {
		return nil, err
	}
	return &RedisCache{client: client}, nil
}

func (r *RedisCache) Get(ctx context.Context, key string) ([]byte, bool, error) {
	val, err := r.client.Get(ctx, key).Bytes()
	if err == redis.Nil {
		return nil, false, nil
	}
	if err != nil {
		return nil, false, err
	}
	return val, true, nil
}

func (r *RedisCache) Set(ctx context.Context, key string, data []byte, ttl time.Duration) error {
	return r.client.Set(ctx, key, data, ttl).Err()
}

func (r *RedisCache) Del(ctx context.Context, keys ...string) error {
	if len(keys) == 0 {
		return nil
	}
	return r.client.Del(ctx, keys...).Err()
}

func (r *RedisCache) Incr(ctx context.Context, key string) (int64, error) {
	return r.client.Incr(ctx, key).Result()
}

// GetOrCompute implements process coalescing with singleflight and a simple distributed lock to avoid cross-process duplicate loaders.
func (r *RedisCache) GetOrCompute(ctx context.Context, key string, ttl time.Duration, loader func() ([]byte, error)) ([]byte, error) {
	// Fast path: try GET
	if val, ok, err := r.Get(ctx, key); err == nil && ok {
		return val, nil
	} else if err != nil {
		// log and continue to loader path
	}

	// Use singleflight to coalesce within process
	v, err, _ := r.group.Do(key, func() (interface{}, error) {
		// Try to acquire a short distributed lock
		lockKey := key + ":lock"
		lockVal := uuid.NewString()
		got, err := r.client.SetNX(ctx, lockKey, lockVal, 5*time.Second).Result()
		if err != nil {
			// Redis error - fallback to just running loader
			return loader()
		}
		if got {
			// we hold the lock; run loader
			data, lerr := loader()
			if lerr != nil {
				// release lock and return error
				_ = r.client.Del(ctx, lockKey).Err()
				return nil, lerr
			}
			// set cache and release lock
			if err := r.Set(ctx, key, data, ttl); err != nil {
				// ignore set error but continue
			}
			_ = r.client.Del(ctx, lockKey).Err()
			return data, nil
		}

		// Lock not acquired - wait/poll cache until value available or timeout
		waitCtx, cancel := context.WithTimeout(ctx, 2*time.Second)
		defer cancel()
		ticker := time.NewTicker(50 * time.Millisecond)
		defer ticker.Stop()
		for {
			select {
			case <-waitCtx.Done():
				// timed out - as safe fallback, run loader locally
				return loader()
			case <-ticker.C:
				if val, ok, err := r.Get(ctx, key); err == nil && ok {
					return val, nil
				}
			}
		}
	})
	if err != nil {
		return nil, err
	}
	if bs, ok := v.([]byte); ok {
		return bs, nil
	}
	return nil, errors.New("unexpected value type from loader")
}

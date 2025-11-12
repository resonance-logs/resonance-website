package cache

import (
	"context"
	"time"
)

// Cache is a small interface for optional caching in the server.
type Cache interface {
	// Get returns value bytes and true when found. If not found, ok=false.
	Get(ctx context.Context, key string) ([]byte, bool, error)
	Set(ctx context.Context, key string, data []byte, ttl time.Duration) error
	Del(ctx context.Context, keys ...string) error
	// GetOrCompute will try to get the key, otherwise call loader, set the key with ttl and return value.
	GetOrCompute(ctx context.Context, key string, ttl time.Duration, loader func() ([]byte, error)) ([]byte, error)
	// Incr atomically increments a numeric key and returns the new value. Useful for versioning.
	Incr(ctx context.Context, key string) (int64, error)
}

// VersionKey returns a simple version key name for a namespace.
func VersionKey(name string) string {
	return name + ":version"
}

// NoopCache implements Cache but does nothing — useful when REDIS is not configured.
type NoopCache struct{}

func NewNoopCache() Cache { return &NoopCache{} }

func (n *NoopCache) Get(ctx context.Context, key string) ([]byte, bool, error) {
	return nil, false, nil
}
func (n *NoopCache) Set(ctx context.Context, key string, data []byte, ttl time.Duration) error {
	return nil
}
func (n *NoopCache) Del(ctx context.Context, keys ...string) error { return nil }
func (n *NoopCache) GetOrCompute(ctx context.Context, key string, ttl time.Duration, loader func() ([]byte, error)) ([]byte, error) {
	return loader()
}
func (n *NoopCache) Incr(ctx context.Context, key string) (int64, error) { return 0, nil }

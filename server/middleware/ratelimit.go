package middleware

import (
	"net/http"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
)

// RateLimiter implements a simple token bucket rate limiter
type RateLimiter struct {
	mu            sync.Mutex
	buckets       map[string]*bucket
	rate          int           // requests per window
	window        time.Duration // time window
	cleanupTicker *time.Ticker
}

type bucket struct {
	tokens    int
	lastReset time.Time
}

// NewRateLimiter creates a new rate limiter
// rate: number of requests allowed per window
// window: time window (e.g., 1 minute)
func NewRateLimiter(rate int, window time.Duration) *RateLimiter {
	rl := &RateLimiter{
		buckets: make(map[string]*bucket),
		rate:    rate,
		window:  window,
	}

	// Cleanup old buckets periodically
	rl.cleanupTicker = time.NewTicker(window * 2)
	go rl.cleanup()

	return rl
}

// Allow checks if a request from the given key is allowed
func (rl *RateLimiter) Allow(key string) bool {
	rl.mu.Lock()
	defer rl.mu.Unlock()

	now := time.Now()
	b, exists := rl.buckets[key]

	if !exists {
		// Create new bucket
		rl.buckets[key] = &bucket{
			tokens:    rl.rate - 1,
			lastReset: now,
		}
		return true
	}

	// Reset bucket if window has passed
	if now.Sub(b.lastReset) > rl.window {
		b.tokens = rl.rate
		b.lastReset = now
	}

	// Check if tokens available
	if b.tokens > 0 {
		b.tokens--
		return true
	}

	return false
}

// cleanup removes old buckets to prevent memory leak
func (rl *RateLimiter) cleanup() {
	for range rl.cleanupTicker.C {
		rl.mu.Lock()
		now := time.Now()
		for key, b := range rl.buckets {
			if now.Sub(b.lastReset) > rl.window*2 {
				delete(rl.buckets, key)
			}
		}
		rl.mu.Unlock()
	}
}

// RateLimitMiddleware creates a rate limiting middleware
// keyFunc: function to extract rate limit key from context (e.g., user ID, IP)
func RateLimitMiddleware(limiter *RateLimiter, keyFunc func(*gin.Context) string) gin.HandlerFunc {
	return func(c *gin.Context) {
		key := keyFunc(c)
		if key == "" {
			// No key, skip rate limiting
			c.Next()
			return
		}

		if !limiter.Allow(key) {
			c.JSON(http.StatusTooManyRequests, gin.H{
				"error": gin.H{
					"code":    "rate_limit_exceeded",
					"message": "Too many requests. Please try again later.",
				},
			})
			c.Abort()
			return
		}

		c.Next()
	}
}

// GetUserIDKey extracts user ID as rate limit key
func GetUserIDKey(c *gin.Context) string {
	if user, exists := c.Get("current_user"); exists {
		if u, ok := user.(interface{ GetID() uint }); ok {
			return string(rune(u.GetID()))
		}
	}
	return ""
}

// GetIPKey extracts client IP as rate limit key
func GetIPKey(c *gin.Context) string {
	return c.ClientIP()
}

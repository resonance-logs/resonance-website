package middleware

import (
	"bytes"
	"context"
	"crypto/sha256"
	"encoding/hex"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/redis/go-redis/v9"
)

const CACHE_TTL = 5 * time.Minute

var redisClient *redis.Client

func InitRedis() error {
	redisURL := os.Getenv("REDIS_URL")
	if redisURL == "" {
		return nil
	}

	opt, err := redis.ParseURL(redisURL)
	if err != nil {
		return err
	}

	redisClient = redis.NewClient(opt)
	_, err = redisClient.Ping(context.Background()).Result()
	return err
}

func CloseRedis() error {
	if redisClient != nil {
		return redisClient.Close()
	}
	return nil
}

func CacheMiddleware() gin.HandlerFunc {
	debugMode := os.Getenv("ENVIRONMENT") == "development"
	return func(c *gin.Context) {
		if redisClient == nil || c.Request.Method != http.MethodGet {
			c.Next()
			return
		}

		cacheKey := generateCacheKey(c)
		ctx := c.Request.Context()
		cachedData, err := redisClient.Get(ctx, cacheKey).Bytes()
		if err == nil && len(cachedData) > 0 {
			if debugMode {
				log.Printf("Cache HIT: %s", cacheKey)
			}
			c.Header("X-Cache", "HIT")
			c.Data(http.StatusOK, "application/json", cachedData)
			c.Abort()
			return
		}

		writer := &responseWriter{ResponseWriter: c.Writer, body: &bytes.Buffer{}}
		c.Writer = writer
		c.Next()

		if c.Writer.Status() == http.StatusOK && writer.body.Len() > 0 {
			if debugMode {
				log.Printf("Cache MISS: %s", cacheKey)
			}
			c.Header("X-Cache", "MISS")
			redisClient.Set(ctx, cacheKey, writer.body.Bytes(), CACHE_TTL)
		}
	}
}

type responseWriter struct {
	gin.ResponseWriter
	body *bytes.Buffer
}

func (w *responseWriter) Write(b []byte) (int, error) {
	w.body.Write(b)
	return w.ResponseWriter.Write(b)
}

func generateCacheKey(c *gin.Context) string {
	h := sha256.New()
	h.Write([]byte(c.Request.Method))
	h.Write([]byte(c.Request.URL.Path))
	h.Write([]byte(c.Request.URL.RawQuery))
	return "cache:" + hex.EncodeToString(h.Sum(nil))
}

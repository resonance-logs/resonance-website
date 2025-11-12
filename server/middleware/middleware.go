package middleware

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"net/http"
	"os"
	"server/models"
	"time"

	"gorm.io/gorm"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
)

// JWTClaims represents the claims in our JWT token (must match auth controller)
type JWTClaims struct {
	UserID        uint   `json:"user_id"`
	DiscordUserID string `json:"discord_user_id"`
	Role          string `json:"role"`
	jwt.RegisteredClaims
}

// AuthMiddleware validates JWT from cookie and attaches user to context
func AuthMiddleware(required bool) gin.HandlerFunc {
	return func(c *gin.Context) {
		tokenString, err := c.Cookie("auth_token")
		if err != nil || tokenString == "" {
			if required {
				c.JSON(http.StatusUnauthorized, gin.H{"error": "Authentication required"})
				c.Abort()
				return
			}
			// If auth is optional, continue without user
			c.Next()
			return
		}

		// Parse and validate JWT
		secret := os.Getenv("JWT_SECRET")
		token, err := jwt.ParseWithClaims(tokenString, &JWTClaims{}, func(token *jwt.Token) (interface{}, error) {
			return []byte(secret), nil
		})

		if err != nil || !token.Valid {
			if required {
				c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid token"})
				c.Abort()
				return
			}
			c.Next()
			return
		}

		claims, ok := token.Claims.(*JWTClaims)
		if !ok {
			if required {
				c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid token claims"})
				c.Abort()
				return
			}
			c.Next()
			return
		}

		// Fetch full user from database (DB should be attached to context by main)
		dbAny, ok := c.Get("db")
		if !ok {
			if required {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Database not available in context"})
				c.Abort()
				return
			}
			c.Next()
			return
		}
		dbConn, ok := dbAny.(*gorm.DB)
		if !ok {
			if required {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Invalid database in context"})
				c.Abort()
				return
			}
			c.Next()
			return
		}

		var user models.User
		if err := dbConn.First(&user, claims.UserID).Error; err != nil {
			if required {
				c.JSON(http.StatusUnauthorized, gin.H{"error": "User not found"})
				c.Abort()
				return
			}
			c.Next()
			return
		}

		// Attach user to context
		c.Set("user", &user)
		c.Next()
	}
}

// RequireAuth is a convenience wrapper for required authentication
func RequireAuth() gin.HandlerFunc {
	return AuthMiddleware(true)
}

// OptionalAuth is a convenience wrapper for optional authentication
func OptionalAuth() gin.HandlerFunc {
	return AuthMiddleware(false)
}

// hashAPIKey creates a HMAC-SHA256 hash of the given key using a server-side secret pepper.
func hashAPIKey(plaintext string) string {
	pepper := os.Getenv("API_KEY_PEPPER")
	h := hmac.New(sha256.New, []byte(pepper))
	h.Write([]byte(plaintext))
	return hex.EncodeToString(h.Sum(nil))
}

// APIKeyAuth validates X-Api-Key header, attaches user to context. Returns 401 if invalid.
func APIKeyAuth() gin.HandlerFunc {
	return func(c *gin.Context) {
		apiKey := c.GetHeader("X-Api-Key")
		if apiKey == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Missing API key"})
			c.Abort()
			return
		}

		// Compute hash and lookup
		keyHash := hashAPIKey(apiKey)

		// DB should be attached to context by main
		dbAny, ok := c.Get("db")
		if !ok {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Database not available in context"})
			c.Abort()
			return
		}
		dbConn, ok := dbAny.(*gorm.DB)
		if !ok {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Invalid database in context"})
			c.Abort()
			return
		}

		var key models.ApiKey
		if err := dbConn.Where("key_hash = ? AND revoked_at IS NULL", keyHash).First(&key).Error; err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid API key"})
			c.Abort()
			return
		}

		// Load user
		var user models.User
		if err := dbConn.First(&user, key.UserID).Error; err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "User not found for API key"})
			c.Abort()
			return
		}

		// Update last used (non-blocking best effort)
		now := time.Now()
		_ = dbConn.Model(&key).Update("last_used_at", &now).Error

		// Attach user to context
		c.Set("user", &user)
		c.Next()
	}
}

// EitherAuth accepts authentication either via the auth cookie (JWT) OR via X-Api-Key header.
// If either method authenticates, the user will be attached to the context as "user".
// If neither method authenticates, it returns 401.
func EitherAuth() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Try cookie-based JWT first (optional)
		tokenString, err := c.Cookie("auth_token")
		if err == nil && tokenString != "" {
			secret := os.Getenv("JWT_SECRET")
			token, err := jwt.ParseWithClaims(tokenString, &JWTClaims{}, func(token *jwt.Token) (interface{}, error) {
				return []byte(secret), nil
			})
			if err == nil && token.Valid {
				if claims, ok := token.Claims.(*JWTClaims); ok {
					dbAny, ok := c.Get("db")
					if ok {
						if dbConn, ok := dbAny.(*gorm.DB); ok {
							var user models.User
							if err := dbConn.First(&user, claims.UserID).Error; err == nil {
								c.Set("user", &user)
								c.Next()
								return
							}
						}
					}
				}
			}
		}

		// Fallback: try API key header
		apiKey := c.GetHeader("X-Api-Key")
		if apiKey == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Authentication required"})
			c.Abort()
			return
		}

		keyHash := hashAPIKey(apiKey)

		dbAny, ok := c.Get("db")
		if !ok {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Database not available in context"})
			c.Abort()
			return
		}
		dbConn, ok := dbAny.(*gorm.DB)
		if !ok {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Invalid database in context"})
			c.Abort()
			return
		}

		var key models.ApiKey
		if err := dbConn.Where("key_hash = ? AND revoked_at IS NULL", keyHash).First(&key).Error; err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid API key"})
			c.Abort()
			return
		}

		var user models.User
		if err := dbConn.First(&user, key.UserID).Error; err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "User not found for API key"})
			c.Abort()
			return
		}

		now := time.Now()
		_ = dbConn.Model(&key).Update("last_used_at", &now).Error
		c.Set("user", &user)
		c.Next()
	}
}

package middleware

import (
	"net/http"
	"os"
	"server/db"
	"server/models"

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

// getEnv retrieves environment variable with a fallback
func getEnv(key, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return fallback
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
		secret := getEnv("JWT_SECRET", "your-secret-key-change-this")
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

		// Fetch full user from database
		dbConn, err := db.InitDB()
		if err != nil {
			if required {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Database connection failed"})
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

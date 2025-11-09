package apikey

import (
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"net/http"
	"os"
	"time"

	apiErrors "server/controller"

	"server/models"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// apiKeyLengthBytes defines how many raw random bytes we generate before hex/base64 encoding.
const apiKeyLengthBytes = 32

// generateRandomKey returns a hex-encoded random 32-byte string.
func generateRandomKey() (string, error) {
	b := make([]byte, apiKeyLengthBytes)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return hex.EncodeToString(b), nil
}

// hashAPIKey creates a HMAC-SHA256 hash of the given key using a server-side secret pepper.
func hashAPIKey(plaintext string) string {
	pepper := os.Getenv("API_KEY_PEPPER")
	h := hmac.New(sha256.New, []byte(pepper))
	h.Write([]byte(plaintext))
	return hex.EncodeToString(h.Sum(nil))
}

// ApiKeyMetaResponse returned by GET /api/apikey
// Plaintext is intentionally omitted.
type ApiKeyMetaResponse struct {
	HasKey     bool       `json:"has_key"`
	CreatedAt  *time.Time `json:"created_at,omitempty"`
	RevokedAt  *time.Time `json:"revoked_at,omitempty"`
	LastUsedAt *time.Time `json:"last_used_at,omitempty"`
}

// ApiKeyGenerateResponse returned by POST /api/apikey
// Includes plaintext once.
type ApiKeyGenerateResponse struct {
	PlaintextKey string             `json:"plaintext_key"`
	Meta         ApiKeyMetaResponse `json:"meta"`
}

// getCurrentUserFromContext extracts *models.User from Gin context.
func getCurrentUserFromContext(c *gin.Context) (*models.User, error) {
	userVal, ok := c.Get("user")
	if !ok {
		return nil, fmt.Errorf("user not in context")
	}
	user, ok := userVal.(*models.User)
	if !ok {
		return nil, fmt.Errorf("invalid user type")
	}
	return user, nil
}

// GetApiKeyMeta handles GET /api/apikey
func GetApiKeyMeta(c *gin.Context) {
	user, err := getCurrentUserFromContext(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, apiErrors.NewErrorResponse(http.StatusUnauthorized, "Not authenticated"))
		return
	}
	dbAny, ok := c.Get("db")
	if !ok {
		c.JSON(http.StatusInternalServerError, apiErrors.NewErrorResponse(http.StatusInternalServerError, "Database not available in context"))
		return
	}
	conn, ok := dbAny.(*gorm.DB)
	if !ok {
		c.JSON(http.StatusInternalServerError, apiErrors.NewErrorResponse(http.StatusInternalServerError, "Invalid database in context"))
		return
	}
	var key models.ApiKey
	result := conn.Where("user_id = ? AND revoked_at IS NULL", user.ID).First(&key)
	if result.Error == gorm.ErrRecordNotFound {
		c.JSON(http.StatusOK, ApiKeyMetaResponse{HasKey: false})
		return
	} else if result.Error != nil {
		c.JSON(http.StatusInternalServerError, apiErrors.NewErrorResponse(http.StatusInternalServerError, "Query failed"))
		return
	}
	resp := ApiKeyMetaResponse{
		HasKey:     true,
		CreatedAt:  &key.CreatedAt,
		RevokedAt:  key.RevokedAt,
		LastUsedAt: key.LastUsedAt,
	}
	c.JSON(http.StatusOK, resp)
}

// GenerateApiKey handles POST /api/apikey
// If a non-revoked key exists, it is revoked then a new one generated.
func GenerateApiKey(c *gin.Context) {
	user, err := getCurrentUserFromContext(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, apiErrors.NewErrorResponse(http.StatusUnauthorized, "Not authenticated"))
		return
	}
	dbAny, ok := c.Get("db")
	if !ok {
		c.JSON(http.StatusInternalServerError, apiErrors.NewErrorResponse(http.StatusInternalServerError, "Database not available in context"))
		return
	}
	conn, ok := dbAny.(*gorm.DB)
	if !ok {
		c.JSON(http.StatusInternalServerError, apiErrors.NewErrorResponse(http.StatusInternalServerError, "Invalid database in context"))
		return
	}
	var existing models.ApiKey
	if err := conn.Where("user_id = ? AND revoked_at IS NULL", user.ID).First(&existing).Error; err == nil {
		// revoke existing
		now := time.Now()
		existing.RevokedAt = &now
		if err := conn.Save(&existing).Error; err != nil {
			c.JSON(http.StatusInternalServerError, apiErrors.NewErrorResponse(http.StatusInternalServerError, "Failed to revoke existing key"))
			return
		}
	}
	plaintext, err := generateRandomKey()
	if err != nil {
		c.JSON(http.StatusInternalServerError, apiErrors.NewErrorResponse(http.StatusInternalServerError, "Failed to generate key"))
		return
	}
	hash := hashAPIKey(plaintext)
	newKey := models.ApiKey{
		UserID:  user.ID,
		KeyHash: hash,
	}
	if err := conn.Create(&newKey).Error; err != nil {
		c.JSON(http.StatusInternalServerError, apiErrors.NewErrorResponse(http.StatusInternalServerError, "Failed to store new key"))
		return
	}
	resp := ApiKeyGenerateResponse{
		PlaintextKey: plaintext,
		Meta: ApiKeyMetaResponse{
			HasKey:     true,
			CreatedAt:  &newKey.CreatedAt,
			RevokedAt:  newKey.RevokedAt,
			LastUsedAt: newKey.LastUsedAt,
		},
	}
	c.JSON(http.StatusOK, resp)
}

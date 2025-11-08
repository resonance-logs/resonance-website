package auth

import (
	"crypto/rand"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"server/db"
	"server/models"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"gorm.io/gorm"
)

// DiscordUser represents the user data returned by Discord's /users/@me endpoint
type DiscordUser struct {
	ID            string `json:"id"`
	Username      string `json:"username"`
	GlobalName    string `json:"global_name"`
	Discriminator string `json:"discriminator"`
	Avatar        string `json:"avatar"`
}

// DiscordTokenResponse represents Discord's OAuth token response
type DiscordTokenResponse struct {
	AccessToken  string `json:"access_token"`
	TokenType    string `json:"token_type"`
	ExpiresIn    int    `json:"expires_in"`
	RefreshToken string `json:"refresh_token"`
	Scope        string `json:"scope"`
}

// JWTClaims represents the claims in our JWT token
type JWTClaims struct {
	UserID        uint   `json:"user_id"`
	DiscordUserID string `json:"discord_user_id"`
	Role          string `json:"role"`
	jwt.RegisteredClaims
}

// generateState creates a cryptographically secure random state parameter
func generateState() (string, error) {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return base64.URLEncoding.EncodeToString(b), nil
}

// getEnv retrieves environment variable with a fallback
func getEnv(key, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return fallback
}

// GetDiscordAuthURL generates the Discord OAuth authorization URL
func GetDiscordAuthURL(c *gin.Context) {
	state, err := generateState()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate state"})
		return
	}

	clientID := getEnv("DISCORD_CLIENT_ID", "")
	redirectURI := getEnv("DISCORD_REDIRECT_URI", "http://localhost:3000/auth/callback")

	if clientID == "" {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Discord client ID not configured"})
		return
	}

	params := url.Values{}
	params.Add("client_id", clientID)
	params.Add("redirect_uri", redirectURI)
	params.Add("response_type", "code")
	params.Add("scope", "identify")
	params.Add("state", state)

	authURL := fmt.Sprintf("https://discord.com/api/oauth2/authorize?%s", params.Encode())

	c.JSON(http.StatusOK, gin.H{
		"url":   authURL,
		"state": state,
	})
}

// exchangeCodeForToken exchanges the authorization code for Discord access tokens
func exchangeCodeForToken(code string) (*DiscordTokenResponse, error) {
	clientID := getEnv("DISCORD_CLIENT_ID", "")
	clientSecret := getEnv("DISCORD_CLIENT_SECRET", "")
	redirectURI := getEnv("DISCORD_REDIRECT_URI", "http://localhost:3000/auth/callback")

	data := url.Values{}
	data.Set("client_id", clientID)
	data.Set("client_secret", clientSecret)
	data.Set("grant_type", "authorization_code")
	data.Set("code", code)
	data.Set("redirect_uri", redirectURI)

	req, err := http.NewRequest("POST", "https://discord.com/api/oauth2/token", strings.NewReader(data.Encode()))
	if err != nil {
		return nil, err
	}

	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("discord token exchange failed: %s", string(body))
	}

	var tokenResp DiscordTokenResponse
	if err := json.NewDecoder(resp.Body).Decode(&tokenResp); err != nil {
		return nil, err
	}

	return &tokenResp, nil
}

// getDiscordUser fetches the user's Discord profile using their access token
func getDiscordUser(accessToken string) (*DiscordUser, error) {
	req, err := http.NewRequest("GET", "https://discord.com/api/users/@me", nil)
	if err != nil {
		return nil, err
	}

	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", accessToken))

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("discord user fetch failed: %s", string(body))
	}

	var user DiscordUser
	if err := json.NewDecoder(resp.Body).Decode(&user); err != nil {
		return nil, err
	}

	return &user, nil
}

// generateJWT creates a JWT token for the user
func generateJWT(user *models.User) (string, error) {
	secret := getEnv("JWT_SECRET", "your-secret-key-change-this")

	claims := JWTClaims{
		UserID:        user.ID,
		DiscordUserID: user.DiscordUserID,
		Role:          user.Role,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(30 * 24 * time.Hour)), // 30 days
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			Issuer:    "resonance-api",
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(secret))
}

// CallbackRequest represents the request body for the callback endpoint
type CallbackRequest struct {
	Code string `json:"code" binding:"required"`
}

// HandleDiscordCallback handles the OAuth callback from Discord
func HandleDiscordCallback(c *gin.Context) {
	var req CallbackRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Missing authorization code"})
		return
	}

	code := req.Code
	if code == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Missing authorization code"})
		return
	}

	// Exchange code for tokens
	tokenResp, err := exchangeCodeForToken(code)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("Token exchange failed: %v", err)})
		return
	}

	// Get Discord user info
	discordUser, err := getDiscordUser(tokenResp.AccessToken)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("Failed to fetch Discord user: %v", err)})
		return
	}

	// Get database connection
	dbConn, err := db.InitDB()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database connection failed"})
		return
	}

	// Find or create user
	var user models.User
	result := dbConn.Where("discord_user_id = ?", discordUser.ID).First(&user)

	now := time.Now()
	if result.Error == gorm.ErrRecordNotFound {
		// Create new user
		user = models.User{
			DiscordUserID:       discordUser.ID,
			DiscordAccessToken:  tokenResp.AccessToken,
			DiscordRefreshToken: tokenResp.RefreshToken,
			Role:                "user",
			LastLoginAt:         &now,
		}
		if err := dbConn.Create(&user).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create user"})
			return
		}
	} else if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database query failed"})
		return
	} else {
		// Update existing user tokens
		user.DiscordAccessToken = tokenResp.AccessToken
		user.DiscordRefreshToken = tokenResp.RefreshToken
		user.LastLoginAt = &now
		if err := dbConn.Save(&user).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update user"})
			return
		}
	}

	// Generate JWT
	jwtToken, err := generateJWT(&user)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate token"})
		return
	}

	// Set HTTP-only cookie
	secure := getEnv("ENVIRONMENT", "development") == "production"
	c.SetCookie(
		"auth_token",           // name
		jwtToken,               // value
		30*24*60*60,            // maxAge (30 days in seconds)
		"/",                    // path
		"",                     // domain (empty = current domain)
		secure,                 // secure (HTTPS only in production)
		true,                   // httpOnly
	)

	// Also set SameSite attribute for CSRF protection
	c.SetSameSite(http.SameSiteLaxMode)

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"user": gin.H{
			"id":              user.ID,
			"discord_user_id": user.DiscordUserID,
			"role":            user.Role,
			"created_at":      user.CreatedAt,
			"last_login_at":   user.LastLoginAt,
		},
	})
}

// GetCurrentUser returns the currently authenticated user with fresh Discord data
func GetCurrentUser(c *gin.Context) {
	// Get user from context (set by auth middleware)
	userInterface, exists := c.Get("user")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Not authenticated"})
		return
	}

	user, ok := userInterface.(*models.User)
	if !ok {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Invalid user data"})
		return
	}

	// Fetch fresh Discord user data
	discordUser, err := getDiscordUser(user.DiscordAccessToken)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch Discord user data"})
		return
	}

	// Build avatar URL
	avatarURL := ""
	if discordUser.Avatar != "" {
		avatarURL = fmt.Sprintf("https://cdn.discordapp.com/avatars/%s/%s.png", discordUser.ID, discordUser.Avatar)
	}

	c.JSON(http.StatusOK, gin.H{
		"id":                  user.ID,
		"discord_user_id":     user.DiscordUserID,
		"discord_username":    discordUser.Username,
		"discord_global_name": discordUser.GlobalName,
		"discord_avatar_url":  avatarURL,
		"role":                user.Role,
		"created_at":          user.CreatedAt,
		"last_login_at":       user.LastLoginAt,
	})
}

// Logout clears the auth cookie
func Logout(c *gin.Context) {
	c.SetCookie(
		"auth_token",
		"",
		-1,      // maxAge -1 deletes the cookie
		"/",
		"",
		false,
		true,
	)

	c.JSON(http.StatusOK, gin.H{"success": true})
}

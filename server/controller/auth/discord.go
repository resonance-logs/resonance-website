package auth

import (
	"context"
	"crypto/rand"
	"encoding/base64"
	"encoding/json"
	"net/http"
	"net/url"
	"os"
	"strings"
	"time"

	"server/models"
	"server/store"

	"github.com/gin-gonic/gin"
)

// AuthHandler bundles dependencies for auth endpoints.
type AuthHandler struct {
	Users    store.UserStore
	Sessions store.SessionStore
}

// NewAuthHandler constructs an AuthHandler.
func NewAuthHandler(users store.UserStore, sessions store.SessionStore) *AuthHandler {
	return &AuthHandler{Users: users, Sessions: sessions}
}

// DiscordLogin initiates the Discord OAuth2 flow.
func (h *AuthHandler) DiscordLogin(c *gin.Context) {
	clientID := os.Getenv("DISCORD_CLIENT_ID")
	redirectURI := os.Getenv("DISCORD_REDIRECT_URI")
	if clientID == "" || redirectURI == "" {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "discord oauth not configured"})
		return
	}

	state, err := randomState()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to generate state"})
		return
	}

	// Persist state in a secure, short-lived cookie.
	c.SetCookie("rsn_oauth_state", state, 300, "/", "", true, true)

	authURL := "https://discord.com/api/oauth2/authorize?response_type=code" +
		"&client_id=" + url.QueryEscape(clientID) +
		"&scope=" + url.QueryEscape("identify") +
		"&redirect_uri=" + url.QueryEscape(redirectURI) +
		"&state=" + url.QueryEscape(state)

	c.Redirect(http.StatusFound, authURL)
}

// DiscordCallback completes the Discord OAuth2 flow.
func (h *AuthHandler) DiscordCallback(c *gin.Context) {
	code := c.Query("code")
	state := c.Query("state")
	storedState, _ := c.Cookie("rsn_oauth_state")
	if code == "" || state == "" || storedState == "" || state != storedState {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid_request"})
		return
	}

	clientID := os.Getenv("DISCORD_CLIENT_ID")
	clientSecret := os.Getenv("DISCORD_CLIENT_SECRET")
	redirectURI := os.Getenv("DISCORD_REDIRECT_URI")
	websiteURL := os.Getenv("WEBSITE_URL")
	if clientID == "" || clientSecret == "" || redirectURI == "" || websiteURL == "" {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "discord oauth not configured"})
		return
	}

	// Exchange code for tokens
	form := url.Values{}
	form.Set("client_id", clientID)
	form.Set("client_secret", clientSecret)
	form.Set("grant_type", "authorization_code")
	form.Set("code", code)
	form.Set("redirect_uri", redirectURI)

	tokenReq, err := http.NewRequestWithContext(c.Request.Context(), http.MethodPost, "https://discord.com/api/oauth2/token", strings.NewReader(form.Encode()))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "token_request_failed"})
		return
	}
	tokenReq.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	resp, err := http.DefaultClient.Do(tokenReq)
	if err != nil || resp.StatusCode != http.StatusOK {
		if resp != nil {
			defer resp.Body.Close()
		}
		c.JSON(http.StatusBadGateway, gin.H{"error": "discord_token_exchange_failed"})
		return
	}
	defer resp.Body.Close()

	var tokenPayload struct {
		AccessToken  string `json:"access_token"`
		RefreshToken string `json:"refresh_token"`
		TokenType    string `json:"token_type"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&tokenPayload); err != nil || tokenPayload.AccessToken == "" {
		c.JSON(http.StatusBadGateway, gin.H{"error": "invalid_token_response"})
		return
	}

	// Fetch Discord user info
	userReq, err := http.NewRequestWithContext(c.Request.Context(), http.MethodGet, "https://discord.com/api/users/@me", nil)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "user_request_failed"})
		return
	}
	userReq.Header.Set("Authorization", tokenPayload.TokenType+" "+tokenPayload.AccessToken)

	userResp, err := http.DefaultClient.Do(userReq)
	if err != nil || userResp.StatusCode != http.StatusOK {
		if userResp != nil {
			defer userResp.Body.Close()
		}
		c.JSON(http.StatusBadGateway, gin.H{"error": "discord_user_fetch_failed"})
		return
	}
	defer userResp.Body.Close()

	var du struct {
		ID            string `json:"id"`
		Username      string `json:"username"`
		GlobalName    string `json:"global_name"`
		Avatar        string `json:"avatar"`
		Discriminator string `json:"discriminator"`
	}
	if err := json.NewDecoder(userResp.Body).Decode(&du); err != nil || du.ID == "" {
		c.JSON(http.StatusBadGateway, gin.H{"error": "invalid_user_response"})
		return
	}

	now := time.Now().UTC()
	user := &models.User{
		DiscordUserID:     du.ID,
		DiscordUsername:   du.Username,
		DiscordGlobalName: du.GlobalName,
		// email intentionally not stored
		DiscordAccessToken:  tokenPayload.AccessToken,
		DiscordRefreshToken: tokenPayload.RefreshToken,
		LastLoginAt:         &now,
	}

	ctx := context.Background()
	upserted, err := h.Users.CreateOrUpdateFromDiscord(ctx, user)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "user_upsert_failed"})
		return
	}

	// Create session
	sessToken, err := randomState()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "session_create_failed"})
		return
	}

	session := &models.Session{
		UserID:       upserted.ID,
		SessionToken: sessToken,
		ExpiresAt:    now.Add(30 * 24 * time.Hour), // 30 days
	}
	if err := h.Sessions.CreateSession(ctx, session); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "session_persist_failed"})
		return
	}

	// Set secure HttpOnly session cookie
	// Domain is left empty to default to current host; adjust in deployment if needed.
	c.SetCookie("rsn_session", sessToken, int((session.ExpiresAt.Sub(now)).Seconds()), "/", "", true, true)

	// Redirect back to frontend
	c.Redirect(http.StatusFound, websiteURL+"/auth/complete")
}

// Me returns the current authenticated user, if any.
func (h *AuthHandler) Me(c *gin.Context) {
	user, ok := c.Get("user")
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}
	// Build a response object and compute avatar URL on demand (don't store it in DB).
	u, ok := user.(*models.User)
	if !ok || u == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	resp := gin.H{
		"id":                  u.ID,
		"discord_user_id":     u.DiscordUserID,
		"discord_username":    u.DiscordUsername,
		"discord_global_name": u.DiscordGlobalName,
		"avatar_url":          nil,
		"role":                u.Role,
		"created_at":          u.CreatedAt,
		"last_login_at":       u.LastLoginAt,
	}

	// Attempt to fetch fresh avatar info from Discord when we have a valid access token.
	if u.DiscordAccessToken != "" {
		ctx, cancel := context.WithTimeout(c.Request.Context(), 2*time.Second)
		defer cancel()
		req, err := http.NewRequestWithContext(ctx, http.MethodGet, "https://discord.com/api/users/@me", nil)
		if err == nil {
			req.Header.Set("Authorization", "Bearer "+u.DiscordAccessToken)
			if respHTTP, err := http.DefaultClient.Do(req); err == nil {
				defer respHTTP.Body.Close()
				if respHTTP.StatusCode == http.StatusOK {
					var du struct {
						ID     string `json:"id"`
						Avatar string `json:"avatar"`
					}
					if err := json.NewDecoder(respHTTP.Body).Decode(&du); err == nil {
						if du.Avatar != "" {
							resp["avatar_url"] = "https://cdn.discordapp.com/avatars/" + du.ID + "/" + du.Avatar + ".png"
						}
					}
				}
			}
		}
	}

	c.JSON(http.StatusOK, resp)
}

// Logout revokes the current session.
func (h *AuthHandler) Logout(c *gin.Context) {
	token, err := c.Cookie("rsn_session")
	if err != nil || token == "" {
		c.JSON(http.StatusNoContent, nil)
		return
	}

	ctx := context.Background()
	_ = h.Sessions.RevokeSession(ctx, token)

	// Clear cookie
	c.SetCookie("rsn_session", "", -1, "/", "", true, true)
	c.JSON(http.StatusNoContent, nil)
}

func randomState() (string, error) {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return base64.RawURLEncoding.EncodeToString(b), nil
}

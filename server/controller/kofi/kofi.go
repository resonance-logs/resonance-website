package kofi

import (
	"encoding/json"
	"log"
	"math"
	"net/http"
	"os"
	"strconv"
	"strings"

	apiErrors "server/controller"
	"server/models"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

// WebhookPayload models the Ko-fi webhook payload nested inside the `data` form field.
type WebhookPayload struct {
	VerificationToken          string          `json:"verification_token"`
	MessageID                  string          `json:"message_id"`
	Timestamp                  string          `json:"timestamp"`
	Type                       string          `json:"type"`
	IsPublic                   bool            `json:"is_public"`
	FromName                   string          `json:"from_name"`
	Message                    string          `json:"message"`
	Amount                     string          `json:"amount"`
	URL                        string          `json:"url"`
	Email                      string          `json:"email"`
	Currency                   string          `json:"currency"`
	IsSubscriptionPayment      bool            `json:"is_subscription_payment"`
	IsFirstSubscriptionPayment bool            `json:"is_first_subscription_payment"`
	KofiTransactionID          string          `json:"kofi_transaction_id"`
	ShopItems                  json.RawMessage `json:"shop_items"`
	TierName                   *string         `json:"tier_name"`
	Shipping                   json.RawMessage `json:"shipping"`
	DiscordUsername            *string         `json:"discord_username"`
	DiscordUserID              *string         `json:"discord_userid"`
}

// WebhookResponse is returned to Ko-fi after processing the webhook.
type WebhookResponse struct {
	Status    string `json:"status"`
	Processed bool   `json:"processed"`
	Reason    string `json:"reason,omitempty"`
}

// HandleWebhook ingests Ko-fi payment notifications and increments the user's amount_spent_usd.
func HandleWebhook(c *gin.Context) {
	expectedToken := strings.TrimSpace(os.Getenv("KOFI_VERIFICATION_TOKEN"))
	if expectedToken == "" {
		c.JSON(http.StatusInternalServerError, apiErrors.NewErrorResponse(http.StatusInternalServerError, "KOFI_VERIFICATION_TOKEN is not configured"))
		return
	}

	dataStr := strings.TrimSpace(c.PostForm("data"))
	if dataStr == "" {
		c.JSON(http.StatusBadRequest, apiErrors.NewErrorResponse(http.StatusBadRequest, "Missing data payload"))
		return
	}

	var payload WebhookPayload
	if err := json.Unmarshal([]byte(dataStr), &payload); err != nil {
		c.JSON(http.StatusBadRequest, apiErrors.NewErrorResponse(http.StatusBadRequest, "Invalid data payload", err.Error()))
		return
	}

	if strings.TrimSpace(payload.VerificationToken) != expectedToken {
		c.JSON(http.StatusUnauthorized, apiErrors.NewErrorResponse(http.StatusUnauthorized, "Invalid verification token"))
		return
	}

	dbAny, ok := c.Get("db")
	if !ok {
		c.JSON(http.StatusInternalServerError, apiErrors.NewErrorResponse(http.StatusInternalServerError, "Database not available in context"))
		return
	}
	db := dbAny.(*gorm.DB)

	amountVal, err := strconv.ParseFloat(strings.TrimSpace(payload.Amount), 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, apiErrors.NewErrorResponse(http.StatusBadRequest, "Invalid amount value", err.Error()))
		return
	}
	amountVal = math.Round(amountVal*100) / 100

	discordID := ""
	if payload.DiscordUserID != nil {
		discordID = strings.TrimSpace(*payload.DiscordUserID)
	}
	if discordID == "" {
		c.JSON(http.StatusOK, WebhookResponse{Status: "ignored", Processed: false, Reason: "missing discord_userid"})
		return
	}

	var user models.User
	if err := db.Where("discord_user_id = ?", discordID).First(&user).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusOK, WebhookResponse{Status: "ignored", Processed: false, Reason: "user not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, apiErrors.NewErrorResponse(http.StatusInternalServerError, "Failed to load user", err.Error()))
		return
	}

	if err := db.Model(&models.User{}).
		Clauses(clause.Locking{Strength: "UPDATE"}).
		Where("id = ?", user.ID).
		UpdateColumn("amount_spent_usd", gorm.Expr("amount_spent_usd + ?", amountVal)).Error; err != nil {
		c.JSON(http.StatusInternalServerError, apiErrors.NewErrorResponse(http.StatusInternalServerError, "Failed to update amount", err.Error()))
		return
	}

	log.Printf("Ko-fi webhook processed: user_id=%d discord_id=%s amount=%.2f", user.ID, discordID, amountVal)
	c.JSON(http.StatusOK, WebhookResponse{Status: "ok", Processed: true})
}

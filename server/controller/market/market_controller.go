package market

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"time"

	"server/middleware"
	"server/models"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

const MarketTimerTTL = 15 * time.Minute

// MarketListing represents a single price/quantity pair for an item.
type MarketListing struct {
	Price      int64   `json:"price" binding:"required"`
	Quantity   int32   `json:"quantity" binding:"required"`
	SellerGUID *string `json:"sellerGuid"`
	NoticeTime *int64  `json:"noticeTime"`
}

// MarketUploadRequest represents the payload sent by the client.
type MarketUploadRequest struct {
	ItemID   uint            `json:"itemId" binding:"required"`
	ItemName string          `json:"itemName"`
	Listings []MarketListing `json:"listings" binding:"required"`
}

// UploadMarketData handles market data uploads.
// It throttles updates per item using Redis keys with 15-minute TTL.
func UploadMarketData(c *gin.Context) {
	var req MarketUploadRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request payload", "details": err.Error()})
		return
	}

	// Validate item ID
	if req.ItemID == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "itemId is required and must be > 0"})
		return
	}

	// Get Redis client
	redisClient := middleware.GetRedisClient()
	if redisClient == nil {
		// If Redis is not available, we can't throttle, so just save to DB
		log.Println("[Market] Redis not available, skipping throttle check")
	} else {
		// Check Redis timer for this item
		ctx := context.Background()
		timerKey := fmt.Sprintf("market:timer:%d", req.ItemID)

		// Check if key exists
		ttl, err := redisClient.TTL(ctx, timerKey).Result()
		if err == nil && ttl > 0 {
			// Timer is still active, throttle this request
			c.JSON(http.StatusOK, gin.H{
				"status":        "throttled",
				"message":       "Market data for this item was recently updated",
				"retryAfterSec": int(ttl.Seconds()),
			})
			return
		}

		// Set the timer for this item
		if err := redisClient.Set(ctx, timerKey, time.Now().Unix(), MarketTimerTTL).Err(); err != nil {
			log.Printf("[Market] Failed to set Redis timer for item %d: %v", req.ItemID, err)
			// Continue anyway - we just won't have throttling for this item
		}
	}

	// Get DB connection
	dbAny, exists := c.Get("db")
	if !exists {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database not available"})
		return
	}
	db, ok := dbAny.(*gorm.DB)
	if !ok {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Invalid database connection"})
		return
	}

	// Create market data records
	var marketDataList []models.MarketData
	for _, listing := range req.Listings {
		marketDataList = append(marketDataList, models.MarketData{
			ItemID:     req.ItemID,
			ItemName:   req.ItemName,
			Price:      listing.Price,
			Quantity:   listing.Quantity,
			SellerGUID: listing.SellerGUID,
			NoticeTime: listing.NoticeTime,
		})
	}

	if len(marketDataList) > 0 {
		if err := db.Create(&marketDataList).Error; err != nil {
			log.Printf("[Market] Failed to save market data: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save market data"})
			return
		}
	}

	log.Printf("[Market] Saved %d market listings for ItemID=%d", len(marketDataList), req.ItemID)
	c.JSON(http.StatusCreated, gin.H{
		"status":  "accepted",
		"message": "Market data saved successfully",
		"count":   len(marketDataList),
	})
}

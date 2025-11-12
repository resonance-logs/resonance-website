package module_optimizer

import (
	"encoding/json"
	"net/http"
	"strconv"

	"server/models"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// GetHistory retrieves user's optimization history with pagination
func GetHistory(c *gin.Context) {
	dbi, _ := c.Get("db")
	db := dbi.(*gorm.DB)

	userIdi, _ := c.Get("user")
	user := userIdi.(*models.User)

	// Parse pagination parameters
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	offset, _ := strconv.Atoi(c.DefaultQuery("offset", "0"))

	// Validate parameters
	if limit < 1 || limit > 100 {
		limit = 20
	}
	if offset < 0 {
		offset = 0
	}

	// Query optimization history
	var results []models.OptimizationResult
	var total int64

	// Count total
	db.Model(&models.OptimizationResult{}).
		Where("user_id = ?", user.ID).
		Count(&total)

	// Fetch paginated results
	err := db.Where("user_id = ?", user.ID).
		Order("created_at DESC").
		Limit(limit).
		Offset(offset).
		Find(&results).Error

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"code":    "internal_error",
				"message": "Failed to retrieve optimization history",
			},
		})
		return
	}

	// Transform to history items (lighter response)
	historyItems := make([]map[string]interface{}, len(results))
	for i, result := range results {
		// Extract top score from combinations JSON
		var topScore float64
		var combinations []map[string]interface{}
		if err := json.Unmarshal(result.Combinations, &combinations); err == nil && len(combinations) > 0 {
			if score, ok := combinations[0]["score"].(float64); ok {
				topScore = score
			}
		}

		historyItems[i] = map[string]interface{}{
			"id":                  result.ID,
			"category":            result.Category,
			"priority_attributes": result.PriorityAttributes,
			"processing_time_ms":  result.ProcessingTimeMS,
			"top_score":           topScore,
			"created_at":          result.CreatedAt,
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"history": historyItems,
		"total":   total,
	})
}

// GetHistoryItem retrieves a specific optimization result by ID
func GetHistoryItem(c *gin.Context) {
	dbi, _ := c.Get("db")
	db := dbi.(*gorm.DB)

	userIdi, _ := c.Get("user")
	user := userIdi.(*models.User)

	// Parse ID parameter
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": gin.H{
				"code":    "bad_request",
				"message": "Invalid history ID",
			},
		})
		return
	}

	// Fetch optimization result
	var result models.OptimizationResult
	err = db.Where("id = ? AND user_id = ?", id, user.ID).First(&result).Error

	if err == gorm.ErrRecordNotFound {
		c.JSON(http.StatusNotFound, gin.H{
			"error": gin.H{
				"code":    "not_found",
				"message": "Optimization result not found",
			},
		})
		return
	}

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"code":    "internal_error",
				"message": "Failed to retrieve optimization result",
			},
		})
		return
	}

	// Return full result with solutions
	c.JSON(http.StatusOK, gin.H{
		"result": gin.H{
			"solutions": result.Combinations,
			"metadata": gin.H{
				"processing_time_ms": result.ProcessingTimeMS,
				"category":           result.Category,
				"created_at":         result.CreatedAt,
			},
		},
	})
}

// DeleteHistoryItem removes an optimization result from history
func DeleteHistoryItem(c *gin.Context) {
	dbi, _ := c.Get("db")
	db := dbi.(*gorm.DB)

	userIdi, _ := c.Get("user")
	user := userIdi.(*models.User)

	// Parse ID parameter
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": gin.H{
				"code":    "bad_request",
				"message": "Invalid history ID",
			},
		})
		return
	}

	// Delete optimization result
	result := db.Where("id = ? AND user_id = ?", id, user.ID).Delete(&models.OptimizationResult{})

	if result.RowsAffected == 0 {
		c.JSON(http.StatusNotFound, gin.H{
			"error": gin.H{
				"code":    "not_found",
				"message": "Optimization result not found",
			},
		})
		return
	}

	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"code":    "internal_error",
				"message": "Failed to delete optimization result",
			},
		})
		return
	}

	c.Status(http.StatusNoContent)
}

package upload

import (
	"net/http"

	apiErrors "server/controller"
	"server/models"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// SyncPlayerDataRequest represents the request body for syncing player data independently
type SyncPlayerDataRequest struct {
	PlayerData    []DetailedPlayerDataIn `json:"playerData"`
	ClientVersion *string                `json:"clientVersion"`
}

// SyncPlayerDataResponse represents the response for the player data sync endpoint
type SyncPlayerDataResponse struct {
	Synced  int     `json:"synced"`
	Updated int     `json:"updated"`
	Created int     `json:"created"`
	IDs     []int64 `json:"ids"`
}

// SyncPlayerData handles POST /api/v1/upload/player-data
// This endpoint allows syncing detailed player data independently from encounter uploads
func SyncPlayerData(c *gin.Context) {
	// Get db and user from context
	dbAny, exists := c.Get("db")
	if !exists {
		c.JSON(http.StatusInternalServerError, apiErrors.NewErrorResponse(http.StatusInternalServerError, "Database not available in context"))
		return
	}
	db := dbAny.(*gorm.DB)

	userAny, exists := c.Get("user")
	if !exists {
		c.JSON(http.StatusUnauthorized, apiErrors.NewErrorResponse(http.StatusUnauthorized, "Unauthorized"))
		return
	}
	user := userAny.(*models.User)

	// Bind JSON
	var req SyncPlayerDataRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, apiErrors.NewErrorResponse(http.StatusBadRequest, "Invalid request payload", err.Error()))
		return
	}

	if len(req.PlayerData) == 0 {
		c.JSON(http.StatusOK, SyncPlayerDataResponse{Synced: 0, Updated: 0, Created: 0, IDs: []int64{}})
		return
	}

	// Limit batch size to prevent abuse
	if len(req.PlayerData) > 100 {
		c.JSON(http.StatusBadRequest, apiErrors.NewErrorResponse(http.StatusBadRequest, "Too many player data entries (max 100)"))
		return
	}

	var created, updated int
	syncedIDs := make([]int64, 0, len(req.PlayerData))

	err := db.Transaction(func(tx *gorm.DB) error {
		for _, pd := range req.PlayerData {
			data := models.DetailedPlayerData{
				PlayerID:          pd.PlayerID,
				UserID:            &user.ID,
				LastSeenMs:        pd.LastSeenMs,
				CharSerializeJSON: pd.CharSerializeJSON,
			}
			if pd.ProfessionListJSON != nil {
				data.ProfessionListJSON = *pd.ProfessionListJSON
			}
			if pd.TalentNodeIDsJSON != nil {
				data.TalentNodeIDsJSON = *pd.TalentNodeIDsJSON
			}

			meta := extractPlayerMetadata(pd.CharSerializeJSON)
			if meta.playerName != nil {
				data.PlayerName = meta.playerName
			}
			if meta.abilityScore != nil {
				data.AbilityScore = meta.abilityScore
			}
			if meta.regionID != nil {
				data.RegionID = meta.regionID
			}

			// Check if record exists
			var existing models.DetailedPlayerData
			err := tx.Where("player_id = ?", pd.PlayerID).First(&existing).Error

			if err == gorm.ErrRecordNotFound {
				// Create new record
				if err := tx.Create(&data).Error; err != nil {
					return err
				}
				created++
			} else if err != nil {
				return err
			} else {
				// Update only if our data is newer
				if pd.LastSeenMs > existing.LastSeenMs {
					if err := tx.Model(&existing).Updates(map[string]interface{}{
						"last_seen_ms":         data.LastSeenMs,
						"char_serialize_json":  data.CharSerializeJSON,
						"profession_list_json": data.ProfessionListJSON,
						"talent_node_ids_json": data.TalentNodeIDsJSON,
						"region_id":            data.RegionID,
						"ability_score":        data.AbilityScore,
						"player_name":          data.PlayerName,
						"user_id":              data.UserID,
					}).Error; err != nil {
						return err
					}
					updated++
				}
			}

			syncedIDs = append(syncedIDs, pd.PlayerID)
		}
		return nil
	})

	if err != nil {
		c.JSON(http.StatusInternalServerError, apiErrors.NewErrorResponse(http.StatusInternalServerError, "Failed to sync player data", err.Error()))
		return
	}

	c.JSON(http.StatusOK, SyncPlayerDataResponse{
		Synced:  len(syncedIDs),
		Updated: updated,
		Created: created,
		IDs:     syncedIDs,
	})
}

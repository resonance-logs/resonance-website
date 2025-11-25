package player

import (
	"encoding/json"
	"net/http"
	"strconv"
	"strings"
	"time"

	apiErrors "server/controller"
	"server/models"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type PlayerTopRow struct {
	models.ActorEncounterStat
	HPS       *float64   `json:"hps,omitempty"`
	SceneName *string    `json:"sceneName,omitempty"`
	StartedAt *time.Time `json:"startedAt,omitempty"`
}

type GetTop10PlayersResponse struct {
	Players []PlayerTopRow `json:"players"`
}

// GET /api/v1/player/top10
// Query params: scene_name (required), class_id (optional), class_spec (optional)
func GetTop10Players(c *gin.Context) {
	dbAny, ok := c.Get("db")
	if !ok {
		c.JSON(http.StatusInternalServerError, apiErrors.NewErrorResponse(http.StatusInternalServerError, "Database not available in context"))
		return
	}
	db := dbAny.(*gorm.DB)

	sceneName := strings.TrimSpace(c.Query("scene_name"))
	if sceneName == "" {
		c.JSON(http.StatusBadRequest, apiErrors.NewErrorResponse(http.StatusBadRequest, "Missing required query param: scene_name"))
		return
	}

	var classID *int64
	if v := strings.TrimSpace(c.Query("class_id")); v != "" {
		if n, err := strconv.ParseInt(v, 10, 64); err == nil {
			classID = &n
		} else {
			c.JSON(http.StatusBadRequest, apiErrors.NewErrorResponse(http.StatusBadRequest, "Invalid class_id"))
			return
		}
	}

	var classSpec *int64
	if v := strings.TrimSpace(c.Query("class_spec")); v != "" {
		if n, err := strconv.ParseInt(v, 10, 64); err == nil {
			classSpec = &n
		} else {
			c.JSON(http.StatusBadRequest, apiErrors.NewErrorResponse(http.StatusBadRequest, "Invalid class_spec"))
			return
		}
	}

	// Build base query joining encounters. Use Model so GORM knows the destination
	// model and can map selected columns into the embedded struct fields.
	q := db.Model(&models.ActorEncounterStat{}).
		Joins("JOIN encounters ON encounters.id = actor_encounter_stats.encounter_id").
		Where("actor_encounter_stats.is_player = ?", true).
		Where("LOWER(encounters.scene_name) = LOWER(?)", sceneName).
		Where("actor_encounter_stats.name IS NOT NULL AND actor_encounter_stats.name <> ''")

	if classID != nil {
		q = q.Where("actor_encounter_stats.class_id = ?", *classID)
	}
	if classSpec != nil {
		q = q.Where("actor_encounter_stats.class_spec = ?", *classSpec)
	}

	// ability_score range: expect format "min,max" where either side can be omitted
	if v := strings.TrimSpace(c.Query("ability_score")); v != "" {
		parts := strings.Split(v, ",")
		if len(parts) >= 1 {
			if s := strings.TrimSpace(parts[0]); s != "" {
				if n, err := strconv.ParseInt(s, 10, 64); err == nil {
					q = q.Where("actor_encounter_stats.ability_score >= ?", n)
				} else {
					c.JSON(http.StatusBadRequest, apiErrors.NewErrorResponse(http.StatusBadRequest, "Invalid ability_score min value"))
					return
				}
			}
		}
		if len(parts) >= 2 {
			if s := strings.TrimSpace(parts[1]); s != "" {
				if n, err := strconv.ParseInt(s, 10, 64); err == nil {
					q = q.Where("actor_encounter_stats.ability_score <= ?", n)
				} else {
					c.JSON(http.StatusBadRequest, apiErrors.NewErrorResponse(http.StatusBadRequest, "Invalid ability_score max value"))
					return
				}
			}
		}
	}

	// duration range on encounters: expect format "min,max" (seconds)
	if v := strings.TrimSpace(c.Query("duration")); v != "" {
		parts := strings.Split(v, ",")
		if len(parts) >= 1 {
			if s := strings.TrimSpace(parts[0]); s != "" {
				if f, err := strconv.ParseFloat(s, 64); err == nil {
					q = q.Where("encounters.duration >= ?", f)
				} else {
					c.JSON(http.StatusBadRequest, apiErrors.NewErrorResponse(http.StatusBadRequest, "Invalid duration min value"))
					return
				}
			}
		}
		if len(parts) >= 2 {
			if s := strings.TrimSpace(parts[1]); s != "" {
				if f, err := strconv.ParseFloat(s, 64); err == nil {
					q = q.Where("encounters.duration <= ?", f)
				} else {
					c.JSON(http.StatusBadRequest, apiErrors.NewErrorResponse(http.StatusBadRequest, "Invalid duration max value"))
					return
				}
			}
		}
	}

	// Optional HPS numeric filter
	var hasHPSFilter bool
	var hpsVal float64
	if v := strings.TrimSpace(c.Query("hps")); v != "" {
		if f, err := strconv.ParseFloat(v, 64); err == nil {
			hpsVal = f
			hasHPSFilter = true
			// compute hps as heal_dealt / encounters.duration (guard against zero duration)
			hpsExpr := "(CASE WHEN encounters.duration > 0 THEN CAST(actor_encounter_stats.heal_dealt AS double precision) / encounters.duration ELSE 0 END)"
			q = q.Where(hpsExpr+" >= ?", hpsVal)
		} else {
			c.JSON(http.StatusBadRequest, apiErrors.NewErrorResponse(http.StatusBadRequest, "Invalid hps value"))
			return
		}
	}

	// Ordering: support explicit `orderBy` query param: 'dps' | 'hps' | 'bossDps'.
	// If not provided, fall back to ordering by HPS when an HPS filter is present, otherwise by stored DPS.
	orderByParam := strings.ToLower(strings.TrimSpace(c.Query("orderBy")))

	hpsExpr := "(CASE WHEN encounters.duration > 0 THEN CAST(actor_encounter_stats.heal_dealt AS double precision) / encounters.duration ELSE 0 END)"
	bossDpsExpr := "(CASE WHEN encounters.duration > 0 THEN CAST(actor_encounter_stats.boss_damage_dealt AS double precision) / encounters.duration ELSE 0 END)"

	orderExpr := "actor_encounter_stats.dps DESC"
	switch orderByParam {
	case "hps":
		orderExpr = hpsExpr + " DESC"
	case "bossdps", "boss_dps", "boss-dps":
		orderExpr = bossDpsExpr + " DESC"
	case "dps":
		orderExpr = "actor_encounter_stats.dps DESC"
	case "":
		if hasHPSFilter {
			orderExpr = hpsExpr + " DESC"
		}
	default:
		// unknown value: keep default behavior (hps when filtered, otherwise dps)
		if hasHPSFilter {
			orderExpr = hpsExpr + " DESC"
		}
	}

	// Select all actor columns plus encounter scene/start and computed HPS.
	// Alias encounter columns explicitly so mapping to `PlayerTopRow` fields is deterministic.
	q = q.Select("actor_encounter_stats.*, encounters.scene_name AS scene_name, encounters.started_at AS started_at, (CASE WHEN encounters.duration > 0 THEN CAST(actor_encounter_stats.heal_dealt AS double precision) / encounters.duration ELSE 0 END) AS hps")

	var rows []PlayerTopRow
	if err := q.Order(orderExpr).Limit(10).Find(&rows).Error; err != nil {
		c.JSON(http.StatusInternalServerError, apiErrors.NewErrorResponse(http.StatusInternalServerError, "Failed to query top players", err.Error()))
		return
	}

	c.JSON(http.StatusOK, GetTop10PlayersResponse{Players: rows})
}

// extractProfileUrl extracts the Profile.Url from AvatarInfo
func extractProfileUrl(avatarInfo interface{}) *string {
	if avatarInfoMap, ok := avatarInfo.(map[string]interface{}); ok {
		if profileRaw, ok := avatarInfoMap["Profile"]; ok {
			if profileMap, ok := profileRaw.(map[string]interface{}); ok {
				if url, ok := profileMap["Url"].(string); ok && url != "" {
					return &url
				}
			}
		}
	}
	return nil
}

// CharBaseData represents the essential character information
type CharBaseData struct {
	Name            string      `json:"name,omitempty"`
	CreateTime      string      `json:"createTime,omitempty"`
	CharId          string      `json:"charId,omitempty"`
	TotalOnlineTime string      `json:"totalOnlineTime,omitempty"`
	LastOfflineTime string      `json:"lastOfflineTime,omitempty"`
	AvatarInfo      interface{} `json:"avatarInfo,omitempty"`
}

// DetailedPlayerDataResponse represents player data with flattened charSerialize fields
type DetailedPlayerDataResponse struct {
	PlayerID              int64         `json:"playerId"`
	LastSeenMs            int64         `json:"lastSeenMs"`
	ProfileUrl            *string       `json:"profileUrl,omitempty"`
	CharBase              *CharBaseData `json:"charBase,omitempty"`
	CharStatisticsData    interface{}   `json:"charStatisticsData,omitempty"`
	DungeonList           interface{}   `json:"dungeonList,omitempty"`
	Equip                 interface{}   `json:"equip,omitempty"`
	FightPoint            interface{}   `json:"fightPoint,omitempty"`
	GashaData             interface{}   `json:"gashaData,omitempty"`
	ItemCurrency          interface{}   `json:"itemCurrency,omitempty"`
	LifeProfession        interface{}   `json:"lifeProfession,omitempty"`
	MasterModeDungeonInfo interface{}   `json:"masterModeDungeonInfo,omitempty"`
	ProfessionList        interface{}   `json:"professionList,omitempty"`
	NewbieData            interface{}   `json:"newbieData,omitempty"`
}

// GET /api/v1/player/detailed-playerdata/:id
// Requires authentication - returns detailed player data for the specified user id
// The handler verifies the authenticated user matches the requested id.
func GetDetailedPlayerData(c *gin.Context) {
	// Extract authenticated user from context
	userVal, ok := c.Get("user")
	if !ok {
		c.JSON(http.StatusUnauthorized, apiErrors.NewErrorResponse(http.StatusUnauthorized, "Not authenticated"))
		return
	}
	user := userVal.(*models.User)

	// Parse and validate path param id
	idStr := strings.TrimSpace(c.Param("id"))
	if idStr == "" {
		c.JSON(http.StatusBadRequest, apiErrors.NewErrorResponse(http.StatusBadRequest, "Missing path param: id"))
		return
	}
	reqID, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, apiErrors.NewErrorResponse(http.StatusBadRequest, "Invalid id path param"))
		return
	}

	// Ensure the authenticated user is requesting their own data
	if reqID != int64(user.ID) {
		c.JSON(http.StatusForbidden, apiErrors.NewErrorResponse(http.StatusForbidden, "Forbidden: requested user id does not match authenticated user"))
		return
	}

	// Get database connection from context
	dbAny, ok := c.Get("db")
	if !ok {
		c.JSON(http.StatusInternalServerError, apiErrors.NewErrorResponse(http.StatusInternalServerError, "Database not available in context"))
		return
	}
	db := dbAny.(*gorm.DB)

	// Query detailed player data linked to the user's ID
	var playerData []models.DetailedPlayerData
	if err := db.Where("user_id = ?", user.ID).Order("last_seen_ms DESC").Find(&playerData).Error; err != nil {
		c.JSON(http.StatusInternalServerError, apiErrors.NewErrorResponse(http.StatusInternalServerError, "Failed to query player data", err.Error()))
		return
	}

	// Parse JSON strings and extract specific fields from charSerialize
	var response []DetailedPlayerDataResponse
	for _, pd := range playerData {
		responseItem := DetailedPlayerDataResponse{
			PlayerID:   pd.PlayerID,
			LastSeenMs: pd.LastSeenMs,
		}

		// Parse CharSerializeJSON and extract specific fields
		if pd.CharSerializeJSON != "" {
			var charData map[string]interface{}
			if err := json.Unmarshal([]byte(pd.CharSerializeJSON), &charData); err == nil {
				// Extract and parse CharBase with specific fields (PascalCase in source data)
				if charBaseRaw, ok := charData["CharBase"]; ok {
					if charBaseMap, ok := charBaseRaw.(map[string]interface{}); ok {
						charBase := &CharBaseData{}

						if name, ok := charBaseMap["Name"].(string); ok {
							charBase.Name = name
						}
						if createTime, ok := charBaseMap["CreateTime"].(string); ok {
							charBase.CreateTime = createTime
						}
						if charId, ok := charBaseMap["CharId"].(string); ok {
							charBase.CharId = charId
						}
						if totalOnlineTime, ok := charBaseMap["TotalOnlineTime"].(string); ok {
							charBase.TotalOnlineTime = totalOnlineTime
						}
						if lastOfflineTime, ok := charBaseMap["LastOfflineTime"].(string); ok {
							charBase.LastOfflineTime = lastOfflineTime
						}
						if avatarInfo, ok := charBaseMap["AvatarInfo"]; ok {
							charBase.AvatarInfo = avatarInfo
							// Extract profile URL from AvatarInfo
							responseItem.ProfileUrl = extractProfileUrl(avatarInfo)
						}

						responseItem.CharBase = charBase
					}
				}

				if val, ok := charData["CharStatisticsData"]; ok {
					responseItem.CharStatisticsData = val
				}
				if val, ok := charData["DungeonList"]; ok {
					responseItem.DungeonList = val
				}
				if val, ok := charData["Equip"]; ok {
					responseItem.Equip = val
				}
				if val, ok := charData["FightPoint"]; ok {
					responseItem.FightPoint = val
				}
				if val, ok := charData["GashaData"]; ok {
					responseItem.GashaData = val
				}
				if val, ok := charData["ItemCurrency"]; ok {
					responseItem.ItemCurrency = val
				}
				if val, ok := charData["LifeProfession"]; ok {
					responseItem.LifeProfession = val
				}
				if val, ok := charData["MasterModeDungeonInfo"]; ok {
					responseItem.MasterModeDungeonInfo = val
				}
				if val, ok := charData["ProfessionList"]; ok {
					responseItem.ProfessionList = val
				}
				if val, ok := charData["NewbieData"]; ok {
					responseItem.NewbieData = val
				}
			}
		}

		response = append(response, responseItem)
	}

	// Return empty array if no data found (rather than 404)
	c.JSON(http.StatusOK, gin.H{
		"playerData": response,
	})
}

// GET /api/v1/player/by-player-id/:player_id
// Returns detailed player data for the specified player_id (unprotected)
func GetPlayerDataByPlayerID(c *gin.Context) {
	// Parse and validate path param player_id
	playerIDStr := strings.TrimSpace(c.Param("player_id"))
	if playerIDStr == "" {
		c.JSON(http.StatusBadRequest, apiErrors.NewErrorResponse(http.StatusBadRequest, "Missing path param: player_id"))
		return
	}
	playerID, err := strconv.ParseInt(playerIDStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, apiErrors.NewErrorResponse(http.StatusBadRequest, "Invalid player_id path param"))
		return
	}

	// Get database connection from context
	dbAny, ok := c.Get("db")
	if !ok {
		c.JSON(http.StatusInternalServerError, apiErrors.NewErrorResponse(http.StatusInternalServerError, "Database not available in context"))
		return
	}
	db := dbAny.(*gorm.DB)

	// Query detailed player data by player_id
	var playerData models.DetailedPlayerData
	if err := db.Where("player_id = ?", playerID).First(&playerData).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, apiErrors.NewErrorResponse(http.StatusNotFound, "Player not found"))
			return
		}
		c.JSON(http.StatusInternalServerError, apiErrors.NewErrorResponse(http.StatusInternalServerError, "Failed to query player data", err.Error()))
		return
	}

	// Parse JSON and create response
	responseItem := DetailedPlayerDataResponse{
		PlayerID:   playerData.PlayerID,
		LastSeenMs: playerData.LastSeenMs,
	}

	// Parse CharSerializeJSON and extract specific fields
	if playerData.CharSerializeJSON != "" {
		var charData map[string]interface{}
		if err := json.Unmarshal([]byte(playerData.CharSerializeJSON), &charData); err == nil {
			// Extract and parse CharBase with specific fields (PascalCase in source data)
			if charBaseRaw, ok := charData["CharBase"]; ok {
				if charBaseMap, ok := charBaseRaw.(map[string]interface{}); ok {
					charBase := &CharBaseData{}

					if name, ok := charBaseMap["Name"].(string); ok {
						charBase.Name = name
					}
					if createTime, ok := charBaseMap["CreateTime"].(string); ok {
						charBase.CreateTime = createTime
					}
					if charId, ok := charBaseMap["CharId"].(string); ok {
						charBase.CharId = charId
					}
					if totalOnlineTime, ok := charBaseMap["TotalOnlineTime"].(string); ok {
						charBase.TotalOnlineTime = totalOnlineTime
					}
					if lastOfflineTime, ok := charBaseMap["LastOfflineTime"].(string); ok {
						charBase.LastOfflineTime = lastOfflineTime
					}
					if avatarInfo, ok := charBaseMap["AvatarInfo"]; ok {
						charBase.AvatarInfo = avatarInfo
						// Extract profile URL from AvatarInfo
						responseItem.ProfileUrl = extractProfileUrl(avatarInfo)
					}

					responseItem.CharBase = charBase
				}
			}

			if val, ok := charData["CharStatisticsData"]; ok {
				responseItem.CharStatisticsData = val
			}
			if val, ok := charData["DungeonList"]; ok {
				responseItem.DungeonList = val
			}
			if val, ok := charData["Equip"]; ok {
				responseItem.Equip = val
			}
			if val, ok := charData["FightPoint"]; ok {
				responseItem.FightPoint = val
			}
			if val, ok := charData["GashaData"]; ok {
				responseItem.GashaData = val
			}
			if val, ok := charData["ItemCurrency"]; ok {
				responseItem.ItemCurrency = val
			}
			if val, ok := charData["LifeProfession"]; ok {
				responseItem.LifeProfession = val
			}
			if val, ok := charData["MasterModeDungeonInfo"]; ok {
				responseItem.MasterModeDungeonInfo = val
			}
			if val, ok := charData["ProfessionList"]; ok {
				responseItem.ProfessionList = val
			}
			if val, ok := charData["NewbieData"]; ok {
				responseItem.NewbieData = val
			}
		}
	}

	c.JSON(http.StatusOK, responseItem)
}

// PlayerSuggestion represents a minimal player data for search suggestions
type PlayerSuggestion struct {
	PlayerID   int64   `json:"playerId"`
	PlayerName string  `json:"playerName"`
	ProfileUrl *string `json:"profileUrl,omitempty"`
}

type SuggestPlayersResponse struct {
	Players []PlayerSuggestion `json:"players"`
}

// GET /api/v1/player/suggest
// Query params: search (required, min 3 characters)
// Returns top 3 players matching the search term by player_name
func SuggestPlayers(c *gin.Context) {
	search := strings.TrimSpace(c.Query("search"))
	if len(search) < 3 {
		c.JSON(http.StatusBadRequest, apiErrors.NewErrorResponse(http.StatusBadRequest, "Search term must be at least 3 characters"))
		return
	}

	// Get database connection from context
	dbAny, ok := c.Get("db")
	if !ok {
		c.JSON(http.StatusInternalServerError, apiErrors.NewErrorResponse(http.StatusInternalServerError, "Database not available in context"))
		return
	}
	db := dbAny.(*gorm.DB)

	// Query top 3 players by name similarity (case-insensitive partial match)
	var playerData []models.DetailedPlayerData
	if err := db.Where("LOWER(player_name) LIKE LOWER(?)", "%"+search+"%").
		Order("last_seen_ms DESC").
		Limit(3).
		Find(&playerData).Error; err != nil {
		c.JSON(http.StatusInternalServerError, apiErrors.NewErrorResponse(http.StatusInternalServerError, "Failed to query players", err.Error()))
		return
	}

	// Build simplified response with only essential fields
	var response []PlayerSuggestion
	for _, pd := range playerData {
		suggestion := PlayerSuggestion{
			PlayerID: pd.PlayerID,
		}

		// Use the player_name field if available
		if pd.PlayerName != nil {
			suggestion.PlayerName = *pd.PlayerName
		}

		// Extract profile URL from CharSerializeJSON if needed
		if pd.CharSerializeJSON != "" {
			var charData map[string]interface{}
			if err := json.Unmarshal([]byte(pd.CharSerializeJSON), &charData); err == nil {
				if charBaseRaw, ok := charData["CharBase"]; ok {
					if charBaseMap, ok := charBaseRaw.(map[string]interface{}); ok {
						if avatarInfo, ok := charBaseMap["AvatarInfo"]; ok {
							suggestion.ProfileUrl = extractProfileUrl(avatarInfo)
						}
					}
				}
			}
		}

		response = append(response, suggestion)
	}

	c.JSON(http.StatusOK, SuggestPlayersResponse{Players: response})
}

// GET /api/v1/player/getCharacters
// Requires authentication - returns simple list of characters owned by the authenticated user
func GetCharacters(c *gin.Context) {
	// Require authenticated user
	userVal, ok := c.Get("user")
	if !ok {
		c.JSON(http.StatusUnauthorized, apiErrors.NewErrorResponse(http.StatusUnauthorized, "Not authenticated"))
		return
	}
	user := userVal.(*models.User)

	// Get DB
	dbAny, ok := c.Get("db")
	if !ok {
		c.JSON(http.StatusInternalServerError, apiErrors.NewErrorResponse(http.StatusInternalServerError, "Database not available in context"))
		return
	}
	db := dbAny.(*gorm.DB)

	var playerData []models.DetailedPlayerData
	if err := db.Where("user_id = ?", user.ID).Find(&playerData).Error; err != nil {
		c.JSON(http.StatusInternalServerError, apiErrors.NewErrorResponse(http.StatusInternalServerError, "Failed to query player data", err.Error()))
		return
	}

	type CharacterEntry struct {
		CharacterName string  `json:"characterName"`
		CharacterId   string  `json:"characterId"`
		ProfileUrl    *string `json:"profileUrl,omitempty"`
	}

	var chars []CharacterEntry
	for _, pd := range playerData {
		if pd.CharSerializeJSON == "" {
			continue
		}
		var charData map[string]interface{}
		if err := json.Unmarshal([]byte(pd.CharSerializeJSON), &charData); err != nil {
			continue
		}
		if cb, ok := charData["CharBase"]; ok {
			if cbm, ok := cb.(map[string]interface{}); ok {
				name := ""
				id := ""
				if n, ok := cbm["Name"].(string); ok {
					name = n
				}
				if cid, ok := cbm["CharId"].(string); ok {
					id = cid
				}
				if name != "" || id != "" {
					var purl *string
					if avatarInfo, ok := cbm["AvatarInfo"]; ok {
						purl = extractProfileUrl(avatarInfo)
					}
					chars = append(chars, CharacterEntry{CharacterName: name, CharacterId: id, ProfileUrl: purl})
				}
			}
		}
	}

	c.JSON(http.StatusOK, gin.H{"characters": chars})
}

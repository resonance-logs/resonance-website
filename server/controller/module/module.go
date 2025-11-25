package module

import (
	"encoding/json"
	"net/http"

	apiErrors "server/controller"
	"server/models"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// GET /api/v1/module/getModuleData/:charId
// Reads `char_serialize_json` from `detailed_playerdata` where `player_id = :charId`
// and returns the `Mod` object and `ItemPackage.Packages.5` embedded inside.
func GetModuleData(c *gin.Context) {
	charIdStr := c.Param("charId")
	if charIdStr == "" {
		c.JSON(http.StatusBadRequest, apiErrors.NewErrorResponse(http.StatusBadRequest, "Missing path param: charId"))
		return
	}

	// get DB from context
	dbAny, ok := c.Get("db")
	if !ok {
		c.JSON(http.StatusInternalServerError, apiErrors.NewErrorResponse(http.StatusInternalServerError, "Database not available in context"))
		return
	}
	db := dbAny.(*gorm.DB)

	var dp models.DetailedPlayerData
	if err := db.Where("player_id = ?", charIdStr).First(&dp).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, apiErrors.NewErrorResponse(http.StatusNotFound, "character not found"))
			return
		}
		c.JSON(http.StatusInternalServerError, apiErrors.NewErrorResponse(http.StatusInternalServerError, "Failed to query player data", err.Error()))
		return
	}

	if dp.CharSerializeJSON == "" {
		c.JSON(http.StatusOK, gin.H{"mod": nil, "itemPackage5": nil})
		return
	}

	var obj map[string]interface{}
	if err := json.Unmarshal([]byte(dp.CharSerializeJSON), &obj); err != nil {
		c.JSON(http.StatusInternalServerError, apiErrors.NewErrorResponse(http.StatusInternalServerError, "Failed to parse char_serialize_json", err.Error()))
		return
	}

	var mod interface{}
	if m, ok := obj["Mod"]; ok {
		mod = m
	}

	var pkg5 interface{}
	if ip, ok := obj["ItemPackage"].(map[string]interface{}); ok {
		if packs, ok := ip["Packages"].(map[string]interface{}); ok {
			if p5, ok := packs["5"]; ok {
				pkg5 = p5
			}
		}
	}

	c.JSON(http.StatusOK, gin.H{"mod": mod, "itemPackage5": pkg5})
}

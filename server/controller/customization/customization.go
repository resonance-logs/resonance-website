package customization

import (
	"net/http"
	"strings"

	apiErrors "server/controller"
	"server/models"

	"github.com/gin-gonic/gin"
	"gorm.io/datatypes"
	"gorm.io/gorm"
)

type CustomizationResponse struct {
	Customization datatypes.JSONMap `json:"customization"`
}

type CustomTagSettings struct {
	Text  *string `json:"text,omitempty"`
	Color *string `json:"color,omitempty"`
	Icon  *string `json:"icon,omitempty"`
}

type EncounterTableRowSettings struct {
	Font  *string            `json:"font,omitempty"`
	Color *string            `json:"color,omitempty"`
	Tag   *CustomTagSettings `json:"tag,omitempty"`
}

type UpdateCustomizationRequest struct {
	EncounterTableEntryTheme *string                    `json:"encounterTableEntryTheme"`
	EncounterTableRow        *EncounterTableRowSettings `json:"encounterTableRow,omitempty"`
	EntityLeaderboardTheme   *string                    `json:"entityLeaderboardTheme,omitempty"`
}

var allowedThemes = map[string]struct{}{
	"default":                {},
	"blossoming-sakura-tree": {},
	"starry-night":           {},
	"summer-sunset":          {},
	"cyberpunk":              {},
	"green-oasis":            {},
}

var allowedFonts = map[string]struct{}{
	"":               {},
	"Knewave":        {},
	"Merienda":       {},
	"Playwrite":      {},
	"Viaoda Libre":   {},
}

var allowedGradients = map[string]struct{}{
	"":                {},
	"neon-pulse":      {},
	"golden-hour":     {},
	"aurora":          {},
	"candy":           {},
	"fire-ice":        {},
	"electric":        {},
}

var allowedTagIcons = map[string]struct{}{
	"":         {},
	"star":     {},
	"crown":    {},
	"shield":   {},
	"heart":    {},
	"sparkles": {},
	"fire":     {},
	"bolt":     {},
	"trophy":   {},
}

// GET /api/v1/customization
func GetCustomization(c *gin.Context) {
	user, ok := getUser(c)
	if !ok {
		return
	}

	custom := user.Customization
	if custom == nil {
		custom = datatypes.JSONMap{}
	}

	c.JSON(http.StatusOK, CustomizationResponse{Customization: custom})
}

// PUT /api/v1/customization
func UpdateCustomization(c *gin.Context) {
	db, ok := getDB(c)
	if !ok {
		return
	}

	user, ok := getUser(c)
	if !ok {
		return
	}

	if user.AmountSpentUSD < 3 {
		c.JSON(http.StatusForbidden, apiErrors.NewErrorResponse(http.StatusForbidden, "Customization unlock requires at least $3 spent"))
		return
	}

	var req UpdateCustomizationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, apiErrors.NewErrorResponse(http.StatusBadRequest, "Invalid request body", err.Error()))
		return
	}

	// Initialize customization map if nil
	if user.Customization == nil {
		user.Customization = datatypes.JSONMap{}
	}

	if req.EncounterTableEntryTheme != nil {
		theme := strings.TrimSpace(*req.EncounterTableEntryTheme)
		if theme == "" {
			delete(user.Customization, "encounterTableEntryTheme")
		} else {
			if _, ok := allowedThemes[theme]; !ok {
				c.JSON(http.StatusBadRequest, apiErrors.NewErrorResponse(http.StatusBadRequest, "Invalid encounterTableEntryTheme value"))
				return
			}
			user.Customization["encounterTableEntryTheme"] = theme
		}
	}

	// Handle entityLeaderboardTheme (uses same theme options)
	if req.EntityLeaderboardTheme != nil {
		theme := strings.TrimSpace(*req.EntityLeaderboardTheme)
		if theme == "" {
			delete(user.Customization, "entityLeaderboardTheme")
		} else {
			if _, ok := allowedThemes[theme]; !ok {
				c.JSON(http.StatusBadRequest, apiErrors.NewErrorResponse(http.StatusBadRequest, "Invalid entityLeaderboardTheme value"))
				return
			}
			user.Customization["entityLeaderboardTheme"] = theme
		}
	}

	// Handle encounterTableRow settings
	if req.EncounterTableRow != nil {
		rowSettings := make(map[string]interface{})

		// Get existing settings if any
		if existing, ok := user.Customization["encounterTableRow"].(map[string]interface{}); ok {
			rowSettings = existing
		}

		// Handle font
		if req.EncounterTableRow.Font != nil {
			font := strings.TrimSpace(*req.EncounterTableRow.Font)
			if font == "" {
				delete(rowSettings, "font")
			} else {
				if _, ok := allowedFonts[font]; !ok {
					c.JSON(http.StatusBadRequest, apiErrors.NewErrorResponse(http.StatusBadRequest, "Invalid font value"))
					return
				}
				rowSettings["font"] = font
			}
		}

		// Handle color (can be a gradient key or a custom hex color)
		if req.EncounterTableRow.Color != nil {
			color := strings.TrimSpace(*req.EncounterTableRow.Color)
			if color == "" {
				delete(rowSettings, "color")
			} else {
				// Check if it's an allowed gradient OR a valid hex color
				_, isGradient := allowedGradients[color]
				isHexColor := len(color) == 7 && color[0] == '#'
				if !isGradient && !isHexColor {
					c.JSON(http.StatusBadRequest, apiErrors.NewErrorResponse(http.StatusBadRequest, "Invalid color value - must be a gradient key or hex color"))
					return
				}
				rowSettings["color"] = color
			}
		}

		// Handle tag (custom tag with text, color, icon)
		if req.EncounterTableRow.Tag != nil {
			tagSettings := req.EncounterTableRow.Tag
			
			// Check if all fields are empty/nil - if so, remove the tag
			hasText := tagSettings.Text != nil && strings.TrimSpace(*tagSettings.Text) != ""
			hasColor := tagSettings.Color != nil && strings.TrimSpace(*tagSettings.Color) != ""
			hasIcon := tagSettings.Icon != nil && strings.TrimSpace(*tagSettings.Icon) != ""
			
			if !hasText && !hasColor && !hasIcon {
				delete(rowSettings, "tag")
			} else {
				tagData := make(map[string]interface{})
				
				// Validate and set text (max 20 characters)
				if hasText {
					text := strings.TrimSpace(*tagSettings.Text)
					if len(text) > 20 {
						c.JSON(http.StatusBadRequest, apiErrors.NewErrorResponse(http.StatusBadRequest, "Tag text cannot exceed 20 characters"))
						return
					}
					tagData["text"] = text
				}
				
				// Validate and set color (must be hex)
				if hasColor {
					color := strings.TrimSpace(*tagSettings.Color)
					isHexColor := len(color) == 7 && color[0] == '#'
					if !isHexColor {
						c.JSON(http.StatusBadRequest, apiErrors.NewErrorResponse(http.StatusBadRequest, "Tag color must be a hex color (e.g., #ff0000)"))
						return
					}
					tagData["color"] = color
				}
				
				// Validate and set icon
				if hasIcon {
					icon := strings.TrimSpace(*tagSettings.Icon)
					if _, ok := allowedTagIcons[icon]; !ok {
						c.JSON(http.StatusBadRequest, apiErrors.NewErrorResponse(http.StatusBadRequest, "Invalid tag icon"))
						return
					}
					tagData["icon"] = icon
				}
				
				if len(tagData) > 0 {
					rowSettings["tag"] = tagData
				}
			}
		}

		// Only store if there are settings, otherwise remove the key
		if len(rowSettings) > 0 {
			user.Customization["encounterTableRow"] = rowSettings
		} else {
			delete(user.Customization, "encounterTableRow")
		}
	}

	if err := db.Save(user).Error; err != nil {
		c.JSON(http.StatusInternalServerError, apiErrors.NewErrorResponse(http.StatusInternalServerError, "Failed to update customization", err.Error()))
		return
	}

	c.JSON(http.StatusOK, CustomizationResponse{Customization: user.Customization})
}

func getDB(c *gin.Context) (*gorm.DB, bool) {
	dbAny, ok := c.Get("db")
	if !ok {
		c.JSON(http.StatusInternalServerError, apiErrors.NewErrorResponse(http.StatusInternalServerError, "Database not available in context"))
		return nil, false
	}
	db, ok := dbAny.(*gorm.DB)
	if !ok {
		c.JSON(http.StatusInternalServerError, apiErrors.NewErrorResponse(http.StatusInternalServerError, "Invalid database in context"))
		return nil, false
	}
	return db, true
}

func getUser(c *gin.Context) (*models.User, bool) {
	userAny, exists := c.Get("user")
	if !exists {
		c.JSON(http.StatusUnauthorized, apiErrors.NewErrorResponse(http.StatusUnauthorized, "Not authenticated"))
		return nil, false
	}

	user, ok := userAny.(*models.User)
	if !ok {
		c.JSON(http.StatusInternalServerError, apiErrors.NewErrorResponse(http.StatusInternalServerError, "Invalid user data"))
		return nil, false
	}

	return user, true
}

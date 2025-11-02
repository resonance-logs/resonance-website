package characters

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

// GetCharacter returns basic character info and recent reports (stubbed)
func GetCharacter(c *gin.Context) {
	name := c.Param("name")
	server := c.Param("server")

	// Return a stubbed response; in a real implementation this would query a DB
	resp := gin.H{
		"name":           name,
		"server":         server,
		"class":          "Warrior",
		"recent_reports": []gin.H{{"reportId": "r123", "title": "Example Raid", "date": "2025-11-02"}},
	}
	c.JSON(http.StatusOK, resp)
}

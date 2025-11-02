package reports

import (
	"fmt"
	"net/http"
	"strconv"
	"time"

	"server/models"

	"github.com/gin-gonic/gin"
)

var store = models.NewInMemoryStore()

// UploadReport accepts a multipart/form-data upload and enqueues processing.
func UploadReport(c *gin.Context) {
	// Expect form field "log" with file
	file, err := c.FormFile("log")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "missing 'log' file in form"})
		return
	}

	// Optional fields
	title := c.PostForm("title")
	owner := c.PostForm("owner")

	// Generate a simple report id
	id := fmt.Sprintf("r%x", time.Now().UnixNano())

	r := &models.Report{
		ReportID: id,
		Title:    title,
		Owner:    owner,
		Fights:   []models.FightSummary{},
	}

	// Save to store
	store.SaveReport(r)

	// Initialize status
	store.SetStatus(id, &models.Status{Status: "processing", Progress: 0, Message: "queued"})

	// For demo, save a dummy fight entry after a short delay to simulate processing
	go func(reportID string, filename string) {
		// update status
		store.SetStatus(reportID, &models.Status{Status: "processing", Progress: 10, Message: "received file: " + filename})
		time.Sleep(1 * time.Second)
		// create a dummy fight
		fight := &models.Fight{ID: 1, Name: "Example Boss", Duration: 300000}
		fight.Players = []models.PlayerPerformance{{ID: 101, Name: "Player 1", Class: "Warrior"}}
		store.SaveFight(reportID, fight)
		// update report summary
		if rep, ok := store.GetReport(reportID); ok {
			rep.Fights = append(rep.Fights, models.FightSummary{ID: 1, Name: fight.Name, Duration: fight.Duration, Boss: true, Kill: true})
			store.SaveReport(rep)
		}
		store.SetStatus(reportID, &models.Status{Status: "completed", Progress: 100, Message: "processing complete"})
	}(id, file.Filename)

	statusURL := "/api/v1/reports/" + id + "/status"
	c.JSON(http.StatusAccepted, gin.H{"reportId": id, "statusUrl": statusURL})
}

func GetReport(c *gin.Context) {
	id := c.Param("reportId")
	if rep, ok := store.GetReport(id); ok {
		c.JSON(http.StatusOK, rep)
		return
	}
	c.JSON(http.StatusNotFound, gin.H{"error": "report not found"})
}

func GetStatus(c *gin.Context) {
	id := c.Param("reportId")
	if st, ok := store.GetStatus(id); ok {
		c.JSON(http.StatusOK, st)
		return
	}
	c.JSON(http.StatusNotFound, gin.H{"error": "status not found"})
}

func GetFight(c *gin.Context) {
	id := c.Param("reportId")
	fightIdStr := c.Param("fightId")
	fightId, err := strconv.Atoi(fightIdStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid fight id"})
		return
	}
	if f, ok := store.GetFight(id, fightId); ok {
		c.JSON(http.StatusOK, f)
		return
	}
	c.JSON(http.StatusNotFound, gin.H{"error": "fight not found"})
}

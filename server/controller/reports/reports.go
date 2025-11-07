package reports

import (
	"errors"
	"fmt"
	"log"
	"net/http"
	"strconv"
	"time"

	"server/models"

	"github.com/gin-gonic/gin"
)

// Use the package-level models.Store at runtime. This allows main() to wire a
// GORM-backed implementation while keeping an in-memory fallback for dev/tests.

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
	if err := models.Store.SaveReport(r); err != nil {
		log.Printf("failed to save report %s: %v", id, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to save report"})
		return
	}

	// Initialize status
	if err := models.Store.SetStatus(id, &models.Status{Status: "processing", Progress: 0, Message: "queued"}); err != nil {
		log.Printf("failed to set initial status for %s: %v", id, err)
	}

	// For demo, save a dummy fight entry after a short delay to simulate processing
	go func(reportID string, filename string) {
		// update status
		if err := models.Store.SetStatus(reportID, &models.Status{Status: "processing", Progress: 10, Message: "received file: " + filename}); err != nil {
			log.Printf("failed to update status for %s: %v", reportID, err)
		}
		time.Sleep(1 * time.Second)
		// create a dummy fight
		fight := &models.Fight{ID: 1, Name: "Example Boss", Duration: 300000}
		fight.Players = []models.PlayerPerformance{{ID: 101, Name: "Player 1", Class: "Warrior"}}
		if err := models.Store.SaveFight(reportID, fight); err != nil {
			log.Printf("failed to save fight for %s: %v", reportID, err)
			// set status to failed
			_ = models.Store.SetStatus(reportID, &models.Status{Status: "failed", Progress: 0, Message: "failed to save fight"})
			return
		}
		// update report summary
		if rep, err := models.Store.GetReport(reportID); err == nil {
			rep.Fights = append(rep.Fights, models.FightSummary{ID: 1, Name: fight.Name, Duration: fight.Duration, Boss: true, Kill: true})
			if err := models.Store.SaveReport(rep); err != nil {
				log.Printf("failed to save updated report summary for %s: %v", reportID, err)
				_ = models.Store.SetStatus(reportID, &models.Status{Status: "failed", Progress: 0, Message: "failed to update report summary"})
				return
			}
		} else {
			if errors.Is(err, models.ErrNotFound) {
				log.Printf("report not found when updating summary: %s", reportID)
			} else {
				log.Printf("error loading report %s: %v", reportID, err)
				_ = models.Store.SetStatus(reportID, &models.Status{Status: "failed", Progress: 0, Message: "error loading report"})
				return
			}
		}
		if err := models.Store.SetStatus(reportID, &models.Status{Status: "completed", Progress: 100, Message: "processing complete"}); err != nil {
			log.Printf("failed to set completed status for %s: %v", reportID, err)
		}
	}(id, file.Filename)

	statusURL := "/api/v1/reports/" + id + "/status"
	c.JSON(http.StatusAccepted, gin.H{"reportId": id, "statusUrl": statusURL})
}

func GetReport(c *gin.Context) {
	id := c.Param("reportId")
	if rep, err := models.Store.GetReport(id); err == nil {
		c.JSON(http.StatusOK, rep)
		return
	} else {
		if errors.Is(err, models.ErrNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "report not found"})
			return
		}
		log.Printf("error fetching report %s: %v", id, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal error"})
		return
	}
}

func GetStatus(c *gin.Context) {
	id := c.Param("reportId")
	if st, err := models.Store.GetStatus(id); err == nil {
		c.JSON(http.StatusOK, st)
		return
	} else {
		if errors.Is(err, models.ErrNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "status not found"})
			return
		}
		log.Printf("error fetching status %s: %v", id, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal error"})
		return
	}
}

func GetFight(c *gin.Context) {
	id := c.Param("reportId")
	fightIdStr := c.Param("fightId")
	fightId, err := strconv.Atoi(fightIdStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid fight id"})
		return
	}
	if f, err := models.Store.GetFight(id, fightId); err == nil {
		c.JSON(http.StatusOK, f)
		return
	} else {
		if errors.Is(err, models.ErrNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "fight not found"})
			return
		}
		log.Printf("error fetching fight %s#%d: %v", id, fightId, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal error"})
		return
	}
}

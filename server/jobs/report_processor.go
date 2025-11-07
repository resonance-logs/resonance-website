package jobs

import (
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"strings"
	"time"

	"server/models"
)

// ProcessReport is a background job that simulates processing a report.
func ProcessReport(reportID string, filePath string) {
	log.Printf("starting processing for report %s, file %s", reportID, filePath)

	// Simulate some work
	time.Sleep(2 * time.Second)

	// Detect file type and parse accordingly
	file, err := os.Open(filePath)
	if err != nil {
		log.Printf("failed to open file for parsing: %v", err)
		_ = models.Store.SetStatus(reportID, models.Status{Status: models.StatusFailed, Progress: 0, Message: "failed to open file"})
		return
	}
	defer file.Close()

	// Read a small chunk to determine the file type
	buffer := make([]byte, 512)
	n, err := file.Read(buffer)
	if err != nil && err != io.EOF {
		log.Printf("failed to read file for type detection: %v", err)
		_ = models.Store.SetStatus(reportID, models.Status{Status: models.StatusFailed, Progress: 0, Message: "failed to read file"})
		return
	}

	contentType := http.DetectContentType(buffer[:n])

	// Reset the file reader to the beginning
	file.Seek(0, 0)

	var parseErr error
	switch {
	case strings.Contains(contentType, "application/json"):
		parseErr = parseJSONLog(file, reportID)
	case strings.Contains(contentType, "text/plain"):
		parseErr = parsePlainTextLog(file, reportID)
	default:
		parseErr = fmt.Errorf("unsupported content type: %s", contentType)
	}

	if parseErr != nil {
		log.Printf("failed to parse file: %v", parseErr)
		_ = models.Store.SetStatus(reportID, models.Status{Status: models.StatusFailed, Progress: 0, Message: fmt.Sprintf("failed to parse file: %v", parseErr)})
		return
	}

	// Simulate more work
	time.Sleep(3 * time.Second)

	status := models.Status{
		Status:   models.StatusCompleted,
		Progress: 100,
		Message:  "Report processed successfully",
	}

	if err := models.Store.SetStatus(reportID, status); err != nil {
		log.Printf("error setting status for report %s: %v", reportID, err)
	}

	// Clean up the uploaded file
	if err := os.Remove(filePath); err != nil {
		log.Printf("error removing file %s: %v", filePath, err)
	}

	log.Printf("finished processing for report %s", reportID)
}

func parseJSONLog(file *os.File, reportID string) error {
	log.Printf("Parsing JSON log for report %s", reportID)
	return nil
}

func parsePlainTextLog(file *os.File, reportID string) error {
	log.Printf("Parsing plain text log for report %s", reportID)
	return nil
}

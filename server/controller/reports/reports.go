package reports

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"io/ioutil"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"time"

	"server/models"
	"server/queue"

	"github.com/gin-gonic/gin"
)

var JobQueue queue.Queue

// Use the package-level models.Store at runtime. This allows main() to wire a
const (
	maxLogSize            = 50 * 1024 * 1024 // 50 MB
	maxConcurrentUploads  = 10
	chunkSize             = 5 * 1024 * 1024 // 5 MB
	chunkedUploadsEnabled = true
)

var (
	allowedMimeTypes = []string{"application/zip", "application/json", "text/plain"}
	uploadSemaphore  = make(chan struct{}, maxConcurrentUploads)
)

// UploadReport accepts a multipart/form-data upload and enqueues processing.
func UploadReport(c *gin.Context) {
	// Limit concurrent uploads
	uploadSemaphore <- struct{}{}
	defer func() { <-uploadSemaphore }()

	// Check if this is a chunked upload
	isChunked := c.Query("chunked") == "true"
	chunkNumber, _ := strconv.Atoi(c.Query("chunk"))
	totalChunks, _ := strconv.Atoi(c.Query("totalChunks"))
	flowIdentifier := c.Query("flowIdentifier")

	if chunkedUploadsEnabled && isChunked {
		handleChunkedUpload(c, chunkNumber, totalChunks, flowIdentifier)
		return
	}

	// Proceed with single-file upload if not chunked
	handleSingleFileUpload(c)
}

func handleSingleFileUpload(c *gin.Context) {
	file, err := c.FormFile("log")
	if err != nil {
		c.JSON(http.StatusBadRequest, NewErrorResponse(http.StatusBadRequest, "missing 'log' file in form"))
		return
	}

	// Validate file size
	if file.Size > maxLogSize {
		c.JSON(http.StatusRequestEntityTooLarge, NewErrorResponse(http.StatusRequestEntityTooLarge, fmt.Sprintf("log file exceeds max size of %d MB", maxLogSize/1024/1024)))
		return
	}

	// Validate file type
	contentType := file.Header.Get("Content-Type")
	isValidType := false
	for _, t := range allowedMimeTypes {
		if t == contentType {
			isValidType = true
			break
		}
	}
	if !isValidType {
		c.JSON(http.StatusUnsupportedMediaType, NewErrorResponse(http.StatusUnsupportedMediaType, fmt.Sprintf("unsupported content type: %s", contentType)))
		return
	}

	// Get authenticated user from context
	u, ok := c.Get("user")
	if !ok || u == nil {
		c.JSON(http.StatusUnauthorized, NewErrorResponse(http.StatusUnauthorized, "unauthorized"))
		return
	}
	user, ok := u.(*models.User)
	if !ok || user == nil {
		c.JSON(http.StatusUnauthorized, NewErrorResponse(http.StatusUnauthorized, "unauthorized"))
		return
	}

	// Generate a simple report id
	id := fmt.Sprintf("r%x", time.Now().UnixNano())

	// Save the file to a temporary location
	tempFilePath := filepath.Join(os.TempDir(), id+"_"+file.Filename)
	if err := c.SaveUploadedFile(file, tempFilePath); err != nil {
		c.JSON(http.StatusInternalServerError, NewErrorResponse(http.StatusInternalServerError, "failed to save uploaded file"))
		return
	}

	r := &models.Report{
		ReportID: id,
		Title:    c.PostForm("title"),
		Owner:    user.DiscordUsername, // Use authenticated user's Discord username
		Fights:   []models.FightSummary{},
	}

	// Save to store
	if err := models.Store.SaveReport(r); err != nil {
		log.Printf("failed to save report %s: %v", id, err)
		c.JSON(http.StatusInternalServerError, NewErrorResponse(http.StatusInternalServerError, "failed to save report"))
		return
	}

	// Initialize status
	if err := models.Store.SetStatus(id, models.Status{Status: models.StatusQueued, Progress: 0, Message: "queued"}); err != nil {
		log.Printf("failed to set initial status for %s: %v", id, err)
	}

	// Enqueue a job to process the file
	payload, _ := json.Marshal(map[string]string{"reportId": id, "filePath": tempFilePath})
	job := &models.Job{
		ID:         fmt.Sprintf("job-%s", id),
		Type:       "process_report",
		Payload:    string(payload),
		MaxRetries: 3,
	}
	if err := JobQueue.Enqueue(job); err != nil {
		log.Printf("failed to enqueue job for report %s: %v", id, err)
		c.JSON(http.StatusInternalServerError, NewErrorResponse(http.StatusInternalServerError, "failed to enqueue report for processing"))
		return
	}

	statusURL := "/api/v1/reports/" + id + "/status"
	c.JSON(http.StatusAccepted, gin.H{"reportId": id, "statusUrl": statusURL})
}

func handleChunkedUpload(c *gin.Context, chunkNumber int, totalChunks int, flowIdentifier string) {
	file, err := c.FormFile("log")
	if err != nil {
		c.JSON(http.StatusBadRequest, NewErrorResponse(http.StatusBadRequest, "missing 'log' file in form"))
		return
	}

	// Create a temporary directory for the chunks
	chunkDir := filepath.Join(os.TempDir(), "resonance-chunks", flowIdentifier)
	if err := os.MkdirAll(chunkDir, os.ModePerm); err != nil {
		c.JSON(http.StatusInternalServerError, NewErrorResponse(http.StatusInternalServerError, "failed to create chunk directory"))
		return
	}

	// Save the chunk
	chunkPath := filepath.Join(chunkDir, strconv.Itoa(chunkNumber))
	if err := c.SaveUploadedFile(file, chunkPath); err != nil {
		c.JSON(http.StatusInternalServerError, NewErrorResponse(http.StatusInternalServerError, "failed to save chunk"))
		return
	}

	// Check if all chunks have been uploaded
	files, err := ioutil.ReadDir(chunkDir)
	if err != nil {
		c.JSON(http.StatusInternalServerError, NewErrorResponse(http.StatusInternalServerError, "failed to read chunk directory"))
		return
	}

	if len(files) == totalChunks {
		// All chunks are uploaded, assemble the file
		go assembleChunks(c, chunkDir, totalChunks, flowIdentifier)
		c.JSON(http.StatusOK, gin.H{"message": "all chunks uploaded, assembling file"})
	} else {
		c.JSON(http.StatusOK, gin.H{"message": fmt.Sprintf("chunk %d of %d uploaded", chunkNumber, totalChunks)})
	}
}

func assembleChunks(c *gin.Context, chunkDir string, totalChunks int, flowIdentifier string) {
	// Generate a simple report id
	id := fmt.Sprintf("r%x", time.Now().UnixNano())
	fileName := c.Query("fileName") // Or get it from the first chunk

	// Create the final file
	finalFilePath := filepath.Join(os.TempDir(), id+"_"+fileName)
	finalFile, err := os.Create(finalFilePath)
	if err != nil {
		log.Printf("failed to create final file: %v", err)
		return
	}
	defer finalFile.Close()

	// Assemble the chunks in order
	for i := 1; i <= totalChunks; i++ {
		chunkPath := filepath.Join(chunkDir, strconv.Itoa(i))
		chunkFile, err := os.Open(chunkPath)
		if err != nil {
			log.Printf("failed to open chunk %d: %v", i, err)
			return
		}

		_, err = io.Copy(finalFile, chunkFile)
		chunkFile.Close()
		os.Remove(chunkPath) // Clean up the chunk

		if err != nil {
			log.Printf("failed to copy chunk %d: %v", i, err)
			return
		}
	}

	// Clean up the chunk directory
	os.RemoveAll(chunkDir)

	// Get authenticated user from context
	u, ok := c.Get("user")
	if !ok || u == nil {
		log.Printf("unauthorized chunked upload for id %s", id)
		return
	}
	user, ok := u.(*models.User)
	if !ok || user == nil {
		log.Printf("unauthorized chunked upload for id %s", id)
		return
	}

	r := &models.Report{
		ReportID: id,
		Title:    c.PostForm("title"),
		Owner:    user.DiscordUsername, // Use authenticated user's Discord username
		Fights:   []models.FightSummary{},
	}

	// Save to store
	if err := models.Store.SaveReport(r); err != nil {
		log.Printf("failed to save report %s: %v", id, err)
		return
	}

	// Initialize status
	if err := models.Store.SetStatus(id, models.Status{Status: models.StatusQueued, Progress: 0, Message: "queued"}); err != nil {
		log.Printf("failed to set initial status for %s: %v", id, err)
	}

	// Enqueue a job to process the assembled file
	payload, _ := json.Marshal(map[string]string{"reportId": id, "filePath": finalFilePath})
	job := &models.Job{
		ID:         fmt.Sprintf("job-%s", id),
		Type:       "process_report",
		Payload:    string(payload),
		MaxRetries: 3,
	}
	if err := JobQueue.Enqueue(job); err != nil {
		log.Printf("failed to enqueue job for report %s: %v", id, err)
		// Don't return an error to the client, as the upload was successful
	}
}

// GetReport retrieves a single report by its ID.
func GetReport(c *gin.Context) {
	id := c.Param("reportId")
	if rep, err := models.Store.GetReport(id); err == nil {
		c.JSON(http.StatusOK, rep)
		return
	} else {
		if errors.Is(err, models.ErrNotFound) {
			c.JSON(http.StatusNotFound, NewErrorResponse(http.StatusNotFound, "report not found"))
			return
		}
		log.Printf("error fetching report %s: %v", id, err)
		c.JSON(http.StatusInternalServerError, NewErrorResponse(http.StatusInternalServerError, "internal error"))
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
			c.JSON(http.StatusNotFound, NewErrorResponse(http.StatusNotFound, "status not found"))
			return
		}
		log.Printf("error fetching status %s: %v", id, err)
		c.JSON(http.StatusInternalServerError, NewErrorResponse(http.StatusInternalServerError, "internal error"))
		return
	}
}

func GetFight(c *gin.Context) {
	id := c.Param("reportId")
	fightIdStr := c.Param("fightId")
	fightId, err := strconv.Atoi(fightIdStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, NewErrorResponse(http.StatusBadRequest, "invalid fight id"))
		return
	}
	if f, err := models.Store.GetFight(id, fightId); err == nil {
		c.JSON(http.StatusOK, f)
		return
	} else {
		if errors.Is(err, models.ErrNotFound) {
			c.JSON(http.StatusNotFound, NewErrorResponse(http.StatusNotFound, "fight not found"))
			return
		}
		log.Printf("error fetching fight %s#%d: %v", id, fightId, err)
		c.JSON(http.StatusInternalServerError, NewErrorResponse(http.StatusInternalServerError, "internal error"))
		return
	}
}

// ListReports retrieves a paginated list of reports.
func ListReports(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("pageSize", "10"))
	owner := c.Query("owner")
	status := c.Query("status")
	startDate := c.Query("startDate") // Expecting time in RFC3339 or YYYY-MM-DD format
	endDate := c.Query("endDate")     // Expecting time in RFC3339 or YYYY-MM-DD format
	sortBy := c.DefaultQuery("sortBy", "created_at")
	sortOrder := c.DefaultQuery("sortOrder", "desc")

	if page < 1 {
		page = 1
	}
	if pageSize < 1 {
		pageSize = 10
	}

	filters := models.ReportFilters{
		Owner:     owner,
		Status:    status,
		StartDate: startDate,
		EndDate:   endDate,
	}

	sort := models.SortOptions{
		SortBy:    sortBy,
		SortOrder: sortOrder,
	}

	reports, total, err := models.Store.ListReports(page, pageSize, filters, sort)
	if err != nil {
		log.Printf("error fetching reports: %v", err)
		c.JSON(http.StatusInternalServerError, NewErrorResponse(http.StatusInternalServerError, "internal error"))
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"reports": reports,
		"pagination": gin.H{
			"page":       page,
			"pageSize":   pageSize,
			"total":      total,
			"totalPages": (total + pageSize - 1) / pageSize,
		},
	})
}

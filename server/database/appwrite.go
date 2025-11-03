package database

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"

	"github.com/appwrite/sdk-for-go/appwrite"
	"github.com/appwrite/sdk-for-go/client"
	"github.com/appwrite/sdk-for-go/databases"
)

var (
	Client     client.Client
	Databases  *databases.Databases
	DatabaseID string
)

// AppwriteConfig holds Appwrite configuration
type AppwriteConfig struct {
	Endpoint   string
	ProjectID  string
	APIKey     string
	DatabaseID string
}

// CollectionIDs holds all collection identifiers
type CollectionIDs struct {
	Reports string
	Fights  string
	Players string
	Status  string
}

var Collections CollectionIDs

// LoadAppwriteConfigFromEnv loads Appwrite configuration from environment variables
func LoadAppwriteConfigFromEnv() AppwriteConfig {
	return AppwriteConfig{
		Endpoint:   GetEnv("APPWRITE_ENDPOINT", "https://cloud.appwrite.io/v1"),
		ProjectID:  GetEnv("APPWRITE_PROJECT_ID", ""),
		APIKey:     GetEnv("APPWRITE_API_KEY", ""),
		DatabaseID: GetEnv("APPWRITE_DATABASE_ID", ""),
	}
}

// LoadCollectionIDsFromEnv loads collection IDs from environment variables
func LoadCollectionIDsFromEnv() CollectionIDs {
	return CollectionIDs{
		Reports: GetEnv("APPWRITE_COLLECTION_REPORTS", "reports"),
		Fights:  GetEnv("APPWRITE_COLLECTION_FIGHTS", "fights"),
		Players: GetEnv("APPWRITE_COLLECTION_PLAYERS", "player_performances"),
		Status:  GetEnv("APPWRITE_COLLECTION_STATUS", "statuses"),
	}
}

// LoadCollectionIDsFromAppwrite queries the Appwrite server for collections in the
// configured database and attempts to map well-known collection names to their
// IDs. This lets us avoid hardcoding collection IDs in environment variables
// while still supporting sensible defaults when discovery fails.
func LoadCollectionIDsFromAppwrite(endpoint, projectID, apiKey, databaseID string) (CollectionIDs, error) {
	var cols CollectionIDs

	if endpoint == "" || projectID == "" || apiKey == "" || databaseID == "" {
		return cols, fmt.Errorf("missing appwrite connection details for collection discovery")
	}

	url := strings.TrimRight(endpoint, "/") + "/databases/" + databaseID + "/collections"

	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return cols, err
	}
	req.Header.Set("X-Appwrite-Project", projectID)
	req.Header.Set("X-Appwrite-Key", apiKey)
	req.Header.Set("Accept", "application/json")

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return cols, err
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		body, _ := io.ReadAll(resp.Body)
		return cols, fmt.Errorf("appwrite returned status %d: %s", resp.StatusCode, string(body))
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return cols, err
	}

	// response shape: { "sum": N, "collections": [{"$id":"...","name":"...",...}, ...] }
	var r struct {
		Sum         int `json:"sum"`
		Collections []struct {
			ID   string `json:"$id"`
			Name string `json:"name"`
		} `json:"collections"`
	}
	if err := json.Unmarshal(body, &r); err != nil {
		return cols, fmt.Errorf("failed to parse collections response: %w", err)
	}

	for _, c := range r.Collections {
		switch strings.ToLower(c.Name) {
		case "reports":
			cols.Reports = c.ID
		case "fights":
			cols.Fights = c.ID
		case "player_performances", "players", "player-performances":
			cols.Players = c.ID
		case "statuses", "status":
			cols.Status = c.ID
		}
	}

	// If discovery didn't find IDs for some collections, fall back to the
	// legacy defaults (these are collection names / slugs and may work in
	// environments where the SDK accepts names). This avoids hard failure on
	// first boot in dev environments.
	if cols.Reports == "" {
		cols.Reports = "reports"
	}
	if cols.Fights == "" {
		cols.Fights = "fights"
	}
	if cols.Players == "" {
		cols.Players = "player_performances"
	}
	if cols.Status == "" {
		cols.Status = "statuses"
	}

	return cols, nil
}

// ConnectAppwrite establishes a connection to Appwrite
func ConnectAppwrite(config AppwriteConfig) error {
	if config.ProjectID == "" {
		return fmt.Errorf("APPWRITE_PROJECT_ID is required")
	}
	if config.APIKey == "" {
		return fmt.Errorf("APPWRITE_API_KEY is required")
	}
	if config.DatabaseID == "" {
		return fmt.Errorf("APPWRITE_DATABASE_ID is required")
	}

	// Initialize Appwrite client
	clt := appwrite.NewClient(
		appwrite.WithEndpoint(config.Endpoint),
		appwrite.WithProject(config.ProjectID),
		appwrite.WithKey(config.APIKey),
	)

	Client = clt
	Databases = appwrite.NewDatabases(clt)
	DatabaseID = config.DatabaseID

	// Try to discover collection IDs from Appwrite at startup. If discovery
	// fails (for example in environments without the right permissions),
	// fall back to the legacy env/defaults approach so the server can still
	// boot in development.
	if cols, err := LoadCollectionIDsFromAppwrite(config.Endpoint, config.ProjectID, config.APIKey, config.DatabaseID); err != nil {
		fmt.Printf("Warning: could not discover collection IDs from Appwrite: %v. Falling back to defaults.\n", err)
		Collections = LoadCollectionIDsFromEnv()
	} else {
		Collections = cols
	}

	return nil
}

// GetDatabases returns the Databases service instance
func GetDatabases() *databases.Databases {
	return Databases
}

// GetDatabaseID returns the current database ID
func GetDatabaseID() string {
	return DatabaseID
}

package database

import (
	"fmt"

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

	// Load collection IDs
	Collections = LoadCollectionIDsFromEnv()

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


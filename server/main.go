package main

import (
	"log"
	"os"
	"path/filepath"

	"server/db"
	"server/migrations"
	"server/models"
	"server/routes"
	sstore "server/store"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
)

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func main() {
	// Load .env file from parent directory
	envPath := filepath.Join("..", ".env")
	if err := godotenv.Load(envPath); err != nil {
		log.Printf("Warning: .env file not found at %s, using default values", envPath)
	}

	router := gin.Default()

	// Initialize DB (optional) and run migrations if configured
	dbConn, err := db.InitDB()
	if err != nil {
		// If DATABASE_URL is not set, continue running the server in degraded mode
		// but log the issue so developers can enable the DB for full functionality.
		log.Printf("DB init warning: %v", err)
	} else {
		if err := migrations.RunMigrations(dbConn); err != nil {
			log.Printf("Migration warning: %v", err)
		}
		// wire up GORM-backed stores
		models.Store = sstore.NewGormReportStore(dbConn)
	}

	// Get environment variables
	websiteURL := getEnv("WEBSITE_URL", "")
	serverPort := getEnv("SERVER_PORT", "")

	// Configure CORS
	router.Use(cors.New(cors.Config{
		AllowOrigins:     []string{websiteURL},
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type"},
		AllowCredentials: true,
	}))

	router.GET("/ping", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"message": "pong",
		})
	})

	// Simple health endpoint to verify API group
	router.GET("/api/v1/test", func(c *gin.Context) {
		c.JSON(200, gin.H{"ok": true})
	})

	// Register API routes
	routes.RegisterAPIRoutes(router)

	// Run on the configured port (default to :8080 if empty)
	if serverPort == "" {
		serverPort = ":8080"
	}
	router.Run(serverPort)
}

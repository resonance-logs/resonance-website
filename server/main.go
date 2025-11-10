package main

import (
	"log"
	"os"
	"path/filepath"

	"server/db"
	"server/migrations"
	"server/routes"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
)

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
	}

	// Get environment variables
	websiteURL := os.Getenv("WEBSITE_URL")
	serverPort := os.Getenv("SERVER_PORT")

	// Configure CORS
	router.Use(cors.New(cors.Config{
		AllowOrigins: []string{websiteURL},
		AllowMethods: []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		// Allow X-Api-Key for desktop uploads and API clients
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization", "X-Api-Key"},
		ExposeHeaders:    []string{"Set-Cookie"},
		AllowCredentials: true,
	}))

	// If DB initialized, attach it to every request via middleware so controllers can reuse it
	if dbConn != nil {
		router.Use(func(c *gin.Context) {
			c.Set("db", dbConn)
			c.Next()
		})
	}

	// Register API routes
	routes.RegisterAPIRoutes(router)

	// Run on the configured port (default to :8080 if empty)
	if serverPort == "" {
		serverPort = ":8080"
	}
	router.Run(serverPort)
}

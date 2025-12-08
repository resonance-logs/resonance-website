package main

import (
	"log"
	"os"
	"path/filepath"
	"strings"
	"time"

	"server/controller/entity"
	"server/db"
	"server/middleware"
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

	if err := middleware.InitRedis(); err != nil {
		log.Printf("Redis init warning: %v", err)
	}
	defer middleware.CloseRedis()

	router := gin.Default()

	dbConn, err := db.InitDB()
	if err != nil {
		// If DATABASE_URL is not set, continue running the server in degraded mode
		// but log the issue so developers can enable the DB for full functionality.
		log.Printf("DB init warning: %v", err)
	} else {
		if err := migrations.RunMigrations(dbConn); err != nil {
			log.Printf("Migration warning: %v", err)
		}

		// Start background job to refresh entity leaderboard cache (production only)
		rawEnv := os.Getenv("ENVIRONMENT")
		env := strings.TrimSpace(rawEnv)
		log.Printf("Environment Check - Raw: '%s', Trimmed: '%s'", rawEnv, env)
		
		if env != "development" {
			redisClient := middleware.GetRedisClient()
			if redisClient != nil {
				go func() {
					// Initial refresh on startup
					time.Sleep(5 * time.Second) // Wait for server to be ready
					entity.RefreshAllLeaderboards(dbConn, redisClient)

					// Then refresh every 2 hours
					ticker := time.NewTicker(2 * time.Hour)
					for range ticker.C {
						entity.RefreshAllLeaderboards(dbConn, redisClient)
					}
				}()
			} else {
				log.Println("Redis not available, entity leaderboard caching disabled")
			}
		} else {
			log.Println("Development environment detected, skipping entity leaderboard background job")
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

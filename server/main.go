package main

import (
	"fmt"
	"log"
	"os"
	"path/filepath"

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

	// Get environment variables
	websiteURL := getEnv("NEXT_PUBLIC_WEBSITE_URL", "localhost")
	appPort := getEnv("NEXT_PUBLIC_APP_PORT", "3000")
	serverPort := getEnv("NEXT_PUBLIC_SERVER_PORT", "8080")

	allowedOrigin := fmt.Sprintf("http://%s:%s", websiteURL, appPort)

	// Configure CORS
	router.Use(cors.New(cors.Config{
		AllowOrigins:     []string{allowedOrigin},
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type"},
		AllowCredentials: true,
	}))

	router.GET("/ping", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"message": "pong",
		})
	})

	// Run on the configured port
	router.Run(fmt.Sprintf(":%s", serverPort))
}
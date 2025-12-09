package db

import (
	"fmt"
	"log"
	"os"
	"strings"
	"time"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

// InitDB initializes a GORM DB using DATABASE_URL env var.
func InitDB() (*gorm.DB, error) {
	dsn := os.Getenv("DATABASE_URL")
	if dsn == "" {
		return nil, fmt.Errorf("DATABASE_URL is not set")
	}

	// Configure GORM logger: in development environment enable detailed SQL logging.
	// In production, only log truly slow queries (> 10 seconds) to reduce noise.
	var gormLogger logger.Interface
	if strings.ToLower(os.Getenv("ENVIRONMENT")) == "development" {
		// Print SQL and binds to stdout at Info level
		gormLogger = logger.New(log.New(os.Stdout, "", log.LstdFlags), logger.Config{
			SlowThreshold:             30 * time.Second,
			LogLevel:                  logger.Info,
			IgnoreRecordNotFoundError: false,
			Colorful:                  true,
		})
	} else {
		// Production: only log slow SQL (> 10 seconds) and errors
		gormLogger = logger.New(log.New(os.Stdout, "", log.LstdFlags), logger.Config{
			SlowThreshold:             10 * time.Second,
			LogLevel:                  logger.Warn,
			IgnoreRecordNotFoundError: true,
			Colorful:                  false,
		})
	}

	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{Logger: gormLogger})
	if err != nil {
		return nil, err
	}
	// Configure connection pool
	sqlDB, err := db.DB()
	if err != nil {
		return nil, err
	}
	sqlDB.SetMaxIdleConns(10)
	sqlDB.SetMaxOpenConns(50)
	sqlDB.SetConnMaxLifetime(30 * time.Minute)

	return db, nil
}

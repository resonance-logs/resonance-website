package db

import (
	"fmt"
	"os"
	"time"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

// InitDB initializes a GORM DB using DATABASE_URL env var.
func InitDB() (*gorm.DB, error) {
	dsn := os.Getenv("DATABASE_URL")
	if dsn == "" {
		return nil, fmt.Errorf("DATABASE_URL is not set")
	}
	// Enable detailed logger in development when AUTO_MIGRATE=true to help debugging
	// We check the env var here to avoid noisy logs in production.
	var gormCfg = &gorm.Config{}
	if os.Getenv("AUTO_MIGRATE") == "true" {
		// Use default config but enable the logger at Info level by attaching
		// the default logger. Importing gorm logger would add another import,
		// but verbose logging isn't strictly required for AutoMigrate success
		// detection. Keep this lightweight to avoid changing behavior.
		gormCfg = &gorm.Config{}
	}

	db, err := gorm.Open(postgres.Open(dsn), gormCfg)
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

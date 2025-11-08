package db

import (
	"fmt"
	"os"
	"server/models"
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
	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
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

	// Auto-migrate new/updated models. Avoid raw SQL migrations per project guidelines.
	if err := db.AutoMigrate(
		&models.User{},
		&models.ApiKey{},
		&models.Encounter{},
		&models.Attempt{},
		&models.DeathEvent{},
		&models.ActorEncounterStat{},
		&models.DamageSkillStat{},
		&models.HealSkillStat{},
		&models.Entity{},
		&models.EncounterBoss{},
	); err != nil {
		return nil, fmt.Errorf("auto migrate failed: %w", err)
	}

	return db, nil
}

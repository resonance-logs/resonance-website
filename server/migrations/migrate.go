package migrations

import (
	"fmt"
	"os"

	"server/models"

	"gorm.io/gorm"
)

// RunMigrations runs DB migrations. In development, set AUTO_MIGRATE=true to run GORM AutoMigrate.
func RunMigrations(db *gorm.DB) error {
	mode := os.Getenv("MIGRATE_MODE")
	auto := os.Getenv("AUTO_MIGRATE")

	if auto == "true" || mode == "auto" || mode == "autogorm" {
		// AutoMigrate all models (developer convenience only)
		err := db.AutoMigrate(
			&models.User{},
			&models.ApiKey{},
			&models.Encounter{},
			&models.Attempt{},
			&models.EncounterBoss{},
			&models.Entity{},
			&models.ActorEncounterStat{},
			&models.DetailedPlayerData{},
			&models.DeathEvent{},
			&models.DamageSkillStat{},
			&models.HealSkillStat{},
		)
		if err != nil {
			return fmt.Errorf("auto migrate failed: %w", err)
		}
		return nil
	}

	// If not using AutoMigrate, expect external SQL migrations (golang-migrate) to be run separately.
	// We intentionally do not call golang-migrate here to avoid adding that dependency automatically.
	return fmt.Errorf("migrations not run: set AUTO_MIGRATE=true for dev AutoMigrate or implement SQL migration runner")
}

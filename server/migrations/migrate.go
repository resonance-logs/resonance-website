package migrations

import (
	"fmt"
	"log"
	"os"

	"server/models"

	"gorm.io/gorm"
)

// RunMigrations runs DB migrations. In development, set AUTO_MIGRATE=true to run GORM AutoMigrate.
// Note: For production, manually run SQL migrations from the migrations/ directory:
//   - 20251110_add_encounter_fingerprint.sql (adds fingerprint, player_set_hash columns and indexes)
//
// Previous migrations:
//   - ALTER TABLE encounters ADD COLUMN source_hash VARCHAR(64);
//   - CREATE INDEX idx_user_source_hash ON encounters (user_id, source_hash);
func RunMigrations(db *gorm.DB) error {
	mode := os.Getenv("MIGRATE_MODE")
	auto := os.Getenv("AUTO_MIGRATE")

	// Diagnostic logging so developers can see what the process read from the environment
	log.Printf("migrations: MIGRATE_MODE=%q AUTO_MIGRATE=%q", mode, auto)

	if auto == "true" || mode == "auto" || mode == "autogorm" {
		log.Println("migrations: starting GORM AutoMigrate (development mode)")
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
		log.Println("migrations: AutoMigrate completed successfully")
		return nil
	}

	// If not using AutoMigrate, expect external SQL migrations (golang-migrate) to be run separately.
	// We intentionally do not call golang-migrate here to avoid adding that dependency automatically.
	return fmt.Errorf("migrations not run: set AUTO_MIGRATE=true for dev AutoMigrate or implement SQL migration runner")
}

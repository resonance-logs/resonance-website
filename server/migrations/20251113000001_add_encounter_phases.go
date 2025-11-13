package migrations

import (
	"server/models"

	"gorm.io/gorm"
)

// CreateEncounterPhasesTable creates the encounter_phases table
func CreateEncounterPhasesTable(db *gorm.DB) error {
	// Create encounter_phases table
	if err := db.AutoMigrate(&models.EncounterPhase{}); err != nil {
		return err
	}

	// Add indexes for efficient querying
	if err := db.Exec(`
		CREATE INDEX IF NOT EXISTS idx_encounter_phases_encounter
		ON encounter_phases(encounter_id);
	`).Error; err != nil {
		return err
	}

	if err := db.Exec(`
		CREATE INDEX IF NOT EXISTS idx_encounter_phases_type
		ON encounter_phases(phase_type);
	`).Error; err != nil {
		return err
	}

	if err := db.Exec(`
		CREATE INDEX IF NOT EXISTS idx_encounter_phases_outcome
		ON encounter_phases(outcome);
	`).Error; err != nil {
		return err
	}

	return nil
}

// DropEncounterPhasesTable drops the encounter_phases table
func DropEncounterPhasesTable(db *gorm.DB) error {
	if err := db.Migrator().DropTable(&models.EncounterPhase{}); err != nil {
		return err
	}

	return nil
}

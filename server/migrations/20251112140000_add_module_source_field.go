package migrations

import (
	"gorm.io/gorm"
)

// AddModuleSourceField adds a source field to track how modules were added
func AddModuleSourceField(db *gorm.DB) error {
	// Add source column to modules table
	// Values: 'manual', 'import', 'backfill'
	if err := db.Exec(`
		ALTER TABLE modules
		ADD COLUMN IF NOT EXISTS source VARCHAR(20) DEFAULT 'manual' NOT NULL;
	`).Error; err != nil {
		return err
	}

	// Update existing records to 'import' (assume they were imported)
	if err := db.Exec(`
		UPDATE modules
		SET source = 'import'
		WHERE source = 'manual';
	`).Error; err != nil {
		return err
	}

	return nil
}

// RollbackModuleSourceField removes the source field
func RollbackModuleSourceField(db *gorm.DB) error {
	if err := db.Exec(`
		ALTER TABLE modules
		DROP COLUMN IF EXISTS source;
	`).Error; err != nil {
		return err
	}

	return nil
}

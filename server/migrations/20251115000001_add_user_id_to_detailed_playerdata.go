package migrations

import (
	"gorm.io/gorm"
)

// AddUserIDToDetailedPlayerData adds the user_id column to detailed_playerdata table
func AddUserIDToDetailedPlayerData(db *gorm.DB) error {
	// Add user_id column
	if err := db.Exec(`
		ALTER TABLE detailed_playerdata
		ADD COLUMN IF NOT EXISTS user_id INTEGER;
	`).Error; err != nil {
		return err
	}

	// Add index on user_id
	if err := db.Exec(`
		CREATE INDEX IF NOT EXISTS idx_detailed_playerdata_user_id
		ON detailed_playerdata(user_id);
	`).Error; err != nil {
		return err
	}

	// Add foreign key constraint
	if err := db.Exec(`
		ALTER TABLE detailed_playerdata
		ADD CONSTRAINT fk_detailed_playerdata_user
		FOREIGN KEY (user_id) REFERENCES users(id)
		ON DELETE SET NULL;
	`).Error; err != nil {
		// Ignore error if constraint already exists
		return nil
	}

	return nil
}

// DropUserIDFromDetailedPlayerData removes the user_id column from detailed_playerdata table
func DropUserIDFromDetailedPlayerData(db *gorm.DB) error {
	// Drop foreign key constraint first
	if err := db.Exec(`
		ALTER TABLE detailed_playerdata
		DROP CONSTRAINT IF EXISTS fk_detailed_playerdata_user;
	`).Error; err != nil {
		return err
	}

	// Drop index
	if err := db.Exec(`
		DROP INDEX IF EXISTS idx_detailed_playerdata_user_id;
	`).Error; err != nil {
		return err
	}

	// Drop column
	if err := db.Exec(`
		ALTER TABLE detailed_playerdata
		DROP COLUMN IF EXISTS user_id;
	`).Error; err != nil {
		return err
	}

	return nil
}

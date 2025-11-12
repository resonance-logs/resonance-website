package migrations

import (
	"server/models"

	"gorm.io/gorm"
)

// CreateModuleOptimizerTables creates all tables for the module optimizer feature
func CreateModuleOptimizerTables(db *gorm.DB) error {
	// Create modules table
	if err := db.AutoMigrate(&models.Module{}); err != nil {
		return err
	}

	// Create module_parts table
	if err := db.AutoMigrate(&models.ModulePart{}); err != nil {
		return err
	}

	// Create optimization_results table
	if err := db.AutoMigrate(&models.OptimizationResult{}); err != nil {
		return err
	}

	// Create saved_builds table
	if err := db.AutoMigrate(&models.SavedBuild{}); err != nil {
		return err
	}

	// Add composite indexes
	if err := db.Exec(`
		CREATE INDEX IF NOT EXISTS idx_modules_user_category
		ON modules(user_id, category);
	`).Error; err != nil {
		return err
	}

	if err := db.Exec(`
		CREATE INDEX IF NOT EXISTS idx_optimization_results_cache_lookup
		ON optimization_results(user_id, request_hash, expires_at);
	`).Error; err != nil {
		return err
	}

	return nil
}

// DropModuleOptimizerTables drops all module optimizer tables
func DropModuleOptimizerTables(db *gorm.DB) error {
	// Drop in reverse order to handle foreign keys
	if err := db.Migrator().DropTable(&models.SavedBuild{}); err != nil {
		return err
	}

	if err := db.Migrator().DropTable(&models.OptimizationResult{}); err != nil {
		return err
	}

	if err := db.Migrator().DropTable(&models.ModulePart{}); err != nil {
		return err
	}

	if err := db.Migrator().DropTable(&models.Module{}); err != nil {
		return err
	}

	return nil
}

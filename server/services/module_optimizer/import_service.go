package module_optimizer

import (
	"fmt"
	"server/models"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

// ImportService handles module import operations
type ImportService struct {
	db *gorm.DB
}

// NewImportService creates a new import service
func NewImportService(db *gorm.DB) *ImportService {
	return &ImportService{db: db}
}

// ImportResult contains the result of an import operation
type ImportResult struct {
	Added     int
	Updated   int
	Errors    int
	ErrorList []ImportErrorDetail
}

// ImportErrorDetail provides details about an import error
type ImportErrorDetail struct {
	Index int    `json:"index"`
	UUID  string `json:"uuid"`
	Error string `json:"error"`
}

// ModuleImportData represents a module to import
type ModuleImportData struct {
	UUID     string
	Name     string
	ConfigID int
	Quality  int
	Category string
	Parts    []PartImportData
}

// PartImportData represents a module part to import
type PartImportData struct {
	PartID int
	Name   string
	Value  int
	Type   string
}

// ImportModules imports a batch of modules with validation and deduplication
func (s *ImportService) ImportModules(userID uint, modulesData interface{}) ImportResult {
	result := ImportResult{
		ErrorList: make([]ImportErrorDetail, 0),
	}

	// Convert interface{} to proper type
	var modules []ModuleImportData
	switch v := modulesData.(type) {
	case []ModuleImportData:
		modules = v
	case []interface{}:
		// Handle the module import payload from controller
		for i, item := range v {
			if moduleMap, ok := item.(map[string]interface{}); ok {
				module := ModuleImportData{
					UUID:     getString(moduleMap, "uuid"),
					Name:     getString(moduleMap, "name"),
					ConfigID: getInt(moduleMap, "config_id"),
					Quality:  getInt(moduleMap, "quality"),
					Category: getString(moduleMap, "category"),
				}

				if partsData, ok := moduleMap["parts"].([]interface{}); ok {
					module.Parts = make([]PartImportData, 0, len(partsData))
					for _, partItem := range partsData {
						if partMap, ok := partItem.(map[string]interface{}); ok {
							part := PartImportData{
								PartID: getInt(partMap, "part_id"),
								Name:   getString(partMap, "name"),
								Value:  getInt(partMap, "value"),
								Type:   getString(partMap, "type"),
							}
							module.Parts = append(module.Parts, part)
						}
					}
				}

				modules = append(modules, module)
			} else {
				result.Errors++
				result.ErrorList = append(result.ErrorList, ImportErrorDetail{
					Index: i,
					UUID:  "",
					Error: "Invalid module data format",
				})
			}
		}
	default:
		result.Errors++
		result.ErrorList = append(result.ErrorList, ImportErrorDetail{
			Index: 0,
			UUID:  "",
			Error: "Unsupported data format",
		})
		return result
	}

	// Process each module
	for i, moduleData := range modules {
		// Validate module data
		if err := s.validateModule(moduleData); err != nil {
			result.Errors++
			result.ErrorList = append(result.ErrorList, ImportErrorDetail{
				Index: i,
				UUID:  moduleData.UUID,
				Error: err.Error(),
			})
			continue
		}

		// Check if module already exists (by UUID)
		var existingModule models.Module
		err := s.db.Where("uuid = ?", moduleData.UUID).First(&existingModule).Error

		if err == gorm.ErrRecordNotFound {
			// Insert new module
			if err := s.insertModule(userID, moduleData); err != nil {
				result.Errors++
				result.ErrorList = append(result.ErrorList, ImportErrorDetail{
					Index: i,
					UUID:  moduleData.UUID,
					Error: fmt.Sprintf("Failed to insert: %v", err),
				})
			} else {
				result.Added++
			}
		} else if err == nil {
			// Update existing module
			if err := s.updateModule(&existingModule, moduleData); err != nil {
				result.Errors++
				result.ErrorList = append(result.ErrorList, ImportErrorDetail{
					Index: i,
					UUID:  moduleData.UUID,
					Error: fmt.Sprintf("Failed to update: %v", err),
				})
			} else {
				result.Updated++
			}
		} else {
			result.Errors++
			result.ErrorList = append(result.ErrorList, ImportErrorDetail{
				Index: i,
				UUID:  moduleData.UUID,
				Error: fmt.Sprintf("Database error: %v", err),
			})
		}
	}

	return result
}

// validateModule validates module data against business rules
func (s *ImportService) validateModule(module ModuleImportData) error {
	// Validate UUID
	if module.UUID == "" {
		return fmt.Errorf("UUID is required")
	}

	// Validate name
	if module.Name == "" {
		return fmt.Errorf("name is required")
	}

	// Validate quality range
	if module.Quality < 1 || module.Quality > 5 {
		return fmt.Errorf("quality must be 1-5, got %d", module.Quality)
	}

	// Validate category
	if module.Category != "ATTACK" && module.Category != "DEFENSE" && module.Category != "SUPPORT" {
		return fmt.Errorf("invalid category: %s", module.Category)
	}

	// Validate config ID exists in mapping
	if !ValidateConfigID(module.ConfigID) {
		return fmt.Errorf("invalid config_id: %d not found in configuration", module.ConfigID)
	}

	// Validate parts
	if len(module.Parts) == 0 {
		return fmt.Errorf("module must have at least one part")
	}

	if len(module.Parts) > 10 {
		return fmt.Errorf("module cannot have more than 10 parts")
	}

	// Validate each part
	for i, part := range module.Parts {
		if part.Name == "" {
			return fmt.Errorf("part %d: name is required", i)
		}
		if part.Value < 1 {
			return fmt.Errorf("part %d: value must be positive", i)
		}
		if part.Type != "basic" && part.Type != "special" {
			return fmt.Errorf("part %d: invalid type %s", i, part.Type)
		}
		// Validate part ID exists
		if !ValidatePartID(part.PartID) {
			return fmt.Errorf("part %d: invalid part_id %d", i, part.PartID)
		}
	}

	return nil
}

// insertModule creates a new module with its parts
func (s *ImportService) insertModule(userID uint, moduleData ModuleImportData) error {
	module := models.Module{
		UUID:     moduleData.UUID,
		Name:     moduleData.Name,
		ConfigID: moduleData.ConfigID,
		Quality:  moduleData.Quality,
		Category: moduleData.Category,
		UserID:   userID,
	}

	// Use transaction
	return s.db.Transaction(func(tx *gorm.DB) error {
		// Insert module
		if err := tx.Create(&module).Error; err != nil {
			return err
		}

		// Insert parts
		for _, partData := range moduleData.Parts {
			part := models.ModulePart{
				ModuleID: module.ID,
				PartID:   partData.PartID,
				Name:     partData.Name,
				Value:    partData.Value,
				Type:     partData.Type,
			}
			if err := tx.Create(&part).Error; err != nil {
				return err
			}
		}

		return nil
	})
}

// updateModule updates an existing module with new data
func (s *ImportService) updateModule(existing *models.Module, moduleData ModuleImportData) error {
	// Use transaction
	return s.db.Transaction(func(tx *gorm.DB) error {
		// Update module fields
		existing.Name = moduleData.Name
		existing.ConfigID = moduleData.ConfigID
		existing.Quality = moduleData.Quality
		existing.Category = moduleData.Category

		if err := tx.Save(existing).Error; err != nil {
			return err
		}

		// Delete existing parts
		if err := tx.Where("module_id = ?", existing.ID).Delete(&models.ModulePart{}).Error; err != nil {
			return err
		}

		// Insert new parts
		for _, partData := range moduleData.Parts {
			part := models.ModulePart{
				ModuleID: existing.ID,
				PartID:   partData.PartID,
				Name:     partData.Name,
				Value:    partData.Value,
				Type:     partData.Type,
			}
			if err := tx.Create(&part).Error; err != nil {
				return err
			}
		}

		return nil
	})
}

// BulkUpsert performs a bulk upsert operation (PostgreSQL specific)
func (s *ImportService) BulkUpsert(userID uint, modules []ModuleImportData) error {
	// Convert to GORM models
	moduleModels := make([]models.Module, len(modules))
	for i, m := range modules {
		moduleModels[i] = models.Module{
			UUID:     m.UUID,
			Name:     m.Name,
			ConfigID: m.ConfigID,
			Quality:  m.Quality,
			Category: m.Category,
			UserID:   userID,
		}
	}

	// Use ON CONFLICT clause for upsert
	return s.db.Clauses(clause.OnConflict{
		Columns:   []clause.Column{{Name: "uuid"}},
		DoUpdates: clause.AssignmentColumns([]string{"name", "config_id", "quality", "category", "updated_at"}),
	}).Create(&moduleModels).Error
}

// Helper functions to extract values from maps

func getString(m map[string]interface{}, key string) string {
	if val, ok := m[key].(string); ok {
		return val
	}
	return ""
}

func getInt(m map[string]interface{}, key string) int {
	if val, ok := m[key].(float64); ok {
		return int(val)
	}
	if val, ok := m[key].(int); ok {
		return val
	}
	return 0
}

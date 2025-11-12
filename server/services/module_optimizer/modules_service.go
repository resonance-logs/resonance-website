package module_optimizer

import (
	"fmt"
	"server/models"

	"gorm.io/gorm"
)

// ModuleService handles module CRUD operations
type ModuleService struct {
	db *gorm.DB
}

// NewModuleService creates a new module service instance
func NewModuleService(db *gorm.DB) *ModuleService {
	return &ModuleService{db: db}
}

// ModulePartInput represents a module part for creation/update
type ModulePartInput struct {
	PartID int
	Name   string
	Value  int
	Type   string
}

// CreateModule creates a new module with parts
func (s *ModuleService) CreateModule(userID uint, uuid, name string, configID, quality int, category string, parts interface{}) (*models.Module, error) {
	// Check if module with same UUID already exists for this user
	var existing models.Module
	if err := s.db.Where("uuid = ? AND user_id = ?", uuid, userID).First(&existing).Error; err == nil {
		return nil, fmt.Errorf("module with UUID %s already exists", uuid)
	}

	// Create module
	module := models.Module{
		UUID:     uuid,
		Name:     name,
		ConfigID: configID,
		Quality:  quality,
		Category: category,
		UserID:   userID,
	}

	// Start transaction
	tx := s.db.Begin()
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	if err := tx.Create(&module).Error; err != nil {
		tx.Rollback()
		return nil, fmt.Errorf("failed to create module: %w", err)
	}

	// Create parts
	if parts != nil {
		if err := s.createParts(tx, module.ID, parts); err != nil {
			tx.Rollback()
			return nil, err
		}
	}

	if err := tx.Commit().Error; err != nil {
		return nil, fmt.Errorf("failed to commit transaction: %w", err)
	}

	// Reload module with parts
	if err := s.db.Preload("Parts").First(&module, module.ID).Error; err != nil {
		return nil, fmt.Errorf("failed to reload module: %w", err)
	}

	return &module, nil
}

// UpdateModule updates an existing module
func (s *ModuleService) UpdateModule(userID, moduleID uint, name *string, quality *int, category *string, parts interface{}) (*models.Module, error) {
	var module models.Module
	if err := s.db.Where("id = ? AND user_id = ?", moduleID, userID).First(&module).Error; err != nil {
		return nil, err
	}

	// Start transaction
	tx := s.db.Begin()
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	// Update fields if provided
	if name != nil {
		module.Name = *name
	}
	if quality != nil {
		module.Quality = *quality
	}
	if category != nil {
		module.Category = *category
	}

	if err := tx.Save(&module).Error; err != nil {
		tx.Rollback()
		return nil, fmt.Errorf("failed to update module: %w", err)
	}

	// Update parts if provided
	if parts != nil {
		// Delete existing parts
		if err := tx.Where("module_id = ?", module.ID).Delete(&models.ModulePart{}).Error; err != nil {
			tx.Rollback()
			return nil, fmt.Errorf("failed to delete old parts: %w", err)
		}

		// Create new parts
		if err := s.createParts(tx, module.ID, parts); err != nil {
			tx.Rollback()
			return nil, err
		}
	}

	if err := tx.Commit().Error; err != nil {
		return nil, fmt.Errorf("failed to commit transaction: %w", err)
	}

	// Reload module with parts
	if err := s.db.Preload("Parts").First(&module, module.ID).Error; err != nil {
		return nil, fmt.Errorf("failed to reload module: %w", err)
	}

	return &module, nil
}

// DeleteModule deletes a module and its parts (cascade)
func (s *ModuleService) DeleteModule(userID, moduleID uint) error {
	result := s.db.Where("id = ? AND user_id = ?", moduleID, userID).Delete(&models.Module{})
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return gorm.ErrRecordNotFound
	}
	return nil
}

// GetUserModules retrieves all modules for a user with optional filters
func (s *ModuleService) GetUserModules(userID uint, category string, quality int) ([]models.Module, error) {
	query := s.db.Where("user_id = ?", userID)

	if category != "" {
		query = query.Where("category = ?", category)
	}

	if quality > 0 {
		query = query.Where("quality = ?", quality)
	}

	var modules []models.Module
	if err := query.Preload("Parts").Order("quality DESC, name ASC").Find(&modules).Error; err != nil {
		return nil, err
	}

	return modules, nil
}

// createParts is a helper to create module parts from various input types
func (s *ModuleService) createParts(tx *gorm.DB, moduleID uint, parts interface{}) error {
	// Handle different input types for parts
	switch p := parts.(type) {
	case []interface{}:
		for _, partData := range p {
			if partMap, ok := partData.(map[string]interface{}); ok {
				part := models.ModulePart{
					ModuleID: moduleID,
					PartID:   int(partMap["part_id"].(float64)),
					Name:     partMap["name"].(string),
					Value:    int(partMap["value"].(float64)),
					Type:     partMap["type"].(string),
				}
				if err := tx.Create(&part).Error; err != nil {
					return fmt.Errorf("failed to create part: %w", err)
				}
			}
		}
	case []map[string]interface{}:
		for _, partMap := range p {
			part := models.ModulePart{
				ModuleID: moduleID,
				PartID:   int(partMap["part_id"].(float64)),
				Name:     partMap["name"].(string),
				Value:    int(partMap["value"].(float64)),
				Type:     partMap["type"].(string),
			}
			if err := tx.Create(&part).Error; err != nil {
				return fmt.Errorf("failed to create part: %w", err)
			}
		}
	default:
		// Try to convert to slice of part structs
		if partSlice, ok := parts.([]ModulePartInput); ok {
			for _, partInput := range partSlice {
				part := models.ModulePart{
					ModuleID: moduleID,
					PartID:   partInput.PartID,
					Name:     partInput.Name,
					Value:    partInput.Value,
					Type:     partInput.Type,
				}
				if err := tx.Create(&part).Error; err != nil {
					return fmt.Errorf("failed to create part: %w", err)
				}
			}
		}
	}

	return nil
}

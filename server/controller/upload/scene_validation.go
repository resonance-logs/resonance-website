package upload

import (
	"fmt"
	"strings"
)

// Hardcoded scene ID -> expected name mapping (derived from SceneName.json)
var allowedSceneNames = map[int64]string{
	1333:  "Dark Mist Fortress - Master",
	1033:  "Tina's Mindrealm - Master",
	1123:  "Towering Ruin - Master",
	6009:  "Goblin Lair - Master",
	1223:  "Dragon Claw Valley - Master",
	6023:  "Kanamia Trial - Master",
	13003: "Purge! Floating Island",
	30150: "Floor 50",
	30160: "Floor 60",
	30170: "Floor 70",
	30175: "Floor 75",
}

// validateScene checks if the scene ID and Name are valid according to requirements
func validateScene(id int64, namePtr *string) error {
	validName, allowed := allowedSceneNames[id]
	if !allowed {
		return fmt.Errorf("scene ID %d is not in the allowed list", id)
	}

	if namePtr == nil || *namePtr == "" {
		return fmt.Errorf("scene name is missing")
	}
	name := *namePtr

	// Validation Logic:
	// 1. Exact match
	if name == validName {
		return nil
	}

	// 2. "Scene Name - Something" format
	// Check for " - " delimiter
	prefix := validName + " - "
	if strings.HasPrefix(name, prefix) {
		return nil
	}

	return fmt.Errorf("scene name '%s' is invalid for scene ID %d (expected '%s' or '%s...')", name, id, validName, prefix)
}

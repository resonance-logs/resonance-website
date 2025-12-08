package upload

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"sync"
)

type SceneInfo struct {
	Name string `json:"name"`
	Icon string `json:"icon"`
}

var (
	validScenes     map[int64]string // ID -> Name
	validScenesLock sync.RWMutex
	sceneDataLoaded bool
)

// getValidScenes loads the scene data from the shared JSON file
func getValidScenes() (map[int64]string, error) {
	validScenesLock.RLock()
	if sceneDataLoaded {
		defer validScenesLock.RUnlock()
		return validScenes, nil
	}
	validScenesLock.RUnlock()

	validScenesLock.Lock()
	defer validScenesLock.Unlock()

	// Double-check after acquiring write lock
	if sceneDataLoaded {
		return validScenes, nil
	}

	// Attempt to find the SceneData.json file
	// Start looking from current working directory
	cwd, err := os.Getwd()
	if err != nil {
		return nil, fmt.Errorf("failed to get cwd: %v", err)
	}

	// Potential paths relative to CWD
	candidates := []string{
		filepath.Join(cwd, "SceneData.json"),
		filepath.Join(cwd, "data", "SceneData.json"),
		filepath.Join(cwd, "app", "src", "data", "SceneData.json"),
		filepath.Join(cwd, "../SceneData.json"),
		filepath.Join(cwd, "../data", "SceneData.json"),
		filepath.Join(cwd, "../app", "src", "data", "SceneData.json"),
		filepath.Join(cwd, "../../app", "src", "data", "SceneData.json"),
	}

	var data []byte
	var loadedPath string

	for _, p := range candidates {
		if d, err := os.ReadFile(p); err == nil {
			data = d
			loadedPath = p
			break
		}
	}

	if data == nil {
		return nil, fmt.Errorf("SceneData.json not found in candidates: %v (cwd: %s)", candidates, cwd)
	}

	_ = loadedPath // Ignoring unused for now, useful for logging

	var rawMap map[string]SceneInfo
	if err := json.Unmarshal(data, &rawMap); err != nil {
		return nil, fmt.Errorf("failed to parse SceneData.json: %v", err)
	}

	result := make(map[int64]string)
	for k, v := range rawMap {
		id, err := strconv.ParseInt(k, 10, 64)
		if err == nil {
			result[id] = v.Name
		}
	}

	validScenes = result
	sceneDataLoaded = true
	return validScenes, nil
}

// validateScene checks if the scene ID and Name are valid according to requirements
func validateScene(id int64, namePtr *string) error {
	scenes, err := getValidScenes()
	if err != nil {
		// Log error but maybe don't block uploads if config is broken?
		// User requirement: "Every log ... should have a valid scene according to that json"
		// This implies strict requirement.
		return fmt.Errorf("server configuration error: %v", err)
	}

	validName, allowed := scenes[id]
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

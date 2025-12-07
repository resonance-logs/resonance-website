package lib

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"sort"
)

// AttemptHashInput represents attempt data needed for source hash computation.
// This matches the client's canonical JSON structure for attempts.
type AttemptHashInput struct {
	AttemptIndex int    `json:"attemptIndex"`
	StartedAtMs  int64  `json:"startedAtMs"`
	EndedAtMs    *int64 `json:"endedAtMs"`
}

// SourceHashInput contains all fields needed to compute the source hash.
// The field names and JSON keys must match the client's implementation exactly.
type SourceHashInput struct {
	StartedAtMs   int64              `json:"startedAtMs"`
	EndedAtMs     *int64             `json:"endedAtMs"`
	LocalPlayerID *int64             `json:"localPlayerId"`
	SceneID       *int64             `json:"sceneId"`
	SceneName     *string            `json:"sceneName"`
	Attempts      []AttemptHashInput `json:"attempts"`
	ActorIDs      []int64            `json:"actorIds"`
	UploaderID    string             `json:"uploaderId"`
}

// ComputeSourceHash computes a deterministic SHA-256 hash for an encounter.
// This implementation matches the client's compute_encounter_hash function in Rust.
// The hash is used for exact deduplication of uploaded logs.
//
// Parameters:
//   - startedAtMs: Encounter start time in milliseconds since epoch
//   - endedAtMs: Encounter end time (nullable)
//   - localPlayerID: Local player's actor ID (nullable)
//   - sceneID: Scene ID (nullable)
//   - sceneName: Scene name (nullable)
//   - attempts: List of attempts with index and timestamps
//   - actorIDs: List of actor IDs from actor encounter stats
//   - uploaderID: The uploader's identifier (API key)
func ComputeSourceHash(
	startedAtMs int64,
	endedAtMs *int64,
	localPlayerID *int64,
	sceneID *int64,
	sceneName *string,
	attempts []AttemptHashInput,
	actorIDs []int64,
	uploaderID string,
) string {
	// Sort attempts by attempt_index for determinism (matches client)
	sortedAttempts := make([]AttemptHashInput, len(attempts))
	copy(sortedAttempts, attempts)
	sort.Slice(sortedAttempts, func(i, j int) bool {
		return sortedAttempts[i].AttemptIndex < sortedAttempts[j].AttemptIndex
	})

	// Sort actor IDs for determinism (matches client)
	sortedActorIDs := make([]int64, len(actorIDs))
	copy(sortedActorIDs, actorIDs)
	sort.Slice(sortedActorIDs, func(i, j int) bool {
		return sortedActorIDs[i] < sortedActorIDs[j]
	})

	// Build the canonical structure matching the client's JSON
	input := SourceHashInput{
		StartedAtMs:   startedAtMs,
		EndedAtMs:     endedAtMs,
		LocalPlayerID: localPlayerID,
		SceneID:       sceneID,
		SceneName:     sceneName,
		Attempts:      sortedAttempts,
		ActorIDs:      sortedActorIDs,
		UploaderID:    uploaderID,
	}

	// Serialize to JSON - Go's encoding/json maintains consistent key order
	// for structs based on field definition order
	jsonBytes, err := json.Marshal(input)
	if err != nil {
		return ""
	}

	// Compute SHA-256 hash
	hash := sha256.Sum256(jsonBytes)

	// Return hex-encoded hash
	return hex.EncodeToString(hash[:])
}

// ComputeSourceHashFromEncounter is a convenience function that extracts
// the necessary fields from an EncounterInput and computes the source hash.
func ComputeSourceHashFromEncounter(enc EncounterInput, uploaderID string) string {
	// Convert attempts
	attempts := make([]AttemptHashInput, 0)
	// Note: EncounterInput doesn't have full attempt data, just AttemptsCount
	// This function should be called with attempt data from the upload request

	// Extract actor IDs from stats
	actorIDs := make([]int64, 0)
	for _, stat := range enc.ActorEncounterStats {
		actorIDs = append(actorIDs, stat.ActorID)
	}

	return ComputeSourceHash(
		enc.StartedAtMs,
		nil, // endedAtMs not in EncounterInput
		nil, // localPlayerID not in EncounterInput
		enc.SceneID,
		enc.SceneName,
		attempts,
		actorIDs,
		uploaderID,
	)
}

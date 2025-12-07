package lib

import (
	"testing"
)

func TestComputeSourceHash_BasicCase(t *testing.T) {
	// Test with a basic encounter
	startedAtMs := int64(1733558400000) // Example timestamp
	endedAtMs := int64(1733558500000)
	localPlayerID := int64(12345)
	sceneID := int64(1333)
	sceneName := "Test Dungeon"

	attempts := []AttemptHashInput{
		{AttemptIndex: 0, StartedAtMs: startedAtMs, EndedAtMs: &endedAtMs},
	}

	actorIDs := []int64{100, 200, 300}
	uploaderID := "test-api-key-12345"

	hash := ComputeSourceHash(
		startedAtMs,
		&endedAtMs,
		&localPlayerID,
		&sceneID,
		&sceneName,
		attempts,
		actorIDs,
		uploaderID,
	)

	// Verify hash is non-empty and has correct length (SHA256 = 64 hex chars)
	if hash == "" {
		t.Error("Expected non-empty hash")
	}
	if len(hash) != 64 {
		t.Errorf("Expected 64 character hex hash, got %d characters", len(hash))
	}
}

func TestComputeSourceHash_Deterministic(t *testing.T) {
	// Verify same input produces same hash
	startedAtMs := int64(1733558400000)
	endedAtMs := int64(1733558500000)
	localPlayerID := int64(12345)
	sceneID := int64(1333)
	sceneName := "Test Dungeon"
	attempts := []AttemptHashInput{
		{AttemptIndex: 0, StartedAtMs: startedAtMs, EndedAtMs: &endedAtMs},
	}
	actorIDs := []int64{100, 200, 300}
	uploaderID := "test-api-key"

	hash1 := ComputeSourceHash(startedAtMs, &endedAtMs, &localPlayerID, &sceneID, &sceneName, attempts, actorIDs, uploaderID)
	hash2 := ComputeSourceHash(startedAtMs, &endedAtMs, &localPlayerID, &sceneID, &sceneName, attempts, actorIDs, uploaderID)

	if hash1 != hash2 {
		t.Errorf("Expected deterministic hash, got %s and %s", hash1, hash2)
	}
}

func TestComputeSourceHash_SortsActorIDs(t *testing.T) {
	// Verify that actor IDs are sorted for determinism
	startedAtMs := int64(1733558400000)
	uploaderID := "test-api-key"

	// Different order should produce same hash
	actorIDs1 := []int64{300, 100, 200}
	actorIDs2 := []int64{100, 200, 300}

	hash1 := ComputeSourceHash(startedAtMs, nil, nil, nil, nil, nil, actorIDs1, uploaderID)
	hash2 := ComputeSourceHash(startedAtMs, nil, nil, nil, nil, nil, actorIDs2, uploaderID)

	if hash1 != hash2 {
		t.Errorf("Expected same hash for different actor ID ordering, got %s and %s", hash1, hash2)
	}
}

func TestComputeSourceHash_SortsAttempts(t *testing.T) {
	// Verify that attempts are sorted by index for determinism
	startedAtMs := int64(1733558400000)
	uploaderID := "test-api-key"

	attempts1 := []AttemptHashInput{
		{AttemptIndex: 1, StartedAtMs: 100},
		{AttemptIndex: 0, StartedAtMs: 50},
	}
	attempts2 := []AttemptHashInput{
		{AttemptIndex: 0, StartedAtMs: 50},
		{AttemptIndex: 1, StartedAtMs: 100},
	}

	hash1 := ComputeSourceHash(startedAtMs, nil, nil, nil, nil, attempts1, nil, uploaderID)
	hash2 := ComputeSourceHash(startedAtMs, nil, nil, nil, nil, attempts2, nil, uploaderID)

	if hash1 != hash2 {
		t.Errorf("Expected same hash for different attempt ordering, got %s and %s", hash1, hash2)
	}
}

func TestComputeSourceHash_DifferentUploaderID(t *testing.T) {
	// Verify that different uploader IDs produce different hashes
	startedAtMs := int64(1733558400000)
	actorIDs := []int64{100}

	hash1 := ComputeSourceHash(startedAtMs, nil, nil, nil, nil, nil, actorIDs, "user-1")
	hash2 := ComputeSourceHash(startedAtMs, nil, nil, nil, nil, nil, actorIDs, "user-2")

	if hash1 == hash2 {
		t.Error("Expected different hashes for different uploader IDs")
	}
}

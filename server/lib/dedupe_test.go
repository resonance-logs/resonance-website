package lib

import (
	"testing"
	"time"
)

func TestComputeEncounterFingerprint_Deterministic(t *testing.T) {
	config := DefaultDedupeConfig()

	// Create a sample encounter
	sceneID := int64(101)
	totalDmg := int64(10000)
	enc := EncounterInput{
		StartedAtMs: time.Now().UnixMilli(),
		TotalDmg:    &totalDmg,
		SceneID:     &sceneID,
		EncounterBosses: []BossInput{
			{MonsterName: "Boss1"},
			{MonsterName: "Boss2"},
		},
		ActorEncounterStats: []ActorStatInput{
			{ActorID: 1001, DamageDealt: 3000, IsPlayer: true},
			{ActorID: 1002, DamageDealt: 4000, IsPlayer: true},
			{ActorID: 1003, DamageDealt: 3000, IsPlayer: true},
		},
		AttemptsCount: 1,
	}

	// Compute fingerprint twice - should be identical
	fp1 := ComputeEncounterFingerprint(enc, config)
	fp2 := ComputeEncounterFingerprint(enc, config)

	if fp1 != fp2 {
		t.Errorf("Fingerprint should be deterministic: %s != %s", fp1, fp2)
	}

	// Verify fingerprint is 64 chars (SHA256 hex)
	if len(fp1) != 64 {
		t.Errorf("Fingerprint should be 64 chars, got %d", len(fp1))
	}
}

func TestComputeEncounterFingerprint_ActorOrderIndependent(t *testing.T) {
	config := DefaultDedupeConfig()

	sceneID := int64(101)
	totalDmg := int64(10000)
	startMs := time.Now().UnixMilli()

	// Create two encounters with same data but different actor order
	enc1 := EncounterInput{
		StartedAtMs: startMs,
		TotalDmg:    &totalDmg,
		SceneID:     &sceneID,
		EncounterBosses: []BossInput{
			{MonsterName: "Boss1"},
		},
		ActorEncounterStats: []ActorStatInput{
			{ActorID: 1001, DamageDealt: 3000, IsPlayer: true},
			{ActorID: 1002, DamageDealt: 4000, IsPlayer: true},
			{ActorID: 1003, DamageDealt: 3000, IsPlayer: true},
		},
		AttemptsCount: 1,
	}

	enc2 := EncounterInput{
		StartedAtMs: startMs,
		TotalDmg:    &totalDmg,
		SceneID:     &sceneID,
		EncounterBosses: []BossInput{
			{MonsterName: "Boss1"},
		},
		ActorEncounterStats: []ActorStatInput{
			{ActorID: 1003, DamageDealt: 3000, IsPlayer: true}, // Different order
			{ActorID: 1001, DamageDealt: 3000, IsPlayer: true},
			{ActorID: 1002, DamageDealt: 4000, IsPlayer: true},
		},
		AttemptsCount: 1,
	}

	fp1 := ComputeEncounterFingerprint(enc1, config)
	fp2 := ComputeEncounterFingerprint(enc2, config)

	if fp1 != fp2 {
		t.Errorf("Fingerprint should be independent of actor order: %s != %s", fp1, fp2)
	}
}

func TestComputeEncounterFingerprint_BossOrderIndependent(t *testing.T) {
	config := DefaultDedupeConfig()

	sceneID := int64(101)
	totalDmg := int64(10000)
	startMs := time.Now().UnixMilli()

	// Create two encounters with same data but different boss order
	enc1 := EncounterInput{
		StartedAtMs: startMs,
		TotalDmg:    &totalDmg,
		SceneID:     &sceneID,
		EncounterBosses: []BossInput{
			{MonsterName: "BossA"},
			{MonsterName: "BossB"},
		},
		ActorEncounterStats: []ActorStatInput{
			{ActorID: 1001, DamageDealt: 5000, IsPlayer: true},
			{ActorID: 1002, DamageDealt: 5000, IsPlayer: true},
		},
		AttemptsCount: 1,
	}

	enc2 := EncounterInput{
		StartedAtMs: startMs,
		TotalDmg:    &totalDmg,
		SceneID:     &sceneID,
		EncounterBosses: []BossInput{
			{MonsterName: "BossB"}, // Different order
			{MonsterName: "BossA"},
		},
		ActorEncounterStats: []ActorStatInput{
			{ActorID: 1001, DamageDealt: 5000, IsPlayer: true},
			{ActorID: 1002, DamageDealt: 5000, IsPlayer: true},
		},
		AttemptsCount: 1,
	}

	fp1 := ComputeEncounterFingerprint(enc1, config)
	fp2 := ComputeEncounterFingerprint(enc2, config)

	if fp1 != fp2 {
		t.Errorf("Fingerprint should be independent of boss order: %s != %s", fp1, fp2)
	}
}

func TestComputeEncounterFingerprint_DifferentStartTimeBucket(t *testing.T) {
	config := DefaultDedupeConfig()
	config.StartTimeBucketSeconds = 30

	sceneID := int64(101)
	totalDmg := int64(10000)

	// Two encounters 60 seconds apart (different buckets) - use a fixed time
	baseTime := time.Date(2025, 11, 10, 12, 0, 0, 0, time.UTC)
	enc1 := EncounterInput{
		StartedAtMs: baseTime.UnixMilli(),
		TotalDmg:    &totalDmg,
		SceneID:     &sceneID,
		EncounterBosses: []BossInput{
			{MonsterName: "Boss1"},
		},
		ActorEncounterStats: []ActorStatInput{
			{ActorID: 1001, DamageDealt: 5000, IsPlayer: true},
			{ActorID: 1002, DamageDealt: 5000, IsPlayer: true},
		},
		AttemptsCount: 1,
	}

	enc2 := EncounterInput{
		StartedAtMs: baseTime.Add(60 * time.Second).UnixMilli(),
		TotalDmg:    &totalDmg,
		SceneID:     &sceneID,
		EncounterBosses: []BossInput{
			{MonsterName: "Boss1"},
		},
		ActorEncounterStats: []ActorStatInput{
			{ActorID: 1001, DamageDealt: 5000, IsPlayer: true},
			{ActorID: 1002, DamageDealt: 5000, IsPlayer: true},
		},
		AttemptsCount: 1,
	}

	fp1 := ComputeEncounterFingerprint(enc1, config)
	fp2 := ComputeEncounterFingerprint(enc2, config)

	if fp1 == fp2 {
		t.Errorf("Fingerprint should differ for different time buckets: %s == %s", fp1, fp2)
	}
}

func TestComputeEncounterFingerprint_SameTimeBucket(t *testing.T) {
	config := DefaultDedupeConfig()
	config.StartTimeBucketSeconds = 30

	sceneID := int64(101)
	totalDmg := int64(10000)

	// Two encounters 10 seconds apart (same bucket) - use a fixed time to avoid timing issues
	baseTime := time.Date(2025, 11, 10, 12, 0, 0, 0, time.UTC)
	enc1 := EncounterInput{
		StartedAtMs: baseTime.UnixMilli(),
		TotalDmg:    &totalDmg,
		SceneID:     &sceneID,
		EncounterBosses: []BossInput{
			{MonsterName: "Boss1"},
		},
		ActorEncounterStats: []ActorStatInput{
			{ActorID: 1001, DamageDealt: 5000, IsPlayer: true},
			{ActorID: 1002, DamageDealt: 5000, IsPlayer: true},
		},
		AttemptsCount: 1,
	}

	enc2 := EncounterInput{
		StartedAtMs: baseTime.Add(10 * time.Second).UnixMilli(),
		TotalDmg:    &totalDmg,
		SceneID:     &sceneID,
		EncounterBosses: []BossInput{
			{MonsterName: "Boss1"},
		},
		ActorEncounterStats: []ActorStatInput{
			{ActorID: 1001, DamageDealt: 5000, IsPlayer: true},
			{ActorID: 1002, DamageDealt: 5000, IsPlayer: true},
		},
		AttemptsCount: 1,
	}

	fp1 := ComputeEncounterFingerprint(enc1, config)
	fp2 := ComputeEncounterFingerprint(enc2, config)

	if fp1 != fp2 {
		t.Errorf("Fingerprint should be same for same time bucket: %s != %s", fp1, fp2)
	}
}

func TestComputePlayerSetHash_Deterministic(t *testing.T) {
	enc := EncounterInput{
		ActorEncounterStats: []ActorStatInput{
			{ActorID: 1001, DamageDealt: 3000, IsPlayer: true},
			{ActorID: 1002, DamageDealt: 4000, IsPlayer: true},
			{ActorID: 1003, DamageDealt: 3000, IsPlayer: true},
		},
	}

	hash1 := ComputePlayerSetHash(enc)
	hash2 := ComputePlayerSetHash(enc)

	if hash1 != hash2 {
		t.Errorf("PlayerSetHash should be deterministic: %s != %s", hash1, hash2)
	}

	if len(hash1) != 64 {
		t.Errorf("PlayerSetHash should be 64 chars, got %d", len(hash1))
	}
}

func TestComputePlayerSetHash_OrderIndependent(t *testing.T) {
	enc1 := EncounterInput{
		ActorEncounterStats: []ActorStatInput{
			{ActorID: 1001, DamageDealt: 3000, IsPlayer: true},
			{ActorID: 1002, DamageDealt: 4000, IsPlayer: true},
			{ActorID: 1003, DamageDealt: 3000, IsPlayer: true},
		},
	}

	enc2 := EncounterInput{
		ActorEncounterStats: []ActorStatInput{
			{ActorID: 1003, DamageDealt: 3000, IsPlayer: true}, // Different order
			{ActorID: 1001, DamageDealt: 3000, IsPlayer: true},
			{ActorID: 1002, DamageDealt: 4000, IsPlayer: true},
		},
	}

	hash1 := ComputePlayerSetHash(enc1)
	hash2 := ComputePlayerSetHash(enc2)

	if hash1 != hash2 {
		t.Errorf("PlayerSetHash should be independent of actor order: %s != %s", hash1, hash2)
	}
}

func TestComputePlayerSetHash_DifferentPlayers(t *testing.T) {
	enc1 := EncounterInput{
		ActorEncounterStats: []ActorStatInput{
			{ActorID: 1001, DamageDealt: 3000, IsPlayer: true},
			{ActorID: 1002, DamageDealt: 4000, IsPlayer: true},
		},
	}

	enc2 := EncounterInput{
		ActorEncounterStats: []ActorStatInput{
			{ActorID: 1001, DamageDealt: 3000, IsPlayer: true},
			{ActorID: 1003, DamageDealt: 4000, IsPlayer: true}, // Different player
		},
	}

	hash1 := ComputePlayerSetHash(enc1)
	hash2 := ComputePlayerSetHash(enc2)

	if hash1 == hash2 {
		t.Errorf("PlayerSetHash should differ for different player sets: %s == %s", hash1, hash2)
	}
}

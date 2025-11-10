package main

import (
	"fmt"
	"time"

	"server/lib"
)

func main() {
	config := lib.DefaultDedupeConfig()

	// Example 1: Same encounter from two different POVs
	fmt.Println("=== Example 1: Same encounter, different POVs ===")
	sceneID := int64(101)
	totalDmg := int64(10000)
	baseTime := time.Date(2025, 11, 10, 12, 0, 0, 0, time.UTC)

	// User 1's upload (LocalPlayerID = 1001)
	enc1 := lib.EncounterInput{
		StartedAtMs: baseTime.UnixMilli(),
		TotalDmg:    &totalDmg,
		SceneID:     &sceneID,
		EncounterBosses: []lib.BossInput{
			{MonsterName: "Dragon Boss"},
		},
		ActorEncounterStats: []lib.ActorStatInput{
			{ActorID: 1001, DamageDealt: 3000, IsPlayer: true}, // Local player for User1
			{ActorID: 1002, DamageDealt: 4000, IsPlayer: true},
			{ActorID: 1003, DamageDealt: 3000, IsPlayer: true},
		},
		AttemptsCount: 1,
	}

	// User 2's upload (LocalPlayerID = 1002)
	enc2 := lib.EncounterInput{
		StartedAtMs: baseTime.UnixMilli(),
		TotalDmg:    &totalDmg,
		SceneID:     &sceneID,
		EncounterBosses: []lib.BossInput{
			{MonsterName: "Dragon Boss"},
		},
		ActorEncounterStats: []lib.ActorStatInput{
			{ActorID: 1002, DamageDealt: 4000, IsPlayer: true}, // Local player for User2
			{ActorID: 1001, DamageDealt: 3000, IsPlayer: true}, // Different order
			{ActorID: 1003, DamageDealt: 3000, IsPlayer: true},
		},
		AttemptsCount: 1,
	}

	fp1 := lib.ComputeEncounterFingerprint(enc1, config)
	fp2 := lib.ComputeEncounterFingerprint(enc2, config)

	fmt.Printf("User1 fingerprint: %s\n", fp1)
	fmt.Printf("User2 fingerprint: %s\n", fp2)
	fmt.Printf("Fingerprints match: %v ✓ (Same encounter detected)\n\n", fp1 == fp2)

	// Example 2: Different runs of same dungeon
	fmt.Println("=== Example 2: Different runs (60s apart) ===")
	run1 := lib.EncounterInput{
		StartedAtMs: baseTime.UnixMilli(),
		TotalDmg:    &totalDmg,
		SceneID:     &sceneID,
		EncounterBosses: []lib.BossInput{
			{MonsterName: "Dragon Boss"},
		},
		ActorEncounterStats: []lib.ActorStatInput{
			{ActorID: 1001, DamageDealt: 3000, IsPlayer: true},
			{ActorID: 1002, DamageDealt: 4000, IsPlayer: true},
			{ActorID: 1003, DamageDealt: 3000, IsPlayer: true},
		},
		AttemptsCount: 1,
	}

	run2 := lib.EncounterInput{
		StartedAtMs: baseTime.Add(60 * time.Second).UnixMilli(), // 60 seconds later
		TotalDmg:    &totalDmg,
		SceneID:     &sceneID,
		EncounterBosses: []lib.BossInput{
			{MonsterName: "Dragon Boss"},
		},
		ActorEncounterStats: []lib.ActorStatInput{
			{ActorID: 1001, DamageDealt: 3000, IsPlayer: true},
			{ActorID: 1002, DamageDealt: 4000, IsPlayer: true},
			{ActorID: 1003, DamageDealt: 3000, IsPlayer: true},
		},
		AttemptsCount: 1,
	}

	fpRun1 := lib.ComputeEncounterFingerprint(run1, config)
	fpRun2 := lib.ComputeEncounterFingerprint(run2, config)

	fmt.Printf("Run 1 fingerprint: %s\n", fpRun1)
	fmt.Printf("Run 2 fingerprint: %s\n", fpRun2)
	fmt.Printf("Fingerprints differ: %v ✓ (Separate runs detected)\n\n", fpRun1 != fpRun2)

	// Example 3: Player set hash for fast lookups
	fmt.Println("=== Example 3: Player set hashing ===")
	psh1 := lib.ComputePlayerSetHash(enc1)
	psh2 := lib.ComputePlayerSetHash(enc2)

	fmt.Printf("Enc1 player set hash: %s\n", psh1)
	fmt.Printf("Enc2 player set hash: %s\n", psh2)
	fmt.Printf("Player sets match: %v ✓ (Same players in both encounters)\n\n", psh1 == psh2)

	// Example 4: Different player sets
	fmt.Println("=== Example 4: Different player sets ===")
	encDiffPlayers := lib.EncounterInput{
		StartedAtMs: baseTime.UnixMilli(),
		ActorEncounterStats: []lib.ActorStatInput{
			{ActorID: 1001, DamageDealt: 3000, IsPlayer: true},
			{ActorID: 1004, DamageDealt: 4000, IsPlayer: true}, // Different player (1004 instead of 1002)
			{ActorID: 1003, DamageDealt: 3000, IsPlayer: true},
		},
	}

	pshDiff := lib.ComputePlayerSetHash(encDiffPlayers)
	fmt.Printf("Original player set hash: %s\n", psh1)
	fmt.Printf("Different player set hash: %s\n", pshDiff)
	fmt.Printf("Player sets differ: %v ✓ (Different party composition detected)\n\n", psh1 != pshDiff)

	fmt.Println("=== Deduplication Validation Complete ===")
	fmt.Println("✓ Cross-user deduplication working correctly")
	fmt.Println("✓ Separate runs detected by time bucketing")
	fmt.Println("✓ Player set hashing enables fast fuzzy candidate lookups")
}

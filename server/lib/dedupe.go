package lib

import (
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"math"
	"sort"
	"strings"
	"time"

	"server/models"
)

// EncounterInput represents the essential data from an encounter upload needed for deduplication
type EncounterInput struct {
	StartedAtMs         int64
	TotalDmg            *int64
	SceneID             *int64
	SceneName           *string
	EncounterBosses     []BossInput
	ActorEncounterStats []ActorStatInput
	AttemptsCount       int
}

// BossInput represents boss data for deduplication
type BossInput struct {
	MonsterName string
}

// ActorStatInput represents actor stat data for deduplication
type ActorStatInput struct {
	ActorID     int64
	DamageDealt int64
	IsPlayer    bool
}

// DedupeConfig holds configurable thresholds for fuzzy matching
type DedupeConfig struct {
	StartTimeBucketSeconds int     // Bucket size for start time (default: 30s)
	DamageL1Threshold      float64 // Max L1 norm difference for per-player damage % (default: 0.05 = 5%)
	TotalDamagePctDiff     float64 // Max total damage relative difference (default: 0.03 = 3%)
	StartTimeDeltaSeconds  int     // Max start time difference for fuzzy match (default: 30s)
}

// DefaultDedupeConfig returns the default configuration
func DefaultDedupeConfig() DedupeConfig {
	return DedupeConfig{
		StartTimeBucketSeconds: 30,
		DamageL1Threshold:      0.05,
		TotalDamagePctDiff:     0.03,
		StartTimeDeltaSeconds:  30,
	}
}

// PlayerDamageInfo holds player actor ID and damage percentage for comparison
type PlayerDamageInfo struct {
	ActorID   int64
	DamagePct float64
	DamageAbs int64
	IsPlayer  bool
}

// ComputeEncounterFingerprint computes a deterministic SHA256 fingerprint for an encounter
// based on scene, bosses, player set with damage percentages, attempt count, and start time bucket
func ComputeEncounterFingerprint(enc EncounterInput, config DedupeConfig) string {
	var parts []string

	// 1. Scene (prefer SceneID, fallback to SceneName)
	if enc.SceneID != nil {
		parts = append(parts, fmt.Sprintf("scene_id:%d", *enc.SceneID))
	} else if enc.SceneName != nil {
		parts = append(parts, fmt.Sprintf("scene_name:%s", strings.ToLower(strings.TrimSpace(*enc.SceneName))))
	} else {
		parts = append(parts, "scene:unknown")
	}

	// 2. Boss names (sorted, lowercased, trimmed)
	bossNames := make([]string, 0, len(enc.EncounterBosses))
	for _, b := range enc.EncounterBosses {
		bossNames = append(bossNames, strings.ToLower(strings.TrimSpace(b.MonsterName)))
	}
	sort.Strings(bossNames)
	if len(bossNames) > 0 {
		parts = append(parts, fmt.Sprintf("bosses:%s", strings.Join(bossNames, ",")))
	} else {
		parts = append(parts, "bosses:none")
	}

	// 3. Players (sorted by ActorID, with damage percentage rounded to 2 decimals)
	totalDmg := int64(0)
	if enc.TotalDmg != nil {
		totalDmg = *enc.TotalDmg
	}

	players := make([]PlayerDamageInfo, 0)
	for _, stat := range enc.ActorEncounterStats {
		if stat.IsPlayer {
			damagePct := 0.0
			if totalDmg > 0 {
				damagePct = float64(stat.DamageDealt) / float64(totalDmg)
			}
			players = append(players, PlayerDamageInfo{
				ActorID:   stat.ActorID,
				DamagePct: damagePct,
				DamageAbs: stat.DamageDealt,
				IsPlayer:  true,
			})
		}
	}

	// Sort players by ActorID for canonical ordering
	sort.Slice(players, func(i, j int) bool {
		return players[i].ActorID < players[j].ActorID
	})

	playerStrs := make([]string, 0, len(players))
	for _, p := range players {
		// Round damage percentage to 2 decimal places
		pct := math.Round(p.DamagePct*10000) / 100 // percentage (0-100)
		playerStrs = append(playerStrs, fmt.Sprintf("%d:%.2f", p.ActorID, pct))
	}
	if len(playerStrs) > 0 {
		parts = append(parts, fmt.Sprintf("players:%s", strings.Join(playerStrs, ",")))
	} else {
		parts = append(parts, "players:none")
	}

	// 4. Attempt count
	parts = append(parts, fmt.Sprintf("attempts:%d", enc.AttemptsCount))

	// 5. Start time bucket (coarse-grained to distinguish separate runs)
	startTime := time.UnixMilli(enc.StartedAtMs)
	bucketSize := int64(config.StartTimeBucketSeconds)
	bucket := startTime.Unix() / bucketSize
	parts = append(parts, fmt.Sprintf("start_bucket:%d", bucket))

	// Combine all parts into a canonical string
	canonical := strings.Join(parts, "|")

	// Compute SHA256 hash
	hash := sha256.Sum256([]byte(canonical))
	return hex.EncodeToString(hash[:])
}

// ComputePlayerSetHash computes a deterministic hash of just the sorted player ActorIDs
// This is used for fast candidate lookup when searching for potential fuzzy duplicates
func ComputePlayerSetHash(enc EncounterInput) string {
	playerIDs := make([]int64, 0)
	for _, stat := range enc.ActorEncounterStats {
		if stat.IsPlayer {
			playerIDs = append(playerIDs, stat.ActorID)
		}
	}

	// Sort for canonical ordering
	sort.Slice(playerIDs, func(i, j int) bool {
		return playerIDs[i] < playerIDs[j]
	})

	// Build canonical string
	idStrs := make([]string, len(playerIDs))
	for i, id := range playerIDs {
		idStrs[i] = fmt.Sprintf("%d", id)
	}
	canonical := strings.Join(idStrs, ",")

	// Compute SHA256 hash (truncate to 64 chars for storage efficiency)
	hash := sha256.Sum256([]byte(canonical))
	return hex.EncodeToString(hash[:])
}

// ExtractPlayerDamageInfo extracts player damage info from an EncounterInput
func ExtractPlayerDamageInfo(enc EncounterInput) []PlayerDamageInfo {
	totalDmg := int64(0)
	if enc.TotalDmg != nil {
		totalDmg = *enc.TotalDmg
	}

	players := make([]PlayerDamageInfo, 0)
	for _, stat := range enc.ActorEncounterStats {
		if stat.IsPlayer {
			damagePct := 0.0
			if totalDmg > 0 {
				damagePct = float64(stat.DamageDealt) / float64(totalDmg)
			}
			players = append(players, PlayerDamageInfo{
				ActorID:   stat.ActorID,
				DamagePct: damagePct,
				DamageAbs: stat.DamageDealt,
				IsPlayer:  true,
			})
		}
	}

	// Sort by ActorID for canonical comparison
	sort.Slice(players, func(i, j int) bool {
		return players[i].ActorID < players[j].ActorID
	})

	return players
}

// ExtractPlayerDamageInfoFromModel extracts player damage info from a models.Encounter with loaded Players
func ExtractPlayerDamageInfoFromModel(enc models.Encounter) []PlayerDamageInfo {
	totalDmg := enc.TotalDmg
	if totalDmg == 0 {
		totalDmg = 1 // avoid division by zero
	}

	players := make([]PlayerDamageInfo, 0)
	for _, stat := range enc.Players {
		if stat.IsPlayer {
			damagePct := float64(stat.DamageDealt) / float64(totalDmg)
			players = append(players, PlayerDamageInfo{
				ActorID:   stat.ActorID,
				DamagePct: damagePct,
				DamageAbs: stat.DamageDealt,
				IsPlayer:  true,
			})
		}
	}

	// Sort by ActorID
	sort.Slice(players, func(i, j int) bool {
		return players[i].ActorID < players[j].ActorID
	})

	return players
}

// FuzzySimilarity holds similarity metrics between two encounters
type FuzzySimilarity struct {
	DamageL1Norm      float64 // L1 norm of per-player damage percentage differences
	TotalDamageDiff   float64 // Relative difference in total damage (0.0 = identical, 1.0 = 100% difference)
	StartTimeDelta    int64   // Absolute difference in start times (seconds)
	AttemptCountMatch bool    // Whether attempt counts match
	PlayerSetMatch    bool    // Whether player sets (ActorIDs) match exactly
	SceneMatch        bool    // Whether scene matches
	BossMatch         bool    // Whether boss names match
}

// ComputeFuzzySimilarity compares two encounters and returns similarity metrics
func ComputeFuzzySimilarity(enc1 EncounterInput, enc2Preloaded models.Encounter) FuzzySimilarity {
	sim := FuzzySimilarity{}

	// Scene match
	if enc1.SceneID != nil && enc2Preloaded.SceneID != nil {
		sim.SceneMatch = *enc1.SceneID == *enc2Preloaded.SceneID
	} else if enc1.SceneName != nil && enc2Preloaded.SceneName != nil {
		sim.SceneMatch = strings.EqualFold(strings.TrimSpace(*enc1.SceneName), strings.TrimSpace(*enc2Preloaded.SceneName))
	} else {
		sim.SceneMatch = false
	}

	// Boss match (compare sorted boss names)
	bossNames1 := make([]string, 0, len(enc1.EncounterBosses))
	for _, b := range enc1.EncounterBosses {
		bossNames1 = append(bossNames1, strings.ToLower(strings.TrimSpace(b.MonsterName)))
	}
	sort.Strings(bossNames1)

	bossNames2 := make([]string, 0, len(enc2Preloaded.Bosses))
	for _, b := range enc2Preloaded.Bosses {
		bossNames2 = append(bossNames2, strings.ToLower(strings.TrimSpace(b.MonsterName)))
	}
	sort.Strings(bossNames2)

	sim.BossMatch = len(bossNames1) == len(bossNames2)
	if sim.BossMatch {
		for i := range bossNames1 {
			if bossNames1[i] != bossNames2[i] {
				sim.BossMatch = false
				break
			}
		}
	}

	// Player set match and damage comparison
	players1 := ExtractPlayerDamageInfo(enc1)
	players2 := ExtractPlayerDamageInfoFromModel(enc2Preloaded)

	// Check if player sets match (same ActorIDs)
	sim.PlayerSetMatch = len(players1) == len(players2)
	if sim.PlayerSetMatch {
		for i := range players1 {
			if players1[i].ActorID != players2[i].ActorID {
				sim.PlayerSetMatch = false
				break
			}
		}
	}

	// Compute damage L1 norm (only if player sets match)
	if sim.PlayerSetMatch && len(players1) > 0 {
		l1Sum := 0.0
		for i := range players1 {
			l1Sum += math.Abs(players1[i].DamagePct - players2[i].DamagePct)
		}
		sim.DamageL1Norm = l1Sum
	} else {
		sim.DamageL1Norm = math.MaxFloat64 // no match
	}

	// Total damage difference
	totalDmg1 := int64(0)
	if enc1.TotalDmg != nil {
		totalDmg1 = *enc1.TotalDmg
	}
	totalDmg2 := enc2Preloaded.TotalDmg

	if totalDmg1 > 0 && totalDmg2 > 0 {
		diff := math.Abs(float64(totalDmg1) - float64(totalDmg2))
		avg := (float64(totalDmg1) + float64(totalDmg2)) / 2.0
		sim.TotalDamageDiff = diff / avg
	} else if totalDmg1 == 0 && totalDmg2 == 0 {
		sim.TotalDamageDiff = 0.0
	} else {
		sim.TotalDamageDiff = 1.0 // one is zero, the other is not
	}

	// Start time delta (seconds)
	startTime1 := time.UnixMilli(enc1.StartedAtMs)
	startTime2 := enc2Preloaded.StartedAt
	sim.StartTimeDelta = int64(math.Abs(startTime1.Sub(startTime2).Seconds()))

	// Attempt count match
	sim.AttemptCountMatch = enc1.AttemptsCount == len(enc2Preloaded.Attempts)

	return sim
}

// IsFuzzyDuplicate returns true if the similarity metrics indicate a duplicate
func IsFuzzyDuplicate(sim FuzzySimilarity, config DedupeConfig) bool {
	// All of these conditions must be met for a fuzzy duplicate:
	// 1. Scene matches
	// 2. Boss names match
	// 3. Player set matches exactly (same ActorIDs)
	// 4. Per-player damage L1 norm below threshold
	// 5. Total damage difference below threshold
	// 6. Start time delta below threshold
	// 7. Attempt counts match (or differ by at most 1)

	if !sim.SceneMatch || !sim.BossMatch || !sim.PlayerSetMatch {
		return false
	}

	if sim.DamageL1Norm > config.DamageL1Threshold {
		return false
	}

	if sim.TotalDamageDiff > config.TotalDamagePctDiff {
		return false
	}

	if sim.StartTimeDelta > int64(config.StartTimeDeltaSeconds) {
		return false
	}

	// Allow attempt count to differ by 1 (in case of minor discrepancies)
	if !sim.AttemptCountMatch {
		return false
	}

	return true
}

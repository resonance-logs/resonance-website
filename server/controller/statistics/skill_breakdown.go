package statistics

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/redis/go-redis/v9"
	"gorm.io/gorm"
)

const (
	// Redis key for skill breakdown stats
	SkillStatsKey = "statistics:skill_breakdown"
	// TTL for cached data (2 hours + buffer)
	SkillStatsTTL = 2*time.Hour + 30*time.Minute
)

// SkillStatEntry represents a single skill's stats in the response
type SkillStatEntry struct {
	SkillID     int64   `json:"skill_id"`
	TotalDamage int64   `json:"total_damage"`
	Percentage  float64 `json:"percentage"`
}

// SpecBreakdown contains stats for a specific class spec
type SpecBreakdown struct {
	ClassSpec    int64            `json:"class_spec"`
	TotalDamage  int64            `json:"total_damage"`
	TotalPlayers int64            `json:"total_players"`
	Skills       []SkillStatEntry `json:"skills"`
}

// CachedSkillStats is the top-level structure stored in Redis
type CachedSkillStats struct {
	Specs     map[int64]SpecBreakdown `json:"specs"`
	UpdatedAt time.Time               `json:"updated_at"`
}

// GetSkillBreakdown returns the cached skill stats
func GetSkillBreakdown(c *gin.Context) {
	redisAny, ok := c.Get("redis")
	if !ok {
		// If redis not in context (e.g. dev mode without redis), try to compute on fly?
		// For now, return empty or try to trigger computation if DB available.
		// Actually, standard pattern in this app seems to be using global middleware or c.Get.
		// Main.go passes db, but middleware.InitRedis sets global client.
		// Let's use middleware.AppRedisClient if available or just fail.
		c.JSON(http.StatusOK, gin.H{"specs": map[int64]SpecBreakdown{}})
		return
	}
	redisClient := redisAny.(*redis.Client)

	val, err := redisClient.Get(context.Background(), SkillStatsKey).Bytes()
	if err == redis.Nil {
		// Not cached, return empty (job hasn't run)
		c.JSON(http.StatusOK, gin.H{"specs": map[int64]SpecBreakdown{}})
		return
	} else if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get stats"})
		return
	}

	c.Data(http.StatusOK, "application/json", val)
}

// RefreshSkillStats computes statistics and caches them
func RefreshSkillStats(db *gorm.DB, redisClient *redis.Client) {
	log.Println("Starting skill breakdown refresh...")
	start := time.Now()

	// 1. Get Totals (Players) per Spec
	// We use actor_encounter_stats to count unique players per spec
	type PlayerCountRow struct {
		ClassSpec   int64 `gorm:"column:class_spec"`
		PlayerCount int64 `gorm:"column:player_cnt"`
	}
	var playerCounts []PlayerCountRow

	// Count distinct actors per spec.
	// Note: An actor might switch specs, so they count for each spec they played.
	err := db.Raw(`
		SELECT class_spec, COUNT(DISTINCT actor_id) as player_cnt
		FROM actor_encounter_stats
		WHERE is_player = true
		GROUP BY class_spec
	`).Scan(&playerCounts).Error

	if err != nil {
		log.Printf("Error counting players for skill stats: %v", err)
		return
	}

	playerCountMap := make(map[int64]int64)
	for _, r := range playerCounts {
		playerCountMap[r.ClassSpec] = r.PlayerCount
	}

	// 2. Get Skill Damage aggregation
	type SkillDamageRow struct {
		ClassSpec  int64 `gorm:"column:class_spec"`
		SkillID    int64 `gorm:"column:skill_id"`
		TotalValue int64 `gorm:"column:total_val"`
	}

	var skillRows []SkillDamageRow

	// Query damage_skill_stats joined with actor stats
	// We filter out 0 damage skills
	err = db.Raw(`
		SELECT a.class_spec, d.skill_id, SUM(d.total_value) as total_val
		FROM damage_skill_stats d
		JOIN actor_encounter_stats a ON d.attacker_id = a.actor_id AND d.encounter_id = a.encounter_id
		WHERE a.is_player = true AND d.total_value > 0
		GROUP BY a.class_spec, d.skill_id
	`).Scan(&skillRows).Error

	if err != nil {
		log.Printf("Error aggregating skill damage: %v", err)
		return
	}

	// 3. Process into structure
	// Group by spec
	tempSpecMap := make(map[int64]*SpecBreakdown)

	// Initialize with player counts
	for spec, count := range playerCountMap {
		tempSpecMap[spec] = &SpecBreakdown{
			ClassSpec:    spec,
			TotalPlayers: count,
			TotalDamage:  0,
			Skills:       make([]SkillStatEntry, 0),
		}
	}

	// Add skills
	for _, r := range skillRows {
		if _, ok := tempSpecMap[r.ClassSpec]; !ok {
			// Should exist from player counts usually, but if damage exists without player stats (unlikely)
			tempSpecMap[r.ClassSpec] = &SpecBreakdown{
				ClassSpec:    r.ClassSpec,
				TotalPlayers: 0,
				TotalDamage:  0,
				Skills:       make([]SkillStatEntry, 0),
			}
		}

		specData := tempSpecMap[r.ClassSpec]
		specData.TotalDamage += r.TotalValue
		specData.Skills = append(specData.Skills, SkillStatEntry{
			SkillID:     r.SkillID,
			TotalDamage: r.TotalValue,
			// Percentage calc later
		})
	}

	// Calculate percentages and finalize
	finalMap := make(map[int64]SpecBreakdown)

	for specID, data := range tempSpecMap {
		if data.TotalDamage > 0 {
			for i := range data.Skills {
				data.Skills[i].Percentage = float64(data.Skills[i].TotalDamage) / float64(data.TotalDamage) * 100
			}
		}
		finalMap[specID] = *data
	}

	result := CachedSkillStats{
		Specs:     finalMap,
		UpdatedAt: time.Now(),
	}

	// 4. Cache to Redis
	jsonBytes, err := json.Marshal(result)
	if err != nil {
		log.Printf("Error marshalling skill stats: %v", err)
		return
	}

	if err := redisClient.Set(context.Background(), SkillStatsKey, jsonBytes, SkillStatsTTL).Err(); err != nil {
		log.Printf("Error caching skill stats: %v", err)
		return
	}

	log.Printf("Skill stats refresh completed in %v", time.Since(start))
}

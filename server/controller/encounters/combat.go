package encounters

import (
	"net/http"
	"strconv"
	"time"

	"server/models"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// GetEncounters retrieves a list of encounters with optional filtering
func GetEncounters(c *gin.Context) {
	db := c.MustGet("db").(*gorm.DB)

	// Parse query parameters
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	offset, _ := strconv.Atoi(c.DefaultQuery("offset", "0"))
	sceneID := c.Query("sceneId")
	localPlayerID := c.Query("localPlayerId")

	// Build query
	query := db.Model(&models.Encounter{})

	if sceneID != "" {
		query = query.Where("scene_id = ?", sceneID)
	}

	if localPlayerID != "" {
		query = query.Where("local_player_id = ?", localPlayerID)
	}

	// Get total count
	var total int64
	query.Count(&total)

	// Get encounters with pagination
	var encounters []models.Encounter
	result := query.Limit(limit).Offset(offset).Order("started_at_ms DESC").Find(&encounters)

	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": result.Error.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"encounters": encounters,
		"total":      total,
		"limit":      limit,
		"offset":     offset,
	})
}

// GetEncounterByID retrieves a specific encounter by ID
func GetEncounterByID(c *gin.Context) {
	db := c.MustGet("db").(*gorm.DB)
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid encounter ID"})
		return
	}

	var encounter models.Encounter
	result := db.First(&encounter, id)

	if result.Error != nil {
		if result.Error == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "Encounter not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": result.Error.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"encounter": encounter})
}

// GetEncounterAttempts retrieves all attempts for a specific encounter
func GetEncounterAttempts(c *gin.Context) {
	db := c.MustGet("db").(*gorm.DB)
	encounterID, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid encounter ID"})
		return
	}

	var attempts []models.Attempt
	result := db.Where("encounter_id = ?", encounterID).Order("attempt_index ASC").Find(&attempts)

	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": result.Error.Error()})
		return
	}

	c.JSON(http.StatusOK, attempts)
}

// GetEntities retrieves a list of entities with optional filtering
func GetEntities(c *gin.Context) {
	db := c.MustGet("db").(*gorm.DB)

	// Parse query parameters
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	offset, _ := strconv.Atoi(c.DefaultQuery("offset", "0"))
	classID := c.Query("classId")
	isPlayer := c.Query("isPlayer")

	// Build query
	query := db.Model(&models.Entity{})

	if classID != "" {
		query = query.Where("class_id = ?", classID)
	}

	if isPlayer != "" {
		query = query.Where("is_player = ?", isPlayer)
	}

	// Get total count
	var total int64
	query.Count(&total)

	// Get entities with pagination
	var entities []models.Entity
	result := query.Limit(limit).Offset(offset).Order("last_seen_ms DESC").Find(&entities)

	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": result.Error.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"entities": entities,
		"total":    total,
		"limit":    limit,
		"offset":   offset,
	})
}

// GetEntityByID retrieves a specific entity by ID
func GetEntityByID(c *gin.Context) {
	db := c.MustGet("db").(*gorm.DB)
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid entity ID"})
		return
	}

	var entity models.Entity
	result := db.First(&entity, id)

	if result.Error != nil {
		if result.Error == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "Entity not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": result.Error.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"entity": entity})
}

// GetEncounterStats retrieves aggregated statistics for a specific encounter
func GetEncounterStats(c *gin.Context) {
	db := c.MustGet("db").(*gorm.DB)
	encounterID, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid encounter ID"})
		return
	}

	// Get actor stats
	var actorStats []models.ActorEncounterStat
	result := db.Where("encounter_id = ?", encounterID).Find(&actorStats)

	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": result.Error.Error()})
		return
	}

	// Get damage skill stats
	var damageSkillStats []models.DamageSkillStat
	result = db.Where("encounter_id = ?", encounterID).Find(&damageSkillStats)

	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": result.Error.Error()})
		return
	}

	// Get heal skill stats
	var healSkillStats []models.HealSkillStat
	result = db.Where("encounter_id = ?", encounterID).Find(&healSkillStats)

	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": result.Error.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"actorStats":       actorStats,
		"damageSkillStats": damageSkillStats,
		"healSkillStats":   healSkillStats,
	})
}

// GetEntityStats retrieves statistics for a specific entity across encounters
func GetEntityStats(c *gin.Context) {
	db := c.MustGet("db").(*gorm.DB)
	entityID, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid entity ID"})
		return
	}

	// Parse query parameters
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	offset, _ := strconv.Atoi(c.DefaultQuery("offset", "0"))

	// Get actor stats for this entity
	var actorStats []models.ActorEncounterStat
	result := db.Where("actor_id = ?", entityID).Order("encounter_id DESC").Limit(limit).Offset(offset).Find(&actorStats)

	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": result.Error.Error()})
		return
	}

	// Get total count
	var total int64
	db.Model(&models.ActorEncounterStat{}).Where("actor_id = ?", entityID).Count(&total)

	c.JSON(http.StatusOK, gin.H{
		"stats":  actorStats,
		"total":  total,
		"limit":  limit,
		"offset": offset,
	})
}

// GetRecentEncounters retrieves recent encounters within a time window
func GetRecentEncounters(c *gin.Context) {
	db := c.MustGet("db").(*gorm.DB)

	// Parse query parameters
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	offset, _ := strconv.Atoi(c.DefaultQuery("offset", "0"))
	hours, _ := strconv.Atoi(c.DefaultQuery("hours", "24"))

	// Calculate time window
	timeWindow := time.Now().Add(-time.Duration(hours) * time.Hour).UnixMilli()

	// Get encounters within time window
	var encounters []models.Encounter
	result := db.Where("started_at_ms >= ?", timeWindow).
		Order("started_at_ms DESC").Limit(limit).Offset(offset).Find(&encounters)

	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": result.Error.Error()})
		return
	}

	// Get total count
	var total int64
	db.Model(&models.Encounter{}).Where("started_at_ms >= ?", timeWindow).Count(&total)

	c.JSON(http.StatusOK, gin.H{
		"encounters": encounters,
		"total":      total,
		"limit":      limit,
		"offset":     offset,
		"hours":      hours,
	})
}

// GetEncounterSummary retrieves a high-level summary of an encounter
func GetEncounterSummary(c *gin.Context) {
	db := c.MustGet("db").(*gorm.DB)
	encounterID, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid encounter ID"})
		return
	}

	// Get encounter details
	var encounter models.Encounter
	result := db.First(&encounter, encounterID)
	if result.Error != nil {
		if result.Error == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "Encounter not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": result.Error.Error()})
		return
	}

	// Get attempt count
	var attemptCount int64
	db.Model(&models.Attempt{}).Where("encounter_id = ?", encounterID).Count(&attemptCount)

	// Get unique actor count
	var actorCount int64
	db.Model(&models.ActorEncounterStat{}).Where("encounter_id = ?", encounterID).Count(&actorCount)

	// Get death count - using raw SQL since GORM Sum() method doesn't work as expected
	var totalDeaths int64
	db.Raw("SELECT COALESCE(SUM(total_deaths), 0) FROM attempts WHERE encounter_id = ?", encounterID).Scan(&totalDeaths)

	// Calculate duration
	var durationMs *int64
	if encounter.EndedAt != nil {
		duration := encounter.EndedAt.Sub(encounter.StartedAt).Milliseconds()
		durationMs = &duration
	}

	summary := gin.H{
		"encounter":    encounter,
		"attemptCount": attemptCount,
		"actorCount":   actorCount,
		"totalDeaths":  totalDeaths,
		"durationMs":   durationMs,
		"isCompleted":  encounter.EndedAt != nil,
	}

	c.JSON(http.StatusOK, summary)
}

// GetEncounterBosses retrieves boss information for a specific encounter
func GetEncounterBosses(c *gin.Context) {
	db := c.MustGet("db").(*gorm.DB)
	encounterID, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid encounter ID"})
		return
	}

	var bosses []models.EncounterBoss
	result := db.Where("encounter_id = ?", encounterID).Order("monster_name ASC").Find(&bosses)

	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": result.Error.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"bosses":    bosses,
		"bossCount": len(bosses),
		"defeated":  len(bosses) > 0,
	})
}

// GetDeathEvents retrieves only death events for a specific encounter
func GetDeathEvents(c *gin.Context) {
	db := c.MustGet("db").(*gorm.DB)
	encounterID, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid encounter ID"})
		return
	}

	// Parse query parameters
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "100"))
	offset, _ := strconv.Atoi(c.DefaultQuery("offset", "0"))
	attemptIndex, _ := strconv.Atoi(c.DefaultQuery("attemptIndex", "1"))

	var deathEvents []models.DeathEvent
	result := db.Where("encounter_id = ? AND attempt_index = ?", encounterID, attemptIndex).
		Order("timestamp_ms ASC").Limit(limit).Offset(offset).Find(&deathEvents)

	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": result.Error.Error()})
		return
	}

	// Get total count
	var total int64
	db.Model(&models.DeathEvent{}).Where("encounter_id = ? AND attempt_index = ?", encounterID, attemptIndex).Count(&total)

	c.JSON(http.StatusOK, gin.H{
		"deathEvents":  deathEvents,
		"total":        total,
		"limit":        limit,
		"offset":       offset,
		"attemptIndex": attemptIndex,
	})
}

// GetEntityEncounters retrieves all encounters for a specific entity
func GetEntityEncounters(c *gin.Context) {
	db := c.MustGet("db").(*gorm.DB)
	entityID, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid entity ID"})
		return
	}

	// Parse query parameters
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	offset, _ := strconv.Atoi(c.DefaultQuery("offset", "0"))

	// Get encounters for this entity
	var encounters []models.Encounter
	result := db.Joins("JOIN actor_encounter_stats ON encounters.id = actor_encounter_stats.encounter_id").
		Where("actor_encounter_stats.actor_id = ?", entityID).
		Group("encounters.id").
		Order("encounters.started_at_ms DESC").
		Limit(limit).Offset(offset).
		Find(&encounters)

	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": result.Error.Error()})
		return
	}

	// Get total count
	var total int64
	db.Model(&models.Encounter{}).
		Joins("JOIN actor_encounter_stats ON encounters.id = actor_encounter_stats.encounter_id").
		Where("actor_encounter_stats.actor_id = ?", entityID).
		Group("encounters.id").
		Count(&total)

	c.JSON(http.StatusOK, gin.H{
		"encounters": encounters,
		"total":      total,
		"limit":      limit,
		"offset":     offset,
	})
}

// GetEntityPerformance retrieves performance metrics for a specific entity
func GetEntityPerformance(c *gin.Context) {
	db := c.MustGet("db").(*gorm.DB)
	entityID, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid entity ID"})
		return
	}

	// Parse query parameters
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	offset, _ := strconv.Atoi(c.DefaultQuery("offset", "0"))

	// Get actor stats for performance metrics
	var stats []models.ActorEncounterStat
	result := db.Where("actor_id = ?", entityID).
		Order("encounter_id DESC").
		Limit(limit).Offset(offset).
		Find(&stats)

	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": result.Error.Error()})
		return
	}

	// Calculate aggregated metrics
	var totalDamage, totalHealing, totalDeaths int64
	var encounterCount int64
	encounterCount = int64(len(stats))

	for _, stat := range stats {
		totalDamage += stat.DamageDealt
		totalHealing += stat.HealDealt
		totalDeaths += int64(stat.Revives) // Using revives as deaths metric
	}

	// Get total count
	var total int64
	db.Model(&models.ActorEncounterStat{}).Where("actor_id = ?", entityID).Count(&total)

	performance := gin.H{
		"stats":          stats,
		"total":          total,
		"limit":          limit,
		"offset":         offset,
		"encounterCount": encounterCount,
		"aggregated": gin.H{
			"totalDamage":  totalDamage,
			"totalHealing": totalHealing,
			"totalDeaths":  totalDeaths,
			"avgDamage":    totalDamage / max(1, encounterCount),
			"avgHealing":   totalHealing / max(1, encounterCount),
		},
	}

	c.JSON(http.StatusOK, performance)
}

// GetSkillStats retrieves skill usage statistics for a specific encounter
func GetSkillStats(c *gin.Context) {
	db := c.MustGet("db").(*gorm.DB)
	encounterID, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid encounter ID"})
		return
	}

	// Get damage skill stats
	var damageSkillStats []models.DamageSkillStat
	result := db.Where("encounter_id = ?", encounterID).Order("total_value DESC").Find(&damageSkillStats)
	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": result.Error.Error()})
		return
	}

	// Get heal skill stats
	var healSkillStats []models.HealSkillStat
	result = db.Where("encounter_id = ?", encounterID).Order("total_value DESC").Find(&healSkillStats)
	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": result.Error.Error()})
		return
	}

	// Aggregate by skill
	skillSummary := make(map[int64]gin.H)

	for _, stat := range damageSkillStats {
		skillID := stat.SkillID
		if existing, ok := skillSummary[skillID]; ok {
			totalDamage := existing["totalDamage"].(int64) + stat.TotalValue
			damageHits := existing["damageHits"].(int64) + stat.Hits
			skillSummary[skillID] = gin.H{
				"skillId":      skillID,
				"totalDamage":  totalDamage,
				"damageHits":   damageHits,
				"totalHealing": existing["totalHealing"].(int64),
				"healingHits":  existing["healingHits"].(int64),
			}
		} else {
			skillSummary[skillID] = gin.H{
				"skillId":      skillID,
				"totalDamage":  stat.TotalValue,
				"damageHits":   stat.Hits,
				"totalHealing": int64(0),
				"healingHits":  int64(0),
			}
		}
	}

	for _, stat := range healSkillStats {
		skillID := stat.SkillID
		if existing, ok := skillSummary[skillID]; ok {
			totalHealing := existing["totalHealing"].(int64) + stat.TotalValue
			healingHits := existing["healingHits"].(int64) + stat.Hits
			skillSummary[skillID] = gin.H{
				"skillId":      skillID,
				"totalDamage":  existing["totalDamage"].(int64),
				"damageHits":   existing["damageHits"].(int64),
				"totalHealing": totalHealing,
				"healingHits":  healingHits,
			}
		} else {
			skillSummary[skillID] = gin.H{
				"skillId":      skillID,
				"totalDamage":  int64(0),
				"damageHits":   int64(0),
				"totalHealing": stat.TotalValue,
				"healingHits":  stat.Hits,
			}
		}
	}

	// Convert map to slice
	skillStats := make([]gin.H, 0, len(skillSummary))
	for _, summary := range skillSummary {
		skillStats = append(skillStats, summary)
	}

	c.JSON(http.StatusOK, gin.H{
		"skillStats":       skillStats,
		"damageSkillStats": damageSkillStats,
		"healSkillStats":   healSkillStats,
	})
}

// GetReportStats retrieves statistics for a specific report
func GetReportStats(c *gin.Context) {
	reportID := c.Param("reportId")

	// This is a placeholder implementation since the current schema doesn't have
	// a direct link between reports and encounters. In a real implementation,
	// you would need to:
	// 1. Find the report in the store
	// 2. Get associated encounters based on the report
	// 3. Aggregate statistics from those encounters

	// For now, return a placeholder response
	c.JSON(http.StatusOK, gin.H{
		"reportId": reportID,
		"message":  "Report statistics endpoint not yet fully implemented - requires report-encounter association",
		"encounters": gin.H{
			"count": 0,
		},
	})
}

// Helper function to avoid division by zero
func max(a, b int64) int64 {
	if a > b {
		return a
	}
	return b
}

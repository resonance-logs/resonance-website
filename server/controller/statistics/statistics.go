package statistics

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"fmt"
	"server/models"
	"strconv"
	"strings"
)

// OverviewResponse represents aggregate statistics over all encounters.
type OverviewResponse struct {
	TotalDamage   int64   `json:"total_damage"`
	TotalDuration float64 `json:"total_duration"`
	TotalHealing  int64   `json:"total_healing"`
	Encounters    int64   `json:"encounters"`
}

// GetOverview computes totals across encounters: damage, duration, healing, and row count.
func GetOverview(c *gin.Context) {
	dbAny, ok := c.Get("db")
	if !ok {
		// Degraded mode: return zeroed totals when DB is unavailable
		c.JSON(http.StatusOK, OverviewResponse{TotalDamage: 0, TotalDuration: 0, TotalHealing: 0, Encounters: 0})
		return
	}
	db, ok := dbAny.(*gorm.DB)
	if !ok {
		c.JSON(http.StatusOK, OverviewResponse{TotalDamage: 0, TotalDuration: 0, TotalHealing: 0, Encounters: 0})
		return
	}

	var totals struct {
		TotalDmg      int64   `gorm:"column:total_dmg"`
		TotalDuration float64 `gorm:"column:total_duration"`
		TotalHeal     int64   `gorm:"column:total_heal"`
		Count         int64   `gorm:"column:encounter_count"`
	}

	if err := db.Model(&models.Encounter{}).
		Select("COALESCE(SUM(total_dmg),0) AS total_dmg, COALESCE(SUM(duration),0) AS total_duration, COALESCE(SUM(total_heal),0) AS total_heal, COUNT(*) AS encounter_count").
		Scan(&totals).Error; err != nil {
		// On query failure, respond with zeros to avoid breaking landing page
		c.JSON(http.StatusOK, OverviewResponse{TotalDamage: 0, TotalDuration: 0, TotalHealing: 0, Encounters: 0})
		return
	}

	resp := OverviewResponse{
		TotalDamage:   totals.TotalDmg,
		TotalDuration: totals.TotalDuration,
		TotalHealing:  totals.TotalHeal,
		Encounters:    totals.Count,
	}
	c.JSON(http.StatusOK, resp)
}

// ClassStatsResponse contains aggregated statistics per class spec
type ClassStatsResponse struct {
	ClassSpec int64   `json:"class_spec"`
	Count     int64   `json:"count"`
	AvgDPS    float64 `json:"avg_dps"`
	DpsQ1     float64 `json:"dps_q1"`
	DpsMedian float64 `json:"dps_median"`
	DpsQ3     float64 `json:"dps_q3"`
	DpsMin    float64 `json:"dps_min"`
	DpsMax    float64 `json:"dps_max"`

	AvgHPS    float64   `json:"avg_hps"`
	HpsQ1     float64   `json:"hps_q1"`
	HpsMedian float64   `json:"hps_median"`
	HpsQ3     float64   `json:"hps_q3"`
	HpsMin    float64   `json:"hps_min"`
	HpsMax    float64   `json:"hps_max"`
	Outliers  []Outlier `json:"outliers"`
}

// Outlier represents a single outlier point for a class
type Outlier struct {
	Type        string  `json:"type"` // "dps" or "hps"
	EncounterID int64   `json:"encounterId"`
	Value       float64 `json:"value"`
}

// GetClassStats aggregates DPS/HPS distributions per class_spec with optional filters.
// Query params:
//   - since_days: int (include encounters started within last N days)
//   - min_duration: float seconds (minimum encounter duration)
//   - max_duration: float seconds (maximum encounter duration)
//   - scene_name: string (filter encounters by scene_name)
//   - min_ability_score: int (minimum ability score)
//   - max_ability_score: int (maximum ability score)
func GetClassStats(c *gin.Context) {
	dbAny, ok := c.Get("db")
	if !ok {
		c.JSON(http.StatusOK, gin.H{"classes": []ClassStatsResponse{}})
		return
	}
	db, ok := dbAny.(*gorm.DB)
	if !ok {
		c.JSON(http.StatusOK, gin.H{"classes": []ClassStatsResponse{}})
		return
	}

	// Parse filters
	sinceDaysStr := c.Query("since_days")
	minDurStr := c.Query("min_duration")
	maxDurStr := c.Query("max_duration")
	sceneName := c.Query("scene_name")
	minAbilityScoreStr := c.Query("min_ability_score")
	maxAbilityScoreStr := c.Query("max_ability_score")

	where := "WHERE a.is_player = true"
	var args []interface{}

	if sinceDaysStr != "" {
		if days, err := strconv.Atoi(sinceDaysStr); err == nil && days > 0 {
			// embed literal days into interval; safe due to Atoi and positive check
			where += fmt.Sprintf(" AND e.started_at >= NOW() - INTERVAL '%d days'", days)
		}
	}
	if minDurStr != "" {
		if v, err := strconv.ParseFloat(minDurStr, 64); err == nil {
			where += " AND e.duration >= ?"
			args = append(args, v)
		}
	}
	if maxDurStr != "" {
		if v, err := strconv.ParseFloat(maxDurStr, 64); err == nil {
			where += " AND e.duration <= ?"
			args = append(args, v)
		}
	}
	if sceneName != "" {
		where += " AND e.scene_name = ?"
		args = append(args, sceneName)
	}
	if minAbilityScoreStr != "" {
		if v, err := strconv.ParseInt(minAbilityScoreStr, 10, 64); err == nil {
			where += " AND a.ability_score >= ?"
			args = append(args, v)
		}
	}
	if maxAbilityScoreStr != "" {
		if v, err := strconv.ParseInt(maxAbilityScoreStr, 10, 64); err == nil {
			where += " AND a.ability_score <= ?"
			args = append(args, v)
		}
	}

	// Build query. COALESCE used to avoid nulls in results.
	query := fmt.Sprintf(`
		SELECT COALESCE(a.class_spec, -1) AS class_spec,
			   COUNT(*) AS cnt,
			   COALESCE(AVG(a.dps), 0) AS avg_dps,
			   COALESCE(percentile_cont(0.25) WITHIN GROUP (ORDER BY a.dps), 0) AS dps_q1,
			   COALESCE(percentile_cont(0.5)  WITHIN GROUP (ORDER BY a.dps), 0) AS dps_median,
			   COALESCE(percentile_cont(0.75) WITHIN GROUP (ORDER BY a.dps), 0) AS dps_q3,
			   COALESCE(MIN(a.dps), 0) AS dps_min,
			   COALESCE(MAX(a.dps), 0) AS dps_max,
			   COALESCE(AVG(CASE WHEN a.duration > 0 THEN a.heal_dealt::double precision / NULLIF(a.duration,0) ELSE 0 END), 0) AS avg_hps,
			   COALESCE(percentile_cont(0.25) WITHIN GROUP (ORDER BY (CASE WHEN a.duration > 0 THEN a.heal_dealt::double precision / NULLIF(a.duration,0) ELSE 0 END)), 0) AS hps_q1,
			   COALESCE(percentile_cont(0.5)  WITHIN GROUP (ORDER BY (CASE WHEN a.duration > 0 THEN a.heal_dealt::double precision / NULLIF(a.duration,0) ELSE 0 END)), 0) AS hps_median,
			   COALESCE(percentile_cont(0.75) WITHIN GROUP (ORDER BY (CASE WHEN a.duration > 0 THEN a.heal_dealt::double precision / NULLIF(a.duration,0) ELSE 0 END)), 0) AS hps_q3,
			   COALESCE(MIN(CASE WHEN a.duration > 0 THEN a.heal_dealt::double precision / NULLIF(a.duration,0) ELSE 0 END), 0) AS hps_min,
			   COALESCE(MAX(CASE WHEN a.duration > 0 THEN a.heal_dealt::double precision / NULLIF(a.duration,0) ELSE 0 END), 0) AS hps_max
		FROM actor_encounter_stats a
		JOIN encounters e ON e.id = a.encounter_id
		%s
		GROUP BY COALESCE(a.class_spec, -1)
		ORDER BY cnt DESC
	`, where)

	type row struct {
		ClassSpec int64   `gorm:"column:class_spec" json:"class_spec"`
		Count     int64   `gorm:"column:cnt" json:"count"`
		AvgDPS    float64 `gorm:"column:avg_dps" json:"avg_dps"`
		DpsQ1     float64 `gorm:"column:dps_q1" json:"dps_q1"`
		DpsMedian float64 `gorm:"column:dps_median" json:"dps_median"`
		DpsQ3     float64 `gorm:"column:dps_q3" json:"dps_q3"`
		DpsMin    float64 `gorm:"column:dps_min" json:"dps_min"`
		DpsMax    float64 `gorm:"column:dps_max" json:"dps_max"`
		AvgHPS    float64 `gorm:"column:avg_hps" json:"avg_hps"`
		HpsQ1     float64 `gorm:"column:hps_q1" json:"hps_q1"`
		HpsMedian float64 `gorm:"column:hps_median" json:"hps_median"`
		HpsQ3     float64 `gorm:"column:hps_q3" json:"hps_q3"`
		HpsMin    float64 `gorm:"column:hps_min" json:"hps_min"`
		HpsMax    float64 `gorm:"column:hps_max" json:"hps_max"`
	}

	var rows []row
	if err := db.Raw(query, args...).Scan(&rows).Error; err != nil {
		// Return an empty set on failure so UI can handle gracefully
		c.JSON(http.StatusOK, gin.H{"classes": []ClassStatsResponse{}})
		return
	}

	// Map to response type
	out := make([]ClassStatsResponse, 0, len(rows))
	for _, r := range rows {
		out = append(out, ClassStatsResponse{
			ClassSpec: r.ClassSpec,
			Count:     r.Count,
			AvgDPS:    r.AvgDPS,
			DpsQ1:     r.DpsQ1,
			DpsMedian: r.DpsMedian,
			DpsQ3:     r.DpsQ3,
			DpsMin:    r.DpsMin,
			DpsMax:    r.DpsMax,
			AvgHPS:    r.AvgHPS,
			HpsQ1:     r.HpsQ1,
			HpsMedian: r.HpsMedian,
			HpsQ3:     r.HpsQ3,
			HpsMin:    r.HpsMin,
			HpsMax:    r.HpsMax,
		})
	}

	// Build per-class thresholds and collect actor rows in a single query.
	// Collect class specs
	classSpecs := make([]int64, 0, len(rows))
	thresholds := make(map[int64]struct {
		dpsLow, dpsHigh, hpsLow, hpsHigh float64
	})
	for _, r := range rows {
		classSpecs = append(classSpecs, r.ClassSpec)
		dpsIQR := r.DpsQ3 - r.DpsQ1
		hpsIQR := r.HpsQ3 - r.HpsQ1
		thresholds[r.ClassSpec] = struct {
			dpsLow, dpsHigh, hpsLow, hpsHigh float64
		}{
			dpsLow:  r.DpsQ1 - 1.5*dpsIQR,
			dpsHigh: r.DpsQ3 + 1.5*dpsIQR,
			hpsLow:  r.HpsQ1 - 1.5*hpsIQR,
			hpsHigh: r.HpsQ3 + 1.5*hpsIQR,
		}
	}

	// initialize Outliers slice on each class response
	classMap := make(map[int64]*ClassStatsResponse, len(out))
	for i := range out {
		out[i].Outliers = []Outlier{}
		classMap[out[i].ClassSpec] = &out[i]
	}

	if len(classSpecs) > 0 {
		// build IN clause placeholders
		placeholders := make([]string, len(classSpecs))
		for i := range classSpecs {
			placeholders[i] = "?"
		}
		inClause := strings.Join(placeholders, ",")

		actorQuery := fmt.Sprintf(`
			SELECT a.encounter_id, COALESCE(a.class_spec, -1) AS class_spec,
				   a.dps AS dps,
				   (CASE WHEN a.duration > 0 THEN a.heal_dealt::double precision / NULLIF(a.duration,0) ELSE 0 END) AS hps
			FROM actor_encounter_stats a
			JOIN encounters e ON e.id = a.encounter_id
			%s AND COALESCE(a.class_spec, -1) IN (%s)
		`, where, inClause)

		// combine args + classSpecs values
		actorArgs := make([]interface{}, 0, len(args)+len(classSpecs))
		actorArgs = append(actorArgs, args...)
		for _, cs := range classSpecs {
			actorArgs = append(actorArgs, cs)
		}

		type actorRow struct {
			EncounterID int64   `gorm:"column:encounter_id"`
			ClassSpec   int64   `gorm:"column:class_spec"`
			Dps         float64 `gorm:"column:dps"`
			Hps         float64 `gorm:"column:hps"`
		}

		var actorRows []actorRow
		if err := db.Raw(actorQuery, actorArgs...).Scan(&actorRows).Error; err == nil {
			for _, ar := range actorRows {
				thr, ok := thresholds[ar.ClassSpec]
				if !ok {
					continue
				}
				// check dps
				if ar.Dps < thr.dpsLow || ar.Dps > thr.dpsHigh {
					if cls, ok := classMap[ar.ClassSpec]; ok {
						cls.Outliers = append(cls.Outliers, Outlier{Type: "dps", EncounterID: ar.EncounterID, Value: ar.Dps})
					}
				}
				// check hps
				if ar.Hps < thr.hpsLow || ar.Hps > thr.hpsHigh {
					if cls, ok := classMap[ar.ClassSpec]; ok {
						cls.Outliers = append(cls.Outliers, Outlier{Type: "hps", EncounterID: ar.EncounterID, Value: ar.Hps})
					}
				}
			}
		}
	}

	c.JSON(http.StatusOK, gin.H{"classes": out})
}

// GetTotals returns overall player totals and simple breakdowns.
// Response JSON shape:
//
//	{
//	  "totalPlayers": int,
//	  "classSpec": { "<spec>": <count>, ... },
//	  "classId": { "<classId>": <count>, ... },
//	  "abilityScore": { "<bracket>": <count>, ... }
//	}
func GetTotals(c *gin.Context) {
	dbAny, ok := c.Get("db")
	if !ok {
		c.JSON(http.StatusOK, gin.H{
			"totalPlayers": 0,
			"classSpec":    map[string]int64{},
			"classId":      map[string]int64{},
			"abilityScore": map[string]int64{},
		})
		return
	}
	db, ok := dbAny.(*gorm.DB)
	if !ok {
		c.JSON(http.StatusOK, gin.H{
			"totalPlayers": 0,
			"classSpec":    map[string]int64{},
			"classId":      map[string]int64{},
			"abilityScore": map[string]int64{},
		})
		return
	}

	// We pick the most recent row per actor_id by created_at using DISTINCT ON.
	// Only consider players (is_player = true) and ensure we join with encounters
	// (joining here keeps the option to filter by encounter fields later).

	// Total players
	var total struct {
		Total int64 `gorm:"column:total"`
	}
	totQ := `
		SELECT COUNT(*) AS total FROM (
			SELECT DISTINCT ON (a.actor_id) a.actor_id
			FROM actor_encounter_stats a
			JOIN encounters e ON e.id = a.encounter_id
			WHERE a.is_player = true
			ORDER BY a.actor_id, a.id DESC
		) t
	`
	if err := db.Raw(totQ).Scan(&total).Error; err != nil {
		c.JSON(http.StatusOK, gin.H{"error": "failed to compute totals"})
		return
	}

	// class_spec counts
	type kv struct {
		Key int64 `gorm:"column:key"`
		Val int64 `gorm:"column:val"`
	}
	var specRows []kv
	specQ := `
		SELECT class_spec AS key, COUNT(*) AS val FROM (
			SELECT DISTINCT ON (a.actor_id) COALESCE(a.class_spec, -1) AS class_spec
			FROM actor_encounter_stats a
			JOIN encounters e ON e.id = a.encounter_id
			WHERE a.is_player = true
			ORDER BY a.actor_id, a.id DESC
		) t
		GROUP BY class_spec
	`
	if err := db.Raw(specQ).Scan(&specRows).Error; err != nil {
		c.JSON(http.StatusOK, gin.H{"error": "failed to compute class_spec breakdown"})
		return
	}

	// class_id counts
	var classRows []kv
	classQ := `
		SELECT class_id AS key, COUNT(*) AS val FROM (
			SELECT DISTINCT ON (a.actor_id) COALESCE(a.class_id, -1) AS class_id
			FROM actor_encounter_stats a
			JOIN encounters e ON e.id = a.encounter_id
			WHERE a.is_player = true
			ORDER BY a.actor_id, a.id DESC
		) t
		GROUP BY class_id
	`
	if err := db.Raw(classQ).Scan(&classRows).Error; err != nil {
		c.JSON(http.StatusOK, gin.H{"error": "failed to compute class_id breakdown"})
		return
	}

	// ability score brackets (range size = 1000). bracket = floor(ability_score/1000)*1000
	var abilityRows []kv
	abilityQ := `
		SELECT (FLOOR(COALESCE(ability_score,0)::double precision / 1000) * 1000)::bigint AS key, COUNT(*) AS val FROM (
			SELECT DISTINCT ON (a.actor_id) COALESCE(a.ability_score, 0) AS ability_score
			FROM actor_encounter_stats a
			JOIN encounters e ON e.id = a.encounter_id
			WHERE a.is_player = true
			ORDER BY a.actor_id, a.id DESC
		) t
		GROUP BY key
		ORDER BY key
	`
	if err := db.Raw(abilityQ).Scan(&abilityRows).Error; err != nil {
		c.JSON(http.StatusOK, gin.H{"error": "failed to compute ability_score breakdown"})
		return
	}

	// Convert rows into maps with string keys (JSON object keys must be strings)
	specMap := make(map[string]int64, len(specRows))
	for _, r := range specRows {
		specMap[strconv.FormatInt(r.Key, 10)] = r.Val
	}
	classMap := make(map[string]int64, len(classRows))
	for _, r := range classRows {
		classMap[strconv.FormatInt(r.Key, 10)] = r.Val
	}
	abilityMap := make(map[string]int64, len(abilityRows))
	for _, r := range abilityRows {
		abilityMap[strconv.FormatInt(r.Key, 10)] = r.Val
	}

	resp := gin.H{
		"totalPlayers": total.Total,
		"classSpec":    specMap,
		"classId":      classMap,
		"abilityScore": abilityMap,
	}
	c.JSON(http.StatusOK, resp)
}

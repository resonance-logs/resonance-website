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

// TotalsResponse is the shape returned by GET /statistics/total
type TotalsResponse struct {
	TotalPlayers   int64                    `json:"total_players"`
	ByClassID      []map[string]interface{} `json:"by_class_id"`
	ByClassSpec    []map[string]interface{} `json:"by_class_spec"`
	GearBrackets   []map[string]interface{} `json:"gear_brackets"`
}

// GetTotals returns overall player/character totals.
// It groups actor rows by player id (extracted from attributes when present, otherwise falls back to encounter.local_player_id),
// picks the most recent row per player, and then computes:
//  - total number of distinct players
//  - number of character ids per class_id
//  - number of character ids per class_spec
//  - number of characters per gear score bracket (by 100)
func GetTotals(c *gin.Context) {
	dbAny, ok := c.Get("db")
	if !ok {
		c.JSON(http.StatusOK, TotalsResponse{})
		return
	}
	db, ok := dbAny.(*gorm.DB)
	if !ok {
		c.JSON(http.StatusOK, TotalsResponse{})
		return
	}

	// Build a subquery that selects the most recent actor row per player_id.
	// Try to extract player id from attributes JSON with several likely keys, otherwise fall back to encounters.local_player_id.
	distinctLatest := `
	SELECT DISTINCT ON (COALESCE((a.attributes->>'player_id')::bigint, (a.attributes->>'playerUid')::bigint, (a.attributes->>'player_uid')::bigint, e.local_player_id))
		COALESCE((a.attributes->>'player_id')::bigint, (a.attributes->>'playerUid')::bigint, (a.attributes->>'player_uid')::bigint, e.local_player_id) AS player_id,
		a.actor_id AS character_id,
		COALESCE(a.class_id, -1) AS class_id,
		COALESCE(a.class_spec, -1) AS class_spec,
		COALESCE((a.attributes->>'gear_score')::int, (a.attributes->>'gear_tier')::int, (a.attributes->>'gearTier')::int, 0) AS gear_score,
		e.started_at
	FROM actor_encounter_stats a
	JOIN encounters e ON e.id = a.encounter_id
	WHERE a.is_player = true
	ORDER BY COALESCE((a.attributes->>'player_id')::bigint, (a.attributes->>'playerUid')::bigint, (a.attributes->>'player_uid')::bigint, e.local_player_id), e.started_at DESC, e.id DESC
	`

	// Total distinct players (count of rows in the distinctLatest result)
	var totalPlayers int64
	totalQuery := fmt.Sprintf(`SELECT COUNT(*) FROM (%s) t`, distinctLatest)
	if err := db.Raw(totalQuery).Scan(&totalPlayers).Error; err != nil {
		c.JSON(http.StatusOK, TotalsResponse{})
		return
	}

	// By class_id
	type pairRow struct {
		Key   int64 `gorm:"column:key" json:"key"`
		Count int64 `gorm:"column:cnt" json:"count"`
	}

	var byClass []pairRow
	classQuery := fmt.Sprintf(`SELECT class_id AS key, COUNT(DISTINCT character_id) AS cnt FROM (%s) t GROUP BY class_id ORDER BY cnt DESC`, distinctLatest)
	if err := db.Raw(classQuery).Scan(&byClass).Error; err != nil {
		c.JSON(http.StatusOK, TotalsResponse{})
		return
	}

	var byClassSpec []pairRow
	specQuery := fmt.Sprintf(`SELECT class_spec AS key, COUNT(DISTINCT character_id) AS cnt FROM (%s) t GROUP BY class_spec ORDER BY cnt DESC`, distinctLatest)
	if err := db.Raw(specQuery).Scan(&byClassSpec).Error; err != nil {
		c.JSON(http.StatusOK, TotalsResponse{})
		return
	}

	// Gear brackets by 100. Negative or zero gear_score will be clamped to 0 bracket.
	var gearRows []struct {
		Bracket int64 `gorm:"column:bracket" json:"bracket"`
		Count   int64 `gorm:"column:cnt" json:"count"`
	}
	gearQuery := fmt.Sprintf(`
		SELECT (FLOOR(GREATEST(0, COALESCE(gear_score,0)) / 100) * 100)::bigint AS bracket,
			   COUNT(DISTINCT character_id) AS cnt
		FROM (%s) t
		GROUP BY bracket
		ORDER BY bracket ASC
	`, distinctLatest)
	if err := db.Raw(gearQuery).Scan(&gearRows).Error; err != nil {
		c.JSON(http.StatusOK, TotalsResponse{})
		return
	}

	// Map to generic JSON-able slices
	byClassOut := make([]map[string]interface{}, 0, len(byClass))
	for _, r := range byClass {
		byClassOut = append(byClassOut, map[string]interface{}{"class_id": r.Key, "count": r.Count})
	}

	bySpecOut := make([]map[string]interface{}, 0, len(byClassSpec))
	for _, r := range byClassSpec {
		bySpecOut = append(bySpecOut, map[string]interface{}{"class_spec": r.Key, "count": r.Count})
	}

	gearOut := make([]map[string]interface{}, 0, len(gearRows))
	for _, g := range gearRows {
		gearOut = append(gearOut, map[string]interface{}{"bracket": g.Bracket, "count": g.Count})
	}

	resp := TotalsResponse{
		TotalPlayers: totalPlayers,
		ByClassID:    byClassOut,
		ByClassSpec:  bySpecOut,
		GearBrackets: gearOut,
	}
	c.JSON(http.StatusOK, resp)
}

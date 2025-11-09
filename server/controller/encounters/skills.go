package encounters

import (
	"encoding/json"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"sync"

	"server/controller/reports"
	"server/models"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

var skillNameOnce sync.Once
var skillNames map[string]string

func loadSkillNames() {
	skillNames = map[string]string{}
	// Attempt to load from data directory (can be adjusted later)
	p := filepath.Join("server", "data", "SkillName.json")
	b, err := os.ReadFile(p)
	if err != nil {
		return
	}
	var raw map[string]string
	if err := json.Unmarshal(b, &raw); err != nil {
		return
	}
	skillNames = raw
}

func getSkillName(id int64) string {
	skillNameOnce.Do(loadSkillNames)
	if n, ok := skillNames[strconv.FormatInt(id, 10)]; ok {
		return n
	}
	return strconv.FormatInt(id, 10)
}

type SkillAggregateResponse struct {
	SkillID         int64          `json:"skillId"`
	Name            string         `json:"name"`
	TotalValue      int64          `json:"totalValue"`
	Hits            int64          `json:"hits"`
	CritHits        int64          `json:"critHits"`
	LuckyHits       int64          `json:"luckyHits"`
	CritTotal       int64          `json:"critTotal"`
	LuckyTotal      int64          `json:"luckyTotal"`
	HpLossTotal     int64          `json:"hpLossTotal"`
	ShieldLossTotal int64          `json:"shieldLossTotal"`
	PerTarget       []PerTargetRow `json:"perTarget"`
}

type PerTargetRow struct {
	TargetID *int64 `json:"targetId,omitempty"`
	Total    int64  `json:"total"`
}

// GET /api/v1/encounter/:id/skill/:skillId?attackerId=&type=dps|heal
func GetEncounterSkill(c *gin.Context) {
	dbAny, ok := c.Get("db")
	if !ok {
		c.JSON(http.StatusInternalServerError, reports.NewErrorResponse(http.StatusInternalServerError, "Database not available in context"))
		return
	}
	db := dbAny.(*gorm.DB)

	encID := c.Param("id")
	skillID := c.Param("skillId")
	attackerID := c.Query("attackerId")
	typ := c.DefaultQuery("type", "dps") // dps or heal

	// Validate encounter exists
	var enc models.Encounter
	if err := db.Select("id").Where("id = ?", encID).First(&enc).Error; err != nil {
		c.JSON(http.StatusNotFound, reports.NewErrorResponse(http.StatusNotFound, "Encounter not found"))
		return
	}

	sid, _ := strconv.ParseInt(skillID, 10, 64)
	name := getSkillName(sid)

	resp := SkillAggregateResponse{SkillID: sid, Name: name}

	if typ == "heal" {
		var rows []models.HealSkillStat
		q := db.Where("encounter_id = ? AND skill_id = ?", enc.ID, sid)
		if attackerID != "" {
			q = q.Where("healer_id = ?", attackerID)
		}
		if err := q.Find(&rows).Error; err != nil {
			c.JSON(http.StatusInternalServerError, reports.NewErrorResponse(http.StatusInternalServerError, "Failed to query heal skill stats", err.Error()))
			return
		}
		// Aggregate
		targetTotals := map[int64]int64{}
		for _, r := range rows {
			resp.TotalValue += r.TotalValue
			resp.Hits += r.Hits
			resp.CritHits += r.CritHits
			resp.LuckyHits += r.LuckyHits
			resp.CritTotal += r.CritTotal
			resp.LuckyTotal += r.LuckyTotal
			if r.TargetID != nil {
				targetTotals[*r.TargetID] += r.TotalValue
			}
		}
		for tid, tot := range targetTotals {
			t := tid
			resp.PerTarget = append(resp.PerTarget, PerTargetRow{TargetID: &t, Total: tot})
		}
	} else { // damage
		var rows []models.DamageSkillStat
		q := db.Where("encounter_id = ? AND skill_id = ?", enc.ID, sid)
		if attackerID != "" {
			q = q.Where("attacker_id = ?", attackerID)
		}
		if err := q.Find(&rows).Error; err != nil {
			c.JSON(http.StatusInternalServerError, reports.NewErrorResponse(http.StatusInternalServerError, "Failed to query damage skill stats", err.Error()))
			return
		}
		targetTotals := map[int64]int64{}
		for _, r := range rows {
			resp.TotalValue += r.TotalValue
			resp.Hits += r.Hits
			resp.CritHits += r.CritHits
			resp.LuckyHits += r.LuckyHits
			resp.CritTotal += r.CritTotal
			resp.LuckyTotal += r.LuckyTotal
			resp.HpLossTotal += r.HpLossTotal
			resp.ShieldLossTotal += r.ShieldLossTotal
			if r.DefenderID != nil {
				targetTotals[*r.DefenderID] += r.TotalValue
			}
		}
		for tid, tot := range targetTotals {
			t := tid
			resp.PerTarget = append(resp.PerTarget, PerTargetRow{TargetID: &t, Total: tot})
		}
	}

	c.JSON(http.StatusOK, resp)
}

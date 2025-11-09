package encounters

import (
    "net/http"
    "strconv"
    "strings"
    "time"

    "server/controller/reports"
    "server/models"

    "github.com/gin-gonic/gin"
    "gorm.io/gorm"
)

type EncounterListRow struct {
    ID          int64              `json:"id"`
    StartedAtMs int64              `json:"startedAtMs"`
    EndedAtMs   *int64             `json:"endedAtMs,omitempty"`
    SceneID     *int64             `json:"sceneId,omitempty"`
    SceneName   *string            `json:"sceneName,omitempty"`
    DurationMs  int64              `json:"durationMs"`
    TotalDmg    int64              `json:"totalDmg"`
    TotalHeal   int64              `json:"totalHeal"`
    Team        string             `json:"team"`
    TeamAvgAS   *int64             `json:"teamAvgAbilityScore,omitempty"`
    TeamDps     float64            `json:"teamDps"`
    Bosses      []models.EncounterBoss `json:"bosses"`
    Players     []EncounterPlayer  `json:"players"`
}

type EncounterPlayer struct {
    ActorID     int64   `json:"actorId"`
    Name        *string `json:"name,omitempty"`
    ClassID     *int64  `json:"classId,omitempty"`
    ClassSpec   *int64  `json:"classSpec,omitempty"`
    DamageDealt int64   `json:"damageDealt"`
    HealDealt   int64   `json:"healDealt"`
    DamageTaken int64   `json:"damageTaken"`
    AbilityScore *int64 `json:"abilityScore,omitempty"`
    IsPlayer    bool    `json:"isPlayer"`
}

type EncounterListResponse struct {
    Rows       []EncounterListRow `json:"rows"`
    TotalCount int64              `json:"totalCount"`
}

// GET /api/v1/encounter
func GetEncounters(c *gin.Context) {
    dbAny, ok := c.Get("db")
    if !ok {
        c.JSON(http.StatusInternalServerError, reports.NewErrorResponse(http.StatusInternalServerError, "Database not available in context"))
        return
    }
    db := dbAny.(*gorm.DB)

    // Params
    limit := 30
    if v := c.Query("limit"); v != "" {
        if n, err := strconv.Atoi(v); err == nil && n > 0 && n <= 200 {
            limit = n
        }
    }
    offset := 0
    if v := c.Query("offset"); v != "" {
        if n, err := strconv.Atoi(v); err == nil && n >= 0 {
            offset = n
        }
    }
    orderBy := strings.ToLower(c.DefaultQuery("orderBy", "duration"))
    sortDir := strings.ToLower(c.DefaultQuery("sort", "asc"))
    if sortDir != "asc" && sortDir != "desc" {
        sortDir = "asc"
    }

    // Build filter base
    base := db.Model(&models.Encounter{})
    if userID := c.Query("user_id"); userID != "" {
        base = base.Where("user_id = ?", userID)
    }
    if sceneID := c.Query("scene_id"); sceneID != "" {
        base = base.Where("scene_id = ?", sceneID)
    }
    if sceneName := c.Query("scene_name"); sceneName != "" {
        base = base.Where("LOWER(scene_name) = LOWER(?)", sceneName)
    }
    if monsterName := c.Query("monster_name"); monsterName != "" {
        base = base.Where("EXISTS (SELECT 1 FROM encounter_bosses b WHERE b.encounter_id = encounters.id AND LOWER(b.monster_name) = LOWER(?))", monsterName)
    }
    if classID := c.Query("class_id"); classID != "" {
        base = base.Where("EXISTS (SELECT 1 FROM actor_encounter_stats s WHERE s.encounter_id = encounters.id AND s.class_id = ?)", classID)
    }
    if classSpec := c.Query("class_spec"); classSpec != "" {
        base = base.Where("EXISTS (SELECT 1 FROM actor_encounter_stats s WHERE s.encounter_id = encounters.id AND s.class_spec = ?)", classSpec)
    }
    if playerName := c.Query("player_name"); playerName != "" {
        like := "%" + playerName + "%"
        base = base.Where("EXISTS (SELECT 1 FROM actor_encounter_stats s WHERE s.encounter_id = encounters.id AND LOWER(s.name) LIKE LOWER(?))", like)
    }

    // Count before pagination
    var total int64
    if err := base.Count(&total).Error; err != nil {
        c.JSON(http.StatusInternalServerError, reports.NewErrorResponse(http.StatusInternalServerError, "Failed to count encounters", err.Error()))
        return
    }

    // Order expression
    var orderExpr string
    switch orderBy {
    case "dps":
        orderExpr = "CASE WHEN EXTRACT(EPOCH FROM (COALESCE(ended_at, NOW()) - started_at)) > 0 THEN total_dmg / EXTRACT(EPOCH FROM (COALESCE(ended_at, NOW()) - started_at)) ELSE 0 END " + sortDir
    case "date", "startedat":
        orderExpr = "started_at " + sortDir
    default: // duration
        orderExpr = "EXTRACT(EPOCH FROM (COALESCE(ended_at, NOW()) - started_at)) " + sortDir
    }

    var encs []models.Encounter
    if err := base.Order(orderExpr).Limit(limit).Offset(offset).Find(&encs).Error; err != nil {
        c.JSON(http.StatusInternalServerError, reports.NewErrorResponse(http.StatusInternalServerError, "Failed to query encounters", err.Error()))
        return
    }

    // Related data
    ids := make([]int64, 0, len(encs))
    for _, e := range encs { ids = append(ids, e.ID) }
    var bosses []models.EncounterBoss
    if len(ids) > 0 {
        _ = db.Where("encounter_id IN ?", ids).Find(&bosses).Error
    }
    var stats []models.ActorEncounterStat
    if len(ids) > 0 {
        _ = db.Where("encounter_id IN ?", ids).Find(&stats).Error
    }
    bossesBy := map[int64][]models.EncounterBoss{}
    for _, b := range bosses { bossesBy[b.EncounterID] = append(bossesBy[b.EncounterID], b) }
    statsBy := map[int64][]models.ActorEncounterStat{}
    for _, s := range stats { statsBy[s.EncounterID] = append(statsBy[s.EncounterID], s) }

    rows := make([]EncounterListRow, 0, len(encs))
    for _, e := range encs {
        startedAtMs := e.StartedAt.UnixMilli()
        var endedAtMs *int64
        var durationMs int64
        if e.EndedAt != nil {
            v := e.EndedAt.UnixMilli(); endedAtMs = &v; durationMs = v - startedAtMs
        } else { durationMs = time.Now().UnixMilli() - startedAtMs }
        durationSec := float64(durationMs) / 1000.0
        teamDps := 0.0
        if durationSec > 0 { teamDps = float64(e.TotalDmg) / durationSec }
        st := statsBy[e.ID]
        var sumAS, cntAS int64
        players := make([]EncounterPlayer, 0, len(st))
        for _, p := range st {
            players = append(players, EncounterPlayer{ActorID: p.ActorID, Name: p.Name, ClassID: p.ClassID, ClassSpec: p.ClassSpec, DamageDealt: p.DamageDealt, HealDealt: p.HealDealt, DamageTaken: p.DamageTaken, AbilityScore: p.AbilityScore, IsPlayer: p.IsPlayer})
            if p.AbilityScore != nil { sumAS += *p.AbilityScore; cntAS++ }
        }
        var avgAS *int64; if cntAS > 0 { v := sumAS / cntAS; avgAS = &v }
        team := "Unknown Team"
        var user models.User
        if err := db.Select("discord_username").Where("id = ?", e.UserID).First(&user).Error; err == nil && user.DiscordUsername != "" { team = user.DiscordUsername + "'s Team" }
        rows = append(rows, EncounterListRow{ID: e.ID, StartedAtMs: startedAtMs, EndedAtMs: endedAtMs, SceneID: e.SceneID, SceneName: e.SceneName, DurationMs: durationMs, TotalDmg: e.TotalDmg, TotalHeal: e.TotalHeal, Team: team, TeamAvgAS: avgAS, TeamDps: teamDps, Bosses: bossesBy[e.ID], Players: players})
    }

    c.JSON(http.StatusOK, EncounterListResponse{Rows: rows, TotalCount: total})
}

// GET /api/v1/encounter/:id
func GetEncounterByID(c *gin.Context) {
    dbAny, ok := c.Get("db")
    if !ok {
        c.JSON(http.StatusInternalServerError, reports.NewErrorResponse(http.StatusInternalServerError, "Database not available in context"))
        return
    }
    db := dbAny.(*gorm.DB)

    id := c.Param("id")

    var enc models.Encounter
    if err := db.Where("id = ?", id).First(&enc).Error; err != nil {
        c.JSON(http.StatusNotFound, reports.NewErrorResponse(http.StatusNotFound, "Encounter not found"))
        return
    }

    var bosses []models.EncounterBoss
    _ = db.Where("encounter_id = ?", enc.ID).Find(&bosses).Error

    var stats []models.ActorEncounterStat
    _ = db.Where("encounter_id = ?", enc.ID).Find(&stats).Error

    // Build response
    startedAtMs := enc.StartedAt.UnixMilli()
    var endedAtMs *int64
    var durationMs int64
    if enc.EndedAt != nil {
        v := enc.EndedAt.UnixMilli()
        endedAtMs = &v
        durationMs = v - startedAtMs
    } else {
        now := time.Now().UnixMilli()
        durationMs = now - startedAtMs
    }

    resp := gin.H{
        "id":           enc.ID,
        "startedAtMs":  startedAtMs,
        "endedAtMs":    endedAtMs,
        "sceneId":      enc.SceneID,
        "sceneName":    enc.SceneName,
        "durationMs":   durationMs,
        "totalDmg":     enc.TotalDmg,
        "totalHeal":    enc.TotalHeal,
        "bosses":       bosses,
        "actors":       stats,
    }
    c.JSON(http.StatusOK, resp)
}

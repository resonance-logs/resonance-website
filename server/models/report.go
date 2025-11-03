package models

// Appwrite-specific models for combat log data storage
// These models map to Appwrite collections and use JSON tags for SDK marshaling

// User represents a user account
type User struct {
	ID       string `json:"$id,omitempty"`
	Email    string `json:"email"`
	Username string `json:"username"`
	Name     string `json:"name,omitempty"`
	// Appwrite timestamps
	CreatedAt string `json:"$createdAt,omitempty"`
	UpdatedAt string `json:"$updatedAt,omitempty"`
}

// Character represents a unique in-game character/avatar
type Character struct {
	ID          string `json:"$id,omitempty"`
	CharacterID int64  `json:"characterId"` // In-game entity ID
	Name        string `json:"name"`
	ClassID     int    `json:"classId,omitempty"`
	ClassSpec   int    `json:"classSpec,omitempty"`
	Level       int    `json:"level,omitempty"`
	// Relationship to User
	UserID string `json:"userId,omitempty"`
	// Appwrite timestamps
	CreatedAt string `json:"$createdAt,omitempty"`
	UpdatedAt string `json:"$updatedAt,omitempty"`
}

// Report represents a combat log report (collection of fights/encounters)
type Report struct {
	ID        string `json:"$id,omitempty"`
	ReportID  string `json:"reportId"` // Unique identifier for the report
	Title     string `json:"title"`
	Owner     string `json:"owner"` // Username or user ID
	StartTime string `json:"startTime,omitempty"`
	EndTime   string `json:"endTime,omitempty"`
	// Relationship to User
	UserID string `json:"userId,omitempty"`
	// Metadata
	TotalDamage  int64 `json:"totalDamage,omitempty"`
	TotalHealing int64 `json:"totalHealing,omitempty"`
	FightCount   int   `json:"fightCount,omitempty"`
	// Appwrite timestamps
	CreatedAt string `json:"$createdAt,omitempty"`
	UpdatedAt string `json:"$updatedAt,omitempty"`
}

// Fight represents a single encounter/fight within a report
type Fight struct {
	ID       string `json:"$id,omitempty"`
	FightID  int    `json:"fightId"` // Sequential ID within the report
	Name     string `json:"name"`
	Duration int64  `json:"duration"` // Duration in milliseconds
	// Timestamps
	StartTime string `json:"startTime,omitempty"`
	EndTime   string `json:"endTime,omitempty"`
	// Flags
	IsBoss bool `json:"isBoss"`
	IsKill bool `json:"isKill"`
	// Relationship to Report
	ReportID string `json:"reportId"`
	// Aggregated statistics
	TotalDamage      int64  `json:"totalDamage,omitempty"`
	TotalHealing     int64  `json:"totalHealing,omitempty"`
	LocalPlayerID    int64  `json:"localPlayerId,omitempty"`
	LocalPlayerName  string `json:"localPlayerName,omitempty"`
	ParticipantCount int    `json:"participantCount,omitempty"`
	// Boss information
	BossName string `json:"bossName,omitempty"`
	// Appwrite timestamps
	CreatedAt string `json:"$createdAt,omitempty"`
	UpdatedAt string `json:"$updatedAt,omitempty"`
}

// Participant represents a player or NPC's performance in a specific fight
type Participant struct {
	ID        string `json:"$id,omitempty"`
	ActorID   int64  `json:"actorId"` // In-game entity ID
	Name      string `json:"name"`
	ClassID   int    `json:"classId,omitempty"`
	ClassSpec int    `json:"classSpec,omitempty"`
	Level     int    `json:"level,omitempty"`
	// Relationship to Fight
	FightID string `json:"fightId"`
	// Flags
	IsPlayer      bool `json:"isPlayer"`
	IsLocalPlayer bool `json:"isLocalPlayer"`
	// Core statistics - Damage
	DamageDealt     int64 `json:"damageDealt"`
	DamageTaken     int64 `json:"damageTaken"`
	HitsDealt       int64 `json:"hitsDealt"`
	HitsTaken       int64 `json:"hitsTaken"`
	CritHitsDealt   int64 `json:"critHitsDealt"`
	CritHitsTaken   int64 `json:"critHitsTaken"`
	CritTotalDealt  int64 `json:"critTotalDealt"`
	CritTotalTaken  int64 `json:"critTotalTaken"`
	LuckyHitsDealt  int64 `json:"luckyHitsDealt"`
	LuckyHitsTaken  int64 `json:"luckyHitsTaken"`
	LuckyTotalDealt int64 `json:"luckyTotalDealt"`
	LuckyTotalTaken int64 `json:"luckyTotalTaken"`
	// Core statistics - Healing
	HealingDealt   int64 `json:"healingDealt"`
	HitsHealed     int64 `json:"hitsHealed"`
	CritHitsHealed int64 `json:"critHitsHealed"`
	CritTotalHeal  int64 `json:"critTotalHeal"`
	LuckyHitsHeal  int64 `json:"luckyHitsHeal"`
	LuckyTotalHeal int64 `json:"luckyTotalHeal"`
	// Boss-specific statistics
	BossDamageDealt     int64 `json:"bossDamageDealt"`
	BossHitsDealt       int64 `json:"bossHitsDealt"`
	BossCritHitsDealt   int64 `json:"bossCritHitsDealt"`
	BossCritTotalDealt  int64 `json:"bossCritTotalDealt"`
	BossLuckyHitsDealt  int64 `json:"bossLuckyHitsDealt"`
	BossLuckyTotalDealt int64 `json:"bossLuckyTotalDealt"`
	// Skill breakdowns (aggregated statistics stored as JSON)
	DamageSkills map[string]SkillStat `json:"damageSkills,omitempty"`
	HealSkills   map[string]SkillStat `json:"healSkills,omitempty"`
	// Additional metadata
	AbilityScore int    `json:"abilityScore,omitempty"`
	Attributes   string `json:"attributes,omitempty"` // JSON string for flexible metadata
	// Appwrite timestamps
	CreatedAt string `json:"$createdAt,omitempty"`
	UpdatedAt string `json:"$updatedAt,omitempty"`
}

// SkillStat represents aggregated statistics for a specific skill
type SkillStat struct {
	SkillID         int    `json:"skillId"`
	SkillName       string `json:"skillName,omitempty"`
	Hits            int    `json:"hits"`
	TotalValue      int64  `json:"totalValue"`
	CritHits        int    `json:"critHits"`
	CritTotal       int64  `json:"critTotal"`
	LuckyHits       int    `json:"luckyHits"`
	LuckyTotal      int64  `json:"luckyTotal"`
	HPLossTotal     int64  `json:"hpLossTotal,omitempty"`     // For damage skills
	ShieldLossTotal int64  `json:"shieldLossTotal,omitempty"` // For damage skills
	TargetName      string `json:"targetName,omitempty"`      // For both damage and heal
}

// ReportStatus represents the processing status of a report
type ReportStatus struct {
	ID       string `json:"$id,omitempty"`
	ReportID string `json:"reportId"`
	Status   string `json:"status"`   // "processing", "completed", "failed"
	Progress int    `json:"progress"` // 0-100
	Message  string `json:"message,omitempty"`
	// Appwrite timestamps
	CreatedAt string `json:"$createdAt,omitempty"`
	UpdatedAt string `json:"$updatedAt,omitempty"`
}

// Boss represents a boss entity in a fight
type Boss struct {
	ID          string `json:"$id,omitempty"`
	Name        string `json:"name"`
	TotalDamage int64  `json:"totalDamage"`
	HitCount    int    `json:"hitCount"`
	// Relationship to Fight
	FightID string `json:"fightId"`
	// Appwrite timestamps
	CreatedAt string `json:"$createdAt,omitempty"`
	UpdatedAt string `json:"$updatedAt,omitempty"`
}

// FightSummary is a lightweight DTO for listing fights (not stored directly)
type FightSummary struct {
	ID        int    `json:"id"`
	Name      string `json:"name"`
	StartTime string `json:"startTime,omitempty"`
	EndTime   string `json:"endTime,omitempty"`
	Duration  int64  `json:"duration,omitempty"`
	Boss      bool   `json:"boss"`
	Kill      bool   `json:"kill"`
}

// Legacy aliases for backward compatibility
type PlayerPerformance = Participant
type Status = ReportStatus

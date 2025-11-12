package module_optimizer

import (
	"math"
)

// Calculator handles combat power and attribute level calculations
type Calculator struct{}

// NewCalculator creates a new calculator instance
func NewCalculator() *Calculator {
	return &Calculator{}
}

// CalculateScore calculates the combat power score for a module combination
func (c *Calculator) CalculateScore(
	attrBreakdown map[string]int,
	preferences *OptimizationPreferences,
) float64 {
	score := 0.0

	// Calculate base combat power from attribute levels
	for attrName, value := range attrBreakdown {
		level := CalculateAttributeLevel(value)
		attrType := GetAttributeType(attrName)
		isBasic := (attrType == "basic")

		power := GetCombatPowerForLevel(level, isBasic)
		score += float64(power)
	}

	// Add bonus for total attribute count
	totalAttrCount := len(attrBreakdown)
	totalAttrPower := GetCombatPowerForTotalAttr(totalAttrCount)
	score += float64(totalAttrPower)

	// Add bonus for priority attributes if specified
	if preferences != nil && len(preferences.PriorityAttributes) > 0 {
		priorityBonus := c.calculatePriorityBonus(attrBreakdown, preferences)
		score += priorityBonus
	}

	return score
}

// calculatePriorityBonus calculates bonus score for meeting priority attribute targets
func (c *Calculator) calculatePriorityBonus(
	attrBreakdown map[string]int,
	preferences *OptimizationPreferences,
) float64 {
	bonus := 0.0

	for _, attrName := range preferences.PriorityAttributes {
		value, exists := attrBreakdown[attrName]
		if !exists {
			continue
		}

		level := CalculateAttributeLevel(value)
		desiredLevel := 0
		if preferences.DesiredLevels != nil {
			if dl, ok := preferences.DesiredLevels[attrName]; ok {
				desiredLevel = dl
			}
		}

		// Reward meeting or exceeding desired level
		if desiredLevel > 0 {
			if level >= desiredLevel {
				// Bonus for meeting target
				bonus += LevelWeights[desiredLevel] * 100.0
			} else {
				// Partial credit for getting close
				bonus += LevelWeights[level] * 50.0
			}

			// Penalty for exceeding target significantly (wasted attributes)
			if level > desiredLevel+PriorityLevelTolerance {
				penalty := float64(level-desiredLevel) * 20.0
				bonus -= penalty
			}
		} else {
			// No specific target, reward higher levels
			bonus += LevelWeights[level] * 50.0
		}
	}

	return bonus
}

// CalculatePriorityLevel calculates the minimum priority attribute level achieved
func (c *Calculator) CalculatePriorityLevel(
	attrBreakdown map[string]int,
	priorityAttributes []string,
	desiredLevels map[string]int,
) int {
	if len(priorityAttributes) == 0 {
		return 0
	}

	minLevel := 6 // Start with max level

	for _, attrName := range priorityAttributes {
		value, exists := attrBreakdown[attrName]
		if !exists {
			return 0 // Missing priority attribute
		}

		level := CalculateAttributeLevel(value)

		// Check if meets desired level
		if desiredLevels != nil {
			if desiredLevel, ok := desiredLevels[attrName]; ok {
				if level < desiredLevel {
					return 0 // Doesn't meet desired level
				}
			}
		}

		if level < minLevel {
			minLevel = level
		}
	}

	return minLevel
}

// CalculateCombatPower calculates total combat power from attribute breakdown
func (c *Calculator) CalculateCombatPower(attrBreakdown map[string]int) float64 {
	power := 0.0

	// Sum power from all attributes
	for attrName, value := range attrBreakdown {
		level := CalculateAttributeLevel(value)
		attrType := GetAttributeType(attrName)
		isBasic := (attrType == "basic")

		attrPower := GetCombatPowerForLevel(level, isBasic)
		power += float64(attrPower)
	}

	// Add total attribute bonus
	totalAttrCount := len(attrBreakdown)
	totalAttrPower := GetCombatPowerForTotalAttr(totalAttrCount)
	power += float64(totalAttrPower)

	return power
}

// CalculateAttributeScore calculates a weighted score for a specific attribute
func (c *Calculator) CalculateAttributeScore(value int, attrName string) float64 {
	level := CalculateAttributeLevel(value)
	attrType := GetAttributeType(attrName)
	isBasic := (attrType == "basic")

	power := GetCombatPowerForLevel(level, isBasic)
	weight := LevelWeights[level]

	return float64(power) * weight
}

// EstimateProcessingTime estimates how long optimization will take
func (c *Calculator) EstimateProcessingTime(moduleCount int) int {
	// Simple heuristic: ~1ms per 10 modules
	baseTime := moduleCount / 10

	// Add overhead for algorithm phases
	overhead := 100 // 100ms base overhead

	return baseTime + overhead
}

// ValidateAttributeLevels checks if attribute levels are achievable
func (c *Calculator) ValidateAttributeLevels(desiredLevels map[string]int) error {
	for attrName, level := range desiredLevels {
		if level < 1 || level > 6 {
			return nil // Invalid level, but we'll just ignore it
		}

		// Check if attribute name exists
		if GetAttributeType(attrName) == "" && attrName != "Unknown Attribute" {
			// Unknown attribute - could be valid in future
			continue
		}
	}

	return nil
}

// CalculateAttributeGap calculates how far an attribute is from target level
func (c *Calculator) CalculateAttributeGap(currentValue, targetLevel int) int {
	currentLevel := CalculateAttributeLevel(currentValue)
	gap := targetLevel - currentLevel

	if gap < 0 {
		return 0 // Already at or above target
	}

	// Calculate value needed to reach target level
	if targetLevel > len(AttrThresholds) {
		targetLevel = len(AttrThresholds)
	}

	targetValue := AttrThresholds[targetLevel-1]
	return targetValue - currentValue
}

// CalculateDiminishingReturns calculates the diminishing returns factor for high values
func (c *Calculator) CalculateDiminishingReturns(value int) float64 {
	// After level 5, returns diminish
	level := CalculateAttributeLevel(value)
	if level >= 5 {
		// Each level beyond 5 has 80% of previous level's value
		return math.Pow(0.8, float64(level-5))
	}
	return 1.0
}

// ScoreComparison represents a detailed comparison between two combinations
type ScoreComparison struct {
	ScoreDiff         float64
	PriorityLevelDiff int
	TotalAttrDiff     int
	BetterAttributes  []string
	WorseAttributes   []string
}

// CompareScores provides detailed comparison between two attribute breakdowns
func (c *Calculator) CompareScores(
	a, b map[string]int,
	preferencesA, preferencesB *OptimizationPreferences,
) ScoreComparison {
	scoreA := c.CalculateScore(a, preferencesA)
	scoreB := c.CalculateScore(b, preferencesB)

	totalA := 0
	totalB := 0
	for _, v := range a {
		totalA += v
	}
	for _, v := range b {
		totalB += v
	}

	better := make([]string, 0)
	worse := make([]string, 0)

	// Find attributes where A is better or worse than B
	allAttrs := make(map[string]bool)
	for attr := range a {
		allAttrs[attr] = true
	}
	for attr := range b {
		allAttrs[attr] = true
	}

	for attr := range allAttrs {
		valA := a[attr]
		valB := b[attr]

		if valA > valB {
			better = append(better, attr)
		} else if valA < valB {
			worse = append(worse, attr)
		}
	}

	return ScoreComparison{
		ScoreDiff:        scoreA - scoreB,
		TotalAttrDiff:    totalA - totalB,
		BetterAttributes: better,
		WorseAttributes:  worse,
	}
}

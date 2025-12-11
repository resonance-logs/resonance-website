package upload

import (
	"encoding/json"
	"strconv"
	"strings"
)

type playerMetadata struct {
	regionID     *int64
	abilityScore *int64
	playerName   *string
}

func extractPlayerMetadata(charSerializeJSON string) playerMetadata {
	var meta playerMetadata
	if charSerializeJSON == "" {
		return meta
	}

	var charData map[string]interface{}
	if err := json.Unmarshal([]byte(charSerializeJSON), &charData); err != nil {
		return meta
	}

	if charBaseRaw, ok := charData["CharBase"]; ok {
		if charBaseMap, ok := charBaseRaw.(map[string]interface{}); ok {
			if name, ok := charBaseMap["Name"].(string); ok && name != "" {
				meta.playerName = &name
			}
			if accountID, ok := charBaseMap["AccountId"].(string); ok && accountID != "" {
				if region := parseRegionID(accountID); region != nil {
					meta.regionID = region
				}
			}
		}
	}

	if fightPointRaw, ok := charData["FightPoint"]; ok {
		if fightPointMap, ok := fightPointRaw.(map[string]interface{}); ok {
			if abilityScore, ok := fightPointMap["AbilityScore"].(float64); ok {
				score := int64(abilityScore)
				meta.abilityScore = &score
			}
		}
	}

	return meta
}

func parseRegionID(accountID string) *int64 {
	parts := strings.SplitN(accountID, "_", 2)
	if len(parts) == 0 {
		return nil
	}

	prefix, err := strconv.ParseInt(parts[0], 10, 64)
	if err != nil {
		return nil
	}

	return &prefix
}

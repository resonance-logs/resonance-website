package module_optimizer

// Static configuration from StarResonanceDps ModuleMaps.cs
// This file contains all mappings and thresholds required for the optimization algorithm

// Module name mappings by config ID
var ModuleNames = map[int]string{
	// Attack modules
	5500101: "基础攻击",
	5500102: "高性能攻击",
	5500103: "卓越攻击",
	// Defense modules
	5500201: "基础防御",
	5500202: "高性能防御",
	5500203: "卓越防御",
	// Support modules
	5500301: "基础支援",
	5500302: "高性能支援",
	5500303: "卓越支援",
	// Add more mappings as needed from the C# source
}

// Attribute name mappings by attribute ID
var AttrNames = map[int]string{
	1110: "力量加持",
	1111: "敏捷加持",
	1112: "智力加持",
	1113: "活力加持",
	2104: "极-伤害叠加",
	2105: "极-暴击效果",
	2204: "吸血",
	2205: "韧性",
	// Add more mappings as needed
}

// Module category by config ID
var ModuleCategoryMap = map[int]string{
	5500101: "ATTACK",
	5500102: "ATTACK",
	5500103: "ATTACK",
	5500201: "DEFENSE",
	5500202: "DEFENSE",
	5500203: "DEFENSE",
	5500301: "SUPPORT",
	5500302: "SUPPORT",
	5500303: "SUPPORT",
	// Add more mappings as needed
}

// Attribute level thresholds
// Level is determined by total attribute value crossing these thresholds
var AttrThresholds = []int{1, 4, 8, 12, 16, 20}

// Combat power by attribute level (basic attributes)
// Maps attribute level to combat power contribution
var BasicAttrPowerMap = map[int]int{
	1: 7,
	2: 14,
	3: 29,
	4: 44,
	5: 167,
	6: 254,
}

// Combat power by attribute level (special attributes)
var SpecialAttrPowerMap = map[int]int{
	1: 14,
	2: 29,
	3: 59,
	4: 89,
	5: 298,
	6: 448,
}

// Total attribute power mapping
// Maps total attribute count to combat power
var TotalAttrPowerMap = map[int]int{
	0:  0,
	1:  5,
	2:  11,
	3:  17,
	4:  23,
	5:  29,
	6:  35,
	7:  42,
	8:  49,
	9:  56,
	10: 63,
	11: 71,
	12: 79,
	13: 87,
	14: 95,
	15: 104,
	16: 113,
	17: 122,
	18: 131,
	19: 141,
	20: 151,
	// Add more as needed
}

// Basic attribute IDs
var BasicAttrIds = map[int]bool{
	1110: true, // 力量加持
	1111: true, // 敏捷加持
	1112: true, // 智力加持
	1113: true, // 活力加持
	// Add more as needed
}

// Special attribute IDs
var SpecialAttrIds = map[int]bool{
	2104: true, // 极-伤害叠加
	2105: true, // 极-暴击效果
	2204: true, // 吸血
	2205: true, // 韧性
	// Add more as needed
}

// Attribute name to type mapping
var AttrNameTypeMap = map[string]string{
	"力量加持":   "basic",
	"敏捷加持":   "basic",
	"智力加持":   "basic",
	"活力加持":   "basic",
	"极-伤害叠加": "special",
	"极-暴击效果": "special",
	"吸血":     "special",
	"韧性":     "special",
	// Add more as needed
}

// Level weights for scoring
// Used to weight priority attribute levels in scoring function
var LevelWeights = map[int]float64{
	1: 1.0,
	2: 4.0,
	3: 8.0,
	4: 12.0,
	5: 16.0,
	6: 20.0,
}

// Optimization constants
const (
	// Maximum number of modules to evaluate per attribute during pre-filtering
	MaxModulesPerAttribute = 30

	// Default maximum iterations for local search phase
	DefaultMaxIterations = 30

	// Modules per combination (fixed at 4)
	ModulesPerCombination = 4

	// Maximum number of solutions to return
	MaxSolutions = 60

	// Tolerance for priority level matching (0 = exact match required)
	PriorityLevelTolerance = 0
)

// Configuration validation
func init() {
	// Validate configuration consistency at startup
	if len(AttrThresholds) != 6 {
		panic("AttrThresholds must have exactly 6 values")
	}

	if len(BasicAttrPowerMap) != 6 {
		panic("BasicAttrPowerMap must have exactly 6 levels")
	}

	if len(SpecialAttrPowerMap) != 6 {
		panic("SpecialAttrPowerMap must have exactly 6 levels")
	}

	if len(LevelWeights) != 6 {
		panic("LevelWeights must have exactly 6 levels")
	}

	// Validate that ModulesPerCombination is 4
	if ModulesPerCombination != 4 {
		panic("ModulesPerCombination must be 4")
	}
}

// CalculateAttributeLevel calculates the attribute level based on total value
func CalculateAttributeLevel(value int) int {
	for level, threshold := range AttrThresholds {
		if value < threshold {
			return level
		}
	}
	return 6 // Maximum level
}

// GetCombatPowerForLevel returns combat power for a given attribute level and type
func GetCombatPowerForLevel(level int, isBasic bool) int {
	if level < 1 || level > 6 {
		return 0
	}

	if isBasic {
		return BasicAttrPowerMap[level]
	}
	return SpecialAttrPowerMap[level]
}

// GetCombatPowerForTotalAttr returns combat power for total attribute count
func GetCombatPowerForTotalAttr(totalAttr int) int {
	if power, ok := TotalAttrPowerMap[totalAttr]; ok {
		return power
	}
	// If not in map, extrapolate or return max known value
	maxKnown := 0
	for _, p := range TotalAttrPowerMap {
		if p > maxKnown {
			maxKnown = p
		}
	}
	return maxKnown
}

// IsBasicAttribute checks if an attribute is a basic type
func IsBasicAttribute(attrID int) bool {
	return BasicAttrIds[attrID]
}

// IsSpecialAttribute checks if an attribute is a special type
func IsSpecialAttribute(attrID int) bool {
	return SpecialAttrIds[attrID]
}

// GetAttributeType returns "basic" or "special" for an attribute name
func GetAttributeType(attrName string) string {
	if attrType, ok := AttrNameTypeMap[attrName]; ok {
		return attrType
	}
	// Default to basic if not found
	return "basic"
}

// GetModuleName returns the module name for a given config ID
func GetModuleName(configID int) string {
	if name, ok := ModuleNames[configID]; ok {
		return name
	}
	return "Unknown Module"
}

// GetModuleCategory returns the module category for a given config ID
func GetModuleCategory(configID int) string {
	if category, ok := ModuleCategoryMap[configID]; ok {
		return category
	}
	return "ATTACK" // Default
}

// GetAttributeName returns the attribute name for a given attribute ID
func GetAttributeName(attrID int) string {
	if name, ok := AttrNames[attrID]; ok {
		return name
	}
	return "Unknown Attribute"
}

// ValidateConfigID checks if a config ID exists in the module mapping
func ValidateConfigID(configID int) bool {
	_, ok := ModuleNames[configID]
	return ok
}

// ValidatePartID checks if a part ID exists in the attribute mapping
func ValidatePartID(partID int) bool {
	_, ok := AttrNames[partID]
	return ok
}

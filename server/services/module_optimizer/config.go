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
	5500301: "基础防护",
	5500302: "高性能守护",
	5500303: "卓越守护",
	// Support modules
	5500201: "基础治疗",
	5500202: "高性能治疗",
	5500203: "卓越辅助",
}

// Attribute name mappings by attribute ID
var AttrNames = map[int]string{
	// Basic attributes
	1110: "力量加持",
	1111: "敏捷加持",
	1112: "智力加持",
	1113: "特攻伤害",
	1114: "精英打击",
	1205: "特攻治疗加持",
	1206: "专精治疗加持",
	1307: "抵御魔法",
	1308: "抵御物理",
	1407: "施法专注",
	1408: "攻速专注",
	1409: "暴击专注",
	1410: "幸运专注",
	// Special (EXTREME) attributes
	2104: "极-伤害叠加",
	2105: "极-灵活身法",
	2204: "极-生命凝聚",
	2205: "极-急救措施",
	2304: "极-绝境守护",
	2404: "极-生命波动",
	2405: "极-生命汲取",
	2406: "极-全队幸暴",
}

// Module category by config ID
var ModuleCategoryMap = map[int]string{
	5500101: "ATTACK",
	5500102: "ATTACK",
	5500103: "ATTACK",
	5500301: "DEFENSE",
	5500302: "DEFENSE",
	5500303: "DEFENSE",
	5500201: "SUPPORT",
	5500202: "SUPPORT",
	5500203: "SUPPORT",
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
	0:   0,
	1:   5,
	2:   11,
	3:   17,
	4:   23,
	5:   29,
	6:   34,
	7:   40,
	8:   46,
	18:  104,
	19:  110,
	20:  116,
	21:  122,
	22:  128,
	23:  133,
	24:  139,
	25:  145,
	26:  151,
	27:  157,
	28:  163,
	29:  168,
	30:  174,
	31:  180,
	32:  186,
	33:  192,
	34:  198,
	35:  203,
	36:  209,
	37:  215,
	38:  221,
	39:  227,
	40:  233,
	41:  238,
	42:  244,
	43:  250,
	44:  256,
	45:  262,
	46:  267,
	47:  273,
	48:  279,
	49:  285,
	50:  291,
	51:  297,
	52:  302,
	53:  308,
	54:  314,
	55:  320,
	56:  326,
	57:  332,
	58:  337,
	59:  343,
	60:  349,
	61:  355,
	62:  361,
	63:  366,
	64:  372,
	65:  378,
	66:  384,
	67:  390,
	68:  396,
	69:  401,
	70:  407,
	71:  413,
	72:  419,
	73:  425,
	74:  431,
	75:  436,
	76:  442,
	77:  448,
	78:  454,
	79:  460,
	80:  466,
	81:  471,
	82:  477,
	83:  483,
	84:  489,
	85:  495,
	86:  500,
	87:  506,
	88:  512,
	89:  518,
	90:  524,
	91:  530,
	92:  535,
	93:  541,
	94:  547,
	95:  553,
	96:  559,
	97:  565,
	98:  570,
	99:  576,
	100: 582,
	101: 588,
	102: 594,
	103: 599,
	104: 605,
	105: 611,
	106: 617,
	113: 658,
	114: 664,
	115: 669,
	116: 675,
	117: 681,
	118: 687,
	119: 693,
	120: 699,
}

// Basic attribute IDs
var BasicAttrIds = map[int]bool{
	1110: true, // 力量加持
	1111: true, // 敏捷加持
	1112: true, // 智力加持
	1113: true, // 特攻伤害
	1114: true, // 精英打击
	1205: true, // 特攻治疗加持
	1206: true, // 专精治疗加持
	1307: true, // 抵御魔法
	1308: true, // 抵御物理
	1407: true, // 施法专注
	1408: true, // 攻速专注
	1409: true, // 暴击专注
	1410: true, // 幸运专注
}

// Special attribute IDs
var SpecialAttrIds = map[int]bool{
	2104: true, // 极-伤害叠加
	2105: true, // 极-灵活身法
	2204: true, // 极-生命凝聚
	2205: true, // 极-急救措施
	2304: true, // 极-绝境守护
	2404: true, // 极-生命波动
	2405: true, // 极-生命汲取
	2406: true, // 极-全队幸暴
}

// Attribute name to type mapping
var AttrNameTypeMap = map[string]string{
	"力量加持":   "basic",
	"敏捷加持":   "basic",
	"智力加持":   "basic",
	"特攻伤害":   "basic",
	"精英打击":   "basic",
	"特攻治疗加持": "basic",
	"专精治疗加持": "basic",
	"施法专注":   "basic",
	"攻速专注":   "basic",
	"暴击专注":   "basic",
	"幸运专注":   "basic",
	"抵御魔法":   "basic",
	"抵御物理":   "basic",
	"极-伤害叠加": "special",
	"极-灵活身法": "special",
	"极-生命凝聚": "special",
	"极-急救措施": "special",
	"极-绝境守护": "special",
	"极-生命波动": "special",
	"极-生命汲取": "special",
	"极-全队幸暴": "special",
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

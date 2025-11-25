import moduleData from './moduleData.json'
import type { Mod, ItemPackage5, Item } from '@/api/module/module'

type ModInfoAny = { PartIds?: number[]; InitLinkNums?: number[]; [k: string]: unknown }

export interface ParsedPart {
  id: number
  value?: number | null
  name?: string
  image?: string
}

export interface ParsedModule {
  uuid: string
  configId: number
  count?: string
  quality?: number
  moduleName?: string
  moduleImage?: string
  parts: ParsedPart[]
}

export function parseModuleData(mod: Mod | null, itemPackage5: ItemPackage5 | null): ParsedModule[] {
  if (!itemPackage5 || !itemPackage5.Items) return []

    const items = itemPackage5.Items as Record<string, Item>
    const modInfos = (mod && (mod.ModInfos as Record<string, ModInfoAny>)) || {}

  return Object.values(items).map((itAny) => {
    const it = itAny as Item
    const uuid = String(it.Uuid)
    const configId = Number(it.ConfigId)

    // module metadata from local moduleData.json
    const md = (moduleData.ModuleData as Record<string, { name: string; image: string }>)?.[String(configId)]

    // gather part ids from both ModNewAttr and server ModInfos
    const partIdSet = new Set<number>()
    if (Array.isArray(it.ModNewAttr?.ModParts)) {
      it.ModNewAttr.ModParts.forEach((p) => partIdSet.add(p))
    }

    const info = modInfos[uuid]
    if (info?.PartIds && Array.isArray(info.PartIds)) {
      info.PartIds.forEach((p: number) => partIdSet.add(p))
    }

    const partIds = Array.from(partIdSet)

    const parts: ParsedPart[] = partIds.map((pid) => {
      let value: number | null = null
      if (info?.PartIds && Array.isArray(info.PartIds)) {
        const idx = info.PartIds.indexOf(pid)
        if (idx >= 0 && Array.isArray(info.InitLinkNums)) {
          value = info.InitLinkNums[idx] ?? null
        }
      }

      const ad = (moduleData.AttrData as Record<string, { name: string; image: string }>)?.[String(pid)]

      return {
        id: pid,
        value,
        name: ad?.name ?? undefined,
        image: ad?.image ?? undefined,
      }
    })

    return {
      uuid,
      configId,
      count: it.Count,
      quality: it.Quality,
      moduleName: md?.name,
      moduleImage: md?.image,
      parts,
    }
  })
}

// ============================================================================
// Module Optimizer Types
// ============================================================================

export type ModuleCategory = 'ATTACK' | 'DEFENSE' | 'SUPPORT'

export type RoleFilter = 'all' | 'dps' | 'healer' | 'tank' | 'dpsHealer'

// Maps role filter to which module categories to include
export const ROLE_CATEGORY_MAP: Record<RoleFilter, ModuleCategory[]> = {
  all: ['ATTACK', 'DEFENSE', 'SUPPORT'],
  dps: ['ATTACK'],
  healer: ['SUPPORT'],
  tank: ['DEFENSE'],
  dpsHealer: ['ATTACK', 'SUPPORT'],
}

export type ModuleItem = {
  uuid: string
  configId: number
  moduleName: string
  moduleImage: string
  quality: number
  count: string
  category: ModuleCategory
  parts: { id: number; name: string; value: number; image: string }[]
}

export type PriorityRequirement = {
  attrId: string
  minLevel: number
}

export type OptionsState = {
  scoringMode: 'combat' | 'levels'
  roleFilter: RoleFilter
  skillPriorities: PriorityRequirement[]
  maxCandidates: number // 20-120, controls speed vs quality tradeoff
}

export type ThresholdHit = {
  id: string
  name: string
  level: number
  linkPoints: number
  score: number
  isBasic: boolean
}

export type OptimizerBreakdown = {
  totalLinkPoints: number
  perAttribute: Record<string, number>
  thresholdHits: ThresholdHit[]
  skillMatches: string[]
  totalAttrBonus: number
  priorityBonus: number
}

export type RankedResult = {
  modules: ModuleItem[]
  score: number
  breakdown: OptimizerBreakdown
}

export type OptimizerResult = {
  bestSet: ModuleItem[]
  score: number
  breakdown: OptimizerBreakdown
  topResults: RankedResult[]
}

// ============================================================================
// Constants and Data Maps
// ============================================================================

const ATTR_THRESHOLDS: readonly number[] = moduleData.AttrThresholds as number[]
const BASIC_ATTR_POWER_MAP = moduleData.BasicAttrPowerMap as Record<string, number>
const SPECIAL_ATTR_POWER_MAP = moduleData.SpecialAttrPowerMap as Record<string, number>
const TOTAL_ATTR_POWER_MAP = moduleData.TotalAttrPowerMap as Record<string, number>
const BASIC_ATTR_IDS = moduleData.BasicAttrIds as Record<string, boolean>
const SPECIAL_ATTR_IDS = moduleData.SpecialAttrIds as Record<string, boolean>
const LEVEL_WEIGHTS = moduleData.LevelWeights as Record<string, number>
const ATTR_DATA = moduleData.AttrData as Record<string, { name: string; image: string }>
const MODULE_CATEGORY_MAP = moduleData.ModuleCategoryMap as Record<string, ModuleCategory>

// Max useful link points per attribute (level 6 threshold)
const MAX_USEFUL_LINK_POINTS = 20
const TOP_RESULT_LIMIT = 5

type ComboIndices = [number, number, number, number]

interface ComboCandidate {
  score: number
  indices: ComboIndices
}

function trackTopCombo(list: ComboCandidate[], score: number, indices: ComboIndices) {
  list.push({ score, indices })
  list.sort((a, b) => b.score - a.score)
  if (list.length > TOP_RESULT_LIMIT) {
    list.pop()
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get threshold level (1-6) for a given link point total
 * Thresholds: [1, 4, 8, 12, 16, 20]
 * Returns 0 if below threshold 1
 */
function getThresholdLevel(linkPoints: number): number {
  for (let i = ATTR_THRESHOLDS.length - 1; i >= 0; i--) {
    if (linkPoints >= ATTR_THRESHOLDS[i]) {
      return i + 1 // 1-indexed level
    }
  }
  return 0
}

/**
 * Checks if an attribute ID is a basic attribute
 */
function isBasicAttr(attrId: string | number): boolean {
  return !!BASIC_ATTR_IDS[String(attrId)]
}

/**
 * Checks if an attribute ID is a special attribute
 */
function isSpecialAttr(attrId: string | number): boolean {
  return !!SPECIAL_ATTR_IDS[String(attrId)]
}

/**
 * Get power score for a threshold level based on attribute type
 */
function getAttrPowerScore(level: number, attrId: string): number {
  if (level <= 0) return 0
  
  if (isSpecialAttr(attrId)) {
    return SPECIAL_ATTR_POWER_MAP[String(level)] ?? 0
  }
  return BASIC_ATTR_POWER_MAP[String(level)] ?? 0
}

/**
 * Get total attribute power bonus for total link points
 */
function getTotalAttrBonus(totalLinkPoints: number): number {
  // Find the highest key <= totalLinkPoints
  const keys = Object.keys(TOTAL_ATTR_POWER_MAP)
    .map(Number)
    .filter((k) => !isNaN(k))
    .sort((a, b) => b - a)
  
  for (const key of keys) {
    if (totalLinkPoints >= key) {
      return TOTAL_ATTR_POWER_MAP[String(key)] ?? 0
    }
  }
  return 0
}

/**
 * Aggregate link points per attribute from a set of modules
 */
function aggregateLinkPoints(modules: ModuleItem[]): Record<string, number> {
  const perAttribute: Record<string, number> = {}
  
  for (const mod of modules) {
    for (const part of mod.parts) {
      const attrId = String(part.id)
      perAttribute[attrId] = (perAttribute[attrId] ?? 0) + (part.value ?? 0)
    }
  }
  
  return perAttribute
}

/**
 * Build a map of required attributes and their minimum tier
 */
function buildRequirementMap(requirements: PriorityRequirement[]): Map<string, number> {
  const map = new Map<string, number>()
  
  for (const req of requirements) {
    if (!req.attrId) continue
    const level = Math.min(Math.max(req.minLevel, 1), 6)
    map.set(req.attrId, level)
  }
  
  return map
}

function meetsRequirements(perAttribute: Record<string, number>, requirements: Map<string, number>): boolean {
  if (requirements.size === 0) return true
  
  for (const [attrId, minLevel] of requirements.entries()) {
    const linkPoints = Math.min(perAttribute[attrId] ?? 0, MAX_USEFUL_LINK_POINTS)
    const level = getThresholdLevel(linkPoints)
    if (level < minLevel) {
      return false
    }
  }
  
  return true
}

/**
 * Calculate score for a set of modules using combat mode
 */
function calculateCombatScore(
  perAttribute: Record<string, number>,
  requirementMap: Map<string, number>
): { score: number; thresholdHits: ThresholdHit[]; skillMatches: string[]; totalAttrBonus: number; priorityBonus: number } {
  let score = 0
  const thresholdHits: ThresholdHit[] = []
  const skillMatches: string[] = []
  let totalLinkPoints = 0
  
  for (const [attrId, rawLinkPoints] of Object.entries(perAttribute)) {
    // Cap link points at 20 (level 6 max)
    const linkPoints = Math.min(rawLinkPoints, MAX_USEFUL_LINK_POINTS)
    totalLinkPoints += linkPoints
    const level = getThresholdLevel(linkPoints)
    
    if (level > 0) {
      const attrScore = getAttrPowerScore(level, attrId)
      score += attrScore
      
      if (requirementMap.has(attrId) && level >= (requirementMap.get(attrId) ?? 0)) {
        const attrName = ATTR_DATA[attrId]?.name ?? attrId
        if (!skillMatches.includes(attrName)) {
          skillMatches.push(attrName)
        }
      }
      
      thresholdHits.push({
        id: attrId,
        name: ATTR_DATA[attrId]?.name ?? attrId,
        level,
        linkPoints,
        score: attrScore,
        isBasic: isBasicAttr(attrId),
      })
    }
  }
  
  // Add total attribute bonus
  const totalAttrBonus = getTotalAttrBonus(totalLinkPoints)
  score += totalAttrBonus
  
  return { score, thresholdHits, skillMatches, totalAttrBonus, priorityBonus: 0 }
}

/**
 * Calculate score for a set of modules using levels mode
 */
function calculateLevelsScore(
  perAttribute: Record<string, number>,
  requirementMap: Map<string, number>
): { score: number; thresholdHits: ThresholdHit[]; skillMatches: string[]; totalAttrBonus: number; priorityBonus: number } {
  let score = 0
  const thresholdHits: ThresholdHit[] = []
  const skillMatches: string[] = []
  
  for (const [attrId, rawLinkPoints] of Object.entries(perAttribute)) {
    // Cap link points at 20 (level 6 max)
    const linkPoints = Math.min(rawLinkPoints, MAX_USEFUL_LINK_POINTS)
    const level = getThresholdLevel(linkPoints)
    
    if (level > 0) {
      const weight = LEVEL_WEIGHTS[String(level)] ?? 0
      const attrScore = level * weight
      score += attrScore
      
      if (requirementMap.has(attrId) && level >= (requirementMap.get(attrId) ?? 0)) {
        const attrName = ATTR_DATA[attrId]?.name ?? attrId
        if (!skillMatches.includes(attrName)) {
          skillMatches.push(attrName)
        }
      }
      
      thresholdHits.push({
        id: attrId,
        name: ATTR_DATA[attrId]?.name ?? attrId,
        level,
        linkPoints,
        score: attrScore,
        isBasic: isBasicAttr(attrId),
      })
    }
  }
  
  return { score, thresholdHits, skillMatches, totalAttrBonus: 0, priorityBonus: 0 }
}

/**
 * Calculate full score and breakdown for a set of 4 modules
 */
function buildRankedResult(modules: ModuleItem[], options: OptionsState): RankedResult {
  const perAttribute = aggregateLinkPoints(modules)
  const requirementMap = buildRequirementMap(options.skillPriorities)
  
  const totalLinkPoints = Object.values(perAttribute).reduce((sum, v) => sum + v, 0)
  
  const result = options.scoringMode === 'combat'
    ? calculateCombatScore(perAttribute, requirementMap)
    : calculateLevelsScore(perAttribute, requirementMap)
  
  // Sort threshold hits by score descending
  result.thresholdHits.sort((a, b) => b.score - a.score)
  
  return {
    modules,
    score: result.score,
    breakdown: {
      totalLinkPoints,
      perAttribute,
      thresholdHits: result.thresholdHits,
      skillMatches: result.skillMatches,
      totalAttrBonus: result.totalAttrBonus,
      priorityBonus: result.priorityBonus,
    },
  }
}

// ============================================================================
// Pre-scoring for Module Ranking (Optimization Heuristic)
// ============================================================================

/**
 * Calculate a quick heuristic score for a single module
 * Used to pre-rank modules for optimization pruning
 */
function quickScoreModule(mod: ModuleItem, requirementMap: Map<string, number>): number {
  let score = 0
  
  // Aggregate by attribute first to calculate levels
  const attrTotals: Record<string, number> = {}
  for (const part of mod.parts) {
    const value = Math.min(part.value ?? 0, MAX_USEFUL_LINK_POINTS)
    const attrId = String(part.id)
    attrTotals[attrId] = (attrTotals[attrId] ?? 0) + value
  }
  
  for (const [attrId, value] of Object.entries(attrTotals)) {
    // Cap at max useful
    const capped = Math.min(value, MAX_USEFUL_LINK_POINTS)
    const level = getThresholdLevel(capped)
    
    // Base score from level
    score += capped
    
    // Bonus for special attributes
    if (isSpecialAttr(attrId)) {
      score += capped * 0.5
    }
    
    // Requirements get a modest boost to keep them near the top of the candidate list
    const requirementLevel = requirementMap.get(attrId)
    if (requirementLevel !== undefined && level > 0) {
      score += level * 50 + requirementLevel * 25
    }
  }
  
  // Quality bonus
  score += (mod.quality ?? 1) * 5
  
  return score
}

// ============================================================================
// Fast Score Calculation (Optimized for Hot Path)
// ============================================================================

/**
 * Pre-compute module contribution to avoid repeated calculations
 */
interface ModuleContribution {
  mod: ModuleItem
  quickScore: number
  attrContributions: Map<string, number> // attrId -> value
  totalValue: number
}

function precomputeModuleContribution(mod: ModuleItem, requirementMap: Map<string, number>): ModuleContribution {
  const attrContributions = new Map<string, number>()
  let totalValue = 0
  
  for (const part of mod.parts) {
    const value = part.value ?? 0
    const attrId = String(part.id)
    attrContributions.set(attrId, (attrContributions.get(attrId) ?? 0) + value)
    totalValue += value
  }
  
  return {
    mod,
    quickScore: quickScoreModule(mod, requirementMap),
    attrContributions,
    totalValue,
  }
}

/**
 * Fast score calculation using pre-computed contributions
 * Avoids creating intermediate objects
 */
function fastScoreCombo(
  contributions: ModuleContribution[],
  requirementMap: Map<string, number>,
  scoringMode: 'combat' | 'levels'
): number {
  // Aggregate attributes using a simple object (faster than Map for small sets)
  const perAttribute: Record<string, number> = {}
  let totalLinkPoints = 0
  
  for (const contrib of contributions) {
    for (const [attrId, value] of contrib.attrContributions) {
      perAttribute[attrId] = (perAttribute[attrId] ?? 0) + value
    }
  }
  
  if (!meetsRequirements(perAttribute, requirementMap)) {
    return Number.NEGATIVE_INFINITY
  }
  
  let score = 0
  
  if (scoringMode === 'combat') {
    for (const attrId in perAttribute) {
      // Cap link points at 20
      const linkPoints = Math.min(perAttribute[attrId], MAX_USEFUL_LINK_POINTS)
      totalLinkPoints += linkPoints
      const level = getThresholdLevel(linkPoints)
      
      if (level > 0) {
        const attrScore = getAttrPowerScore(level, attrId)
        score += attrScore
      }
    }
    
    // Add total attribute bonus
    score += getTotalAttrBonus(totalLinkPoints)
  } else {
    for (const attrId in perAttribute) {
      // Cap link points at 20
      const linkPoints = Math.min(perAttribute[attrId], MAX_USEFUL_LINK_POINTS)
      const level = getThresholdLevel(linkPoints)
      
      if (level > 0) {
        const weight = LEVEL_WEIGHTS[String(level)] ?? 0
        const attrScore = level * weight
        score += attrScore
      }
    }
  }
  
  return score
}

// ============================================================================
// Progress Tracking
// ============================================================================

export type OptimizerProgress = {
  phase: 'preparing' | 'scoring' | 'finalizing' | 'complete'
  current: number
  total: number
  percentage: number
  bestScoreSoFar: number
  elapsedMs: number
}

export type ProgressCallback = (progress: OptimizerProgress) => void

// ============================================================================
// Main Optimizer Function
// ============================================================================

/**
 * Calculate number of combinations: C(n, 4) = n! / (4! * (n-4)!)
 */
function calcCombinations(n: number): number {
  if (n < 4) return 0
  return (n * (n - 1) * (n - 2) * (n - 3)) / 24
}

/**
 * Module Optimizer - finds the best set of 4 modules to maximize score
 * 
 * @param modules - Array of all available modules
 * @param options - Scoring options (mode and skill priorities)
 * @param onProgress - Optional progress callback
 * @returns Best set of 4 modules with score and breakdown
 */
export function moduleOptimizer(
  modules: ModuleItem[],
  options: OptionsState,
  onProgress?: ProgressCallback
): OptimizerResult | null {
  const startTime = performance.now()
  
  if (modules.length < 4) {
    return null
  }
  
  const requirementMap = buildRequirementMap(options.skillPriorities)
  
  // Phase 1: Preparing - Pre-compute module contributions
  onProgress?.({
    phase: 'preparing',
    current: 0,
    total: modules.length,
    percentage: 0,
    bestScoreSoFar: 0,
    elapsedMs: 0,
  })
  
  const contributions = modules.map((mod) => precomputeModuleContribution(mod, requirementMap))
  
  // Sort by quick score descending
  contributions.sort((a, b) => b.quickScore - a.quickScore)
  
  // Pruning: Use user-specified maxCandidates or auto-calculate
  const maxCandidates = options.maxCandidates || 60
  let candidates = contributions
  
  // Apply candidate limit
  if (candidates.length > maxCandidates) {
    candidates = candidates.slice(0, maxCandidates)
  }
  
  const n = candidates.length
  const actualTotalCombos = calcCombinations(n)
  const topCombos: ComboCandidate[] = []
  
  // Phase 2: Scoring
  let bestScore = -Infinity
  let comboCount = 0
  const progressInterval = Math.max(1, Math.floor(actualTotalCombos / 100)) // Update every 1%
  
  // Optimized 4-nested loop (faster than generator for this case)
  for (let i = 0; i < n - 3; i++) {
    for (let j = i + 1; j < n - 2; j++) {
      for (let k = j + 1; k < n - 1; k++) {
        for (let l = k + 1; l < n; l++) {
          const combo = [candidates[i], candidates[j], candidates[k], candidates[l]]
          const score = fastScoreCombo(combo, requirementMap, options.scoringMode)
          const indices: ComboIndices = [i, j, k, l]
          
          comboCount++
          if (!Number.isFinite(score)) {
            if (onProgress && comboCount % progressInterval === 0) {
              const safeBest = Number.isFinite(bestScore) ? bestScore : 0
              onProgress({
                phase: 'scoring',
                current: comboCount,
                total: actualTotalCombos,
                percentage: Math.round((comboCount / actualTotalCombos) * 100),
                bestScoreSoFar: safeBest,
                elapsedMs: performance.now() - startTime,
              })
            }
            continue
          }
          
          trackTopCombo(topCombos, score, indices)
          
          if (score > bestScore) {
            bestScore = score
          }
          
          // Progress update
          if (onProgress && comboCount % progressInterval === 0) {
            const safeBest = Number.isFinite(bestScore) ? bestScore : 0
            onProgress({
              phase: 'scoring',
              current: comboCount,
              total: actualTotalCombos,
              percentage: Math.round((comboCount / actualTotalCombos) * 100),
              bestScoreSoFar: safeBest,
              elapsedMs: performance.now() - startTime,
            })
          }
        }
      }
    }
  }
  
  if (topCombos.length === 0) {
    const elapsed = performance.now() - startTime
    const safeBest = Number.isFinite(bestScore) ? bestScore : 0
    onProgress?.({
      phase: 'finalizing',
      current: actualTotalCombos,
      total: actualTotalCombos,
      percentage: 100,
      bestScoreSoFar: safeBest,
      elapsedMs: elapsed,
    })
    onProgress?.({
      phase: 'complete',
      current: actualTotalCombos,
      total: actualTotalCombos,
      percentage: 100,
      bestScoreSoFar: safeBest,
      elapsedMs: elapsed,
    })
    return null
  }
  
  // Phase 3: Finalizing - Build full result
  const rankedResults = topCombos.map(({ indices }) => {
    const modules = indices.map((idx) => candidates[idx].mod)
    return buildRankedResult(modules, options)
  })
  const bestResult = rankedResults[0]
  
  onProgress?.({
    phase: 'finalizing',
    current: actualTotalCombos,
    total: actualTotalCombos,
    percentage: 100,
    bestScoreSoFar: bestResult.score,
    elapsedMs: performance.now() - startTime,
  })
  
  onProgress?.({
    phase: 'complete',
    current: actualTotalCombos,
    total: actualTotalCombos,
    percentage: 100,
    bestScoreSoFar: bestResult.score,
    elapsedMs: performance.now() - startTime,
  })
  
  return {
    bestSet: bestResult.modules,
    score: bestResult.score,
    breakdown: bestResult.breakdown,
    topResults: rankedResults,
  }
}

/**
 * Async version of optimizer that yields to the event loop
 * Prevents UI freezing for large module sets
 */
export async function moduleOptimizerAsync(
  modules: ModuleItem[],
  options: OptionsState,
  onProgress?: ProgressCallback
): Promise<OptimizerResult | null> {
  const startTime = performance.now()
  
  if (modules.length < 4) {
    return null
  }
  
  const requirementMap = buildRequirementMap(options.skillPriorities)
  
  // Phase 1: Preparing
  onProgress?.({
    phase: 'preparing',
    current: 0,
    total: modules.length,
    percentage: 0,
    bestScoreSoFar: 0,
    elapsedMs: 0,
  })
  
  // Yield to allow UI update
  await new Promise((r) => setTimeout(r, 0))
  
  const contributions = modules.map((mod) => precomputeModuleContribution(mod, requirementMap))
  contributions.sort((a, b) => b.quickScore - a.quickScore)
  
  // Pruning: Use user-specified maxCandidates
  const maxCandidates = options.maxCandidates || 60
  let candidates = contributions
  
  if (candidates.length > maxCandidates) {
    candidates = candidates.slice(0, maxCandidates)
  }
  
  const n = candidates.length
  const actualTotalCombos = calcCombinations(n)
  const topCombos: ComboCandidate[] = []
  
  // Phase 2: Scoring with periodic yields
  let bestScore = -Infinity
  let comboCount = 0
  const yieldInterval = 5000 // Yield every 5000 combinations
  const progressInterval = Math.max(1, Math.floor(actualTotalCombos / 50))
  
  for (let i = 0; i < n - 3; i++) {
    for (let j = i + 1; j < n - 2; j++) {
      for (let k = j + 1; k < n - 1; k++) {
        for (let l = k + 1; l < n; l++) {
          const combo = [candidates[i], candidates[j], candidates[k], candidates[l]]
          const score = fastScoreCombo(combo, requirementMap, options.scoringMode)
          const indices: ComboIndices = [i, j, k, l]
          
          comboCount++
          if (!Number.isFinite(score)) {
            if (onProgress && comboCount % progressInterval === 0) {
              const safeBest = Number.isFinite(bestScore) ? bestScore : 0
              onProgress({
                phase: 'scoring',
                current: comboCount,
                total: actualTotalCombos,
                percentage: Math.round((comboCount / actualTotalCombos) * 100),
                bestScoreSoFar: safeBest,
                elapsedMs: performance.now() - startTime,
              })
            }
            if (comboCount % yieldInterval === 0) {
              await new Promise((r) => setTimeout(r, 0))
            }
            continue
          }
          
          trackTopCombo(topCombos, score, indices)
          
          if (score > bestScore) {
            bestScore = score
          }
          
          // Progress update
          if (onProgress && comboCount % progressInterval === 0) {
            const safeBest = Number.isFinite(bestScore) ? bestScore : 0
            onProgress({
              phase: 'scoring',
              current: comboCount,
              total: actualTotalCombos,
              percentage: Math.round((comboCount / actualTotalCombos) * 100),
              bestScoreSoFar: safeBest,
              elapsedMs: performance.now() - startTime,
            })
          }
          
          // Yield to event loop
          if (comboCount % yieldInterval === 0) {
            await new Promise((r) => setTimeout(r, 0))
          }
        }
      }
    }
  }
  
  if (topCombos.length === 0) {
    const elapsed = performance.now() - startTime
    const safeBest = Number.isFinite(bestScore) ? bestScore : 0
    onProgress?.({
      phase: 'finalizing',
      current: actualTotalCombos,
      total: actualTotalCombos,
      percentage: 100,
      bestScoreSoFar: safeBest,
      elapsedMs: elapsed,
    })
    onProgress?.({
      phase: 'complete',
      current: actualTotalCombos,
      total: actualTotalCombos,
      percentage: 100,
      bestScoreSoFar: safeBest,
      elapsedMs: elapsed,
    })
    return null
  }
  
  // Phase 3: Finalizing
  const rankedResults = topCombos.map(({ indices }) => {
    const modules = indices.map((idx) => candidates[idx].mod)
    return buildRankedResult(modules, options)
  })
  const bestResult = rankedResults[0]
  
  onProgress?.({
    phase: 'finalizing',
    current: actualTotalCombos,
    total: actualTotalCombos,
    percentage: 100,
    bestScoreSoFar: bestResult.score,
    elapsedMs: performance.now() - startTime,
  })
  
  onProgress?.({
    phase: 'complete',
    current: actualTotalCombos,
    total: actualTotalCombos,
    percentage: 100,
    bestScoreSoFar: bestResult.score,
    elapsedMs: performance.now() - startTime,
  })
  
  return {
    bestSet: bestResult.modules,
    score: bestResult.score,
    breakdown: bestResult.breakdown,
    topResults: rankedResults,
  }
}

/**
 * Convert ParsedModule to ModuleItem format for the optimizer
 */
export function parsedModuleToItem(pm: ParsedModule): ModuleItem {
  const category = MODULE_CATEGORY_MAP[String(pm.configId)] ?? 'ATTACK'
  return {
    uuid: pm.uuid,
    configId: pm.configId,
    moduleName: pm.moduleName ?? `Module ${pm.configId}`,
    moduleImage: pm.moduleImage ?? '',
    quality: pm.quality ?? 1,
    count: pm.count ?? '1',
    category,
    parts: pm.parts.map((p) => ({
      id: p.id,
      name: p.name ?? String(p.id),
      value: p.value ?? 0,
      image: p.image ?? '',
    })),
  }
}

/**
 * Filter modules by role
 */
export function filterModulesByRole(modules: ModuleItem[], roleFilter: RoleFilter): ModuleItem[] {
  const allowedCategories = ROLE_CATEGORY_MAP[roleFilter]
  return modules.filter((mod) => allowedCategories.includes(mod.category))
}

/**
 * Get attribute name by ID
 */
export function getAttrName(attrId: string | number): string {
  return ATTR_DATA[String(attrId)]?.name ?? String(attrId)
}

/**
 * Get attribute image by ID
 */
export function getAttrImage(attrId: string | number): string | undefined {
  return ATTR_DATA[String(attrId)]?.image
}

/**
 * Get threshold level description
 */
export function getThresholdDescription(level: number): string {
  if (level <= 0) return 'None'
  const threshold = ATTR_THRESHOLDS[level - 1]
  const nextThreshold = ATTR_THRESHOLDS[level] ?? '∞'
  return `Tier ${level} (${threshold}–${nextThreshold})`
}
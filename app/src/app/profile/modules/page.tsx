'use client'

import React, { useState, useMemo, useCallback, useEffect } from 'react'
import Image from 'next/image'
import { useQuery } from '@tanstack/react-query'
import { getCharacters } from '@/api/player/player'
import { getModuleData, type GetModuleDataResponse } from '@/api/module/module'
import {
  parseModuleData,
  parsedModuleToItem,
  moduleOptimizerAsync,
  filterModulesByRole,
  type ParsedModule,
  type ModuleItem,
  type OptionsState,
  type OptimizerResult,
  type OptimizerProgress,
  type RoleFilter,
} from '@/utils/moduleOptimizer'
import moduleData from '@/utils/moduleData.json'
import { produce } from 'immer'
import { GlassCard } from '@/components/landing/GlassCard'
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { Filter, Sparkles, Target, SlidersHorizontal, ChevronDown, Plus, Trash2 } from 'lucide-react'

const QUALITY_COLORS: Record<number, string> = {
  2: 'border-blue-400/30 bg-gradient-to-br from-blue-500/10 via-blue-600/5 to-[rgba(5,7,16,0.9)] text-blue-100',
  3: 'border-purple-400/40 bg-gradient-to-br from-purple-500/10 via-purple-600/5 to-[rgba(5,7,16,0.9)] text-purple-100',
  4: 'border-yellow-400/50 bg-gradient-to-br from-yellow-500/10 via-amber-500/5 to-[rgba(5,7,16,0.9)] text-yellow-100',
}

const ATTR_THRESHOLDS: readonly number[] = (moduleData.AttrThresholds ?? []) as number[]
const ATTR_DATA = moduleData.AttrData as Record<string, { name: string; image?: string }>

function getThresholdLevel(points: number): number {
  for (let i = ATTR_THRESHOLDS.length - 1; i >= 0; i--) {
    if (points >= ATTR_THRESHOLDS[i]) {
      return i + 1
    }
  }
  return 0
}

function getAttributeName(attrId: string | number): string {
  return ATTR_DATA?.[String(attrId)]?.name ?? `Attribute ${attrId}`
}

function getAttributeImage(attrId: string | number): string | undefined {
  return ATTR_DATA?.[String(attrId)]?.image
}

function AttributeSummary({ perAttribute }: { perAttribute: Record<string, number> }) {
  const attrSummary = Object.entries(perAttribute)
    .map(([attrId, total]) => ({
      attrId,
      name: getAttributeName(attrId),
      image: getAttributeImage(attrId),
      level: getThresholdLevel(total),
      total,
    }))
    .filter((attr) => attr.total > 0)
    .sort((a, b) => b.level - a.level || b.total - a.total)

  if (attrSummary.length === 0) return null

  return (
    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {attrSummary.map((attr) => (
        <div
          key={attr.attrId}
          className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/30 px-3 py-2"
        >
          {attr.image ? (
            <div className="relative h-6 w-6 shrink-0 overflow-hidden rounded-full border border-white/10">
              <Image
                src={`/images/modules/module-part/${attr.image}`}
                alt={attr.name}
                fill
                sizes="24px"
                className="object-cover"
              />
            </div>
          ) : (
            <div className="h-6 w-6 shrink-0 rounded-full border border-white/10 bg-white/5" />
          )}
          <span className="flex-1 truncate text-sm text-gray-200">{attr.name}</span>
          <span className="text-sm font-semibold text-purple-300">{attr.total}</span>
          <span
            className={cn(
              'rounded-full px-2 py-0.5 text-xs font-bold',
              attr.level >= 5
                ? 'bg-yellow-500/20 text-yellow-300'
                : attr.level >= 3
                  ? 'bg-purple-500/20 text-purple-300'
                  : 'bg-blue-500/20 text-blue-300'
            )}
          >
            Lv. {attr.level}
          </span>
        </div>
      ))}
    </div>
  )
}

const MIN_MODULES_REQUIRED = 4

const roleOptions: { value: RoleFilter; label: string; description: string }[] = [
  { value: 'all', label: 'All Modules', description: 'No filtering applied' },
  { value: 'dps', label: 'DPS (Attack)', description: 'Prioritize offensive cores' },
  { value: 'healer', label: 'Healer (Support)', description: 'Utility + sustain modules' },
  { value: 'tank', label: 'Tank (Defense)', description: 'High sustain, mitigation' },
  { value: 'dpsHealer', label: 'DPS + Healer', description: 'Hybrid attack/support' },
]

const scoringModes: { value: OptionsState['scoringMode']; label: string; description: string }[] = [
  {
    value: 'combat',
    label: 'Combat Power',
    description: 'Includes total link bonuses and priority multipliers',
  },
  {
    value: 'levels',
    label: 'Level Weights',
    description: 'Rewards hitting higher tiers evenly across stats',
  },
]

const speedPresets: { value: number; label: string; desc: string }[] = [
  { value: 20, label: 'Fastest', desc: '~1k combos' },
  { value: 40, label: 'Fast', desc: '~90k combos' },
  { value: 60, label: 'Balanced', desc: '~500k combos' },
  { value: 80, label: 'Thorough', desc: '~1.6M combos' },
  { value: 100, label: 'Exhaustive', desc: '~4M combos' },
]
const selectTriggerClass =
  'h-11 rounded-lg border border-white/10 bg-[rgba(5,7,16,0.9)] px-3 text-left text-sm text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20 data-[state=open]:border-purple-400/50'
const selectContentClass = 'bg-[rgba(4,5,12,0.98)] border border-white/10 backdrop-blur-xl text-white shadow-xl'

function OptionField({
  label,
  hint,
  children,
  action,
}: {
  label: string
  hint?: string
  children: React.ReactNode
  action?: React.ReactNode
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-gray-400">{label}</p>
          {hint && <p className="text-xs text-gray-500">{hint}</p>}
        </div>
        {action}
      </div>
      {children}
    </div>
  )
}

function TabButton({
  label,
  active,
  onClick,
  count,
}: {
  label: string
  active: boolean
  onClick: () => void
  count?: number
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'relative overflow-hidden rounded-2xl border px-5 py-2.5 text-sm font-semibold transition-colors',
        active
          ? 'border-purple-400/70 bg-purple-500/20 text-white shadow-lg shadow-purple-500/25'
          : 'border-white/10 bg-white/5 text-gray-300 hover:text-white hover:border-purple-400/50'
      )}
    >
      <span className="relative z-10 flex items-center gap-2">
        {label}
        {typeof count === 'number' && (
          <span className="rounded-full bg-black/40 px-2 py-0.5 text-xs font-medium text-gray-300">
            {count}
          </span>
        )}
      </span>
      {active && (
        <span className="absolute inset-0 bg-linear-to-r from-purple-500/25 to-transparent" aria-hidden />
      )}
    </button>
  )
}

function ModuleCard({
  module,
  isSelected,
  onToggle,
}: {
  module: ModuleItem
  isSelected?: boolean
  onToggle?: () => void
}) {
  const qualityClass = QUALITY_COLORS[module.quality] ?? QUALITY_COLORS[2]
  const linkPoints = module.parts.reduce((sum, part) => sum + (part.value ?? 0), 0)

  return (
    <div
      onClick={onToggle}
      className={cn(
        'relative flex flex-col gap-3 rounded-2xl border p-4 transition-all',
        qualityClass,
        isSelected
          ? 'border-purple-400/70 shadow-lg shadow-purple-500/25'
          : 'hover:border-purple-400/40 cursor-pointer'
      )}
    >
      <div className="flex items-start gap-3">
        {module.moduleImage ? (
          <div className="relative h-16 w-16 overflow-hidden rounded-xl border border-purple-500/30 bg-black/30">
            <Image
              src={`/images/modules/module-image/${module.moduleImage}`}
              alt={module.moduleName}
              fill
              sizes="64px"
              className="object-cover"
              unoptimized
            />
          </div>
        ) : (
          <div className="h-16 w-16 rounded-xl border border-white/10 bg-white/5" />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-[0.65rem] uppercase tracking-[0.35em] text-gray-400">
                {module.category}
              </p>
              <h3 className="text-base font-semibold text-white truncate">
                {module.moduleName}
              </h3>
            </div>
          </div>
          <div className="mt-2 flex items-center gap-3 text-xs text-gray-400">
            <span className="rounded-full border border-purple-400/40 bg-purple-500/10 px-2 py-0.5 text-gray-200">
              {linkPoints} Pts
            </span>
            <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5">
              Qty ×{module.count}
            </span>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs text-gray-300">
        {module.parts.slice(0, 6).map((part) => (
          <div
            key={`${module.uuid}-${part.id}`}
            className="flex items-center gap-2 rounded-xl border border-white/5 bg-black/30 px-2 py-1"
            title={`${part.name}: ${part.value} Link Points`}
          >
            {part.image && (
              <div className="relative h-5 w-5 overflow-hidden rounded-full border border-white/5">
                <Image
                  src={`/images/modules/module-part/${part.image}`}
                  alt={part.name}
                  fill
                  sizes="20px"
                  className="object-cover"
                />
              </div>
            )}
            <span className="truncate text-[0.75rem] text-gray-200">{part.name}</span>
            <span className="font-semibold text-purple-300">{part.value}</span>
          </div>
        ))}
      </div>
      {isSelected && (
        <span className="absolute -right-1 -top-1 rounded-full bg-purple-500 p-1 text-white">
          <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
            <path
              fillRule="evenodd"
              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
              clipRule="evenodd"
            />
          </svg>
        </span>
      )}
    </div>
  )
}

export default function ProfileModulesPage() {
  const [selected, setSelected] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'inventory' | 'optimizer'>('optimizer')
  const [isOptimizing, setIsOptimizing] = useState(false)
  const [progress, setProgress] = useState<OptimizerProgress | null>(null)
  const [optimizerResult, setOptimizerResult] = useState<OptimizerResult | null>(null)
  const [optimizerError, setOptimizerError] = useState<string | null>(null)

  const [options, setOptions] = useState<OptionsState>(() => ({
    scoringMode: 'combat',
    roleFilter: 'all',
    skillPriorities: [],
    maxCandidates: 20,
  }))
  const [showFilters, setShowFilters] = useState(true)

  const { data: charsData, isLoading: isCharsLoading } = useQuery({
    queryKey: ['player', 'characters'],
    queryFn: () => getCharacters(),
    staleTime: 1000 * 60 * 5,
  })

  const characters = useMemo(() => charsData?.characters ?? [], [charsData])

  const clearOptimizerOutput = useCallback(() => {
    setOptimizerResult(null)
    setOptimizerError(null)
  }, [])

  useEffect(() => {
    if (!selected && characters.length === 1) {
      setSelected(characters[0].characterId)
    }
  }, [characters, selected])

  useEffect(() => {
    if (selected && characters.length > 0) {
      const exists = characters.some((c) => c.characterId === selected)
      if (!exists) {
        setSelected(null)
      }
    }
  }, [characters, selected])

  const moduleQuery = useQuery<GetModuleDataResponse | null>({
    queryKey: ['moduleData', selected],
    queryFn: async () => {
      if (!selected) return null
      return getModuleData({ charId: selected })
    },
    enabled: !!selected,
    staleTime: 1000 * 60 * 2,
  })

  const parsedModules = useMemo<ParsedModule[] | null>(() => {
    const data = moduleQuery.data
    if (!data) return null
    return parseModuleData(data.mod, data.itemPackage5)
  }, [moduleQuery.data])

  const allModuleItems = useMemo<ModuleItem[]>(() => {
    if (!parsedModules) return []
    return parsedModules.map(parsedModuleToItem)
  }, [parsedModules])

    console.log(parsedModules)

  const filteredModuleItems = useMemo<ModuleItem[]>(() => {
    return filterModulesByRole(allModuleItems, options.roleFilter)
  }, [allModuleItems, options.roleFilter])

  const attrOptions = useMemo(() => {
    return Object.entries(moduleData.AttrData ?? {})
      .map(([id, v]) => ({ id, name: (v as { name: string }).name }))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [])

  const activeSpeedPreset = speedPresets.find((preset) => preset.value === options.maxCandidates)
  const isModuleLoading = moduleQuery.isLoading || moduleQuery.isFetching

  const handleCharacterChange = useCallback((value: string) => {
    const next = value === 'none' ? null : value
    setSelected(next)
    clearOptimizerOutput()
    setProgress(null)
  }, [clearOptimizerOutput])

  const handleRoleFilterChange = useCallback((value: RoleFilter) => {
    setOptions((prev) =>
      produce(prev, (draft) => {
        draft.roleFilter = value
      })
    )
    clearOptimizerOutput()
  }, [clearOptimizerOutput])

  const handleScoringModeChange = useCallback((mode: OptionsState['scoringMode']) => {
    setOptions((prev) =>
      produce(prev, (draft) => {
        draft.scoringMode = mode
      })
    )
    clearOptimizerOutput()
  }, [clearOptimizerOutput])

  const handleAddPriorityRequirement = useCallback(() => {
    setOptions((prev) =>
      produce(prev, (draft) => {
        draft.skillPriorities.push({ attrId: '', minLevel: 1 })
      })
    )
    clearOptimizerOutput()
  }, [clearOptimizerOutput])

  const handlePriorityAttrChange = useCallback((index: number, attrId: string) => {
    setOptions((prev) =>
      produce(prev, (draft) => {
        if (!draft.skillPriorities[index]) return
        draft.skillPriorities[index].attrId = attrId === 'none' ? '' : attrId
      })
    )
    clearOptimizerOutput()
  }, [clearOptimizerOutput])

  const handlePriorityLevelChange = useCallback((index: number, level: number) => {
    setOptions((prev) =>
      produce(prev, (draft) => {
        if (!draft.skillPriorities[index]) return
        draft.skillPriorities[index].minLevel = Math.min(Math.max(level, 1), 6)
      })
    )
    clearOptimizerOutput()
  }, [clearOptimizerOutput])

  const handleRemovePriority = useCallback((index: number) => {
    setOptions((prev) =>
      produce(prev, (draft) => {
        draft.skillPriorities.splice(index, 1)
      })
    )
    clearOptimizerOutput()
  }, [clearOptimizerOutput])

  const handleResetPriorities = useCallback(() => {
    setOptions((prev) =>
      produce(prev, (draft) => {
        draft.skillPriorities = []
      })
    )
    clearOptimizerOutput()
  }, [clearOptimizerOutput])

  const handleMaxCandidatesChange = useCallback((value: number) => {
    setOptions((prev) =>
      produce(prev, (draft) => {
        draft.maxCandidates = value
      })
    )
    clearOptimizerOutput()
  }, [clearOptimizerOutput])

  const handleOptimize = useCallback(async () => {
    if (filteredModuleItems.length < MIN_MODULES_REQUIRED || isOptimizing || !selected) {
      return
    }

    setIsOptimizing(true)
    setProgress(null)
    setOptimizerError(null)

    try {
      const result = await moduleOptimizerAsync(filteredModuleItems, options, (prog) => {
        setProgress(prog)
      })
      if (result) {
        setOptimizerResult(result)
        setOptimizerError(null)
      } else {
        setOptimizerResult(null)
        setOptimizerError('No valid combinations met your current requirements. Adjust your filters or tiers and try again.')
      }
    } catch (error) {
      console.error('Failed to run module optimizer', error)
      setOptimizerResult(null)
      setOptimizerError('Optimizer failed to run. Please try again.')
    } finally {
      setIsOptimizing(false)
    }
  }, [filteredModuleItems, isOptimizing, options, selected])

  const isInBestSet = useCallback(
    (uuid: string) => optimizerResult?.bestSet.some((m) => m.uuid === uuid) ?? false,
    [optimizerResult]
  )

  const validTopResults = useMemo(() => {
    if (!optimizerResult) return []
    return optimizerResult.topResults.filter((result) => {
      const modules = result.modules.filter((mod): mod is ModuleItem => Boolean(mod))
      return modules.length >= MIN_MODULES_REQUIRED
    })
  }, [optimizerResult])

  const showNoValidResults = optimizerError && (!optimizerResult || validTopResults.length === 0)

  const disableOptimizeButton = !selected || filteredModuleItems.length < MIN_MODULES_REQUIRED || isOptimizing
  const optimizeLabel = !selected
    ? 'Select a character'
    : filteredModuleItems.length < MIN_MODULES_REQUIRED
      ? `Need ${MIN_MODULES_REQUIRED} modules (have ${filteredModuleItems.length})`
      : `Optimize (${filteredModuleItems.length} modules)`

  return (
    <div className="mt-24 mb-20 px-4">
      <div className="mx-auto max-w-7xl space-y-8">
        <div className="flex flex-wrap items-center justify-between gap-6 rounded-2xl border border-white/10 bg-[rgba(5,7,16,0.9)] px-6 py-6 shadow-xl shadow-black/30">
          <div className="flex items-center gap-3 text-white">
            <Sparkles className="h-5 w-5 text-purple-300" />
            <h1 className="text-3xl font-semibold">Module Optimizer</h1>
          </div>
          <div className="w-full max-w-sm space-y-2">
            <p className="text-xs uppercase tracking-[0.35em] text-gray-400">Character</p>
            <Select
              value={selected ?? 'none'}
              onValueChange={handleCharacterChange}
              disabled={isCharsLoading || !characters.length}
            >
              <SelectTrigger className={selectTriggerClass}>
                <SelectValue placeholder={isCharsLoading ? 'Loading characters…' : 'Select a character'} />
              </SelectTrigger>
              <SelectContent className={selectContentClass}>
                <SelectItem value="none" className="text-sm text-gray-300">
                  Select Character
                </SelectItem>
                {characters.map((char) => (
                  <SelectItem key={char.characterId} value={char.characterId} className="cursor-pointer text-sm text-white">
                    <div className="flex items-center gap-2">
                      {char.profileUrl && (
                        <div className="relative h-6 w-6 overflow-hidden rounded-full border border-purple-500/40">
                          <Image
                            src={char.profileUrl}
                            alt={char.characterName}
                            fill
                            sizes="24px"
                            className="object-cover"
                            unoptimized
                          />
                        </div>
                      )}
                      <span>{char.characterName}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {isModuleLoading && selected && (
              <p className="text-xs text-gray-400">Syncing latest modules…</p>
            )}
          </div>
        </div>

        <GlassCard className="space-y-5" hover={false}>
          <button
            type="button"
            onClick={() => setShowFilters((prev) => !prev)}
            className={cn(
              'flex w-full items-center justify-between gap-3 text-left text-white transition-colors',
              showFilters ? 'border-b border-white/5 pb-4' : 'pb-0'
            )}
            aria-expanded={showFilters}
          >
            <div className="flex items-center gap-3">
              <SlidersHorizontal className="h-5 w-5 text-purple-300" />
              <div>
                <h2 className="text-lg font-semibold">Filter Options</h2>
                <p className="text-xs text-gray-400">Role filters, scoring mode, search depth, and priorities</p>
              </div>
            </div>
            <ChevronDown
              className={cn(
                'h-4 w-4 text-gray-400 transition-transform',
                showFilters ? 'rotate-180' : 'rotate-0'
              )}
              aria-hidden
            />
          </button>

          <div className={cn('space-y-6', showFilters ? 'block' : 'hidden')} aria-hidden={!showFilters}>
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              <OptionField label="Role Filter" hint="Keep only relevant module types">
                <Select value={options.roleFilter} onValueChange={(value) => handleRoleFilterChange(value as RoleFilter)}>
                  <SelectTrigger className={selectTriggerClass}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className={selectContentClass}>
                      {roleOptions.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value} className="text-left text-sm text-white">
                        <div>
                          <p className="font-medium">{opt.label}</p>
                          <p className="text-xs text-gray-400">{opt.description}</p>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </OptionField>

              <OptionField label="Scoring Mode" hint="Choose how levels are valued">
                <Select value={options.scoringMode} onValueChange={(value) => handleScoringModeChange(value as OptionsState['scoringMode'])}>
                  <SelectTrigger className={selectTriggerClass}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className={selectContentClass}>
                      {scoringModes.map((mode) => (
                        <SelectItem key={mode.value} value={mode.value} className="text-left text-sm text-white">
                        <div>
                          <p className="font-medium">{mode.label}</p>
                          <p className="text-xs text-gray-400">{mode.description}</p>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </OptionField>

              <OptionField label="Search Depth" hint={activeSpeedPreset?.desc ?? 'Adjust depth to change combos'}>
                <div className="space-y-4">
                  <div className="flex items-center justify-between text-[0.65rem] uppercase tracking-[0.35em] text-gray-400">
                    <span>Fast</span>
                    <span>Thorough</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <input
                      type="range"
                      min={20}
                      max={100}
                      step={20}
                      value={options.maxCandidates}
                      onChange={(e) => handleMaxCandidatesChange(Number(e.target.value))}
                      className="h-2 flex-1 appearance-none rounded-full bg-black/40 accent-purple-500"
                    />
                  </div>
                </div>
              </OptionField>
            </div>

            <div className="rounded-2xl border border-purple-500/20 bg-black/40 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs text-gray-400">
                    Add minimum tier requirements to force the optimizer to keep only modules that hit those levels.
                  </p>
                  <p className="text-xs text-gray-400">
                    Adding too many requirements may result in zero valid combinations.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {options.skillPriorities.length > 0 && (
                    <button
                      type="button"
                      onClick={handleResetPriorities}
                      className="text-xs text-gray-400 underline-offset-2 hover:underline"
                    >
                      Clear All
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleAddPriorityRequirement}
                    className="flex items-center gap-2 rounded-full border border-purple-400/40 px-3 py-1.5 text-xs font-semibold text-purple-200 hover:border-purple-300"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add Requirement
                  </button>
                </div>
              </div>

              {options.skillPriorities.length === 0 ? (
                <p className="mt-4 text-sm text-gray-400">No priority requirements added.</p>
              ) : (
                <div className="mt-4 space-y-3">
                  {options.skillPriorities.map((priority, index) => (
                    <div key={`${priority.attrId || 'attr'}-${index}`} className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="flex-1 space-y-2">
                          <p className="text-[0.65rem] uppercase tracking-[0.35em] text-gray-400">Attribute</p>
                          <Select
                            value={priority.attrId || 'none'}
                            onValueChange={(value) => handlePriorityAttrChange(index, value)}
                          >
                            <SelectTrigger className={selectTriggerClass}>
                              <SelectValue placeholder="Select attribute" />
                            </SelectTrigger>
                            <SelectContent className={selectContentClass}>
                              <SelectItem value="none" className="text-sm text-gray-300">
                                Any Attribute
                              </SelectItem>
                              {attrOptions.map((attr) => (
                                <SelectItem key={attr.id} value={attr.id} className="text-sm text-white">
                                  {attr.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemovePriority(index)}
                          className="rounded-full border border-white/10 p-2 text-gray-400 hover:text-white"
                          aria-label="Remove requirement"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="space-y-2">
                        <p className="text-[0.65rem] uppercase tracking-[0.35em] text-gray-400">Minimum Tier</p>
                        <Select
                          value={priority.minLevel.toString()}
                          onValueChange={(value) => handlePriorityLevelChange(index, Number(value))}
                        >
                          <SelectTrigger className={selectTriggerClass}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className={selectContentClass}>
                            {Array.from({ length: 6 }).map((_, levelIndex) => {
                              const level = levelIndex + 1
                              return (
                                <SelectItem key={level} value={level.toString()} className="text-sm text-white">
                                  Tier {level}
                                </SelectItem>
                              )
                            })}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </GlassCard>

        <GlassCard className="space-y-4" hover={false}>
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/5 pb-4 text-white">
            <div>
              <h2 className="text-xl font-semibold">Optimizer Control</h2>
              <p className="text-xs text-gray-400">
                {selected ? `${filteredModuleItems.length} modules eligible` : 'Select a character to enable optimization'}
              </p>
            </div>
            <button
              type="button"
              onClick={handleOptimize}
              disabled={disableOptimizeButton}
              className={cn(
                'flex items-center justify-center gap-2 rounded-2xl px-5 py-2.5 text-sm font-semibold transition-colors',
                disableOptimizeButton
                  ? 'cursor-not-allowed border border-white/10 bg-white/5 text-gray-400'
                  : 'bg-purple-600 text-white hover:bg-purple-500'
              )}
            >
              {isOptimizing ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                  Crunching…
                </>
              ) : (
                <>
                  <Target className="h-4 w-4" />
                  {optimizeLabel}
                </>
              )}
            </button>
          </div>
          {progress && (
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-xs text-gray-400">
              <div className="flex items-center justify-between text-white">
                <span>{progress.phase === 'complete' ? 'Optimization complete' : `Phase: ${progress.phase}`}</span>
                <span>{progress.percentage}%</span>
              </div>
              <div className="mt-2 h-2 rounded-full bg-black/40">
                <div
                  className="h-full rounded-full bg-linear-to-r from-purple-500 to-pink-500"
                  style={{ width: `${Math.min(progress.percentage, 100)}%` }}
                />
              </div>
              <div className="mt-3 flex flex-wrap gap-4 text-sm font-mono text-gray-200">
                <span>Combos {progress.current.toLocaleString()} / {progress.total.toLocaleString()}</span>
                <span>Best {progress.bestScoreSoFar.toLocaleString()}</span>
                <span>Time {(progress.elapsedMs / 1000).toFixed(1)}s</span>
              </div>
            </div>
          )}
        </GlassCard>

        <div className="flex gap-3">
          <TabButton label="Optimizer Results" active={activeTab === 'optimizer'} onClick={() => setActiveTab('optimizer')} />
          <TabButton label="Module Inventory" active={activeTab === 'inventory'} onClick={() => setActiveTab('inventory')} count={allModuleItems.length} />
        </div>

        {activeTab === 'optimizer' && (
          <div className="space-y-6">
            {!selected && (
              <GlassCard className="p-8 text-center" hover={false}>
                <p className="text-gray-400">Pick a character to load their modules.</p>
              </GlassCard>
            )}

            {selected && filteredModuleItems.length < MIN_MODULES_REQUIRED && (
              <GlassCard className="p-8 text-center" hover={false}>
                <p className="text-gray-400">
                  {filteredModuleItems.length === 0
                    ? 'No modules match the current role filter.'
                    : `Need at least ${MIN_MODULES_REQUIRED} modules. Only ${filteredModuleItems.length} available.`}
                </p>
              </GlassCard>
            )}

            {validTopResults.length > 0 && (
              <div className="space-y-6">
                {validTopResults.slice(0, 5).map((result, index) => {
                  const modules = result.modules.filter((mod): mod is ModuleItem => Boolean(mod))
                  if (modules.length < MIN_MODULES_REQUIRED) {
                    return null
                  }
                  const comboKey = modules.map((m) => m.uuid).join('-') || `${index}-combo`
                  return (
                    <GlassCard key={comboKey} className="space-y-5" hover={false}>
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div>
                        <p className="text-xs uppercase tracking-[0.35em] text-gray-500">Combination #{index + 1}</p>
                        <h2 className="text-2xl font-semibold text-white">
                          {index === 0 ? 'Best Combination Found' : 'Alternative Best Set'}
                        </h2>
                      </div>
                      <div className="flex flex-wrap items-center gap-3">
                        <div className="rounded-2xl border border-purple-400/40 bg-purple-500/10 px-4 py-2 text-sm text-purple-100">
                          Total Score
                          <span className="ml-2 text-lg font-bold text-white">{result.score.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <p className="text-xs uppercase tracking-[0.3em] text-gray-400">Attribute Totals</p>
                      <AttributeSummary perAttribute={result.breakdown.perAttribute} />
                    </div>
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                      {modules.map((mod) => (
                        <ModuleCard key={`${index}-${mod.uuid}`} module={mod} />
                      ))}
                    </div>
                    {index === 0 && progress && (
                      <p className="text-xs text-gray-400">
                        {progress.total.toLocaleString()} combos searched in {(progress.elapsedMs / 1000).toFixed(2)}s
                      </p>
                    )}
                    </GlassCard>
                  )
                })}
              </div>
            )}

            {showNoValidResults && (
              <div className="rounded-2xl border border-red-500/60 bg-red-500/10 p-8 text-center">
                <p className="text-lg font-semibold text-red-200">{optimizerError}</p>
                <p className="mt-2 text-sm text-red-200/80">
                  Try loosening requirements, lowering minimum tiers, or selecting a different role to continue.
                </p>
              </div>
            )}

            {selected && filteredModuleItems.length >= MIN_MODULES_REQUIRED && !optimizerResult && (
              <GlassCard className="p-8 text-center" hover={false}>
                <p className="text-gray-400">Ready when you are — hit Optimize to generate a best-in-slot set.</p>
              </GlassCard>
            )}
          </div>
        )}

        {activeTab === 'inventory' && (
          <div className="space-y-4">
            <GlassCard className="flex flex-wrap items-center justify-between gap-3" hover={false}>
              <div className="flex items-center gap-2 text-white">
                <Filter className="h-4 w-4 text-purple-300" />
                <div>
                  <p className="text-sm font-semibold">Module Inventory</p>
                  <p className="text-xs text-gray-400">{filteredModuleItems.length} modules currently visible</p>
                </div>
              </div>
            </GlassCard>

            {!selected && (
              <GlassCard className="p-8 text-center" hover={false}>
                <p className="text-gray-400">Select a character to inspect their modules.</p>
              </GlassCard>
            )}

            {selected && allModuleItems.length === 0 && (
              <GlassCard className="p-8 text-center" hover={false}>
                <p className="text-gray-400">No modules were returned for this character.</p>
              </GlassCard>
            )}

            {allModuleItems.length > 0 && (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {allModuleItems.map((mod) => (
                  <ModuleCard key={mod.uuid} module={mod} isSelected={isInBestSet(mod.uuid)} />
                ))}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  )
}

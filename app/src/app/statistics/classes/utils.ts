import { CLASS_MAP, CLASS_COLORS, CLASS_SPEC_MAP } from "@/utils/classData"
import type { ClassStatsItem, Outlier } from "@/api/statistics/statistics"

export interface QuartileData {
  min: number
  q1: number
  median: number
  q3: number
  max: number
  avg: number
  outliers: number[]
}

export function getQuartiles(item: ClassStatsItem, metric: 'dps' | 'hps'): QuartileData {
  if (metric === 'dps') {
    return {
      min: item.dps_min,
      q1: item.dps_q1,
      median: item.dps_median,
      q3: item.dps_q3,
      max: item.dps_max,
      avg: item.avg_dps,
      outliers: item.outliers?.filter(o => o.type === 'dps').map(o => o.value) || []
    }
  } else {
    return {
      min: item.hps_min,
      q1: item.hps_q1,
      median: item.hps_median,
      q3: item.hps_q3,
      max: item.hps_max,
      avg: item.avg_hps,
      outliers: item.outliers?.filter(o => o.type === 'hps').map(o => o.value) || []
    }
  }
}

export function getClassInfo(classSpec: number) {
  const classSpecName = CLASS_SPEC_MAP[classSpec]
  const specId = classSpec
  const classId = getClassIdFromSpec(specId)
  const className = classId ? CLASS_MAP[classId] : ''
  const classColor = className ? CLASS_COLORS[className] : '#8b5cf6'
  
  return {
    name: classSpecName,
    className,
    color: classColor,
    hasValidMapping: !!(classId && className)
  }
}

export function filterAndSortData(data: ClassStatsItem[], metric: 'dps' | 'hps'): ClassStatsItem[] {
  return data
    .filter(item => item.class_spec !== -1 && CLASS_SPEC_MAP[item.class_spec])
    .sort((a, b) => {
      const aQuartiles = getQuartiles(a, metric)
      const bQuartiles = getQuartiles(b, metric)
      return bQuartiles.median - aQuartiles.median // Best performance at top
    })
}

export function getClassIdFromSpec(specId: number): number | null {
  if (specId === 1 || specId === 2) return 1
  if (specId === 3 || specId === 4) return 2
  if (specId === 5 || specId === 6) return 4
  if (specId === 7 || specId === 8) return 5
  if (specId === 9 || specId === 10) return 9
  if (specId === 11 || specId === 12) return 11
  if (specId === 13 || specId === 14) return 12
  if (specId === 15 || specId === 16) return 13
  return null
}

export function formatNumber(num: number): string {
  return num.toFixed(0)
}

export function calculateScale(data: ClassStatsItem[], metric: 'dps' | 'hps'): {
  scale: number
  maxValue: number
} {
  const maxValue = Math.max(...data.map(item => {
    const quartiles = getQuartiles(item, metric)
    return Math.max(quartiles.max, ...quartiles.outliers)
  }))
  return {
    scale: 100 / maxValue, // Convert to percentage width
    maxValue
  }
}
import { BoxPlot } from "./BoxPlot"
import { getQuartiles, getClassInfo, formatNumber } from "../utils"
import type { ClassStatsItem } from "@/api/statistics/statistics"

interface PlotRowProps {
  item: ClassStatsItem
  metric: 'dps' | 'hps'
  scale: number
}

export function PlotRow({ item, metric, scale }: PlotRowProps) {
  const quartiles = getQuartiles(item, metric)
  const classInfo = getClassInfo(item.class_spec)

  if (!classInfo.hasValidMapping) {
    return null
  }

  return (
    <div className="flex items-center gap-3">
      {/* Left-aligned label */}
      <div className="flex items-center gap-2 w-48 shrink-0">
        <div
          className="w-3 h-3 rounded-full border-2"
          style={{ backgroundColor: classInfo.color, borderColor: classInfo.color + '40' }}
        />
        <span className="text-xs font-semibold text-gray-200 truncate">{classInfo.name}</span>
      </div>

      {/* Plot area */}
      <div className="flex-1">
        <BoxPlot
          quartiles={quartiles}
          classColor={classInfo.color}
          scale={scale}
        />
      </div>
    </div>
  )
}
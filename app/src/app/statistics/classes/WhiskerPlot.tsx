import React from "react"
import { PlotHeader } from "./components/PlotHeader"
import { PlotRow } from "./components/PlotRow"
import { filterAndSortData, calculateScale } from "./utils"
import type { ClassStatsItem } from "@/api/statistics/statistics"

interface WhiskerPlotProps {
  title: string
  data: ClassStatsItem[]
  metric: 'dps' | 'hps'
  className?: string
  limit?: number
  subtitle?: string
}

export function WhiskerPlot({ title, data, metric, className = "", limit, subtitle }: WhiskerPlotProps) {
  // Filter out unknown classes and sort by median performance
  let validData = filterAndSortData(data, metric)

  // Apply limit if specified
  if (limit && limit > 0) {
    validData = validData.slice(0, limit)
  }

  if (validData.length === 0) {
    return (
      <div className={`rounded-2xl border border-gray-800/80 bg-linear-to-br from-gray-900/90 via-gray-900/80 to-gray-900/70 backdrop-blur-md p-6 ${className}`}>
        <PlotHeader title={title} subtitle={subtitle} />
        <p className="text-gray-400">No data available{subtitle ? ` for ${subtitle}` : ''}</p>
      </div>
    )
  }

  const { scale, maxValue } = calculateScale(validData, metric)

  return (
    <div className={`rounded-2xl border border-gray-800/80 bg-linear-to-br from-gray-900/90 via-gray-900/80 to-gray-900/70 backdrop-blur-md p-5 transition-all duration-300 hover:border-purple-500/50 hover:shadow-xl hover:shadow-purple-500/10 ${className}`}>
      <PlotHeader title={title} subtitle={subtitle} />

      <div className="space-y-2 mt-4">
        {validData.map((item) => (
          <PlotRow
            key={item.class_spec}
            item={item}
            metric={metric}
            scale={scale}
          />
        ))}
      </div>


      {/* Legend */}
      <div className="mt-3 pt-3 border-t border-gray-700/50">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-3 text-gray-400">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-0.5 bg-white"></div>
              <span>Median</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-yellow-400"></div>
              <span>Mean</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-red-400 border border-red-300"></div>
              <span>Outliers</span>
            </div>
          </div>
          <span className="text-gray-500 text-xs">Hover for details • Sorted by median</span>
        </div>
      </div>
    </div>
  )
}
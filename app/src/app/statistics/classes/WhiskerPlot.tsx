import React from "react"
import { ApexBoxPlot } from "./components/ApexBoxPlot"
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
  return (
    <ApexBoxPlot
      title={title}
      data={data}
      metric={metric}
      className={className}
      limit={limit}
      subtitle={subtitle}
    />
  )
}
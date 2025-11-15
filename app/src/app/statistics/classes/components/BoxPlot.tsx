import { CHART_CONFIG } from "../constants"
import type { QuartileData } from "../utils"
import { useState } from "react"

interface BoxPlotProps {
  quartiles: QuartileData
  classColor: string
  scale: number
}

export function BoxPlot({ quartiles, classColor, scale }: BoxPlotProps) {
  const [showTooltip, setShowTooltip] = useState(false)
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 })

  // Calculate positions as percentages
  const minPos = quartiles.min * scale
  const q1Pos = quartiles.q1 * scale
  const medianPos = quartiles.median * scale
  const q3Pos = quartiles.q3 * scale
  const maxPos = quartiles.max * scale

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    setTooltipPos({ x: e.clientX - rect.left, y: e.clientY - rect.top })
  }

  const formatValue = (val: number) => val.toFixed(1)

  return (
    <div
      className="relative h-6 bg-gray-800/60 rounded-lg overflow-visible cursor-pointer"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
      onMouseMove={handleMouseMove}
    >
      {/* Main visualization */}
      <div className="absolute inset-0 flex items-center">
        {/* Whisker line */}
        <div
          className="absolute h-0.5"
          style={{
            left: `${minPos}%`,
            width: `${maxPos - minPos}%`,
            backgroundColor: classColor + '40'
          }}
        />

        {/* Box (Q1 to Q3) */}
        <div
          className="absolute h-4 rounded"
          style={{
            left: `${q1Pos}%`,
            width: `${q3Pos - q1Pos}%`,
            backgroundColor: classColor + '60',
            border: `1px solid ${classColor}`,
            top: '50%',
            transform: 'translateY(-50%)'
          }}
        />

        {/* Median line */}
        <div
          className="absolute w-0.5 h-5 bg-white"
          style={{
            left: `${medianPos}%`,
            top: '50%',
            transform: 'translateY(-50%)'
          }}
        />

        {/* Mean indicator */}
        <div
          className="absolute w-1 h-3 rounded-full bg-yellow-400"
          style={{
            left: `${quartiles.avg * scale}%`,
            top: '50%',
            transform: 'translateY(-50%)'
          }}
          title={`Mean: ${quartiles.avg.toFixed(1)}`}
        />

        {/* Outliers */}
        {quartiles.outliers.map((outlier, idx) => (
          <div
            key={idx}
            className="absolute w-1.5 h-1.5 rounded-full bg-red-400 border border-red-300"
            style={{
              left: `${outlier * scale}%`,
              top: '50%',
              transform: 'translateY(-50%)'
            }}
          />
        ))}
      </div>

      {/* Tooltip */}
      {showTooltip && (
        <div
          className="absolute z-50 pointer-events-none"
          style={{
            left: tooltipPos.x,
            top: tooltipPos.y - 10,
            transform: 'translate(-50%, -100%)'
          }}
        >
          <div className="bg-gray-900 border border-gray-700 rounded-lg shadow-xl p-3 text-xs whitespace-nowrap">
            <div className="space-y-1">
              <div className="flex justify-between gap-4">
                <span className="text-gray-400">Lower Outlier:</span>
                <span className="text-white font-semibold">{formatValue(quartiles.min)}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-gray-400">Q1 (25%):</span>
                <span className="text-white font-semibold">{formatValue(quartiles.q1)}</span>
              </div>
              <div className="flex justify-between gap-4 border-t border-gray-700 pt-1">
                <span className="text-gray-400">Median:</span>
                <span className="text-white font-bold">{formatValue(quartiles.median)}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-gray-400">Average:</span>
                <span className="text-yellow-400 font-semibold">{formatValue(quartiles.avg)}</span>
              </div>
              <div className="flex justify-between gap-4 border-t border-gray-700 pt-1">
                <span className="text-gray-400">Q3 (75%):</span>
                <span className="text-white font-semibold">{formatValue(quartiles.q3)}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-gray-400">Upper Outlier:</span>
                <span className="text-white font-semibold">{formatValue(quartiles.max)}</span>
              </div>
              {quartiles.outliers.length > 0 && (
                <div className="flex justify-between gap-4 border-t border-gray-700 pt-1">
                  <span className="text-gray-400">Outliers:</span>
                  <span className="text-red-400 font-semibold">{quartiles.outliers.length}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
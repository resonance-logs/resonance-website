interface PlotLegendProps {
  maxValue: number
}

export function PlotLegend({ maxValue }: PlotLegendProps) {
  const marks = [
    { label: "0", value: 0 },
    { label: (maxValue * 0.25).toFixed(0), value: maxValue * 0.25 },
    { label: (maxValue * 0.5).toFixed(0), value: maxValue * 0.5 },
    { label: (maxValue * 0.75).toFixed(0), value: maxValue * 0.75 },
    { label: maxValue.toFixed(0), value: maxValue },
  ]

  return (
    <div className="mt-4 pt-4 border-t border-gray-700/50">
      <div className="flex items-center justify-between text-xs text-gray-400">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            <div className="w-3 h-1 bg-white"></div>
            <span>Median</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-yellow-400"></div>
            <span>Mean</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-red-400 border border-red-300"></div>
            <span>Outliers</span>
          </div>
        </div>
        <span className="text-xs">Performance Range</span>
      </div>
      
      {/* Scale markers */}
      <div className="absolute inset-x-0 bottom-0 flex justify-between text-xs text-gray-500 px-2 -mt-4">
        {marks.map((mark) => (
          <span key={mark.label}>{mark.label}</span>
        ))}
      </div>
    </div>
  )
}
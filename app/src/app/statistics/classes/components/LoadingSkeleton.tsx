export function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      <div className="animate-pulse">
        <div className="h-8 w-64 rounded bg-gray-700/50 mb-2" />
        <div className="h-4 w-96 rounded bg-gray-700/50" />
      </div>
      
      {/* Plot skeletons */}
      {[1, 2].map((i) => (
        <div key={i} className="rounded-2xl border border-gray-800/80 bg-gray-900/50 p-6">
          <div className="h-6 w-48 rounded bg-gray-700/50 mb-4" />
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((j) => (
              <div key={j} className="space-y-2">
                <div className="flex justify-between">
                  <div className="h-4 w-32 rounded bg-gray-700/50" />
                  <div className="h-3 w-24 rounded bg-gray-700/50" />
                </div>
                <div className="h-8 rounded bg-gray-700/30" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
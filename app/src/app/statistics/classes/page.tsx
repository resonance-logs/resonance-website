"use client"

import React, { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { fetchClassStats, ClassStatsResponse, ClassStatsParams } from "@/api/statistics/statistics"
import { WhiskerPlot } from "./WhiskerPlot"
import { LoadingSkeleton } from "./components/LoadingSkeleton"
import { Filter } from "@/components/ui/Filter";
import SceneData from "@/data/SceneData.json"

export default function ClassesPage() {
  const [params, setParams] = useState<ClassStatsParams>({});

  const { data, isLoading, error } = useQuery<ClassStatsResponse>({
    queryKey: ["statisticsClasses", params],
    queryFn: () => fetchClassStats(Object.keys(params).length > 0 ? params : undefined),
    staleTime: 5 * 60 * 1000, // 5 minutes
  })

  const classes = data?.classes || []

  // Look up scene name for display
  const selectedSceneName = params.scene_id
    ? (SceneData as Record<string, { name: string }>)[String(params.scene_id)]?.name
    : undefined;

  return (
    <div className="min-h-screen text-white">
      <Filter
        params={params}
        setParams={setParams}
        config={{
          scene: true,
          sinceDays: true,
          duration: true,
          abilityScore: true,
        }}
      />

      <div className="max-w-7xl mx-auto py-20 px-6">
        {/* Header */}
        <div className="text-center mb-12 animate-fade-in">
          <div className="inline-flex items-center gap-3 px-6 py-2 rounded-full bg-purple-500/10 border border-purple-500/20 backdrop-blur-md mb-4">
            <div className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
            <p className="text-sm uppercase tracking-[0.35em] text-purple-300 font-semibold">Statistics</p>
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
            <span className="bg-linear-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
              Class Performance
            </span>
          </h1>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto">
            DPS and HPS performance analysis across all classes and specializations
          </p>
        </div>

        {/* Error state */}
        {error && !isLoading && (
          <div className="text-center py-12">
            <div className="inline-flex items-center gap-3 px-6 py-4 rounded-xl bg-red-500/10 border border-red-500/30">
              <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-red-400 font-medium">Failed to load class statistics</span>
            </div>
          </div>
        )}

        {/* Loading state */}
        {isLoading && <LoadingSkeleton />}

        {/* Data visualization */}
        {!isLoading && !error && (
          <div className="space-y-6">
            {/* DPS Performance */}
            <WhiskerPlot
              title="DPS Performance by Class Spec"
              subtitle={selectedSceneName ? `Scene: ${selectedSceneName}` : undefined}
              data={classes}
              metric="dps"
            />

            {/* HPS Performance */}
            <WhiskerPlot
              title="HPS Performance by Class Spec (Top 6)"
              subtitle={selectedSceneName ? `Scene: ${selectedSceneName}` : undefined}
              data={classes}
              metric="hps"
              limit={6}
            />
          </div>
        )}
      </div>

      <style jsx global>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fade-in {
          animation: fade-in 0.6s ease-out forwards;
          opacity: 0;
        }
      `}</style>
    </div>
  )
}

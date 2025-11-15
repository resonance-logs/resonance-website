"use client"

import React, { useEffect, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { fetchClassStats, ClassStatsResponse } from "@/api/statistics/statistics"
import { fetchEncounterScenes } from "@/api/encounter/encounter"
import { WhiskerPlot } from "./WhiskerPlot"
import { LoadingSkeleton } from "./components/LoadingSkeleton"
import SceneFilterDropdown from '@/components/ui/SceneFilterDropdown'

export default function ClassesPage() {
  const [sceneName, setSceneName] = useState<string>("")
  // Debounce the input so we don't fire a request on every keystroke
  const [debouncedScene, setDebouncedScene] = useState<string>(sceneName)
  useEffect(() => {
    const t = setTimeout(() => setDebouncedScene(sceneName), 350)
    return () => clearTimeout(t)
  }, [sceneName])

  // Fetch known scenes for dropdown - component will also fetch, we only need its side effects here
  useQuery<string[]>({
    queryKey: ["encounterScenes"],
    queryFn: () => fetchEncounterScenes(),
  })

  const { data, isLoading, error } = useQuery<ClassStatsResponse>({
    queryKey: ["statisticsClasses", debouncedScene],
    queryFn: () => fetchClassStats(debouncedScene ? { scene_name: debouncedScene } : undefined),
    staleTime: 5 * 60 * 1000, // 5 minutes
  })

  const classes = data?.classes || []

  return (
    <div className="min-h-screen text-white">
      <div className="max-w-7xl mx-auto py-6 px-4">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-1">Class Performance Statistics</h1>
          <p className="text-sm text-gray-400">
            DPS and HPS performance analysis across all classes and specializations
          </p>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium mb-1">Scene Name</label>
            <SceneFilterDropdown value={sceneName} onChange={(s) => setSceneName(s)} />
          </div>
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
              subtitle={debouncedScene ? `Scene: ${debouncedScene}` : undefined}
              data={classes}
              metric="dps"
            />

            {/* HPS Performance */}
            <WhiskerPlot
              title="HPS Performance by Class Spec (Top 6)"
              subtitle={debouncedScene ? `Scene: ${debouncedScene}` : undefined}
              data={classes}
              metric="hps"
              limit={6}
            />
          </div>
        )}
      </div>
    </div>
  )
}
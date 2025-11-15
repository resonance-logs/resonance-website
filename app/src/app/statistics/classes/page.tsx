"use client"

import React, { useState } from "react"
import { produce } from "immer"
import { useQuery } from "@tanstack/react-query"
import { fetchClassStats, ClassStatsResponse, ClassStatsParams } from "@/api/statistics/statistics"
import { fetchEncounterScenes } from "@/api/encounter/encounter"
import { WhiskerPlot } from "./WhiskerPlot"
import { LoadingSkeleton } from "./components/LoadingSkeleton"
import * as RadixSlider from '@radix-ui/react-slider'

function FilterControls({ params, setParams }: {
  params: ClassStatsParams;
  setParams: React.Dispatch<React.SetStateAction<ClassStatsParams>>;
}) {
  const { data: scenesData } = useQuery<string[]>({
    queryKey: ['encounterScenes'],
    queryFn: () => fetchEncounterScenes(),
  });

  const scenes = scenesData ?? [];

  const [isOpen, setIsOpen] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement | null>(null);

  // duration slider state (seconds, 0 - 3600)
  const [durationMin, setDurationMin] = React.useState<number>(0);
  const [durationMax, setDurationMax] = React.useState<number>(3600);
  // ability score slider (0 - 100000)
  const [abilityMin, setAbilityMin] = React.useState<number>(0);
  const [abilityMax, setAbilityMax] = React.useState<number>(100000);
  // since days input
  const [sinceDays, setSinceDays] = React.useState<string>("");

  // Helper to remove filters
  const removeSinceDaysFilter = () => {
    setSinceDays("");
    setParams(prev => produce(prev, draft => { draft.since_days = undefined }));
  };

  const removeDurationFilter = () => {
    setDurationMin(0);
    setDurationMax(3600);
    setParams(prev => produce(prev, draft => {
      draft.min_duration = undefined;
      draft.max_duration = undefined;
    }));
  };

  const removeAbilityScoreFilter = () => {
    setAbilityMin(0);
    setAbilityMax(100000);
    setParams(prev => produce(prev, draft => {
      draft.min_ability_score = undefined;
      draft.max_ability_score = undefined;
    }));
  };

  // click outside to close drawer
  React.useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  // when duration changes, update params
  React.useEffect(() => {
    if (durationMin === 0 && durationMax === 3600) {
      setParams(prev => produce(prev, draft => {
        draft.min_duration = undefined;
        draft.max_duration = undefined;
      }));
    } else {
      setParams(prev => produce(prev, draft => {
        draft.min_duration = durationMin;
        draft.max_duration = durationMax;
      }));
    }
  }, [durationMin, durationMax, setParams]);

  // when ability score changes, update params
  React.useEffect(() => {
    if (abilityMin === 0 && abilityMax === 100000) {
      setParams(prev => produce(prev, draft => {
        draft.min_ability_score = undefined;
        draft.max_ability_score = undefined;
      }));
    } else {
      setParams(prev => produce(prev, draft => {
        draft.min_ability_score = abilityMin;
        draft.max_ability_score = abilityMax;
      }));
    }
  }, [abilityMin, abilityMax, setParams]);

  // when since days changes, update params
  React.useEffect(() => {
    if (sinceDays) {
      const days = parseInt(sinceDays);
      if (!isNaN(days) && days > 0) {
        setParams(prev => produce(prev, draft => { draft.since_days = days }));
      }
    } else {
      setParams(prev => produce(prev, draft => { draft.since_days = undefined }));
    }
  }, [sinceDays, setParams]);

  const hasActiveFilters = params.since_days ||
    (params.min_duration !== undefined && params.max_duration !== undefined && (params.min_duration !== 0 || params.max_duration !== 3600)) ||
    (params.min_ability_score !== undefined && params.max_ability_score !== undefined && (params.min_ability_score !== 0 || params.max_ability_score !== 100000));

  return (
    <>
      {/* Active Filter Chips */}
      {hasActiveFilters && (
        <div className="fixed top-20 left-6 z-30 flex flex-wrap gap-2 max-w-xl animate-fade-in">
          {params.since_days && (
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-500/20 border border-purple-500/40 backdrop-blur-md text-sm text-purple-200 font-medium shadow-lg">
              <span>Last {params.since_days} days</span>
              <button onClick={removeSinceDaysFilter} className="hover:bg-purple-500/30 rounded-full p-0.5 transition-colors">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
          )}
          {params.min_duration !== undefined && params.max_duration !== undefined && (params.min_duration !== 0 || params.max_duration !== 3600) && (
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-500/20 border border-purple-500/40 backdrop-blur-md text-sm text-purple-200 font-medium shadow-lg">
              <span>Duration: {params.min_duration}s-{params.max_duration}s</span>
              <button onClick={removeDurationFilter} className="hover:bg-purple-500/30 rounded-full p-0.5 transition-colors">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
          )}
          {params.min_ability_score !== undefined && params.max_ability_score !== undefined && (params.min_ability_score !== 0 || params.max_ability_score !== 100000) && (
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-500/20 border border-purple-500/40 backdrop-blur-md text-sm text-purple-200 font-medium shadow-lg">
              <span>Ability: {params.min_ability_score}-{params.max_ability_score}</span>
              <button onClick={removeAbilityScoreFilter} className="hover:bg-purple-500/30 rounded-full p-0.5 transition-colors">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
          )}
        </div>
      )}

    <div className="fixed top-20 right-6 z-40 animate-fade-in" ref={dropdownRef}>
      <div className="group relative">
        <div className="absolute inset-0 -m-0.5 bg-linear-to-r from-purple-600 to-pink-600 rounded-2xl opacity-20 blur group-hover:opacity-40 transition-all duration-300 pointer-events-none"></div>

        <div className={`relative w-80 bg-gray-900/95 border border-purple-500/30 backdrop-blur-xl shadow-2xl shadow-purple-500/10 transition-all duration-300 overflow-hidden ${isOpen ? 'rounded-2xl' : 'rounded-2xl hover:shadow-purple-500/20 hover:border-purple-500/50'}`}>
          <button onClick={() => setIsOpen(v => !v)} className="relative flex items-center gap-3 px-5 py-3.5 w-full transition-all duration-300">
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-linear-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30 transition-all duration-300">
              <svg className="w-4.5 h-4.5 text-purple-300" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" viewBox="0 0 24 24" stroke="currentColor">
                <path d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"></path>
              </svg>
            </div>
            <div className="h-8 w-px bg-linear-to-b from-transparent via-purple-500/40 to-transparent" />
            <div className="flex flex-col gap-1 flex-1">
              <label className="text-[10px] uppercase tracking-widest text-purple-300/70 font-semibold">Filters</label>
              <div className="flex items-center gap-2">
                <span className="text-white text-sm font-medium truncate">{params.scene_name || 'All Scenes'}</span>
                <svg className={`w-4 h-4 text-purple-300 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><path d="M19 9l-7 7-7-7" /></svg>
              </div>
            </div>
          </button>

          <div className={`transition-all duration-300 ease-in-out ${isOpen ? 'max-h-[700px] opacity-100' : 'max-h-0 opacity-0'}`}>
            <div className="max-h-[700px] overflow-y-auto py-2 px-4 space-y-4">
              {/* Scene selector */}
              <div>
                <div className="text-xs font-semibold text-purple-300 mb-2 uppercase tracking-wide">Scene</div>
                <select
                  className="w-full p-2.5 bg-gray-800/80 border border-gray-700 rounded-lg text-sm text-gray-200 focus:border-purple-500 focus:outline-none transition-colors"
                  value={params.scene_name ?? ''}
                  onChange={e => setParams(prev => produce(prev, draft => { draft.scene_name = e.target.value || undefined }))}
                >
                  <option value="">All Scenes</option>
                  {scenes.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              {/* Since Days */}
              <div>
                <div className="text-xs font-semibold text-purple-300 mb-2 uppercase tracking-wide">Last N Days</div>
                <input
                  type="number"
                  value={sinceDays}
                  onChange={e => setSinceDays(e.target.value)}
                  placeholder="e.g. 7"
                  min="1"
                  className="w-full p-2.5 bg-gray-800/80 border border-gray-700 rounded-lg text-sm text-gray-200 placeholder-gray-500 focus:border-purple-500 focus:outline-none transition-colors"
                />
              </div>

              {/* Ability Score Slider */}
              <div>
                <div className="text-xs font-semibold text-purple-300 mb-2 uppercase tracking-wide">Ability Score</div>
                <RadixSlider.Root
                  className="relative flex items-center select-none touch-none w-full h-6"
                  value={[abilityMin, abilityMax]}
                  onValueChange={(vals: number[]) => {
                    setAbilityMin(vals[0]);
                    setAbilityMax(vals[1]);
                  }}
                  min={0}
                  max={100000}
                  step={100}
                  aria-label="Ability score range"
                >
                  <RadixSlider.Track className="relative bg-gray-800/80 rounded-full h-2 w-full">
                    <RadixSlider.Range className="absolute bg-purple-500 h-full rounded-full" />
                  </RadixSlider.Track>
                  <RadixSlider.Thumb className="block w-4 h-4 bg-purple-400 border-2 border-purple-300 rounded-full shadow-lg hover:scale-110 transition-transform focus:outline-none focus:ring-2 focus:ring-purple-400" />
                  <RadixSlider.Thumb className="block w-4 h-4 bg-purple-400 border-2 border-purple-300 rounded-full shadow-lg hover:scale-110 transition-transform focus:outline-none focus:ring-2 focus:ring-purple-400" />
                </RadixSlider.Root>
                <div className="text-sm text-gray-400 mt-2 font-medium">{abilityMin.toLocaleString()} — {abilityMax.toLocaleString()}</div>
              </div>

              {/* Duration Slider */}
              <div>
                <div className="text-xs font-semibold text-purple-300 mb-2 uppercase tracking-wide">Duration (seconds)</div>
                <RadixSlider.Root
                  className="relative flex items-center select-none touch-none w-full h-6"
                  value={[durationMin, durationMax]}
                  onValueChange={(vals: number[]) => {
                    setDurationMin(vals[0]);
                    setDurationMax(vals[1]);
                  }}
                  min={0}
                  max={3600}
                  step={10}
                  aria-label="Duration range"
                >
                  <RadixSlider.Track className="relative bg-gray-800/80 rounded-full h-2 w-full">
                    <RadixSlider.Range className="absolute bg-purple-500 h-full rounded-full" />
                  </RadixSlider.Track>
                  <RadixSlider.Thumb className="block w-4 h-4 bg-purple-400 border-2 border-purple-300 rounded-full shadow-lg hover:scale-110 transition-transform focus:outline-none focus:ring-2 focus:ring-purple-400" />
                  <RadixSlider.Thumb className="block w-4 h-4 bg-purple-400 border-2 border-purple-300 rounded-full shadow-lg hover:scale-110 transition-transform focus:outline-none focus:ring-2 focus:ring-purple-400" />
                </RadixSlider.Root>
                <div className="text-sm text-gray-400 mt-2 font-medium">{durationMin}s — {durationMax}s</div>
              </div>

              {/* Reset Button */}
              <div className="flex gap-2 pt-2 border-t border-gray-800">
                <button className="flex-1 px-4 py-2.5 rounded-lg bg-gray-800/80 border border-gray-700 hover:bg-gray-800 text-gray-300 text-sm font-medium transition-colors" onClick={() => {
                  setParams({});
                  setSinceDays("");
                  setDurationMin(0);
                  setDurationMax(3600);
                  setAbilityMin(0);
                  setAbilityMax(100000);
                }}>Reset All</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    </>
  );
}

export default function ClassesPage() {
  const [params, setParams] = useState<ClassStatsParams>({});

  const { data, isLoading, error } = useQuery<ClassStatsResponse>({
    queryKey: ["statisticsClasses", params],
    queryFn: () => fetchClassStats(Object.keys(params).length > 0 ? params : undefined),
    staleTime: 5 * 60 * 1000, // 5 minutes
  })

  const classes = data?.classes || []

  return (
    <div className="min-h-screen text-white">
      <FilterControls params={params} setParams={setParams} />

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
              subtitle={params.scene_name ? `Scene: ${params.scene_name}` : undefined}
              data={classes}
              metric="dps"
            />

            {/* HPS Performance */}
            <WhiskerPlot
              title="HPS Performance by Class Spec (Top 6)"
              subtitle={params.scene_name ? `Scene: ${params.scene_name}` : undefined}
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

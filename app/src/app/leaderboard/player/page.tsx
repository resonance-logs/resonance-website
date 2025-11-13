"use client";

import React, { useEffect, useRef, useState } from 'react';
import { produce } from 'immer';
import { useQuery } from '@tanstack/react-query';
import { fetchTop10Players, GetTop10PlayersParams } from '@/api/player/player';
import { formatDuration, formatRelativeTime } from '@/utils/timeFormat';
import { formatNumber } from '@/utils/numberFormatter';
import { fetchEncounterScenes } from '@/api/encounter/encounter';
import {
  CLASS_MAP,
  CLASS_SPEC_MAP,
  getClassIconName,
  getSpecsForClass,
  getClassTooltip,
} from '@/utils/classData';
import Image from 'next/image'
import Link from 'next/link'
import * as RadixSlider from '@radix-ui/react-slider'

function ScrollIndicator({ direction, onClick }: { direction: 'up' | 'down'; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="group fixed left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-2 transition-all hover:scale-110"
      style={{ [direction === 'down' ? 'bottom' : 'top']: '2rem' }}
      aria-label={`Scroll ${direction}`}
    >
      <div className="rounded-full bg-purple-500/20 backdrop-blur-md p-3 border border-purple-500/30 group-hover:bg-purple-500/30 transition-colors">
        <svg
          className="w-6 h-6 text-purple-300"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          viewBox="0 0 24 24"
          stroke="currentColor"
          style={{ transform: direction === 'up' ? 'rotate(180deg)' : 'none' }}
        >
          <path d="M19 14l-7 7m0 0l-7-7m7 7V3"></path>
        </svg>
      </div>
    </button>
  );
}

function PodiumSkeleton() {
  return (
    <div className="relative mx-auto w-full max-w-6xl px-2">
      <div className="relative flex min-h-128 items-end justify-center gap-6">
        {[1, 0, 2].map((slotPos) => {
          const isCenter = slotPos === 0;
          const isSilver = slotPos === 1;
          const heightClass = 'h-[22rem]';
          const widthClass = 'w-[15rem]';
          const translateY = isCenter ? '-translate-y-[100px]' : isSilver ? '-translate-y-[50px]' : '-translate-y-[25px]';
          const animationDelay = slotPos === 1 ? '400ms' : slotPos === 0 ? '600ms' : '800ms';

          return (
            <div
              key={`skeleton-${slotPos}`}
              className={`relative ${widthClass} ${heightClass} ${translateY} flex flex-col justify-between rounded-2xl bg-gray-900/50 backdrop-blur-md ring-2 ring-gray-700/50 shadow-xl animate-pulse`}
              style={{ animationDelay }}
            >
              <div className="absolute -top-5 left-4 z-20">
                <div className="h-12 w-12 rounded-full bg-gray-700/50" />
              </div>
              <div className="z-10 mt-6 w-full px-5">
                <div className="flex items-center justify-center gap-3">
                  <div className="h-20 w-20 rounded-full bg-gray-700/50" />
                </div>
              </div>
              <div className="z-10 my-2 w-full px-5">
                <div className="grid grid-cols-2 gap-3">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="p-2 rounded-lg bg-gray-800/50">
                      <div className="h-3 w-16 rounded bg-gray-700/50 mb-2" />
                      <div className="h-4 w-20 rounded bg-gray-700/50" />
                    </div>
                  ))}
                </div>
              </div>
              <div className="z-10 mb-5 w-full px-5">
                <div className="h-4 w-full rounded bg-gray-700/50" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PlayerListSkeleton() {
  return (
    <div className="space-y-6">
      {[...Array(7)].map((_, idx) => (
        <div
          key={idx}
          className="flex h-full flex-col rounded-2xl border border-gray-800/80 bg-linear-to-br from-gray-900/90 via-gray-900/80 to-gray-900/70 backdrop-blur-md p-6 animate-pulse"
        >
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-gray-700/50" />
              <div className="flex items-center gap-3">
                <div className="h-16 w-16 rounded-full bg-gray-700/50" />
                <div>
                  <div className="h-5 w-32 rounded bg-gray-700/50 mb-2" />
                  <div className="h-3 w-24 rounded bg-gray-700/50" />
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="text-right">
                  <div className="h-3 w-16 rounded bg-gray-700/50 mb-2 ml-auto" />
                  <div className="h-5 w-20 rounded bg-gray-700/50 ml-auto" />
                </div>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function FilterControls({ params, setParams }: { params: GetTop10PlayersParams; setParams: React.Dispatch<React.SetStateAction<GetTop10PlayersParams>>; }) {
  const { data: scenesData } = useQuery<string[]>({
    queryKey: ['encounterScenes'],
    queryFn: () => fetchEncounterScenes(),
  });

  const scenes = scenesData ?? [];

  const [isOpen, setIsOpen] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement | null>(null);

  // class/spec local state for UI selection
  const [selectedClass, setSelectedClass] = React.useState<number | null>(params.class_id ? Number(params.class_id) : null);
  const [selectedSpecs, setSelectedSpecs] = React.useState<number[]>(() => {
    if (!params.class_spec) return [];
    if (typeof params.class_spec === 'number') return [params.class_spec];
    return String(params.class_spec).split(',').map(s => parseInt(s, 10)).filter(n => !Number.isNaN(n));
  });

  // duration slider state (seconds, 0 - 3600)
  const [durationMin, setDurationMin] = React.useState<number>(0);
  const [durationMax, setDurationMax] = React.useState<number>(3600);
  // ability score slider (0 - 100000)
  const [abilityMin, setAbilityMin] = React.useState<number>(0);
  const [abilityMax, setAbilityMax] = React.useState<number>(100000);

  // Helper to remove a filter
  const removeClassFilter = () => {
    setSelectedClass(null);
    setSelectedSpecs([]);
    setParams(prev => produce(prev, draft => { 
      draft.class_id = undefined;
      draft.class_spec = undefined;
    }));
  };

  const removeOrderByFilter = () => {
    setParams(prev => produce(prev, draft => { draft.orderBy = undefined }));
  };

  const removeDurationFilter = () => {
    setDurationMin(0);
    setDurationMax(3600);
    setParams(prev => produce(prev, draft => { draft.duration = undefined }));
  };

  const removeAbilityScoreFilter = () => {
    setAbilityMin(0);
    setAbilityMax(100000);
    setParams(prev => produce(prev, draft => { draft.ability_score = undefined }));
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

  // when class changes, update params
  React.useEffect(() => {
    setParams(prev => produce(prev, draft => { draft.class_id = selectedClass ?? undefined }));
    // also update class_spec param based on selectedSpecs
    setParams(prev => produce(prev, draft => {
      if (!selectedSpecs || selectedSpecs.length === 0) {
        draft.class_spec = undefined;
      } else if (selectedSpecs.length === 1) {
        draft.class_spec = selectedSpecs[0];
      } else {
        draft.class_spec = selectedSpecs.join(',');
      }
    }));
  }, [selectedClass, selectedSpecs, setParams]);

  // when duration changes, update params
  React.useEffect(() => {
    setParams(prev => produce(prev, draft => { draft.duration = `${durationMin},${durationMax}` }));
  }, [durationMin, durationMax, setParams]);

  // when ability score changes, update params
  React.useEffect(() => {
    setParams(prev => produce(prev, draft => { draft.ability_score = `${abilityMin},${abilityMax}` }));
  }, [abilityMin, abilityMax, setParams]);

  // when metric or metric value changes, update params automatically
  // (dps filter removed) no-op for metric switching regarding query params

  // (slider removed) HPS filter can still be set via URL params; no slider control in UI

  return (
    <>
      {/* Active Filter Chips */}
      {(selectedClass || params.orderBy || params.duration || params.ability_score || selectedSpecs.length > 0) && (
        <div className="fixed top-20 left-6 z-30 flex flex-wrap gap-2 max-w-xl animate-fade-in">
          {selectedClass && (
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-500/20 border border-purple-500/40 backdrop-blur-md text-sm text-purple-200 font-medium shadow-lg">
              <span>Class: {CLASS_MAP[selectedClass]}</span>
              <button onClick={removeClassFilter} className="hover:bg-purple-500/30 rounded-full p-0.5 transition-colors">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
          )}
          {selectedSpecs.length > 0 && (
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-500/20 border border-purple-500/40 backdrop-blur-md text-sm text-purple-200 font-medium shadow-lg">
              <span>Specs: {selectedSpecs.map(id => CLASS_SPEC_MAP[id]).join(', ')}</span>
              <button onClick={() => {
                setSelectedSpecs([]);
                setParams(prev => produce(prev, draft => { draft.class_spec = undefined }));
              }} className="hover:bg-purple-500/30 rounded-full p-0.5 transition-colors">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
          )}
          {params.orderBy && (
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-500/20 border border-purple-500/40 backdrop-blur-md text-sm text-purple-200 font-medium shadow-lg">
              <span>Order: {params.orderBy === 'dps' ? 'DPS' : params.orderBy === 'hps' ? 'HPS' : 'Boss DPS'}</span>
              <button onClick={removeOrderByFilter} className="hover:bg-purple-500/30 rounded-full p-0.5 transition-colors">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
          )}
          {params.duration && params.duration !== '0,3600' && (
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-500/20 border border-purple-500/40 backdrop-blur-md text-sm text-purple-200 font-medium shadow-lg">
              <span>Duration: {durationMin}s-{durationMax}s</span>
              <button onClick={removeDurationFilter} className="hover:bg-purple-500/30 rounded-full p-0.5 transition-colors">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
          )}
          {params.ability_score && params.ability_score !== '0,100000' && (
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-500/20 border border-purple-500/40 backdrop-blur-md text-sm text-purple-200 font-medium shadow-lg">
              <span>Ability: {abilityMin}-{abilityMax}</span>
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
                <select className="w-full p-2.5 bg-gray-800/80 border border-gray-700 rounded-lg text-sm text-gray-200 focus:border-purple-500 focus:outline-none transition-colors" value={params.scene_name ?? ''} onChange={e => setParams(prev => produce(prev, draft => { draft.scene_name = e.target.value }))}>
                  <option value="">All Scenes</option>
                  {scenes.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              {/* Class selector */}
              <div>
                <div className="text-xs font-semibold text-purple-300 mb-2 uppercase tracking-wide">Class</div>
                <div className="flex gap-2 flex-wrap">
                  {Object.entries(CLASS_MAP).map(([idStr, name]) => {
                    const id = Number(idStr);
                    const active = selectedClass === id;
                    return (
                      <button key={id} onClick={() => { setSelectedClass(id); }} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${active ? 'bg-purple-500/30 border border-purple-500 text-purple-200' : 'bg-gray-800/80 border border-gray-700 hover:bg-gray-800 text-gray-300'}`}>
                        <Image src={`/images/classes/${getClassIconName(id)}`} alt={name} width={18} height={18} className="object-contain" />
                        <span>{name}</span>
                      </button>
                    )
                  })}
                </div>

                {/* Specs */}
                {selectedClass && (
                  <div className="mt-3">
                    <div className="text-xs font-semibold text-purple-300 mb-2 uppercase tracking-wide">Specs</div>
                    <div className="flex gap-2 flex-wrap">
                      {getSpecsForClass(selectedClass).map(specId => {
                        const specName = CLASS_SPEC_MAP[specId] ?? `Spec ${specId}`;
                        const checked = selectedSpecs.includes(specId);
                        return (
                          <label key={specId} className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm cursor-pointer transition-colors ${checked ? 'bg-purple-500/30 border border-purple-500 text-purple-200' : 'bg-gray-800/80 border border-gray-700 hover:bg-gray-800 text-gray-300'}`}>
                            <input type="checkbox" checked={checked} onChange={e => {
                              setSelectedSpecs(prev => {
                                if (e.target.checked) return [...prev, specId];
                                return prev.filter(x => x !== specId);
                              })
                            }} className="sr-only" />
                            <span>{specName}</span>
                          </label>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Order selector */}
              <div>
                <div className="text-xs font-semibold text-purple-300 mb-2 uppercase tracking-wide">Order By</div>
                <div className="flex gap-2">
                  <button onClick={() => setParams(prev => produce(prev, draft => { draft.orderBy = 'dps' }))} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${params.orderBy === 'dps' ? 'bg-purple-500/30 border border-purple-500 text-purple-200' : 'bg-gray-800/80 border border-gray-700 hover:bg-gray-800 text-gray-300'}`}>DPS</button>
                  <button onClick={() => setParams(prev => produce(prev, draft => { draft.orderBy = 'hps' }))} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${params.orderBy === 'hps' ? 'bg-purple-500/30 border border-purple-500 text-purple-200' : 'bg-gray-800/80 border border-gray-700 hover:bg-gray-800 text-gray-300'}`}>HPS</button>
                  <button onClick={() => setParams(prev => produce(prev, draft => { draft.orderBy = 'bossDps' }))} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${params.orderBy === 'bossDps' ? 'bg-purple-500/30 border border-purple-500 text-purple-200' : 'bg-gray-800/80 border border-gray-700 hover:bg-gray-800 text-gray-300'}`}>Boss DPS</button>
                </div>
              </div>

              {/* Combined sliders: Ability score (0-100k) and Duration (0-3600s) - use Radix two-thumb slider */}
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
                  step={1}
                  aria-label="Ability score range"
                >
                  <RadixSlider.Track className="relative bg-gray-800/80 rounded-full h-2 w-full">
                    <RadixSlider.Range className="absolute bg-purple-500 h-full rounded-full" />
                  </RadixSlider.Track>
                  <RadixSlider.Thumb className="block w-4 h-4 bg-purple-400 border-2 border-purple-300 rounded-full shadow-lg hover:scale-110 transition-transform" />
                  <RadixSlider.Thumb className="block w-4 h-4 bg-purple-400 border-2 border-purple-300 rounded-full shadow-lg hover:scale-110 transition-transform" />
                </RadixSlider.Root>
                <div className="text-sm text-gray-400 mt-2 font-medium">{abilityMin.toLocaleString()} — {abilityMax.toLocaleString()}</div>

                <div className="mt-4 text-xs font-semibold text-purple-300 mb-2 uppercase tracking-wide">Duration (seconds)</div>
                <RadixSlider.Root
                  className="relative flex items-center select-none touch-none w-full h-6"
                  value={[durationMin, durationMax]}
                  onValueChange={(vals: number[]) => {
                    setDurationMin(vals[0]);
                    setDurationMax(vals[1]);
                  }}
                  min={0}
                  max={3600}
                  step={1}
                  aria-label="Duration range"
                >
                  <RadixSlider.Track className="relative bg-gray-800/80 rounded-full h-2 w-full">
                    <RadixSlider.Range className="absolute bg-purple-500 h-full rounded-full" />
                  </RadixSlider.Track>
                  <RadixSlider.Thumb className="block w-4 h-4 bg-purple-400 border-2 border-purple-300 rounded-full shadow-lg hover:scale-110 transition-transform" />
                  <RadixSlider.Thumb className="block w-4 h-4 bg-purple-400 border-2 border-purple-300 rounded-full shadow-lg hover:scale-110 transition-transform" />
                </RadixSlider.Root>
                <div className="text-sm text-gray-400 mt-2 font-medium">{durationMin}s — {durationMax}s</div>
              </div>

                <div className="flex gap-2 pt-2 border-t border-gray-800">
                <button className="flex-1 px-4 py-2.5 rounded-lg bg-gray-800/80 border border-gray-700 hover:bg-gray-800 text-gray-300 text-sm font-medium transition-colors" onClick={() => {
                  setParams(prev => produce(prev, draft => { draft.scene_name = ''; draft.class_id = undefined; draft.class_spec = undefined; draft.ability_score = undefined; draft.duration = undefined; draft.hps = undefined; draft.orderBy = undefined; }));
                  setSelectedClass(null);
                  setSelectedSpecs([]);
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

export default function PlayerLeaderboardPage() {
  const [params, setParams] = useState<GetTop10PlayersParams>({ scene_name: "Unstable - Tina's Mindrealm" });
  const [currentSection, setCurrentSection] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const section1Ref = useRef<HTMLElement>(null);
  const section2Ref = useRef<HTMLElement>(null);

  const { data, isLoading } = useQuery({ queryKey: ['players', params], queryFn: () => fetchTop10Players(params), enabled: !!params.scene_name });

  // Derive ordering / display flags from params.orderBy (fallback to hps if hps filter present)
  const orderBy = (params.orderBy ?? (params.hps ? 'hps' : 'dps')) as 'dps' | 'hps' | 'bossDps';
  const metricForDisplay = orderBy === 'hps' ? 'hps' : 'dps';
  const bossOnlyFlag = orderBy === 'bossDps';

  const rows = data?.players ?? [];
  const topThree = rows.slice(0, 3);
  const restRows = rows.slice(3);

  const scrollToSection = (sectionIndex: number) => {
    const section = sectionIndex === 0 ? section1Ref.current : section2Ref.current;
    if (section) {
      section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Detect which section is visible
  useEffect(() => {
    const handleScroll = () => {
      if (!containerRef.current) return;
      const scrollTop = containerRef.current.scrollTop;
      const viewportHeight = window.innerHeight;

      if (scrollTop < viewportHeight / 2) {
        setCurrentSection(0);
      } else {
        setCurrentSection(1);
      }
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll);
      return () => container.removeEventListener('scroll', handleScroll);
    }
  }, []);

  return (
    <div ref={containerRef} className="h-screen overflow-y-auto text-white scroll-smooth" style={{ scrollSnapType: 'y mandatory' }}>
      <FilterControls params={params} setParams={setParams} />

      {/* Scroll indicator - only on first section */}
      {currentSection === 0 && restRows.length > 0 && (
        <ScrollIndicator direction="down" onClick={() => scrollToSection(1)} />
      )}

      {/* First panel: Podium (full-screen) */}
      <section ref={section1Ref} className="snap-start h-screen flex items-center justify-center relative">
        <div className="absolute inset-0 bg-linear-to-b from-purple-900/10 via-transparent to-transparent pointer-events-none" />

        <div className="max-w-7xl mx-auto w-full px-4 py-12 relative z-10">
          {/* Header */}
          <div className="text-center mb-12 animate-fade-in">
            <div className="inline-flex items-center gap-3 px-6 py-2 rounded-full bg-purple-500/10 border border-purple-500/20 backdrop-blur-md mb-4">
              <div className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
              <p className="text-sm uppercase tracking-[0.35em] text-purple-300 font-semibold">Leaderboard</p>
            </div>
            <h1 className="text-6xl font-bold bg-linear-to-r from-purple-200 via-purple-300 to-pink-200 bg-clip-text text-transparent pb-4">
              Top 3 Players
            </h1>
          </div>

          {/* Podium for top 3 */}
          {isLoading ? (
            <PodiumSkeleton />
          ) : topThree.length > 0 && (
            <div className="relative mx-auto w-full max-w-6xl px-2">
              <div className="relative flex min-h-128 items-end justify-center gap-6">
                {[1, 0, 2].map((slotIdx, slotPos) => {
                  const player = topThree[slotIdx];
                  if (!player) {
                    return <div key={`slot-${slotPos}`} className="flex-1" />;
                  }

                  const globalRank = slotIdx + 1;
                  const durationSec = Math.max(1, Math.floor((player.duration || 0)));
                  const displayDamage = (metricForDisplay === 'dps' && bossOnlyFlag) ? (player.bossDamageDealt ?? 0) : (player.damageDealt ?? 0);
                  const displayDPS = Math.round((displayDamage || 0) / durationSec);
                  const displayHeal = player.healDealt ?? 0;
                  const displayHPS = Math.round((displayHeal || 0) / durationSec);
                  const dmgHits = (metricForDisplay === 'dps' && bossOnlyFlag) ? (player.bossHitsDealt ?? 0) : (player.hitsDealt ?? 0);
                  const dmgCritHits = (metricForDisplay === 'dps' && bossOnlyFlag) ? (player.bossCritHitsDealt ?? 0) : (player.critHitsDealt ?? 0);

                  const isCenter = slotPos === 1;
                  const isSilver = globalRank === 2;
                  const heightClass = 'h-[26.625rem]';
                  const widthClass = 'w-[18rem]';
                  const ringClass = isCenter
                    ? 'ring-2 ring-yellow-400/60 shadow-lg shadow-yellow-400/20'
                    : isSilver
                    ? 'ring-2 ring-gray-300/60 shadow-lg shadow-gray-300/20'
                    : 'ring-2 ring-amber-600/60 shadow-lg shadow-amber-600/20';
                  const translateY = isCenter ? '-translate-y-[100px]' : isSilver ? '-translate-y-[50px]' : '-translate-y-[25px]';
                  const animationDelay = slotPos === 1 ? '400ms' : slotPos === 0 ? '600ms' : '800ms';

                  return (
                    <Link
                      key={player.id}
                      href={`/encounter/${player.encounterId}`}
                      className={`group relative ${widthClass} ${heightClass} ${translateY} flex flex-col justify-between rounded-2xl bg-gray-900/90 backdrop-blur-md ${ringClass} transition-all duration-300 hover:scale-[1.05] animate-scale-in`}
                      style={{ animationDelay }}
                    >
                      {/* Rank badge */}
                      <div className="absolute -top-5 left-4 z-20">
                        <div className={`flex h-12 w-12 items-center justify-center rounded-full text-lg font-bold text-gray-900 shadow-lg transition-transform group-hover:scale-110 ${
                          isCenter
                            ? 'bg-linear-to-br from-yellow-300 to-amber-400 shadow-yellow-400/50'
                            : isSilver
                            ? 'bg-linear-to-br from-gray-200 to-gray-400 shadow-gray-300/50'
                            : 'bg-linear-to-br from-amber-500 to-amber-700 shadow-amber-500/50'
                        }`}>
                          {globalRank}
                        </div>
                      </div>

                      {/* Player class icon */}
                      <div className="z-10 mt-6 w-full px-4">
                        <div className="flex items-center justify-center">
                          <div className="relative h-14 w-14 flex items-center justify-center">
                            <Image 
                              src={`/images/classes/${getClassIconName(player.classId ?? 0)}`} 
                              alt={player.name ?? 'Player'} 
                              fill 
                              sizes="56px" 
                              className="object-contain"
                              title={getClassTooltip(player.classId ?? null, player.classSpec ?? null)}
                            />
                          </div>
                        </div>
                        <div className="text-center mt-2">
                          <div className="text-base font-semibold text-white truncate">{player.name ?? 'Unknown'}</div>
                          <div className="text-xs text-gray-400 font-medium">{CLASS_MAP[player.classId ?? 0] ?? 'Unknown'} • {CLASS_SPEC_MAP[player.classSpec ?? 0] ?? ''}</div>
                          <div className="text-xs text-gray-400 mt-1 font-medium">Ability Score: {formatNumber(player.abilityScore) ?? '—'}</div>
                        </div>
                      </div>

                      {/* Stats grid */}
                      <div className="z-10 my-2 w-full px-4">
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div className="p-2 rounded-lg bg-purple-500/10 border border-purple-500/20">
                            <p className="text-[10px] uppercase tracking-wide text-gray-400">
                              {metricForDisplay === 'dps' ? 'DPS' : 'HPS'}
                            </p>
                            <p className="mt-1 text-lg font-bold text-purple-300">
                              {metricForDisplay === 'dps' ? formatNumber(displayDPS) : formatNumber(displayHPS)}
                            </p>
                          </div>
                          <div className="p-2 rounded-lg bg-gray-800/50">
                            <p className="text-[10px] uppercase tracking-wide text-gray-400">
                              {metricForDisplay === 'dps' ? 'Damage' : 'Healing'}
                            </p>
                            <p className="mt-1 text-lg font-medium text-gray-200">
                              {metricForDisplay === 'dps' ? formatNumber(displayDamage) : formatNumber(displayHeal)}
                            </p>
                          </div>
                          <div className="p-2 rounded-lg bg-gray-800/50">
                            <p className="text-[10px] uppercase tracking-wide text-gray-400">Crit Rate</p>
                            <p className="mt-1 text-lg font-medium text-gray-200">
                              {dmgHits > 0 ? ((dmgCritHits / dmgHits) * 100).toFixed(1) : '0.0'}%
                            </p>
                          </div>
                          <div className="p-2 rounded-lg bg-gray-800/50">
                            <p className="text-[10px] uppercase tracking-wide text-gray-400">Lucky Rate</p>
                            <p className="mt-1 text-lg font-medium text-gray-200">
                              {dmgHits > 0 ? ((player.luckyHitsDealt / dmgHits) * 100).toFixed(1) : '0.0'}%
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Footer info */}
                      <div className="z-10 mb-4 w-full px-4">
                        <div className="text-sm text-gray-300 text-center font-medium">
                          {player.startedAt ? formatRelativeTime(player.startedAt) : ''}
                          {player.startedAt && player.duration && (
                            <span className="text-purple-300"> • {formatDuration(player.startedAt, new Date(new Date(player.startedAt).getTime() + (player.duration * 1000)).toISOString())}</span>
                          )}
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Second panel: Top 10 list */}
      <section ref={section2Ref} className="snap-start h-screen flex items-start relative overflow-y-auto">
        <div className="absolute inset-0 bg-linear-to-b from-transparent via-purple-900/5 to-transparent pointer-events-none" />

        <div className="max-w-7xl mx-auto py-12 w-full px-4 relative z-10 mt-16">
          {/* Header for second section */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-3 px-6 py-2 rounded-full bg-purple-500/10 border border-purple-500/20 backdrop-blur-md mb-4">
              <div className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
              <p className="text-sm uppercase tracking-[0.35em] text-purple-300 font-semibold">Leaderboard</p>
            </div>
            <h2 className="text-5xl font-bold bg-linear-to-r from-purple-200 via-purple-300 to-pink-200 bg-clip-text text-transparent mb-8">
              Top 10
            </h2>
          </div>

          {/* Players list */}
          {isLoading ? (
            <PlayerListSkeleton />
          ) : (
            <div className="space-y-6">
              {restRows.map((player, idx) => {
                const globalRank = idx + 4;
                const durationSec = Math.max(1, Math.floor((player.duration || 0)));
                const displayDamage = (metricForDisplay === 'dps' && bossOnlyFlag) ? (player.bossDamageDealt ?? 0) : (player.damageDealt ?? 0);
                const displayDPS = Math.round((displayDamage || 0) / durationSec);
                const displayHeal = player.healDealt ?? 0;
                const displayHPS = Math.round((displayHeal || 0) / durationSec);
                const dmgHits = (metricForDisplay === 'dps' && bossOnlyFlag) ? (player.bossHitsDealt ?? 0) : (player.hitsDealt ?? 0);
                const dmgCritHits = (metricForDisplay === 'dps' && bossOnlyFlag) ? (player.bossCritHitsDealt ?? 0) : (player.critHitsDealt ?? 0);
                const dmgLuckyHits = (metricForDisplay === 'dps' && bossOnlyFlag) ? (player.bossLuckyHitsDealt ?? 0) : (player.luckyHitsDealt ?? 0);

                return (
                  <Link
                    key={player.id}
                    href={`/encounter/${player.encounterId}`}
                    className="group flex h-full rounded-xl border border-gray-800/80 bg-linear-to-br from-gray-900/95 via-gray-900/90 to-gray-800/95 backdrop-blur-md p-5 transition-all duration-300 hover:border-purple-500/50 hover:shadow-xl hover:shadow-purple-500/10 hover:scale-[1.01] relative overflow-hidden"
                  >
                    {/* Textured background overlay */}
                    <div className="absolute inset-0 opacity-5 pointer-events-none" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width="40" height="40" xmlns="http://www.w3.org/2000/svg"%3E%3Cpath d="M0 0h40v40H0z" fill="none"/%3E%3Cpath d="M20 0v40M0 20h40" stroke="%23fff" stroke-width="0.5" opacity="0.1"/%3E%3C/svg%3E")' }}></div>
                    
                    <div className="flex items-center justify-between gap-6 w-full relative z-10">
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        {/* Rank badge */}
                        <div
                          className={
                            globalRank === 4
                              ? "flex h-11 w-11 items-center justify-center rounded-lg text-base font-bold text-white bg-linear-to-br from-purple-600 to-purple-800 shadow-lg shadow-purple-500/30 ring-2 ring-purple-400/50 shrink-0"
                              : "flex h-11 w-11 items-center justify-center rounded-lg text-base font-bold text-gray-200 bg-linear-to-br from-gray-700 to-gray-900 shadow-lg ring-2 ring-gray-600/50 shrink-0"
                          }
                        >
                          {globalRank}
                        </div>

                        {/* Player info */}
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="relative h-12 w-12 flex items-center justify-center shrink-0">
                            <Image 
                              src={`/images/classes/${getClassIconName(player.classId ?? 0)}`} 
                              alt={player.name ?? 'Player'} 
                              fill 
                              sizes="48px" 
                              className="object-contain"
                              title={getClassTooltip(player.classId ?? null, player.classSpec ?? null)}
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-base font-semibold text-white group-hover:text-purple-200 transition-colors truncate">
                              {player.name ?? 'Unknown'}
                            </p>
                            <div className="flex items-center gap-2 text-xs text-gray-400">
                              <span>{CLASS_MAP[player.classId ?? 0] ?? 'Unknown'}</span>
                              <span>•</span>
                              <span>{CLASS_SPEC_MAP[player.classSpec ?? 0] ?? 'No Spec'}</span>
                            </div>
                            <div className="text-xs text-gray-500 mt-0.5">
                              Ability Score: {player.abilityScore ?? '—'}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Stats grid */}
                      <div className="flex items-center gap-3 shrink-0">
                        <div className="text-center p-3 rounded-lg bg-purple-500/10 border border-purple-500/20 min-w-[100px]">
                          <p className="text-xs uppercase tracking-wide text-gray-400">
                            {metricForDisplay === 'dps' ? 'DPS' : 'HPS'}
                          </p>
                          <p className="mt-1 text-xl font-bold text-purple-300">
                            {metricForDisplay === 'dps' ? formatNumber(displayDPS) : formatNumber(displayHPS)}
                          </p>
                        </div>
                        <div className="text-center p-3 rounded-lg bg-gray-800/70 min-w-[100px]">
                          <p className="text-xs uppercase tracking-wide text-gray-400">Total</p>
                          <p className="mt-1 text-base font-medium text-gray-200">
                            {metricForDisplay === 'dps' ? formatNumber(displayDamage) : formatNumber(displayHeal)}
                          </p>
                        </div>
                        <div className="text-center p-3 rounded-lg bg-gray-800/70 min-w-[90px]">
                          <p className="text-xs uppercase tracking-wide text-gray-400">Crit Rate</p>
                          <p className="mt-1 text-base font-medium text-gray-200">
                            {dmgHits > 0 ? ((dmgCritHits / dmgHits) * 100).toFixed(1) : '0.0'}%
                          </p>
                        </div>
                        <div className="text-center p-3 rounded-lg bg-gray-800/70 min-w-[90px]">
                          <p className="text-xs uppercase tracking-wide text-gray-400">Lucky Rate</p>
                          <p className="mt-1 text-base font-medium text-gray-200">
                            {dmgHits > 0 ? ((dmgLuckyHits / dmgHits) * 100).toFixed(1) : '0.0'}%
                          </p>
                        </div>
                        <div className="text-center p-3 rounded-lg bg-gray-800/70 min-w-[90px]">
                          <p className="text-xs uppercase tracking-wide text-gray-400">Duration</p>
                          <p className="mt-1 text-base font-medium text-gray-200">
                            {player.startedAt && player.duration ? formatDuration(player.startedAt, new Date(new Date(player.startedAt).getTime() + (player.duration * 1000)).toISOString()) : '—'}
                          </p>
                        </div>
                        <div className="text-center p-3 rounded-lg bg-gray-800/70 min-w-[100px]">
                          <p className="text-xs uppercase tracking-wide text-gray-400">Date</p>
                          <p className="mt-1 text-base font-medium text-gray-200">
                            {player.startedAt ? formatRelativeTime(player.startedAt) : '—'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </section>

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

        @keyframes scale-in {
          from {
            opacity: 0;
            transform: scale(0.9);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        .animate-fade-in {
          animation: fade-in 0.6s ease-out forwards;
          opacity: 0;
        }

        .animate-scale-in {
          animation: scale-in 0.6s ease-out forwards;
          opacity: 0;
        }

        .scroll-smooth {
          scroll-behavior: smooth;
        }

        .snap-start {
          scroll-snap-align: start;
        }

        .overflow-y-auto::-webkit-scrollbar {
          display: none;
        }
        .overflow-y-auto {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}

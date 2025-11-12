"use client";

import React, { useEffect, useRef, useState } from 'react';
import { produce } from 'immer';
import { useQuery } from '@tanstack/react-query';
import { fetchTop10Players, GetTop10PlayersParams } from '@/api/player/player';
import { PlayerTopRow } from '@/api/player/player';
import { formatDuration, formatRelativeTime } from '@/utils/timeFormat';
import { fetchEncounterScenes } from '@/api/encounter/encounter';
import {
  CLASS_MAP,
  CLASS_SPEC_MAP,
  getClassIconName,
  getSpecsForClass,
} from '@/utils/classData';
import Image from 'next/image'
import Link from 'next/link'
import * as RadixSlider from '@radix-ui/react-slider'

// PAGE_SIZE removed (not needed here)

function PlayerCard({ player, metric }: { player: PlayerTopRow; metric: 'dps' | 'hps' }) {
  const dps = Math.round(player.dps || 0);
  const hps = player.hps ? Math.round(player.hps) : 0;

  return (
    <Link href={`/encounter/${player.encounterId}`} className="rounded-xl border border-gray-800/60 bg-gray-900/60 p-4 backdrop-blur-sm block">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-transparent flex items-center justify-center text-white font-semibold border border-gray-700/40">{(player.name || '??').slice(0,2).toUpperCase()}</div>
          <div>
            <div className="font-semibold">{player.name ?? 'Unknown'}</div>
            <div className="text-sm text-gray-400">Level {player.level ?? '-' } • Class {player.classId ?? '-'}</div>
          </div>
        </div>
        <div className="text-right">
          <div className="font-mono font-semibold text-lg">DPS {dps}</div>
          <div className="text-sm text-gray-400">HPS {hps}</div>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 text-sm text-gray-300">
        {metric === 'dps' ? (
          <>
            <div>Damage: {player.damageDealt}</div>
            <div>DPS: {dps}</div>
          </>
        ) : (
          <>
            <div>Healing: {player.healDealt}</div>
            <div>HPS: {hps}</div>
          </>
        )}
        <div className="col-span-2 text-xs text-gray-400 mt-1">
          {(() => {
            const uploaded = player.startedAt ? formatRelativeTime(player.startedAt) : '';
            const endedAt = player.startedAt && player.duration ? new Date(new Date(player.startedAt).getTime() + (player.duration * 1000)).toISOString() : undefined;
            const dur = player.startedAt && endedAt ? formatDuration(player.startedAt, endedAt) : '';
            return `${uploaded}${uploaded && dur ? ' • ' : ''}${dur}`;
          })()}
        </div>
      </div>
    </Link>
  );
}

function FilterControls({ params, setParams, metric, setMetric }: { params: GetTop10PlayersParams; setParams: React.Dispatch<React.SetStateAction<GetTop10PlayersParams>>; metric: 'dps' | 'hps'; setMetric: (m: 'dps'|'hps') => void }) {
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
  React.useEffect(() => {
    // ensure metric param is present/cleared when metric switches
    if (metric === 'dps') {
      setParams(prev => produce(prev, draft => { draft.hps = undefined }));
    } else {
      setParams(prev => produce(prev, draft => { draft.dps = undefined }));
    }
  }, [metric, setParams]);

  return (
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
            <div className="flex flex-col gap-1">
              <label className="text-[10px] uppercase tracking-widest text-purple-300/70 font-semibold">Scene</label>
              <div className="flex items-center gap-2">
                <span className="text-white text-sm font-medium">{params.scene_name || 'All Scenes'}</span>
                <svg className={`w-4 h-4 text-purple-300 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><path d="M19 9l-7 7-7-7" /></svg>
              </div>
            </div>
          </button>

          <div className={`transition-all duration-300 ease-in-out ${isOpen ? 'max-h-[480px] opacity-100' : 'max-h-0 opacity-0'}`}>
            <div className="max-h-72 overflow-y-auto py-2 px-4 space-y-3">
              {/* Scene selector */}
              <div>
                <div className="text-xs text-gray-400 mb-2">Scenes</div>
                <select className="w-full p-2 bg-gray-800 rounded" value={params.scene_name ?? ''} onChange={e => setParams(prev => produce(prev, draft => { draft.scene_name = e.target.value }))}>
                  <option value="">All Scenes</option>
                  {scenes.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              {/* Class selector */}
              <div>
                <div className="text-xs text-gray-400 mb-2">Class</div>
                <div className="flex gap-2 flex-wrap">
                  {Object.entries(CLASS_MAP).map(([idStr, name]) => {
                    const id = Number(idStr);
                    const active = selectedClass === id;
                    return (
                      <button key={id} onClick={() => { setSelectedClass(id); }} className={`flex items-center gap-2 px-3 py-1 rounded ${active ? 'bg-purple-600/20 border border-purple-500' : 'bg-gray-800'}`}>
                        <Image src={`/images/classes/${getClassIconName(id)}`} alt={name} width={20} height={20} className="object-contain" />
                        <span className="text-sm">{name}</span>
                      </button>
                    )
                  })}
                </div>

                {/* Specs */}
                {selectedClass && (
                  <div className="mt-3">
                    <div className="text-xs text-gray-400 mb-2">Specs</div>
                    <div className="flex gap-2">
                      {getSpecsForClass(selectedClass).map(specId => {
                        const specName = CLASS_SPEC_MAP[specId] ?? `Spec ${specId}`;
                        const checked = selectedSpecs.includes(specId);
                        return (
                          <label key={specId} className="inline-flex items-center gap-2 px-3 py-1 rounded bg-gray-800">
                            <input type="checkbox" checked={checked} onChange={e => {
                              setSelectedSpecs(prev => {
                                if (e.target.checked) return [...prev, specId];
                                return prev.filter(x => x !== specId);
                              })
                            }} />
                            <span className="text-sm">{specName}</span>
                          </label>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Metric tab */}
              <div>
                <div className="text-xs text-gray-400 mb-2">Metric</div>
                <div className="flex gap-2">
                  <button onClick={() => setMetric('dps')} className={`px-3 py-1 rounded ${metric === 'dps' ? 'bg-purple-600' : 'bg-gray-800'}`}>DPS</button>
                  <button onClick={() => setMetric('hps')} className={`px-3 py-1 rounded ${metric === 'hps' ? 'bg-purple-600' : 'bg-gray-800'}`}>HPS</button>
                </div>
                <div className="mt-2">
                  <input type="number" placeholder={`${metric.toUpperCase()} >=`} className="w-full p-2 rounded bg-gray-800" value={metric === 'dps' ? (params.dps ?? '') : (params.hps ?? '')} onChange={e => setParams(prev => produce(prev, draft => { if (metric === 'dps') draft.dps = e.target.value; else draft.hps = e.target.value }))} />
                </div>
              </div>

              {/* Combined sliders: Ability score (0-100k) and Duration (0-3600s) - use Radix two-thumb slider */}
              <div>
                <div className="text-xs text-gray-400 mb-2">Ability Score</div>
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
                  <RadixSlider.Track className="relative bg-gray-800 rounded-full h-2 w-full">
                    <RadixSlider.Range className="absolute bg-purple-500 h-full rounded-full" />
                  </RadixSlider.Track>
                  <RadixSlider.Thumb className="block w-4 h-4 bg-white rounded-full shadow -mt-1" />
                  <RadixSlider.Thumb className="block w-4 h-4 bg-white rounded-full shadow -mt-1" />
                </RadixSlider.Root>
                <div className="text-sm text-gray-400 mt-1">{abilityMin} — {abilityMax}</div>

                <div className="mt-3 text-xs text-gray-400 mb-2">Duration (seconds)</div>
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
                  <RadixSlider.Track className="relative bg-gray-800 rounded-full h-2 w-full">
                    <RadixSlider.Range className="absolute bg-purple-500 h-full rounded-full" />
                  </RadixSlider.Track>
                  <RadixSlider.Thumb className="block w-4 h-4 bg-white rounded-full shadow -mt-1" />
                  <RadixSlider.Thumb className="block w-4 h-4 bg-white rounded-full shadow -mt-1" />
                </RadixSlider.Root>
                <div className="text-sm text-gray-400 mt-1">{durationMin}s — {durationMax}s</div>
              </div>

              <div className="flex gap-2">
                <button className="px-3 py-1 rounded bg-gray-700" onClick={() => {
                  setParams(prev => produce(prev, draft => { draft.scene_name = ''; draft.class_id = undefined; draft.class_spec = undefined; draft.ability_score = undefined; draft.duration = undefined; draft.dps = undefined; draft.hps = undefined; }));
                  setSelectedClass(null);
                  setSelectedSpecs([]);
                  setDurationMin(0);
                  setDurationMax(3600);
                  setMetric('dps');
                }}>Reset</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PlayerLeaderboardPage() {
  const [params, setParams] = useState<GetTop10PlayersParams>({ scene_name: "Unstable - Tina's Mindrealm" });
  const [metric, setMetric] = useState<'dps'|'hps'>(params.dps ? 'dps' : params.hps ? 'hps' : 'dps');
  const { data, isLoading } = useQuery({ queryKey: ['players', params], queryFn: () => fetchTop10Players(params), enabled: !!params.scene_name });

  const rows = data?.players ?? [];
  const topThree = rows.slice(0, 3);
  const rest = rows.slice(3);

  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // scroll to top when params change
    if (containerRef.current) containerRef.current.scrollTop = 0;
  }, [params]);

  return (
    <div ref={containerRef} className="h-screen overflow-y-auto text-white">
      <FilterControls params={params} setParams={setParams} metric={metric} setMetric={m => setMetric(m)} />

      <section className="h-screen flex items-center justify-center">
        <div className="max-w-7xl w-full px-6 py-12">
          <div className="text-center mb-8">
            <h1 className="text-5xl font-bold">Player Leaderboard</h1>
            <p className="text-gray-400">Top players for the selected scene</p>
          </div>

          {isLoading ? (
            <div>Loading...</div>
          ) : (
            <div className="grid grid-cols-3 gap-6">
                  {topThree.map((p, idx) => (
                    <Link key={p.id} href={`/encounter/${p.encounterId}`} className={`p-6 rounded-2xl bg-linear-to-br from-gray-900/80 to-gray-900/60 border border-gray-800/60 ${idx===1? 'scale-95' : idx===2 ? 'scale-90' : 'scale-100'}`}>
                      <div className="flex items-center gap-4">
                        <div className="relative h-20 w-20 rounded-full bg-transparent flex items-center justify-center text-white font-bold text-xl overflow-hidden border border-gray-700/40">
                          <Image src={`/images/classes/${getClassIconName(p.classId ?? 0)}`} alt={CLASS_MAP[p.classId ?? 0] ?? 'Class'} width={80} height={80} className="object-contain" />
                        </div>
                        <div>
                          <div className="text-lg font-semibold">{p.name ?? 'Unknown'}</div>
                          <div className="text-sm text-gray-400">{CLASS_MAP[p.classId ?? 0] ?? 'Unknown'} • {CLASS_SPEC_MAP[p.classSpec ?? 0] ?? ''}</div>
                        </div>
                      </div>
                      <div className="mt-4 grid grid-cols-2 gap-2 text-center">
                        {metric === 'dps' ? (
                          <>
                            <div>
                              <div className="text-sm text-gray-400">Damage</div>
                              <div className="font-mono text-xl">{p.damageDealt}</div>
                            </div>
                            <div>
                              <div className="text-sm text-gray-400">DPS</div>
                              <div className="font-mono text-xl">{Math.round(p.dps||0)}</div>
                            </div>
                          </>
                        ) : (
                          <>
                            <div>
                              <div className="text-sm text-gray-400">Healing</div>
                              <div className="font-mono text-xl">{p.healDealt}</div>
                            </div>
                            <div>
                              <div className="text-sm text-gray-400">HPS</div>
                              <div className="font-mono text-xl">{p.hps ? Math.round(p.hps) : 0}</div>
                            </div>
                          </>
                        )}
                      </div>
                      <div className="mt-3 text-xs text-gray-400">{p.startedAt ? formatRelativeTime(p.startedAt) : ''} • {p.startedAt && p.duration ? formatDuration(p.startedAt, new Date(new Date(p.startedAt).getTime() + (p.duration * 1000)).toISOString()) : ''}</div>
                    </Link>
                  ))}
            </div>
          )}
        </div>
      </section>

      <section className="py-12 max-w-7xl mx-auto px-6">
        <h2 className="text-3xl font-bold mb-6">Top 10</h2>
        {isLoading ? (
          <div>Loading...</div>
        ) : (
          <div className="grid gap-4">
            {rest.map((p) => (
              <PlayerCard key={p.id} player={p} metric={metric} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

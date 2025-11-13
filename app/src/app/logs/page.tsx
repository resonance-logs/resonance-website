"use client";

import React, { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { produce } from "immer";
import Link from "next/link";
import Image from "next/image";
import {
  fetchEncounters,
  fetchEncounterScenes,
  FetchEncountersParams,
  FetchEncountersResponse,
  DEFAULT_FETCH_ENCOUNTERS_PARAMS,
} from "@/api/encounter/encounter";
import { CLASS_MAP, getClassIconName, getType } from "@/utils/classData";
import { formatDuration, formatRelativeTime, getDuration } from "@/utils/timeFormat";
import { formatNumber } from "@/utils/numberFormatter";

function AdvancedFilterControls({ params, setParams, scenes }: { 
  params: FetchEncountersParams; 
  setParams: React.Dispatch<React.SetStateAction<FetchEncountersParams>>; 
  scenes: string[] 
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Local debounced inputs for player and monster to avoid firing queries for short inputs
  const [playerInput, setPlayerInput] = useState<string>(params.player_name ?? "");
  const [monsterInput, setMonsterInput] = useState<string>(params.monster_name ?? "");

  // Debounce duration (ms)
  const DEBOUNCE_MS = 400;

  // Apply debounced player input to params only when empty or length > 3
  useEffect(() => {
    const t = setTimeout(() => {
      setParams((prev) =>
        produce(prev, (draft: FetchEncountersParams) => {
          if (playerInput.length === 0) {
            draft.player_name = "";
          } else if (playerInput.length > 3) {
            draft.player_name = playerInput;
          }
          draft.offset = 0;
        })
      );
    }, DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [playerInput, setParams]);

  // Apply debounced monster input to params only when empty or length > 3
  useEffect(() => {
    const t = setTimeout(() => {
      setParams((prev) =>
        produce(prev, (draft: FetchEncountersParams) => {
          if (monsterInput.length === 0) {
            draft.monster_name = "";
          } else if (monsterInput.length > 3) {
            draft.monster_name = monsterInput;
          }
          draft.offset = 0;
        })
      );
    }, DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [monsterInput, setParams]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const activeFiltersCount = [
    params.scene_name,
    params.player_name,
    params.monster_name,
    params.class_id
  ].filter(Boolean).length;

  function clearAllFilters() {
    setParams(
      produce((draft: FetchEncountersParams) => {
        draft.scene_name = "";
        draft.player_name = "";
        draft.monster_name = "";
        draft.class_id = "";
        draft.offset = 0;
      })
    );
    setPlayerInput("");
    setMonsterInput("");
  }

  return (
    <>
      {/* Active Filter Chips */}
      {activeFiltersCount > 0 && (
        <div className="fixed top-20 left-6 z-30 flex flex-wrap gap-2 max-w-xl animate-fade-in">
          {params.scene_name && (
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-500/20 border border-purple-500/40 backdrop-blur-md text-sm text-purple-200 font-medium shadow-lg">
              <span>Scene: {params.scene_name}</span>
              <button onClick={() => setParams(produce((draft: FetchEncountersParams) => { draft.scene_name = ""; draft.offset = 0 }))} className="hover:bg-purple-500/30 rounded-full p-0.5 transition-colors">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
          )}
          {params.player_name && (
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-500/20 border border-purple-500/40 backdrop-blur-md text-sm text-purple-200 font-medium shadow-lg">
              <span>Player: {params.player_name}</span>
              <button onClick={() => { setParams(produce((draft: FetchEncountersParams) => { draft.player_name = ""; draft.offset = 0 })); setPlayerInput(""); }} className="hover:bg-purple-500/30 rounded-full p-0.5 transition-colors">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
          )}
          {params.monster_name && (
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-500/20 border border-purple-500/40 backdrop-blur-md text-sm text-purple-200 font-medium shadow-lg">
              <span>Monster: {params.monster_name}</span>
              <button onClick={() => { setParams(produce((draft: FetchEncountersParams) => { draft.monster_name = ""; draft.offset = 0 })); setMonsterInput(""); }} className="hover:bg-purple-500/30 rounded-full p-0.5 transition-colors">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
          )}
          {params.class_id && (
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-500/20 border border-purple-500/40 backdrop-blur-md text-sm text-purple-200 font-medium shadow-lg">
              <span>Class: {CLASS_MAP[Number(params.class_id)]}</span>
              <button onClick={() => setParams(produce((draft: FetchEncountersParams) => { draft.class_id = ""; draft.offset = 0 }))} className="hover:bg-purple-500/30 rounded-full p-0.5 transition-colors">
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
                  <span className="text-white text-sm font-medium truncate">{activeFiltersCount > 0 ? `${activeFiltersCount} active` : 'None active'}</span>
                  <svg className={`w-4 h-4 text-purple-300 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><path d="M19 9l-7 7-7-7" /></svg>
                </div>
              </div>
            </button>

            <div className={`transition-all duration-300 ease-in-out ${isOpen ? 'max-h-[600px] opacity-100' : 'max-h-0 opacity-0'}`}>
              <div className="max-h-[600px] overflow-y-auto py-2 px-4 space-y-4">
                {/* Scene selector */}
                <div>
                  <div className="text-xs font-semibold text-purple-300 mb-2 uppercase tracking-wide">Scene</div>
                  <select 
                    className="w-full p-2.5 bg-gray-800/80 border border-gray-700 rounded-lg text-sm text-gray-200 focus:border-purple-500 focus:outline-none transition-colors" 
                    value={params.scene_name ?? ''} 
                    onChange={e => setParams(prev => produce(prev, draft => { draft.scene_name = e.target.value; draft.offset = 0; }))}
                  >
                    <option value="">All Scenes</option>
                    {scenes.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>

                {/* Class selector */}
                <div>
                  <div className="text-xs font-semibold text-purple-300 mb-2 uppercase tracking-wide">Class</div>
                  <div className="flex gap-2 flex-wrap">
                    {Object.entries(CLASS_MAP).map(([idStr, name]) => {
                      const id = idStr;
                      const active = params.class_id === id;
                      return (
                        <button 
                          key={id} 
                          onClick={() => setParams(prev => produce(prev, draft => { draft.class_id = active ? "" : id; draft.offset = 0; }))} 
                          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${active ? 'bg-purple-500/30 border border-purple-500 text-purple-200' : 'bg-gray-800/80 border border-gray-700 hover:bg-gray-800 text-gray-300'}`}
                        >
                          <Image src={`/images/classes/${getClassIconName(Number(id))}`} alt={name} width={18} height={18} className="object-contain" />
                          <span>{name}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Player search */}
                <div>
                  <div className="text-xs font-semibold text-purple-300 mb-2 uppercase tracking-wide">Player Name</div>
                  <input
                    type="text"
                    value={playerInput}
                    onChange={(e) => setPlayerInput(e.target.value)}
                    placeholder="Type at least 4 characters..."
                    className="w-full p-2.5 bg-gray-800/80 border border-gray-700 rounded-lg text-sm text-gray-200 placeholder-gray-500 focus:border-purple-500 focus:outline-none transition-colors"
                  />
                </div>

                {/* Monster search */}
                <div>
                  <div className="text-xs font-semibold text-purple-300 mb-2 uppercase tracking-wide">Monster Name</div>
                  <input
                    type="text"
                    value={monsterInput}
                    onChange={(e) => setMonsterInput(e.target.value)}
                    placeholder="Type at least 4 characters..."
                    className="w-full p-2.5 bg-gray-800/80 border border-gray-700 rounded-lg text-sm text-gray-200 placeholder-gray-500 focus:border-purple-500 focus:outline-none transition-colors"
                  />
                </div>

                <div className="flex gap-2 pt-2 border-t border-gray-800">
                  <button 
                    className="flex-1 px-4 py-2.5 rounded-lg bg-gray-800/80 border border-gray-700 hover:bg-gray-800 text-gray-300 text-sm font-medium transition-colors" 
                    onClick={clearAllFilters}
                  >
                    Reset All
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function EncounterCardSkeleton() {
  return (
    <div className="flex h-full rounded-2xl border border-gray-800/80 bg-linear-to-br from-gray-900/90 via-gray-900/80 to-gray-900/70 backdrop-blur-md p-6 animate-pulse">
      <div className="flex flex-wrap items-start justify-between gap-6 w-full">
        <div className="flex items-center gap-4">
          {/* Uploader skeleton */}
          <div className="h-12 w-12 rounded-full bg-gray-700/50" />
          <div>
            <div className="h-5 w-32 rounded bg-gray-700/50 mb-2" />
            <div className="h-3 w-24 rounded bg-gray-700/50 mb-1" />
            <div className="h-3 w-20 rounded bg-gray-700/50" />
          </div>
        </div>
        
        {/* Stats skeleton */}
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
  );
}

export default function LogsPage() {
  const [params, setParams] = useState<FetchEncountersParams>({
    ...DEFAULT_FETCH_ENCOUNTERS_PARAMS,
    limit: 15,
    offset: 0,
    orderBy: "startedAt",
    sort: "desc",
  });

  const { data, isLoading } = useQuery<FetchEncountersResponse>({
    queryKey: ["encounters", params],
    queryFn: () => fetchEncounters(params),
  });

  const { data: scenesData } = useQuery<string[]>({
    queryKey: ["encounterScenes"],
    queryFn: () => fetchEncounterScenes(),
  });

  const scenes = scenesData ?? [];
  const rows = data?.encounters ?? [];
  const count = data?.count ?? 0;

  const limit = params.limit || 15;
  const offset = params.offset || 0;
  const page = Math.max(1, Math.floor(offset / limit) + 1);
  const totalPages = Math.max(1, Math.ceil(count / limit));

  return (
    <>
      <div className="min-h-screen text-white relative">
        <div className="absolute inset-0 bg-linear-to-b from-purple-900/10 via-transparent to-transparent pointer-events-none" />
        
        <AdvancedFilterControls params={params} setParams={setParams} scenes={scenes} />

        <div className="max-w-7xl mx-auto py-12 px-4 relative z-10">
        {/* Header */}
        <div className="text-center mb-12 animate-fade-in">
          <div className="inline-flex items-center gap-3 px-6 py-2 rounded-full bg-purple-500/10 border border-purple-500/20 backdrop-blur-md mb-4">
            <div className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
            <p className="text-sm uppercase tracking-[0.35em] text-purple-300 font-semibold">Browse</p>
          </div>
          <h1 className="text-6xl font-bold bg-linear-to-r from-purple-200 via-purple-300 to-pink-200 bg-clip-text text-transparent pb-4">
            Combat Logs
          </h1>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            Explore uploaded encounters and analyze combat performance across all scenes and players.
          </p>
        </div>

        {/* Results Summary */}
        <div className="flex flex-wrap items-center justify-between mb-8 gap-4">
          <div className="text-gray-400 text-lg">
            {count > 0 ? (
              <span className="font-medium">
                Showing <span className="text-purple-300">{Math.min(offset + 1, count)}</span>-<span className="text-purple-300">{Math.min(offset + rows.length, count)}</span> of <span className="text-white font-semibold">{count.toLocaleString()}</span> encounters
              </span>
            ) : (
              "No encounters found"
            )}
          </div>
          
          {/* Pagination */}
          <div className="flex items-center gap-3">
            <div className="text-sm text-gray-400">Page {page} of {totalPages}</div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setParams(produce((draft: FetchEncountersParams) => { draft.offset = Math.max(0, (draft.offset || 0) - (draft.limit || 15)); }))}
                disabled={offset <= 0}
                className="px-4 py-2 rounded-lg bg-gray-800/60 border border-gray-700 text-gray-300 disabled:opacity-40 hover:bg-gray-700/60 transition-colors font-medium"
              >
                Previous
              </button>
              <button
                type="button"
                onClick={() => setParams(produce((draft: FetchEncountersParams) => { draft.offset = (draft.offset || 0) + (draft.limit || 15); }))}
                disabled={(offset + limit) >= count}
                className="px-4 py-2 rounded-lg bg-gray-800/60 border border-gray-700 text-gray-300 disabled:opacity-40 hover:bg-gray-700/60 transition-colors font-medium"
              >
                Next
              </button>
            </div>
          </div>
        </div>

        {/* Encounters Grid */}
        <div className="space-y-3">
          {isLoading ? (
            Array.from({ length: limit }).map((_, idx) => (
              <EncounterCardSkeleton key={idx} />
            ))
          ) : (
            rows.map((encounter, idx) => {
              const localPlayer = encounter?.players?.filter((e) => e.isLocalPlayer)[0];
              const duration = Math.max(1, getDuration(encounter?.startedAt, encounter?.endedAt));
              const classType = localPlayer ? getType(localPlayer.classId ?? 0, localPlayer.classSpec ?? 0) : "damage";

              const dps = formatNumber(Math.round((localPlayer?.damageDealt || 0) / duration));
              const hps = formatNumber(Math.round((localPlayer?.healDealt || 0) / duration));

              const showDps = classType === "damage" || classType === "tank" || classType === "damagehealer";
              const showHps = classType === "healer" || classType === "damagehealer";

              const teamDps = Math.round((encounter.totalDmg ?? 0) / duration);
              const playerCount = encounter.players?.filter(p => p.isPlayer)?.length ?? 0;

              return (
                <Link
                  key={encounter.id}
                  href={`/encounter/${encounter.id}`}
                  className="group flex h-full rounded-xl border border-gray-800/80 bg-linear-to-br from-gray-900/90 via-gray-900/80 to-gray-900/70 backdrop-blur-md p-4 transition-all duration-300 hover:border-purple-500/50 hover:shadow-xl hover:shadow-purple-500/10 hover:scale-[1.01] relative overflow-hidden animate-slide-up"
                  style={{ animationDelay: `${idx * 50}ms` }}
                >
                  {/* Textured background overlay */}
                  <div className="absolute inset-0 opacity-5 pointer-events-none" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width="40" height="40" xmlns="http://www.w3.org/2000/svg"%3E%3Cpath d="M0 0h40v40H0z" fill="none"/%3E%3Cpath d="M20 0v40M0 20h40" stroke="%23fff" stroke-width="0.5" opacity="0.1"/%3E%3C/svg%3E")' }}></div>
                  
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 w-full relative z-10">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {/* Uploader info */}
                      <div className="relative h-10 w-10 rounded-full overflow-hidden border-2 border-gray-700/80 bg-white/5 flex items-center justify-center text-sm font-semibold text-white shadow-md shrink-0">
                        {encounter.user?.discord_avatar_url ? (
                          <Image src={encounter.user.discord_avatar_url} alt={(encounter.user?.discord_global_name ?? encounter.user?.discord_username) as string} fill sizes="40px" className="object-cover" />
                        ) : (
                          <span>{((encounter.user?.discord_global_name ?? encounter.user?.discord_username) || 'F')[0].toUpperCase()}</span>
                        )}
                      </div>
                      
                      {/* Encounter details */}
                      <div className="flex-1 min-w-0">
                        <p className="text-lg font-bold text-white group-hover:text-purple-200 transition-colors truncate">
                          {encounter.sceneName || 'Unknown Scene'}
                        </p>
                        <div className="flex items-center gap-2 text-sm text-gray-400">
                          <span>{encounter.bosses?.[0]?.monsterName || 'Unknown Boss'}</span>
                          <span>•</span>
                          <span>Uploaded by {(encounter.user?.discord_global_name ?? encounter.user?.discord_username) ?? "Fireteam"}</span>
                        </div>
                        <div className="text-xs text-gray-500">
                          {formatRelativeTime(encounter.startedAt)} • {playerCount} player{playerCount !== 1 ? 's' : ''}
                        </div>
                      </div>
                    </div>

                    {/* Stats grid */}
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-4 shrink-0 min-w-0 justify-items-end">
                      {/* Empty column spacer when needed */}
                      {!localPlayer && <div className="hidden lg:block"></div>}
                      
                      <div className="text-center p-3 rounded-lg bg-purple-500/10 border border-purple-500/20 min-w-[90px] min-h-[60px] flex flex-col justify-center">
                        <p className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold">Team DPS</p>
                        <p className="mt-1 text-lg font-bold text-purple-300 truncate">{formatNumber(teamDps)}</p>
                      </div>
                      
                      {localPlayer && showDps && (
                        <div className="text-center p-3 rounded-lg bg-gray-800/70 min-w-[90px] min-h-[60px] flex flex-col justify-center">
                          <p className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold">Your DPS</p>
                          <p className="mt-1 text-lg font-bold text-red-400 truncate">{dps}</p>
                        </div>
                      )}
                      
                      {localPlayer && showHps && (
                        <div className="text-center p-3 rounded-lg bg-gray-800/70 min-w-[90px] min-h-[60px] flex flex-col justify-center">
                          <p className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold">Your HPS</p>
                          <p className="mt-1 text-lg font-bold text-green-400 truncate">{hps}</p>
                        </div>
                      )}
                      
                      <div className="text-center p-3 rounded-lg bg-gray-800/70 min-w-[90px] min-h-[60px] flex flex-col justify-center">
                        <p className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold">Total DMG</p>
                        <p className="mt-1 text-lg font-bold text-gray-200 truncate">{formatNumber(encounter.totalDmg ?? 0)}</p>
                      </div>
                      
                      <div className="text-center p-3 rounded-lg bg-gray-800/70 min-w-[90px] min-h-[60px] flex flex-col justify-center">
                        <p className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold">Duration</p>
                        <p className="mt-1 text-lg font-bold text-white truncate">{formatDuration(encounter.startedAt, encounter.endedAt)}</p>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })
          )}
        </div>

        {/* Bottom Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-3 mt-12">
            <button
              type="button"
              onClick={() => setParams(produce((draft: FetchEncountersParams) => { draft.offset = Math.max(0, (draft.offset || 0) - (draft.limit || 15)); }))}
              disabled={offset <= 0}
              className="px-6 py-3 rounded-lg bg-gray-800/60 border border-gray-700 text-gray-300 disabled:opacity-40 hover:bg-gray-700/60 transition-colors font-medium"
            >
              Previous Page
            </button>
            <div className="px-4 py-2 text-gray-400 font-medium">
              Page {page} of {totalPages}
            </div>
            <button
              type="button"
              onClick={() => setParams(produce((draft: FetchEncountersParams) => { 
                draft.offset = (draft.offset || 0) + (draft.limit || 15); 
              }))}
              disabled={(offset + limit) >= count}
              className="px-6 py-3 rounded-lg bg-gray-800/60 border border-gray-700 text-gray-300 disabled:opacity-40 hover:bg-gray-700/60 transition-colors font-medium"
            >
              Next Page
            </button>
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

        @keyframes slide-up {
          from {
            opacity: 0;
            transform: translateY(20px);
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

        .animate-slide-up {
          animation: slide-up 0.6s ease-out forwards;
          opacity: 0;
        }
      `}</style>
      </div>
    </>
  );
}

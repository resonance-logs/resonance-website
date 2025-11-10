"use client";

import { useState, useEffect, useRef } from "react";
import { useQuery } from '@tanstack/react-query'
import { produce } from "immer"
import Link from "next/link";
import Image from "next/image";
import { fetchEncounters, FetchEncountersParams, FetchEncountersResponse, fetchEncounterScenes, DEFAULT_FETCH_ENCOUNTERS_PARAMS } from '@/api/encounter/encounter'
import { ActorEncounterStat } from '@/types/commonTypes'
import { getClassIconName, getClassTooltip } from "@/utils/classData";
import { formatDuration, formatRelativeTime } from "@/utils/timeFormat";

const PAGE_SIZE = 10;

function renderPlayerColumn(
  column: ActorEncounterStat[],
  columnIndex: number,
  encounterId: number,
  bestDamage: number,
  durationMs: number
) {
  return (
    <div
      key={`${encounterId}-column-${columnIndex}`}
      className="rounded-xl border border-gray-800/60 bg-gray-900/60 p-4 backdrop-blur-sm"
    >
      <div className="space-y-3">
        {column.map((player) => {
          const damageRatio = bestDamage > 0 ? Math.round((player.damageDealt / bestDamage) * 100) : 0;
          const durationSec = Math.max(1, Math.floor(durationMs / 1000));
          const playerDps = Math.round(player.damageDealt / durationSec);
          return (
            <div key={`${encounterId}-${player.actorId}`} className="flex items-center gap-3">
              <div className="relative h-8 w-8 overflow-hidden rounded-full border border-purple-400/30 bg-gray-800">
                <Image
                  src={`/images/classes/${getClassIconName(player.classId)}`}
                  alt={player.name ?? "Player"}
                  fill
                  sizes="32px"
                  className="object-contain"
                  title={getClassTooltip(player.classId ?? null, player.classSpec ?? null)}
                />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between text-sm">
                  <p className="font-medium text-gray-200">{player.name ?? `Player #${player.actorId}`}</p>
                  <span className="text-xs text-gray-400">{playerDps.toLocaleString()} DPS</span>
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-gray-800">
                  <div className="h-full bg-linear-to-r from-purple-500 to-purple-400 transition-all duration-500" style={{ width: `${damageRatio}%` }} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function FilterControls({ params, setParams, scenes }: { params: FetchEncountersParams; setParams: React.Dispatch<React.SetStateAction<FetchEncountersParams>>; scenes: string[] }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

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

  const currentSceneName = params.scene_name || 'All Scenes';

  return (
    <div className="fixed top-20 right-6 z-40 animate-fade-in" ref={dropdownRef}>
      <div className="group relative">
        {/* Unified glow effect - only shows around the actual content */}
        <div className="absolute inset-0 -m-0.5 bg-linear-to-r from-purple-600 to-pink-600 rounded-2xl opacity-20 blur group-hover:opacity-40 transition-all duration-300 pointer-events-none"></div>

        {/* Unified container */}
        <div className={`relative bg-gray-900/95 border border-purple-500/30 backdrop-blur-xl shadow-2xl shadow-purple-500/10 transition-all duration-300 overflow-hidden ${
          isOpen ? 'rounded-2xl' : 'rounded-2xl hover:shadow-purple-500/20 hover:border-purple-500/50'
        }`}>
          {/* Main button */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="relative flex items-center gap-3 px-5 py-3.5 w-full transition-all duration-300"
          >
            {/* Filter icon with animated bg */}
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-linear-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30 group-hover:from-purple-500/30 group-hover:to-pink-500/30 transition-all duration-300">
              <svg className="w-4.5 h-4.5 text-purple-300" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" viewBox="0 0 24 24" stroke="currentColor">
                <path d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"></path>
              </svg>
            </div>

            {/* Divider */}
            <div className="h-8 w-px bg-linear-to-b from-transparent via-purple-500/40 to-transparent"></div>

            {/* Current selection */}
            <div className="flex flex-col gap-1">
              <label className="text-[10px] uppercase tracking-widest text-purple-300/70 font-semibold">Scene</label>
              <div className="flex items-center gap-2">
                <span className="text-white text-sm font-medium">{currentSceneName}</span>
                <svg
                  className={`w-4 h-4 text-purple-300 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2.5"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path d="M19 9l-7 7-7-7"></path>
                </svg>
              </div>
            </div>
          </button>

          {/* Expandable drawer section */}
          <div className={`transition-all duration-300 ease-in-out ${
            isOpen ? 'max-h-[400px] opacity-100' : 'max-h-0 opacity-0'
          }`}>

            {/* Options list */}
            <div className="max-h-72 overflow-y-auto py-2">

              {/* Scene options */}
              {scenes.map((scene) => (
                <button
                  key={scene}
                  onClick={() => {
                    setParams(produce((draft: FetchEncountersParams) => {
                      draft.scene_name = scene;
                      draft.offset = 0;
                    }));
                    setIsOpen(false);
                  }}
                  className={`w-full px-5 py-3 text-left transition-all duration-200 flex items-center justify-between ${
                    params.scene_name === scene
                      ? 'bg-purple-500/20 text-purple-200'
                      : 'text-gray-300 hover:bg-purple-500/10 hover:text-white'
                  }`}
                >
                  <span className="text-sm font-medium">{scene}</span>
                  {params.scene_name === scene && (
                    <svg className="w-4 h-4 text-purple-400" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" viewBox="0 0 24 24" stroke="currentColor">
                      <path d="M5 13l4 4L19 7"></path>
                    </svg>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

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
          const heightClass = 'h-[26.625rem]';
          const widthClass = 'w-[18rem]';
          // Center (1st) is tallest, silver (2nd) is medium, bronze (3rd) is shortest
          const translateY = isCenter ? '-translate-y-[100px]' : isSilver ? '-translate-y-[50px]' : '-translate-y-[25px]';
          const animationDelay = slotPos === 1 ? '400ms' : slotPos === 0 ? '600ms' : '800ms';

          return (
            <div
              key={`skeleton-${slotPos}`}
              className={`relative ${widthClass} ${heightClass} ${translateY} flex flex-col justify-between rounded-2xl bg-gray-900/50 backdrop-blur-md ring-2 ring-gray-700/50 shadow-xl animate-pulse`}
              style={{ animationDelay }}
            >
              {/* Rank badge skeleton */}
              <div className="absolute -top-5 left-4 z-20">
                <div className="h-12 w-12 rounded-full bg-gray-700/50" />
              </div>

              {/* Uploader skeleton */}
              <div className="z-10 mt-6 w-full px-5">
                <div className="flex items-center justify-end gap-3">
                  <div className="h-10 w-10 rounded-full bg-gray-700/50" />
                  <div className="text-right">
                    <div className="h-3 w-16 rounded bg-gray-700/50 mb-2" />
                    <div className="h-4 w-24 rounded bg-gray-700/50 mb-1" />
                    <div className="h-3 w-20 rounded bg-gray-700/50" />
                  </div>
                </div>
              </div>

              {/* Stats skeleton */}
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

              {/* Players skeleton */}
              <div className="z-10 mb-5 w-full px-5">
                <div className="flex flex-col gap-2">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="h-7 w-7 rounded-full bg-gray-700/50" />
                      <div className="flex-1">
                        <div className="h-3 w-full rounded bg-gray-700/50 mb-2" />
                        <div className="h-1.5 w-full rounded-full bg-gray-800/50" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function EncounterListSkeleton() {
  return (
    <div className="space-y-6">
      {[...Array(7)].map((_, idx) => (
        <div
          key={idx}
          className="flex h-full flex-col rounded-2xl border border-gray-800/80 bg-gradient-to-br from-gray-900/90 via-gray-900/80 to-gray-900/70 backdrop-blur-md p-6 animate-pulse"
        >
          <div className="flex flex-wrap items-start justify-between gap-6 mb-6">
            <div className="flex items-center gap-4">
              {/* Rank badge skeleton */}
              <div className="h-12 w-12 rounded-full bg-gray-700/50" />

              {/* Uploader skeleton */}
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-full bg-gray-700/50" />
                <div>
                  <div className="h-3 w-20 rounded bg-gray-700/50 mb-2" />
                  <div className="h-5 w-32 rounded bg-gray-700/50" />
                </div>
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

          {/* Players skeleton */}
          <div className="grid gap-4 md:grid-cols-2">
            {[...Array(2)].map((_, colIdx) => (
              <div key={colIdx} className="rounded-xl border border-gray-800/60 bg-gray-900/60 p-4">
                <div className="space-y-3">
                  {[...Array(4)].map((_, playerIdx) => (
                    <div key={playerIdx} className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-gray-700/50" />
                      <div className="flex-1">
                        <div className="h-3 w-full rounded bg-gray-700/50 mb-2" />
                        <div className="h-2 w-full rounded-full bg-gray-800/50" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function EncounterLeaderboardPage() {
  const [params, setParams] = useState<FetchEncountersParams>({
    ...DEFAULT_FETCH_ENCOUNTERS_PARAMS,
    scene_name: "Unstable - Tina's Mindrealm",
    limit: PAGE_SIZE,
    orderBy: 'duration',
  })
  const [currentSection, setCurrentSection] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const section1Ref = useRef<HTMLElement>(null);
  const section2Ref = useRef<HTMLElement>(null);

  const { data, isLoading } = useQuery<FetchEncountersResponse>({
    queryKey: ['encounters', params],
    queryFn: () => fetchEncounters(params),
  });

  const { data: scenesData } = useQuery<string[]>({
    queryKey: ['encounterScenes'],
    queryFn: () => fetchEncounterScenes(),
  });

  const offset = params.offset || 0

  const rows = data?.encounters ?? [];

  const scenes = scenesData ?? [];


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

  // Handle scroll to top of section 2 to snap back to section 1
  useEffect(() => {
    const handleSection2Scroll = (e: Event) => {
      const target = e.target as HTMLElement;
      if (target.scrollTop === 0 && currentSection === 1) {
        // User is at the top of section 2 and scrolling up
        const deltaY = (e as WheelEvent).deltaY;
        if (deltaY < 0) {
          // Scrolling up, snap to section 1
          e.preventDefault();
          scrollToSection(0);
        }
      }
    };

    const section2 = section2Ref.current;
    if (section2) {
      section2.addEventListener('wheel', handleSection2Scroll, { passive: false });
      return () => section2.removeEventListener('wheel', handleSection2Scroll);
    }
  }, [currentSection]);

  return (
    <div ref={containerRef} className="h-screen overflow-y-auto text-white scroll-smooth" style={{ scrollSnapType: 'y mandatory' }}>
      {/* Fixed Filter */}
      <FilterControls params={params} setParams={setParams} scenes={scenes} />

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
              Top 3
            </h1>
          </div>

          {/* Podium for top 3 */}
          {isLoading ? (
            <PodiumSkeleton />
          ) : topThree.length > 0 && (
            <div className="relative mx-auto w-full max-w-6xl px-2">
              <div className="relative flex min-h-128 items-end justify-center gap-6">
                {[1, 0, 2].map((slotIdx, slotPos) => {
                  const enc = topThree[slotIdx];
                  if (!enc) {
                    return <div key={`slot-${slotPos}`} className="flex-1" />;
                  }

                  const topIndex = slotIdx;
                  const globalRank = offset + topIndex + 1;
                  const startedAtMs = new Date(enc.startedAt).getTime();
                  const endedAtMs = enc.endedAt ? new Date(enc.endedAt).getTime() : startedAtMs + 1000;
                  const durationMs = endedAtMs - startedAtMs;
                  const durationSec = Math.max(1, Math.floor(durationMs / 1000));
                  const teamDps = Math.round((enc.totalDmg ?? 0) / durationSec);

                  const teamAvg = enc.players?.length
                    ? Math.round(enc.players.reduce((s, p) => s + (p.abilityScore ?? 0), 0) / enc.players.length)
                    : null;

                  const isCenter = slotPos === 1;
                  const isSilver = globalRank === 2;
                  const heightClass = 'h-[26.625rem]';
                  const widthClass = 'w-[18rem]';
                  const ringClass = isCenter
                    ? 'ring-2 ring-yellow-400/60 shadow-lg shadow-yellow-400/20'
                    : isSilver
                    ? 'ring-2 ring-gray-300/60 shadow-lg shadow-gray-300/20'
                    : 'ring-2 ring-amber-600/60 shadow-lg shadow-amber-600/20';

                  const uploaderName = enc.user?.discord_global_name ?? enc.user?.discord_username ?? 'Fireteam';
                  const uploaderAvatarUrl = enc.user?.discord_avatar_url ?? undefined;
                  const translateY = isCenter ? '-translate-y-[100px]' : isSilver ? '-translate-y-[50px]' : '-translate-y-[25px]';

                  // Animation delays
                  const animationDelay = slotPos === 1 ? '400ms' : slotPos === 0 ? '600ms' : '800ms';

                  const allPlayers = (enc.players ?? [])
                    .filter((p) => p.isPlayer)
                    .sort((a, b) => b.damageDealt - a.damageDealt);

                  const totalPlayersCount = allPlayers.length;
                  const topPlayers = allPlayers.slice(0, 5);
                  const bestDamage = totalPlayersCount > 0 ? Math.max(...allPlayers.map((p) => p.damageDealt)) : 0;

                  return (
                    <Link
                      key={enc.id}
                      href={`/encounter/${enc.id}`}
                      className={`group relative ${widthClass} ${heightClass} ${translateY} flex flex-col justify-between rounded-2xl bg-gray-900/90 backdrop-blur-md ${ringClass} transition-all duration-300 hover:scale-[1.05] animate-scale-in`}
                      style={{ animationDelay }}
                    >
                      {/* Rank badge with glow */}
                      <div className="absolute -top-5 left-4 z-20 flex items-center gap-2">
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

                      {/* Uploader info */}
                      <div className="z-10 mt-6 w-full px-5">
                        <div className="flex items-center justify-end gap-3">
                          <div className="relative h-10 w-10 overflow-hidden rounded-full border-2 border-white/10 bg-white/5 flex items-center justify-center shadow-lg">
                            {uploaderAvatarUrl ? (
                              <Image src={uploaderAvatarUrl} alt={uploaderName} fill sizes="40px" className="object-cover" />
                            ) : (
                              <div className="text-sm font-semibold text-white/90">{(uploaderName || 'F').charAt(0).toUpperCase()}</div>
                            )}
                          </div>
                          <div className="text-right max-w-36 sm:max-w-48">
                            <div className="text-[10px] uppercase tracking-wider text-gray-400">Uploaded by</div>
                            <div className="text-sm font-semibold text-white truncate">{uploaderName}</div>
                            <div className="text-xs text-gray-500 truncate">{formatRelativeTime(enc.startedAt)}</div>
                          </div>
                        </div>
                      </div>

                      {/* Stats grid */}
                      <div className="z-10 my-2 w-full px-5">
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div className="p-2 rounded-lg bg-purple-500/10 border border-purple-500/20">
                            <p className="text-[10px] uppercase tracking-wide text-gray-400">Duration</p>
                            <p className="mt-1 font-bold text-purple-300">{formatDuration(enc.startedAt, enc.endedAt)}</p>
                          </div>
                          <div className="p-2 rounded-lg bg-gray-800/50">
                            <p className="text-[10px] uppercase tracking-wide text-gray-400">Total Damage</p>
                            <p className="mt-1 font-medium text-gray-200">{(enc.totalDmg ?? 0).toLocaleString()}</p>
                          </div>
                          <div className="p-2 rounded-lg bg-gray-800/50">
                            <p className="text-[10px] uppercase tracking-wide text-gray-400">Team DPS</p>
                            <p className="mt-1 text-base font-bold text-white">{teamDps.toLocaleString()}</p>
                          </div>
                          <div className="p-2 rounded-lg bg-gray-800/50">
                            <p className="text-[10px] uppercase tracking-wide text-gray-400">Avg Ability</p>
                            <p className="mt-1 font-medium text-gray-200">{teamAvg ?? '—'}</p>
                          </div>
                        </div>
                      </div>

                      {/* Players */}
                      <div className="z-10 mb-5 w-full px-5">
                        {topPlayers.length === 0 ? (
                          <p className="text-xs text-gray-500">No player data available.</p>
                        ) : (
                          <div className="flex flex-col gap-2">
                            {topPlayers.map((p, idx) => {
                              const damageRatio = bestDamage > 0 ? Math.round((p.damageDealt / bestDamage) * 100) : 0;
                              const durationSec = Math.max(1, Math.floor(durationMs / 1000));
                              const playerDps = Math.round(p.damageDealt / durationSec);
                              return (
                                <div key={`${enc.id}-pd-${p.actorId}`} className="flex items-center gap-3 opacity-0 animate-fade-in" style={{ animationDelay: `${idx * 50}ms` }}>
                                  <div className="relative h-7 w-7 overflow-hidden rounded-full border border-purple-400/30 bg-gray-800 shadow-md">
                                    <Image
                                      src={`/images/classes/${getClassIconName(p.classId)}`}
                                      alt={p.name ?? 'Player'}
                                      fill
                                      sizes="28px"
                                      className="object-contain"
                                      title={getClassTooltip(p.classId ?? null, p.classSpec ?? null)}
                                    />
                                  </div>
                                  <div className="flex-1">
                                    <div className="flex items-center justify-between text-sm">
                                      <p className="font-medium text-gray-200">{p.name ?? `Player #${p.actorId}`}</p>
                                      <span className="text-xs text-gray-400">{playerDps.toLocaleString()} DPS</span>
                                    </div>
                                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-gray-800">
                                      <div className="h-full bg-linear-to-r from-purple-500 to-purple-400 transition-all duration-700" style={{ width: `${damageRatio}%` }} />
                                    </div>
                                  </div>
                                </div>
                              );
                            })}

                            {totalPlayersCount > topPlayers.length && (
                              <div className="mt-2 flex justify-end">
                                <span className="rounded-full bg-gray-800 px-3 py-1 text-xs font-medium text-gray-300 border border-gray-700">
                                  +{totalPlayersCount - topPlayers.length} more players
                                </span>
                              </div>
                            )}
                          </div>
                        )}
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

          {/* Encounters list */}
          {isLoading ? (
            <EncounterListSkeleton />
          ) : (
            <div className="space-y-6">
              {restRows.map((encounter, idx) => {
              const globalRank = offset + idx + 4; // after top 3
              const startedAtMs = new Date(encounter.startedAt).getTime();
              const endedAtMs = encounter.endedAt ? new Date(encounter.endedAt).getTime() : startedAtMs + 1000;
              const durationMs = endedAtMs - startedAtMs;
              const durationSec = Math.max(1, Math.floor(durationMs / 1000));
              const teamDps = Math.round((encounter.totalDmg ?? 0) / durationSec);

              const topPlayers: ActorEncounterStat[] = [...(encounter.players ?? [])]
                .filter((p) => p.isPlayer)
                .sort((a, b) => b.damageDealt - a.damageDealt)
                .slice(0, 8);

              const bestDamage = topPlayers.length
                ? Math.max(...topPlayers.map((p) => p.damageDealt))
                : 0;

              const columnSize = Math.ceil(topPlayers.length / 2);
              const playerColumns: ActorEncounterStat[][] = [
                topPlayers.slice(0, columnSize),
                topPlayers.slice(columnSize),
              ].filter((group) => group.length > 0);

              const teamAvg = encounter.players?.length
                ? Math.round(encounter.players.reduce((s, p) => s + (p.abilityScore ?? 0), 0) / encounter.players.length)
                : null;

              return (
                <Link
                  key={encounter.id}
                  href={`/encounter/${encounter.id}`}
                  className="group flex h-full flex-col rounded-2xl border border-gray-800/80 bg-linear-to-br from-gray-900/90 via-gray-900/80 to-gray-900/70 backdrop-blur-md p-6 transition-all duration-300 hover:border-purple-500/50 hover:shadow-xl hover:shadow-purple-500/10 hover:scale-[1.02]"
                >
                  <div className="flex flex-wrap items-start justify-between gap-6 mb-6">
                    <div className="flex items-center gap-4">
                      {/* Rank badge */}
                      <div
                        className={
                          globalRank === 4
                            ? "flex h-12 w-12 items-center justify-center rounded-full text-lg font-bold text-white bg-linear-to-br from-purple-600 to-purple-800 shadow-lg shadow-purple-500/30 ring-2 ring-purple-400/50"
                            : "flex h-12 w-12 items-center justify-center rounded-full text-lg font-bold text-gray-200 bg-linear-to-br from-gray-700 to-gray-900 shadow-lg ring-2 ring-gray-600/50"
                        }
                      >
                        {globalRank}
                      </div>

                      {/* Uploader */}
                      <div className="flex items-center gap-3">
                        <div className="relative h-11 w-11 rounded-full overflow-hidden border-2 border-gray-700/80 bg-white/5 flex items-center justify-center text-sm font-semibold text-white shadow-md">
                          {encounter.user?.discord_avatar_url ? (
                            <Image src={encounter.user.discord_avatar_url} alt={(encounter.user?.discord_global_name ?? encounter.user?.discord_username) as string} fill sizes="44px" className="object-cover" />
                          ) : (
                            <span>{((encounter.user?.discord_global_name ?? encounter.user?.discord_username) || 'F')[0].toUpperCase()}</span>
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 text-sm text-gray-400">
                            <span className="text-xs text-gray-500">{formatRelativeTime(encounter.startedAt)}</span>
                          </div>
                          <p className="mt-1 text-lg font-semibold text-white group-hover:text-purple-200 transition-colors">
                            <span className="text-xs text-gray-400 mr-2">Uploaded by</span>
                            {(encounter.user?.discord_global_name ?? encounter.user?.discord_username) ?? "Fireteam"}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Stats grid */}
                    <div className="grid grid-cols-2 gap-4 text-right sm:grid-cols-4 sm:text-left">
                      <div className="sm:text-right">
                        <p className="text-xs uppercase tracking-wide text-gray-500">Team DPS</p>
                        <p className="mt-1 text-lg font-bold text-purple-300">{teamDps.toLocaleString()}</p>
                      </div>
                      <div className="sm:text-right">
                        <p className="text-xs uppercase tracking-wide text-gray-500">Total Damage</p>
                        <p className="mt-1 text-sm font-medium text-gray-200">{(encounter.totalDmg ?? 0).toLocaleString()}</p>
                      </div>
                      <div className="sm:text-right">
                        <p className="text-xs uppercase tracking-wide text-gray-500">Duration</p>
                        <p className="mt-1 text-2xl font-bold text-white">{formatDuration(encounter.startedAt, encounter.endedAt)}</p>
                      </div>
                      <div className="sm:text-right">
                        <p className="text-xs uppercase tracking-wide text-gray-500">Avg Ability</p>
                        <p className="mt-1 text-sm font-medium text-gray-200">{teamAvg ?? "—"}</p>
                      </div>
                    </div>
                  </div>

                  {/* Players */}
                  <div className="grid gap-4 md:grid-cols-2">
                    {playerColumns.length === 0 ? (
                      <p className="text-xs text-gray-500">No player data available.</p>
                    ) : (
                      playerColumns.map((column, columnIndex) =>
                        renderPlayerColumn(column, columnIndex, encounter.id, bestDamage, durationMs)
                      )
                    )}
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

        .animate-slide-up {
          animation: slide-up 0.6s ease-out forwards;
          opacity: 0;
        }

        .animate-scale-in {
          animation: scale-in 0.6s ease-out forwards;
          opacity: 0;
        }

        .scroll-smooth {
          scroll-behavior: smooth;
        }

        /* Scroll snap behavior */
        .snap-start {
          scroll-snap-align: start;
        }

        /* Hide scrollbars */
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

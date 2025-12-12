"use client";

import React, { useEffect, useRef, useState } from 'react';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { fetchTop10Players, GetTop10PlayersParams, PlayerTopRow } from '@/api/player/player';
import { formatDuration, formatRelativeTime } from '@/utils/timeFormat';
import { formatNumber } from '@/utils/numberFormatter';
import {
  CLASS_MAP,
  CLASS_SPEC_MAP,
  getClassIconName,
  getSpecsForClass,
  getClassTooltip,
} from '@/utils/classData';
import Image from 'next/image'
import Link from 'next/link'
import { Filter } from '@/components/ui/Filter';

// Theme configurations for player leaderboard
const PLAYER_LB_THEME_CONFIGS: Record<string, {
  containerClass?: string;
  containerStyle?: React.CSSProperties;
  titleClass?: string;
  secondaryClass?: string;
  statLabelClass?: string;
  statValueClass?: string;
  textShadowClass?: string;
}> = {
  default: {
    containerClass: "border-gray-800/80 bg-gradient-to-br from-gray-900/95 via-gray-900/90 to-gray-800/95 hover:border-purple-500/50 hover:shadow-xl hover:shadow-purple-500/10",
    titleClass: "text-white",
    secondaryClass: "text-gray-400",
    statLabelClass: "text-gray-400",
    statValueClass: "text-gray-200",
    textShadowClass: "",
  },
  "blossoming-sakura-tree": {
    containerClass: "border-rose-200/60 bg-gradient-to-br from-[#2b0b21]/90 via-[#3f0f2d]/85 to-[#4b1736]/80 shadow-rose-500/25 hover:shadow-rose-400/30 hover:border-rose-200/80",
    containerStyle: { backgroundImage: 'url("/images/themes/sakura-tree.gif")', backgroundSize: "cover", backgroundPosition: "center 45%" },
    titleClass: "text-rose-50",
    secondaryClass: "text-rose-200/80",
    statLabelClass: "text-rose-200/70",
    statValueClass: "text-rose-50",
    textShadowClass: "drop-shadow-md",
  },
  "starry-night": {
    containerClass: "border-indigo-400/60 bg-gradient-to-br from-[#0b1026]/95 via-[#0f1838]/90 to-[#0d244d]/85 shadow-cyan-500/20 hover:border-cyan-300/70 hover:shadow-cyan-500/25",
    containerStyle: { backgroundImage: 'url("/images/themes/shooting-star-anime.gif")', backgroundSize: "cover", backgroundPosition: "10% 90%" },
    titleClass: "text-gray-900",
    secondaryClass: "text-gray-700",
    statLabelClass: "text-gray-700",
    statValueClass: "text-gray-900",
    textShadowClass: "",
  },
  "summer-sunset": {
    containerClass: "border-orange-400/60 bg-gradient-to-br from-[#2a1005]/80 via-[#4a1c10]/80 to-[#1f0802]/85 shadow-orange-500/20 hover:border-orange-300/70 hover:shadow-orange-500/25",
    containerStyle: { backgroundImage: 'url("/images/themes/sunset.png")', backgroundSize: "cover", backgroundPosition: "center 65%" },
    titleClass: "text-gray-900",
    secondaryClass: "text-gray-800",
    statLabelClass: "text-gray-800",
    statValueClass: "text-gray-900",
    textShadowClass: "",
  },
  cyberpunk: {
    containerClass: "border-pink-400/70 bg-gradient-to-br from-[#18002b]/90 via-[#1b0a3d]/85 to-[#061226]/90 shadow-pink-500/30 hover:border-cyan-300/80 hover:shadow-pink-500/40",
    containerStyle: { backgroundImage: 'url("/images/themes/cyberpunk.gif")', backgroundSize: "cover", backgroundPosition: "center" },
    titleClass: "text-white",
    secondaryClass: "text-purple-200/80",
    statLabelClass: "text-purple-200/70",
    statValueClass: "text-purple-50",
    textShadowClass: "drop-shadow-md",
  },
  "green-oasis": {
    containerClass: "border-emerald-400/60 bg-gradient-to-br from-[#0a1f0a]/90 via-[#0f2d1a]/85 to-[#0a2811]/90 shadow-emerald-500/20 hover:border-emerald-300/70 hover:shadow-emerald-500/25",
    titleClass: "text-emerald-50",
    secondaryClass: "text-emerald-200/80",
    statLabelClass: "text-emerald-200/70",
    statValueClass: "text-emerald-50",
    textShadowClass: "drop-shadow-md",
  },
};

function ScrollIndicator({ direction, onClick }: { direction: 'up' | 'down'; onClick: () => void }) {
  const isUp = direction === 'up';
  return (
    <button
      onClick={onClick}
      className={`group fixed z-50 flex flex-col items-center gap-2 transition-all hover:scale-110 ${isUp ? 'right-8' : 'left-1/2 -translate-x-1/2'
        }`}
      style={{ bottom: '2rem' }}
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
              <div className="absolute -top-5 left-4 z-50">
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

const PAGE_SIZE = 10;
const MAX_PLAYERS = 100;

export default function PlayerLeaderboardPage() {
  const [params, setParams] = useState<GetTop10PlayersParams>({ scene_id: "13003" }); // Purge! Floating Island

  const [currentSection, setCurrentSection] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const section1Ref = useRef<HTMLElement>(null);
  const section2Ref = useRef<HTMLElement>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: ['players', params],
    queryFn: ({ pageParam = 0 }) => fetchTop10Players({ ...params, limit: PAGE_SIZE, offset: pageParam }),
    enabled: !!params.scene_id,
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      const totalFetched = allPages.reduce((sum, page) => sum + page.players.length, 0);
      if (lastPage.players.length < PAGE_SIZE || totalFetched >= MAX_PLAYERS) return undefined;
      return totalFetched;
    },
  });

  // Flatten all pages into a single array
  const rows: PlayerTopRow[] = data?.pages.flatMap(page => page.players) ?? [];

  // Derive ordering / display flags from params.orderBy (fallback to hps if hps filter present)
  const orderBy = (params.orderBy ?? (params.hps ? 'hps' : 'dps')) as 'dps' | 'hps' | 'bossDps';
  const metricForDisplay = orderBy === 'hps' ? 'hps' : 'dps';
  const bossOnlyFlag = orderBy === 'bossDps';

  const topThree = rows.slice(0, 3);
  const restRows = rows.slice(3);

  // Lazy loading: trigger fetchNextPage when loadMoreRef is visible
  useEffect(() => {
    if (!loadMoreRef.current || !hasNextPage || isFetchingNextPage) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          fetchNextPage();
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(loadMoreRef.current);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

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
      <Filter
        params={params}
        setParams={setParams}
        config={{
          scene: true,
          class: true,
          orderBy: true,
          duration: true,
          abilityScore: true,
        }}
        orderByOptions={[
          { value: 'dps', label: 'DPS' },
          { value: 'hps', label: 'HPS' },
          { value: 'bossDps', label: 'Boss DPS' },
        ]}
      />

      {/* Scroll indicator - only on first section */}
      {currentSection === 0 && restRows.length > 0 && (
        <ScrollIndicator direction="down" onClick={() => scrollToSection(1)} />
      )}

      {/* Scroll indicator - jump to top */}
      {currentSection === 1 && (
        <ScrollIndicator direction="up" onClick={() => scrollToSection(0)} />
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
              Top Players
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

                  // Get theme from user customization
                  const themeKey = (player.user?.customization?.leaderboardPlayerTheme as string) || "default";
                  const theme = PLAYER_LB_THEME_CONFIGS[themeKey] ?? PLAYER_LB_THEME_CONFIGS.default;

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
                      className={`group relative ${widthClass} ${heightClass} ${translateY} flex flex-col justify-between rounded-2xl backdrop-blur-md ${ringClass} transition-all duration-300 hover:scale-[1.05] animate-scale-in ${theme.containerClass ?? "bg-gray-900/90"}`}
                      style={{ animationDelay, ...theme.containerStyle }}
                    >
                      {/* Rank badge */}
                      <div className="absolute -top-5 left-4 z-50">
                        <div className={`flex h-12 w-12 items-center justify-center rounded-full text-lg font-bold text-gray-900 shadow-lg transition-transform group-hover:scale-110 ${isCenter
                          ? 'bg-gradient-to-br from-yellow-300 to-amber-400 shadow-yellow-400/50'
                          : isSilver
                            ? 'bg-gradient-to-br from-gray-200 to-gray-400 shadow-gray-300/50'
                            : 'bg-gradient-to-br from-amber-500 to-amber-700 shadow-amber-500/50'
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
                          <div className={`text-base font-semibold truncate ${theme.textShadowClass ?? ""} ${theme.titleClass ?? "text-white"}`}>{player.name ?? 'Unknown'}</div>
                          {/* Discord user display */}
                          {player.user && (
                            <div className="flex items-center justify-center gap-1.5 mt-1">
                              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-black/40 border border-white/10 backdrop-blur-sm shadow-sm">
                                {player.user.discord_avatar_url && (
                                  <Image
                                    src={player.user.discord_avatar_url}
                                    alt={player.user.discord_username}
                                    width={14}
                                    height={14}
                                    className="rounded-full"
                                  />
                                )}
                                <span className="text-[10px] font-medium truncate max-w-[80px] text-purple-200 drop-shadow-sm">
                                  {player.user.discord_global_name || player.user.discord_username}
                                </span>
                              </div>
                            </div>
                          )}
                          <div className={`text-xs font-medium ${theme.textShadowClass ?? ""} ${theme.secondaryClass ?? "text-gray-400"}`}>{CLASS_MAP[player.classId ?? 0] ?? 'Unknown'} • {CLASS_SPEC_MAP[player.classSpec ?? 0] ?? ''}</div>
                          <div className={`text-xs mt-1 font-medium ${theme.textShadowClass ?? ""} ${theme.secondaryClass ?? "text-gray-400"}`}>Ability Score: {formatNumber(player.abilityScore) ?? '—'}</div>
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
              Top 100
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

                // Get theme from user customization
                const themeKey = (player.user?.customization?.leaderboardPlayerTheme as string) || "default";
                const theme = PLAYER_LB_THEME_CONFIGS[themeKey] ?? PLAYER_LB_THEME_CONFIGS.default;

                return (
                  <Link
                    key={player.id}
                    href={`/encounter/${player.encounterId}`}
                    className={`group flex h-full rounded-xl border backdrop-blur-md p-5 transition-all duration-300 hover:scale-[1.01] relative overflow-hidden ${theme.containerClass ?? ""}`}
                    style={theme.containerStyle}
                  >
                    {/* Textured background overlay */}
                    <div className="absolute inset-0 opacity-5 pointer-events-none" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width="40" height="40" xmlns="http://www.w3.org/2000/svg"%3E%3Cpath d="M0 0h40v40H0z" fill="none"/%3E%3Cpath d="M20 0v40M0 20h40" stroke="%23fff" stroke-width="0.5" opacity="0.1"/%3E%3C/svg%3E")' }}></div>

                    <div className="flex items-center justify-between gap-6 w-full relative z-10">
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        {/* Rank badge */}
                        <div
                          className={
                            globalRank === 4
                              ? "flex h-11 w-11 items-center justify-center rounded-lg text-base font-bold text-white bg-gradient-to-br from-purple-600 to-purple-800 shadow-lg shadow-purple-500/30 ring-2 ring-purple-400/50 shrink-0"
                              : "flex h-11 w-11 items-center justify-center rounded-lg text-base font-bold text-gray-200 bg-gradient-to-br from-gray-700 to-gray-900 shadow-lg ring-2 ring-gray-600/50 shrink-0"
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
                            <div className="flex items-center gap-2">
                              <p className={`text-base font-semibold group-hover:text-purple-200 transition-colors truncate ${theme.textShadowClass ?? ""} ${theme.titleClass ?? "text-white"}`}>
                                {player.name ?? 'Unknown'}
                              </p>
                              {/* Discord user display */}
                              {player.user && (
                                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-black/40 border border-white/10 backdrop-blur-sm shadow-sm shrink-0">
                                  {player.user.discord_avatar_url && (
                                    <Image
                                      src={player.user.discord_avatar_url}
                                      alt={player.user.discord_username}
                                      width={16}
                                      height={16}
                                      className="rounded-full"
                                    />
                                  )}
                                  <span className="text-xs font-medium truncate max-w-[100px] text-purple-200 drop-shadow-sm">
                                    {player.user.discord_global_name || player.user.discord_username}
                                  </span>
                                </div>
                              )}
                            </div>
                            <div className={`flex items-center gap-2 text-xs ${theme.textShadowClass ?? ""} ${theme.secondaryClass ?? "text-gray-400"}`}>
                              <span>{CLASS_MAP[player.classId ?? 0] ?? 'Unknown'}</span>
                              <span>•</span>
                              <span>{CLASS_SPEC_MAP[player.classSpec ?? 0] ?? 'No Spec'}</span>
                            </div>
                            <div className={`text-xs mt-0.5 ${theme.textShadowClass ?? ""} ${theme.secondaryClass ?? "text-gray-500"}`}>
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
              {/* Lazy loading trigger */}
              {hasNextPage && (
                <div ref={loadMoreRef} className="flex justify-center py-8">
                  {isFetchingNextPage ? (
                    <div className="flex items-center gap-3 text-purple-300">
                      <div className="w-5 h-5 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
                      <span>Loading more...</span>
                    </div>
                  ) : (
                    <div className="text-gray-500">Scroll to load more</div>
                  )}
                </div>
              )}
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

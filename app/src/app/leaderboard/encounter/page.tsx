"use client";

import { useMemo, useState } from "react";
import { useQuery } from '@tanstack/react-query'
import Link from "next/link";
import Image from "next/image";
import { fetchEncounters, FetchEncountersParams, FetchEncountersResponse, fetchEncounterScenes } from '@/api/encounter/encounter'
import { Encounter, ActorEncounterStat } from '@/types/commonTypes'
import { getClassIconName, getClassTooltip } from "@/lib/classIcon";

function formatDuration(ms: number) {
  const s = Math.max(1, Math.floor(ms / 1000));
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

function formatTimeAgo(timestampMs: number) {
  const diffMs = Date.now() - timestampMs;
  const diffSeconds = Math.max(0, Math.floor(diffMs / 1000));
  if (diffSeconds < 60) return "Just now";
  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  const diffWeeks = Math.floor(diffDays / 7);
  if (diffWeeks < 5) return `${diffWeeks}w ago`;
  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths < 12) return `${diffMonths}mo ago`;
  const diffYears = Math.floor(diffDays / 365);
  return `${diffYears}y ago`;
}

type DisplayPlayer = ActorEncounterStat & { actorId: number };

type DisplayEncounter = {
  id: number;
  sceneName?: string | null;
  totalDmg?: number | null;
  totalHeal?: number | null;
  durationMs: number;
  startedAtMs: number;
  players: DisplayPlayer[];
  team?: string | null;
  teamAvgAbilityScore?: number | null;
  bosses?: { monsterName: string; isDefeated: boolean }[];
}

function transformEncounter(enc: Encounter): DisplayEncounter {
  const startedAtMs = new Date(enc.startedAt).getTime();
  const endedAtMs = enc.endedAt ? new Date(enc.endedAt).getTime() : undefined;
  const durationMs = endedAtMs ? endedAtMs - startedAtMs : Math.max(1, Date.now() - startedAtMs);

  const players: DisplayPlayer[] = (enc.players ?? []).map((p) => ({ ...p, actorId: p.actorId }));

  const teamAvg = players.length
    ? Math.round(players.reduce((s, p) => s + (p.abilityScore ?? 0), 0) / players.length)
    : null;

  return {
    id: enc.id,
    sceneName: enc.sceneName ?? null,
    totalDmg: enc.totalDmg ?? null,
    totalHeal: enc.totalHeal ?? null,
    durationMs,
    startedAtMs,
    players,
    team: enc.user?.discord_username ?? null,
    teamAvgAbilityScore: teamAvg,
    bosses: enc.bosses?.map((b) => ({ monsterName: b.monsterName, isDefeated: b.isDefeated })) ?? [],
  };
}

const PAGE_SIZE = 8;

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
      className="rounded-xl border border-gray-800/60 bg-gray-900/60 p-4"
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
                  className="object-cover"
                  title={getClassTooltip(player.classId ?? null, player.classSpec ?? null)}
                />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between text-sm">
                  <p className="font-medium text-gray-200">{player.name ?? `Player #${player.actorId}`}</p>
                  <span className="text-xs text-gray-400">{playerDps.toLocaleString()} DPS</span>
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-gray-800">
                  <div className="h-full bg-linear-to-r from-purple-500 to-purple-400" style={{ width: `${damageRatio}%` }} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function EncounterLeaderboardPage() {
  const [page, setPage] = useState(1);
  const [scene, setScene] = useState("");
  const [orderBy, setOrderBy] = useState<'dps' | 'date' | 'startedAt' | 'duration'>('dps');
  const [sort] = useState<'asc' | 'desc'>('desc');
  const [searchTerm, setSearchTerm] = useState("");

  const filters: FetchEncountersParams = {
    limit: PAGE_SIZE,
    offset: (page - 1) * PAGE_SIZE,
    orderBy,
    sort,
    scene_name: scene || undefined,
  };

  const { data, isLoading } = useQuery<FetchEncountersResponse, Error>({
    queryKey: ['encounters', filters.orderBy, filters.sort, filters.scene_name, filters.offset],
    queryFn: () => fetchEncounters(filters),
  });

  const { data: scenesData } = useQuery<string[], Error>({
    queryKey: ['encounterScenes'],
    queryFn: () => fetchEncounterScenes(),
  });

  // Derived rows/count
  const rows = useMemo<Encounter[]>(() => data?.encounters ?? [], [data]);
  const count = data?.count ?? 0;
  const loading = isLoading;

  const scenes = scenesData ?? [];

  const displayRows = useMemo<DisplayEncounter[]>(() => rows.map(transformEncounter), [rows]);

  const filteredRows = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return displayRows;
    return displayRows.filter((row: DisplayEncounter) => {
      const teamMatch = (row.team ?? '').toLowerCase().includes(term);
      const sceneMatch = (row.sceneName ?? '').toLowerCase().includes(term);
      const bossMatch = (row.bosses ?? []).some((b) => b.monsterName.toLowerCase().includes(term));
      return teamMatch || sceneMatch || bossMatch;
    });
  }, [displayRows, searchTerm]);

  const pageCount = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const pageRows = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredRows.slice(start, start + PAGE_SIZE);
  }, [filteredRows, page]);

  return (
    <div className="max-w-7xl mx-auto py-8 text-white">
      <div className="mb-8 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.35em] text-purple-400">Leaderboard</p>
          <h1 className="mt-2 text-4xl font-semibold">Encounter Power Rankings</h1>
          <p className="mt-2 max-w-2xl text-sm text-gray-400">
            Track elite Resonance squads, compare kill speeds, and dive into team compositions with a single click.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:auto-cols-fr lg:grid-flow-col">
          <div className="flex flex-col">
            <label className="text-xs uppercase tracking-wide text-gray-500">Search</label>
            <input
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(1);
              }}
              placeholder="Team, scene, or boss"
              className="mt-1 rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-gray-200 outline-none transition focus:border-purple-500 focus:ring-2 focus:ring-purple-500/40"
            />
          </div>
          <div className="flex flex-col">
            <label className="text-xs uppercase tracking-wide text-gray-500">Scene</label>
              <select
              value={scene}
              onChange={(e) => {
                setScene(e.target.value);
                setPage(1);
              }}
              className="mt-1 rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-gray-200 outline-none transition focus:border-purple-500 focus:ring-2 focus:ring-purple-500/40"
            >
              <option value="">All scenes</option>
              {scenes.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col">
            <label className="text-xs uppercase tracking-wide text-gray-500">Metric</label>
              <select
              value={orderBy}
              onChange={(e) => {
                const metric = e.target.value as 'dps' | 'date' | 'startedAt' | 'duration';
                setOrderBy(metric);
                setPage(1);
              }}
              className="mt-1 rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-gray-200 outline-none transition focus:border-purple-500 focus:ring-2 focus:ring-purple-500/40"
            >
              <option value="dps">Team DPS</option>
              <option value="duration">Clear time</option>
              <option value="date">Newest clears</option>
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col gap-5">
          {Array.from({ length: PAGE_SIZE }).map((_, idx) => (
            <div key={idx} className="h-48 animate-pulse rounded-2xl border border-gray-800 bg-gray-900/60" />
          ))}
        </div>
      ) : filteredRows.length === 0 ? (
        <div className="rounded-2xl border border-gray-800 bg-gray-900/60 p-12 text-center text-sm text-gray-400">
          No encounters match your filters yet. Try adjusting the search criteria.
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          {pageRows.map((encounter, idx) => {
            const globalRank = (page - 1) * PAGE_SIZE + idx + 1;
            const duration = formatDuration(encounter.durationMs);
            const teamDps = Math.round((encounter.totalDmg ?? 0) / Math.max(1, Math.floor((encounter.durationMs ?? 0) / 1000)));
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
            const uploadedAgo = formatTimeAgo(encounter.startedAtMs);

            return (
              <Link
                key={encounter.id}
                href={`/leaderboard/encounter/${encounter.id}`}
                className="group flex h-full flex-col rounded-2xl border border-gray-800/80 bg-linear-to-br from-gray-900/80 via-gray-900 to-gray-900/70 p-6 transition hover:border-purple-500/40 hover:shadow-lg hover:shadow-purple-500/10"
              >
                <div className="flex flex-wrap items-start justify-between gap-6">
                  <div className="flex items-center gap-3">
                    <div
                      className={
                        globalRank === 1
                          ? "flex h-11 w-11 items-center justify-center rounded-full text-lg font-semibold text-gray-900 bg-linear-to-br from-yellow-300 to-amber-400"
                          : globalRank === 2
                          ? "flex h-11 w-11 items-center justify-center rounded-full text-lg font-semibold text-gray-900 bg-linear-to-br from-gray-200 to-gray-400"
                          : globalRank === 3
                          ? "flex h-11 w-11 items-center justify-center rounded-full text-lg font-semibold text-gray-900 bg-linear-to-br from-amber-500 to-amber-700"
                          : "flex h-11 w-11 items-center justify-center rounded-full text-lg font-semibold text-gray-900 bg-linear-to-br from-purple-600 to-purple-800"
                      }
                    >
                      {globalRank}
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2 text-sm text-gray-400">
                        <span className="rounded-full border border-gray-700/80 px-2 py-0.5 text-xs uppercase tracking-wide text-gray-300">
                          {encounter.sceneName ?? "Unknown Encounter"}
                        </span>
                        <span className="text-xs text-gray-500">{uploadedAgo}</span>
                      </div>
                      <p className="mt-1 text-xl font-semibold text-white group-hover:text-purple-200">
                        {encounter.team ?? "Fireteam"}
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-right sm:grid-cols-4 sm:text-left">
                    <div className="sm:text-right">
                      <p className="text-xs uppercase tracking-wide text-gray-500">Team DPS</p>
                      <p className="mt-1 text-lg font-semibold text-purple-300">{teamDps.toLocaleString()}</p>
                    </div>
                    <div className="sm:text-right">
                      <p className="text-xs uppercase tracking-wide text-gray-500">Total Damage</p>
                      <p className="mt-1 text-sm font-medium text-gray-200">{(encounter.totalDmg ?? 0).toLocaleString()}</p>
                    </div>
                    <div className="sm:text-right">
                      <p className="text-xs uppercase tracking-wide text-gray-500">Duration</p>
                      <p className="mt-1 text-2xl font-semibold text-white">{duration}</p>
                    </div>
                    <div className="sm:text-right">
                      <p className="text-xs uppercase tracking-wide text-gray-500">Avg Ability</p>
                      <p className="mt-1 text-sm font-medium text-gray-200">{encounter.teamAvgAbilityScore ?? "—"}</p>
                    </div>
                  </div>
                </div>

                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  {playerColumns.length === 0 ? (
                    <p className="text-xs text-gray-500">No player data available.</p>
                  ) : (
                    playerColumns.map((column, columnIndex) =>
                      renderPlayerColumn(column, columnIndex, encounter.id, bestDamage, encounter.durationMs ?? 0)
                    )
                  )}
                </div>

              </Link>
            );
          })}
        </div>
      )}

        <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
        <p className="text-xs uppercase tracking-wide text-gray-500">
          Showing {(page - 1) * PAGE_SIZE + 1}-{Math.min(page * PAGE_SIZE, filteredRows.length)} of {count} encounters
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={page === 1}
            onClick={() => setPage((prev) => Math.max(1, prev - 1))}
            className="rounded-full border border-gray-700 px-3 py-1 text-sm text-gray-300 transition hover:border-purple-500 hover:text-purple-200 disabled:cursor-not-allowed disabled:border-gray-800 disabled:text-gray-600"
          >
            Prev
          </button>
          <div className="flex items-center gap-1 text-xs text-gray-400">
            {Array.from({ length: pageCount }).slice(0, 5).map((_, idx) => {
              const displayNumber = idx + 1;
              const isActive = page === displayNumber;
              return (
                <button
                  key={displayNumber}
                  type="button"
                  onClick={() => setPage(displayNumber)}
                  className={
                    isActive
                      ? "h-7 w-7 rounded-full border border-purple-500 bg-purple-500/20 text-purple-200 text-xs transition"
                      : "h-7 w-7 rounded-full border border-gray-700 text-gray-400 hover:border-purple-500 hover:text-purple-200 text-xs transition"
                  }
                >
                  {displayNumber}
                </button>
              );
            })}
            {pageCount > 5 && <span className="px-1">…</span>}
          </div>
          <button
            type="button"
            disabled={page >= pageCount}
            onClick={() => setPage((prev) => Math.min(pageCount, prev + 1))}
            className="rounded-full border border-gray-700 px-3 py-1 text-sm text-gray-300 transition hover:border-purple-500 hover:text-purple-200 disabled:cursor-not-allowed disabled:border-gray-800 disabled:text-gray-600"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}

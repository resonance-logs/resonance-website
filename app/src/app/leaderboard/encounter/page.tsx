"use client";

import { useState } from "react";
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { produce } from "immer"
import Link from "next/link";
import Image from "next/image";
import { fetchEncounters, FetchEncountersParams, FetchEncountersResponse, fetchEncounterScenes, DEFAULT_FETCH_ENCOUNTERS_PARAMS } from '@/api/encounter/encounter'
import { ActorEncounterStat } from '@/types/commonTypes'
import { getClassIconName, getClassTooltip } from "@/utils/classData";
import { formatDuration, formatRelativeTime } from "@/utils/timeFormat";

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
  const [params, setParams] = useState<FetchEncountersParams>({
    ...DEFAULT_FETCH_ENCOUNTERS_PARAMS,
    limit: PAGE_SIZE,
    orderBy: 'dps',
  })

  const { data, isLoading } = useQuery<FetchEncountersResponse>({
    queryKey: ['encounters', params],
    queryFn: () => fetchEncounters(params),
    placeholderData: keepPreviousData,
  });

  const { data: scenesData } = useQuery<string[]>({
    queryKey: ['encounterScenes'],
    queryFn: () => fetchEncounterScenes(),
  });

  // Derived values
  const rows = data?.encounters ?? []
  const count = data?.count ?? 0
  const scenes = scenesData ?? []

  const limit = params.limit || PAGE_SIZE
  const offset = params.offset || 0
  const page = Math.max(1, Math.floor(offset / limit) + 1)
  const totalPages = Math.max(1, Math.ceil(count / limit))

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
            <label className="text-xs uppercase tracking-wide text-gray-500">Scene</label>
            <select
              value={params.scene_name || ''}
              onChange={(e) => setParams(produce(draft => {
                draft.scene_name = e.target.value
                draft.offset = 0
              }))}
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
              value={params.orderBy}
              onChange={(e) => setParams(produce(draft => {
                draft.orderBy = e.target.value as 'dps' | 'date' | 'startedAt' | 'duration'
                draft.offset = 0
              }))}
              className="mt-1 rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-gray-200 outline-none transition focus:border-purple-500 focus:ring-2 focus:ring-purple-500/40"
            >
              <option value="dps">Team DPS</option>
              <option value="duration">Clear time</option>
              <option value="date">Newest clears</option>
            </select>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-5">
          {Array.from({ length: PAGE_SIZE }).map((_, idx) => (
            <div key={idx} className="h-48 animate-pulse rounded-2xl border border-gray-800 bg-gray-900/60" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-2xl border border-gray-800 bg-gray-900/60 p-12 text-center text-sm text-gray-400">
          No encounters match your filters yet. Try adjusting the search criteria.
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          {rows.map((encounter, idx) => {
            const globalRank = offset + idx + 1;
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
                        <span className="text-xs text-gray-500">{formatRelativeTime(encounter.startedAt)}</span>
                      </div>
                      <p className="mt-1 text-xl font-semibold text-white group-hover:text-purple-200">
                        {encounter.user?.discord_username ?? "Fireteam"}
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
                      <p className="mt-1 text-2xl font-semibold text-white">{formatDuration(encounter.startedAt, encounter.endedAt)}</p>
                    </div>
                    <div className="sm:text-right">
                      <p className="text-xs uppercase tracking-wide text-gray-500">Avg Ability</p>
                      <p className="mt-1 text-sm font-medium text-gray-200">{teamAvg ?? "—"}</p>
                    </div>
                  </div>
                </div>

                <div className="mt-5 grid gap-4 md:grid-cols-2">
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

      {totalPages > 1 && (
        <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
          <p className="text-xs uppercase tracking-wide text-gray-500">
            Showing {offset + 1}-{Math.min(offset + limit, count)} of {count} encounters
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page === 1}
              onClick={() => setParams(produce(draft => {
                draft.offset = Math.max(0, offset - limit)
              }))}
              className="rounded-full border border-gray-700 px-3 py-1 text-sm text-gray-300 transition hover:border-purple-500 hover:text-purple-200 disabled:cursor-not-allowed disabled:border-gray-800 disabled:text-gray-600"
            >
              Prev
            </button>
            <div className="flex items-center gap-1 text-xs text-gray-400">
              {Array.from({ length: Math.min(totalPages, 5) }).map((_, idx) => {
                const displayNumber = idx + 1;
                const isActive = page === displayNumber;
                return (
                  <button
                    key={displayNumber}
                    type="button"
                    onClick={() => setParams(produce(draft => {
                      draft.offset = (displayNumber - 1) * limit
                    }))}
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
              {totalPages > 5 && <span className="px-1">…</span>}
            </div>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setParams(produce(draft => {
                draft.offset = Math.min((totalPages - 1) * limit, offset + limit)
              }))}
              className="rounded-full border border-gray-700 px-3 py-1 text-sm text-gray-300 transition hover:border-purple-500 hover:text-purple-200 disabled:cursor-not-allowed disabled:border-gray-800 disabled:text-gray-600"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

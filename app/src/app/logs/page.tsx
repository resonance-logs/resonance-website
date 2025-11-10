"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from '@/hooks/useAuth'
import { GlassCard } from "@/components/landing/GlassCard";
import { fetchEncounters, FetchEncountersParams, FetchEncountersResponse, DEFAULT_FETCH_ENCOUNTERS_PARAMS } from "@/api/encounter/encounter";
import { formatDuration, formatRelativeTime, getDuration } from "@/utils/timeFormat";
import { formatNumber } from "@/utils/numberFormatter";
import { getType } from "@/utils/classData";

import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { produce } from "immer"

export default function LogsPage() {
  const [params, setParams] = useState<FetchEncountersParams>(DEFAULT_FETCH_ENCOUNTERS_PARAMS)
  const { user } = useAuth();
  const router = useRouter();

  const { data, error, isLoading } = useQuery<FetchEncountersResponse>({
    queryKey: ["encounters", params, user],
    queryFn: () => fetchEncounters({ ...params, user_id: user?.id || 0}),
    placeholderData: keepPreviousData,
  })

  const rows = data?.encounters || []
  const count = data?.count || 0

  const limit = params.limit || 20
  const offset = params.offset || 0
  const page = Math.max(1, Math.floor(offset / limit) + 1)
  const totalPages = Math.max(1, Math.ceil(count / limit))

  const SkeletonRow = () => (
    <tr className="border-b border-gray-800">
      <td className="px-6 py-4">
        <div className="h-4 bg-gray-700 rounded animate-pulse w-32"></div>
      </td>
      <td className="px-6 py-4">
        <div className="h-4 bg-gray-700 rounded animate-pulse w-24"></div>
      </td>
      <td className="px-6 py-4">
        <div className="h-4 bg-gray-700 rounded animate-pulse w-20"></div>
      </td>
      <td className="px-6 py-4">
        <div className="h-4 bg-gray-700 rounded animate-pulse w-16"></div>
      </td>
      <td className="px-6 py-4">
        <div className="h-4 bg-gray-700 rounded animate-pulse w-24"></div>
      </td>
      <td className="px-6 py-4">
        <div className="h-4 bg-gray-700 rounded animate-pulse w-16"></div>
      </td>
      <td className="px-6 py-4">
        <div className="h-4 bg-gray-700 rounded animate-pulse w-20"></div>
      </td>
    </tr>
  );

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 text-white">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Combat Logs</h1>
        <p className="text-gray-400">Recent encounters and combat data</p>
      </div>

      {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Scene Name</label>
            <input
              type="text"
              className="w-full px-3 py-2 bg-gray-800/60 border border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="Filter by scene..."
              value={params.scene_name || ''}
              onChange={(e) => setParams(produce(draft => { draft.scene_name = e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Player Name</label>
            <input
              type="text"
              className="w-full px-3 py-2 bg-gray-800/60 border border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="Filter by player..."
              value={params.player_name || ''}
              onChange={(e) => setParams(produce(draft => { draft.player_name = e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Monster Name</label>
            <input
              type="text"
              className="w-full px-3 py-2 bg-gray-800/60 border border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="Filter by monster..."
              value={params.monster_name || ''}
              onChange={(e) => setParams(produce(draft => { draft.monster_name = e.target.value }))}
            />
          </div>
        </div>

      {/* Results count and controls */}
      <div className="flex justify-between items-center mb-4">
        <div className="text-gray-400">
          {count > 0 ? `Showing ${rows.length} of ${count} encounters` : "No encounters found"}
        </div>
        <div className="flex items-center gap-4">
          <div className="text-sm text-gray-400">Per page: {params.limit || 20}</div>
        </div>
      </div>
        {!isLoading && rows.length === 0 ? (
          <div className="text-center py-12">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-700/50 rounded-full mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">No encounters found</h3>
            <p className="text-gray-400">Try adjusting your filters or check back later for new encounters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left px-6 py-4 font-semibold text-gray-300 w-2xl">Encounter</th>
                  <th className="text-left px-6 py-4 font-semibold text-gray-300">Performance</th>
                  <th className="text-left px-6 py-4 font-semibold text-gray-300">Duration</th>
                  <th className="text-left px-6 py-4 font-semibold text-gray-300">Date</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  Array.from({ length: limit }).map((_, idx) => <SkeletonRow key={idx} />)
                ) : rows?.map((encounter) => {
                  const localPlayer = encounter?.players?.filter(e => e.isLocalPlayer)[0]
                  const duration = getDuration(encounter?.startedAt, encounter?.endedAt)
                  const classType = localPlayer ? getType(localPlayer.classId ?? 0, localPlayer.classSpec ?? 0) : "damage"

                  const dps = formatNumber((localPlayer?.damageDealt || 0) / duration)
                  const hps = formatNumber((localPlayer?.healDealt || 0) / duration)

                  const showDps = classType === "damage" || classType === "tank" || classType === "damagehealer"
                  const showHps = classType === "healer" || classType === "damagehealer"

                  return (
                    <tr
                      key={encounter?.id}
                      onClick={() => router.push(`/encounter/${encounter?.id}`)}
                      className="border-b border-gray-800/50 hover:bg-purple-900/20 transition-all duration-200 group cursor-pointer"
                    >
                      <td className="px-6 py-4">
                        <div className="font-medium text-white group-hover:text-purple-300 transition-colors">
                          {`${encounter?.sceneName} · ${localPlayer?.name}` || "Unknown Scene"}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1">
                          {showDps && (
                            <div className="text-sm font-mono">
                              <span className="text-gray-400 text-xs mr-2">DPS</span>
                              <span className="text-red-400">{dps}</span>
                            </div>
                          )}
                          {showHps && (
                            <div className="text-sm font-mono">
                              <span className="text-gray-400 text-xs mr-2">HPS</span>
                              <span className="text-green-400">{hps}</span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-300 font-mono">
                          {formatDuration(encounter?.startedAt, encounter?.endedAt)}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-300">
                          {formatRelativeTime(encounter?.startedAt)}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2 mt-6">
          <div className="text-gray-400 text-sm">Page {page} of {totalPages}</div>
        </div>
      )}
    </div>
  );
}

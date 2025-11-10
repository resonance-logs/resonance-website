"use client";

import { useState } from "react";
// import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from '@/hooks/useAuth'
// import { GlassCard } from "@/components/landing/GlassCard";
import { fetchEncounters, FetchEncountersParams, FetchEncountersResponse, DEFAULT_FETCH_ENCOUNTERS_PARAMS } from "@/api/encounter/encounter";
// Removed duplicate import of EncounterTable
import EncounterTable from "@/components/ui/EncounterTable";

import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { produce } from "immer"

export default function LogsPage() {
  const [params, setParams] = useState<FetchEncountersParams>(DEFAULT_FETCH_ENCOUNTERS_PARAMS)
  const { user } = useAuth();
  const router = useRouter();

  const { data, isLoading } = useQuery<FetchEncountersResponse>({
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

  

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 text-white">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">My Logs</h1>
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
          <EncounterTable
            rows={rows}
            isLoading={isLoading}
            limit={limit}
            onRowClick={(enc) => router.push(`/encounter/${enc.id}`)}
          />
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

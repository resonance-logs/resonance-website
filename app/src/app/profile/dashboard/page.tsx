"use client";

import React from "react";
// import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from '@/hooks/useAuth'
// import { GlassCard } from "@/components/landing/GlassCard";
import { fetchEncounters, FetchEncountersParams, FetchEncountersResponse, DEFAULT_FETCH_ENCOUNTERS_PARAMS } from "@/api/encounter/encounter";
import EncounterTable from "@/components/ui/EncounterTable";

import { keepPreviousData, useQuery } from '@tanstack/react-query'

export default function LogsPage() {
  const params: FetchEncountersParams = DEFAULT_FETCH_ENCOUNTERS_PARAMS;
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
    <div className="max-w-7xl mx-auto py-20 px-6 text-white">
      <div className="text-center mb-12 animate-fade-in">
        <div className="inline-flex items-center gap-3 px-6 py-2 rounded-full bg-purple-500/10 border border-purple-500/20 backdrop-blur-md mb-4">
          <div className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
          <p className="text-sm uppercase tracking-[0.35em] text-purple-300 font-semibold">Profile</p>
        </div>
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
          <span className="bg-linear-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
            Dashboard
          </span>
        </h1>
        <p className="text-xl text-gray-300 max-w-2xl mx-auto">
          Recent encounters and combat data
        </p>
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
      
      <div>
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
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2 mt-6">
          <div className="text-gray-400 text-sm">Page {page} of {totalPages}</div>
        </div>
      )}
    </div>
  );
}

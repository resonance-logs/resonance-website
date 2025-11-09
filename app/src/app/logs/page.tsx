"use client";

import { useEffect, useState } from "react";
import { useQuery } from '@tanstack/react-query'
import Link from "next/link";
import { GlassCard } from "@/components/landing/GlassCard";
import { fetchEncounters, FetchEncountersParams, FetchEncountersFrontendResponse, EncounterRowDTO } from "@/api/encounter/encounter";

export default function LogsPage() {
  const [encounters, setEncounters] = useState<EncounterRowDTO[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [initialLoading, setInitialLoading] = useState(true);
  const [localError, setLocalError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [orderBy, setOrderBy] = useState("date");
  const [sort, setSort] = useState("desc");
  const [filters, setFilters] = useState({
    scene_name: "",
    player_name: "",
    monster_name: "",
  });

  const params: FetchEncountersParams = {
    limit,
    offset: (page - 1) * limit,
    orderBy,
    sort,
    scene_name: filters.scene_name || undefined,
    player_name: filters.player_name || undefined,
    monster_name: filters.monster_name || undefined,
  };

  const { data, isLoading, error, refetch } = useQuery([
    "encounterLogs",
    params.limit,
    params.offset,
    params.orderBy,
    params.sort,
    params.scene_name,
    params.player_name,
    params.monster_name,
  ], () => fetchEncounters(params));

  useEffect(() => {
    if (data) {
      setEncounters((data as any).rows ?? []);
      setTotalCount((data as any).totalCount ?? 0);
    }
    setInitialLoading(false);
    if (error) setLocalError((error as any)?.message ?? String(error));
  }, [data, error]);

  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const formatDate = (ms: number) => {
    return new Date(ms).toLocaleString();
  };

  const handleSort = (column: string) => {
    if (orderBy === column) {
      setSort(sort === "asc" ? "desc" : "asc");
    } else {
      setOrderBy(column);
      setSort("desc");
    }
  };

  const totalPages = Math.ceil(totalCount / limit);

  // Skeleton loader component
  const SkeletonRow = () => (
    <tr className="border-b border-gray-800">
      <td className="px-6 py-4">
        <div className="h-4 bg-gray-700 rounded animate-pulse w-32"></div>
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
      <td className="px-6 py-4">
        <div className="h-4 bg-gray-700 rounded animate-pulse w-20"></div>
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
        <div className="h-4 bg-gray-700 rounded animate-pulse w-20"></div>
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
      <GlassCard className="mb-6 p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Scene Name</label>
            <input
              type="text"
              className="w-full px-3 py-2 bg-gray-800/60 border border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="Filter by scene..."
              value={filters.scene_name}
              onChange={(e) => setFilters({ ...filters, scene_name: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Player Name</label>
            <input
              type="text"
              className="w-full px-3 py-2 bg-gray-800/60 border border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="Filter by player..."
              value={filters.player_name}
              onChange={(e) => setFilters({ ...filters, player_name: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Monster Name</label>
            <input
              type="text"
              className="w-full px-3 py-2 bg-gray-800/60 border border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="Filter by monster..."
              value={filters.monster_name}
              onChange={(e) => setFilters({ ...filters, monster_name: e.target.value })}
            />
          </div>
        </div>
      </GlassCard>

      {/* Results count and controls */}
      <div className="flex justify-between items-center mb-4">
        <div className="text-gray-400">
          {totalCount > 0 ? `Showing ${((page - 1) * limit) + 1}-${Math.min(page * limit, totalCount)} of ${totalCount} encounters` : "No encounters found"}
        </div>
        <div className="flex items-center gap-4">
          <label className="text-sm text-gray-400">
            Per page:
            <select
              className="ml-2 px-2 py-1 bg-gray-800/60 border border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              value={limit}
              onChange={(e) => {
                setLimit(Number(e.target.value));
                setPage(1);
              }}
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </label>
        </div>
      </div>

      {/* Table */}
      <GlassCard className="overflow-hidden">
        {isLoading || initialLoading ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left px-6 py-4 font-semibold text-gray-300">Date</th>
                  <th className="text-left px-6 py-4 font-semibold text-gray-300">Scene</th>
                  <th className="text-left px-6 py-4 font-semibold text-gray-300">Duration</th>
                  <th className="text-left px-6 py-4 font-semibold text-gray-300">Team DPS</th>
                  <th className="text-left px-6 py-4 font-semibold text-gray-300">Damage</th>
                  <th className="text-left px-6 py-4 font-semibold text-gray-300">Healing</th>
                  <th className="text-left px-6 py-4 font-semibold text-gray-300">Players</th>
                  <th className="text-left px-6 py-4 font-semibold text-gray-300">Bosses</th>
                  <th className="text-left px-6 py-4 font-semibold text-gray-300">Team</th>
                  <th className="text-left px-6 py-4 font-semibold text-gray-300"></th>
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: limit || 0 }).map((_, idx) => (
                  <SkeletonRow key={idx} />
                ))}
              </tbody>
            </table>
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-red-500/20 rounded-full mb-4">
              <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Failed to load encounters</h3>
            <p className="text-gray-400 mb-4">{error}</p>
            <button
              onClick={loadEncounters}
              className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg transition-all duration-200 transform hover:scale-105"
            >
              Try Again
            </button>
          </div>
        ) : encounters.length === 0 ? (
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
                  <th className="text-left px-6 py-4 font-semibold text-gray-300">
                    <button
                      onClick={() => handleSort("date")}
                      className="flex items-center gap-1 hover:text-purple-400 transition-colors"
                    >
                      Date
                      {orderBy === "date" && (
                        <span className="text-purple-400">{sort === "asc" ? "↑" : "↓"}</span>
                      )}
                    </button>
                  </th>
                  <th className="text-left px-6 py-4 font-semibold text-gray-300">Scene</th>
                  <th className="text-left px-6 py-4 font-semibold text-gray-300">
                    <button
                      onClick={() => handleSort("duration")}
                      className="flex items-center gap-1 hover:text-purple-400 transition-colors"
                    >
                      Duration
                      {orderBy === "duration" && (
                        <span className="text-purple-400">{sort === "asc" ? "↑" : "↓"}</span>
                      )}
                    </button>
                  </th>
                  <th className="text-left px-6 py-4 font-semibold text-gray-300">
                    <button
                      onClick={() => handleSort("dps")}
                      className="flex items-center gap-1 hover:text-purple-400 transition-colors"
                    >
                      Team DPS
                      {orderBy === "dps" && (
                        <span className="text-purple-400">{sort === "asc" ? "↑" : "↓"}</span>
                      )}
                    </button>
                  </th>
                  <th className="text-left px-6 py-4 font-semibold text-gray-300">Damage</th>
                  <th className="text-left px-6 py-4 font-semibold text-gray-300">Healing</th>
                  <th className="text-left px-6 py-4 font-semibold text-gray-300">Players</th>
                  <th className="text-left px-6 py-4 font-semibold text-gray-300">Bosses</th>
                  <th className="text-left px-6 py-4 font-semibold text-gray-300">Team</th>
                  <th className="text-left px-6 py-4 font-semibold text-gray-300"></th>
                </tr>
              </thead>
              <tbody>
                {(encounters || []).map((encounter) => (
                  <tr 
                    key={encounter?.id || Math.random()} 
                    className="border-b border-gray-800/50 hover:bg-purple-900/20 transition-all duration-200 group"
                  >
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-300">
                        {formatDate(encounter?.startedAtMs || 0)}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-white group-hover:text-purple-300 transition-colors">
                        {encounter?.sceneName || "Unknown Scene"}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-300 font-mono">
                        {formatDuration(encounter?.durationMs || 0)}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-mono text-sm text-purple-400 font-semibold">
                        {Math.round(encounter?.teamDps || 0).toLocaleString()}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-300 font-mono">
                        {(encounter?.totalDmg || 0).toLocaleString()}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-green-400 font-mono">
                        {(encounter?.totalHeal || 0).toLocaleString()}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <div className="text-sm text-gray-300">
                          <span className="text-purple-400 font-medium">
                            {(encounter.players || []).filter(p => p?.isPlayer).length}
                          </span>
                          <span className="text-gray-500 ml-1">players</span>
                        </div>
                        <div className="text-xs text-gray-500">
                          {(encounter.players || []).length} total actors
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        {(encounter.bosses || []).map((boss, idx) => (
                          <div key={idx} className="flex items-center gap-2">
                            <span className="text-sm text-gray-300">
                              {boss?.monsterName || "Unknown Boss"}
                            </span>
                            {boss?.isDefeated && (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-red-500/20 text-red-400">
                                Defeated
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-300 max-w-32 truncate">
                        {encounter?.team || "Unknown Team"}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Link
                        href={`/encounter/${encounter?.id || ''}`}
                        className="inline-flex items-center gap-1 text-purple-400 hover:text-purple-300 text-sm font-medium transition-all duration-200 group-hover:translate-x-1"
                      >
                        View Details
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </GlassCard>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2 mt-6">
          <button
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page === 1}
            className="px-4 py-2 bg-gray-800/60 border border-gray-700 rounded-lg hover:bg-gray-700/60 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 text-sm font-medium text-gray-300 hover:text-white disabled:text-gray-500"
          >
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Previous
            </div>
          </button>
          
          <div className="flex gap-1">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (page <= 3) {
                pageNum = i + 1;
              } else if (page >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = page - 2 + i;
              }
              
              return (
                <button
                  key={pageNum}
                  onClick={() => setPage(pageNum)}
                  className={`px-3 py-2 rounded-lg transition-all duration-200 text-sm font-medium ${
                    pageNum === page
                      ? "bg-purple-600 text-white shadow-lg shadow-purple-600/25"
                      : "bg-gray-800/60 border border-gray-700 text-gray-300 hover:bg-gray-700/60 hover:text-white hover:border-purple-600/50"
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
          </div>
          
          <button
            onClick={() => setPage(Math.min(totalPages, page + 1))}
            disabled={page === totalPages}
            className="px-4 py-2 bg-gray-800/60 border border-gray-700 rounded-lg hover:bg-gray-700/60 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 text-sm font-medium text-gray-300 hover:text-white disabled:text-gray-500"
          >
            <div className="flex items-center gap-2">
              Next
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </button>
        </div>
      )}
    </div>
  );
}

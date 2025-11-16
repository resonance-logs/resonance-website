"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { produce } from "immer";
import EncounterTable from "@/components/ui/EncounterTable";
import { AdvancedEncounterFilters } from "@/components/logs/AdvancedEncounterFilters";
import {
  fetchEncounters,
  fetchEncounterScenes,
  FetchEncountersParams,
  FetchEncountersResponse,
  DEFAULT_FETCH_ENCOUNTERS_PARAMS,
} from "@/api/encounter/encounter";

export default function LogsPage() {
  const [params, setParams] = useState<FetchEncountersParams>({
    ...DEFAULT_FETCH_ENCOUNTERS_PARAMS,
    limit: 15,
    offset: 0,
    orderBy: "startedAt",
    sort: "desc",
  });
  const router = useRouter();

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
        
        <AdvancedEncounterFilters params={params} setParams={setParams} scenes={scenes} />

        <div className="max-w-7xl mx-auto py-20 px-6 relative z-10">
        {/* Header */}
        <div className="text-center mb-12 animate-fade-in">
          <div className="inline-flex items-center gap-3 px-6 py-2 rounded-full bg-purple-500/10 border border-purple-500/20 backdrop-blur-md mb-4">
            <div className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
            <p className="text-sm uppercase tracking-[0.35em] text-purple-300 font-semibold">Browse</p>
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
            <span className="bg-linear-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
              Combat Logs
            </span>
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
        <EncounterTable
          rows={rows}
          isLoading={isLoading}
          limit={limit}
          onRowClick={(encounter) => router.push(`/encounter/${encounter.id}`)}
        />

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

      </div>
    </>
  );
}

"use client";

import { useState, useEffect, useRef, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { produce } from "immer";
import EncounterTable from "@/components/ui/EncounterTable";
import { Filter } from "@/components/ui/Filter";
import {
  fetchEncounters,
  FetchEncountersParams,
  FetchEncountersResponse,
  DEFAULT_FETCH_ENCOUNTERS_PARAMS,
} from "@/api/encounter/encounter";

// Helper to parse URL search params into FetchEncountersParams
function parseSearchParams(searchParams: URLSearchParams): Partial<FetchEncountersParams> {
  const parsed: Partial<FetchEncountersParams> = {};

  const limit = searchParams.get("limit");
  if (limit) parsed.limit = parseInt(limit, 10) || DEFAULT_FETCH_ENCOUNTERS_PARAMS.limit;

  const offset = searchParams.get("offset");
  if (offset) parsed.offset = parseInt(offset, 10) || 0;

  const orderBy = searchParams.get("orderBy") as FetchEncountersParams["orderBy"];
  if (orderBy && ["dps", "date", "startedAt", "duration"].includes(orderBy)) {
    parsed.orderBy = orderBy;
  }

  const sort = searchParams.get("sort") as FetchEncountersParams["sort"];
  if (sort && ["asc", "desc"].includes(sort)) {
    parsed.sort = sort;
  }

  const user_id = searchParams.get("user_id");
  if (user_id) parsed.user_id = user_id;

  const scene_id = searchParams.get("scene_id");
  if (scene_id) parsed.scene_id = scene_id;

  const monster_name = searchParams.get("monster_name");
  if (monster_name) parsed.monster_name = monster_name;

  const class_id = searchParams.get("class_id");
  if (class_id) parsed.class_id = class_id;

  const class_spec = searchParams.get("class_spec");
  if (class_spec) parsed.class_spec = class_spec;

  const player_name = searchParams.get("player_name");
  if (player_name) parsed.player_name = player_name;

  const user_search = searchParams.get("user_search");
  if (user_search) parsed.user_search = user_search;

  const log_id = searchParams.get("log_id");
  if (log_id) parsed.log_id = log_id;

  return parsed;
}

// Helper to build query string from params (only includes non-default values)
function buildQueryString(params: FetchEncountersParams): string {
  const queryParts: string[] = [];
  const defaults = DEFAULT_FETCH_ENCOUNTERS_PARAMS;

  if (params.limit !== defaults.limit) queryParts.push(`limit=${params.limit}`);
  if (params.offset !== 0) queryParts.push(`offset=${params.offset}`);
  if (params.orderBy !== defaults.orderBy) queryParts.push(`orderBy=${params.orderBy}`);
  if (params.sort !== defaults.sort) queryParts.push(`sort=${params.sort}`);
  if (params.user_id) queryParts.push(`user_id=${encodeURIComponent(String(params.user_id))}`);
  if (params.scene_id) queryParts.push(`scene_id=${encodeURIComponent(String(params.scene_id))}`);
  if (params.monster_name) queryParts.push(`monster_name=${encodeURIComponent(params.monster_name)}`);
  if (params.class_id) queryParts.push(`class_id=${encodeURIComponent(String(params.class_id))}`);
  if (params.class_spec) queryParts.push(`class_spec=${encodeURIComponent(String(params.class_spec))}`);
  if (params.player_name) queryParts.push(`player_name=${encodeURIComponent(params.player_name)}`);
  if (params.user_search) queryParts.push(`user_search=${encodeURIComponent(params.user_search)}`);
  if (params.log_id) queryParts.push(`log_id=${encodeURIComponent(params.log_id)}`);
  return queryParts.length > 0 ? `?${queryParts.join("&")}` : "";
}

function LogsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Ref to track if we've done the initial sync from URL
  const initializedFromUrl = useRef(false);

  // Memoize the initial params from URL to avoid re-parsing on every render
  const initialParams = useMemo(() => {
    const urlParams = parseSearchParams(searchParams);
    return {
      ...DEFAULT_FETCH_ENCOUNTERS_PARAMS,
      limit: 10,
      offset: 0,
      orderBy: "startedAt" as const,
      sort: "desc" as const,
      ...urlParams,
    };
  }, [searchParams]);

  const [params, setParams] = useState<FetchEncountersParams>(initialParams);

  // Sync state -> URL (but not on initial render)
  useEffect(() => {
    // Skip the first render (initial sync from URL)
    if (!initializedFromUrl.current) {
      initializedFromUrl.current = true;
      return;
    }

    const queryString = buildQueryString(params);
    const newUrl = `/logs${queryString}`;

    // Use replace to avoid polluting history for every filter change
    router.replace(newUrl, { scroll: false });
  }, [params, router]);

  const { data, isLoading } = useQuery<FetchEncountersResponse>({
    queryKey: ["encounters", params],
    queryFn: () => fetchEncounters(params),
  });

  const rows = data?.encounters ?? [];
  const count = data?.count ?? 0;

  const limit = params.limit || 10;
  const offset = params.offset || 0;
  const page = Math.max(1, Math.floor(offset / limit) + 1);
  const totalPages = Math.max(1, Math.ceil(count / limit));

  return (
    <>
      <div className="min-h-screen text-white relative">
        <div className="absolute inset-0 bg-linear-to-b from-purple-900/10 via-transparent to-transparent pointer-events-none" />

        <Filter
          params={params}
          setParams={setParams}
          config={{
            scene: true,
            class: true,
            playerName: true,
            monsterName: true,
            uploaderName: true,
            logId: true,
            orderBy: true,
            sortDirection: true,
          }}
        />

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
                  onClick={() => setParams(produce((draft: FetchEncountersParams) => { draft.offset = Math.max(0, (draft.offset || 0) - (draft.limit || 10)); }))}
                  disabled={offset <= 0}
                  className="px-4 py-2 rounded-lg bg-gray-800/60 border border-gray-700 text-gray-300 disabled:opacity-40 hover:bg-gray-700/60 transition-colors font-medium"
                >
                  Previous
                </button>
                <button
                  type="button"
                  onClick={() => setParams(produce((draft: FetchEncountersParams) => { draft.offset = (draft.offset || 0) + (draft.limit || 10); }))}
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
                onClick={() => setParams(produce((draft: FetchEncountersParams) => { draft.offset = Math.max(0, (draft.offset || 0) - (draft.limit || 10)); }))}
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
                  draft.offset = (draft.offset || 0) + (draft.limit || 10);
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

export default function LogsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-white">Loading...</div>}>
      <LogsPageContent />
    </Suspense>
  );
}

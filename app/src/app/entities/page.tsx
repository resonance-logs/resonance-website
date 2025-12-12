"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams, useRouter } from "next/navigation";
import Image from "next/image";
import {
  fetchEntities,
  GetEntitiesParams,
  EntityLeaderboardEntry,
} from "@/api/entity/entity";
import {
  CLASS_MAP,
  getClassIconName,
} from "@/utils/classData";
import { formatNumber } from "@/utils/numberFormatter";
import LeaderboardRow from "@/components/ui/LeaderboardRow";
import { Filter } from "@/components/ui/Filter";


// Skeleton loader for the table
function LeaderboardSkeleton() {
  return (
    <div className="space-y-3">
      {[...Array(10)].map((_, idx) => (
        <div
          key={idx}
          className="flex items-center gap-4 p-4 rounded-xl border border-gray-800/80 bg-gray-900/50 animate-pulse"
        >
          <div className="w-10 h-10 rounded-lg bg-gray-700/50" />
          <div className="w-12 h-12 rounded-full bg-gray-700/50" />
          <div className="flex-1">
            <div className="h-4 w-32 rounded bg-gray-700/50 mb-2" />
            <div className="h-3 w-24 rounded bg-gray-700/50" />
          </div>
          <div className="h-6 w-20 rounded bg-gray-700/50" />
        </div>
      ))}
    </div>
  );
}



export const dynamic = 'force-dynamic';

function EntitiesPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Initialize params from URL
  const [params, setParams] = useState<GetEntitiesParams>(() => ({
    classId: searchParams.get("classId")
      ? Number(searchParams.get("classId"))
      : undefined,
  }));

  // Sync params to URL
  useEffect(() => {
    const urlParams = new URLSearchParams();
    if (params.classId) urlParams.set("classId", String(params.classId));

    const newUrl = urlParams.toString()
      ? `/entities?${urlParams.toString()}`
      : "/entities";
    router.replace(newUrl, { scroll: false });
  }, [params, router]);

  const { data, isLoading } = useQuery({
    queryKey: ["entities", params],
    queryFn: () => fetchEntities(params),
    staleTime: 5 * 60 * 1000, // 5 minutes - data is cached server-side anyway
  });

  const entities = data?.entities ?? [];
  const total = data?.total ?? 0;
  const updatedAt = data?.updatedAt;
  const subtitle = total > 0
    ? `Top 50 of ${formatNumber(total)} players ranked by Ability Score`
    : "Top 50 players ranked by Ability Score";

  // Format last updated time
  const formatUpdatedAt = (isoString?: string) => {
    if (!isoString) return null;
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins} min ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="min-h-screen text-white">
      <Filter
        params={params}
        setParams={setParams}
        config={{ class: true }}
      />

      <div className="max-w-5xl mx-auto px-4 py-12 pt-24">
        {/* Header */}
        <div className="text-center mb-12 animate-fade-in">
          <div className="inline-flex items-center gap-3 px-6 py-2 rounded-full bg-purple-500/10 border border-purple-500/20 backdrop-blur-md mb-4">
            <div className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
            <p className="text-sm uppercase tracking-[0.35em] text-purple-300 font-semibold">
              Leaderboard
            </p>
          </div>
          <h1 className="text-5xl font-bold bg-linear-to-r from-purple-200 via-purple-300 to-pink-200 bg-clip-text text-transparent pb-4">
            All Players
          </h1>
          <p className="text-gray-400 text-lg">
            {subtitle}
          </p>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-3 text-sm animate-fade-in">
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-900/80 border border-purple-500/30 backdrop-blur-md shadow-lg shadow-purple-500/10">
              <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-gray-300">Total Players</span>
              <span className="font-semibold text-purple-200">{total > 0 ? formatNumber(total) : "—"}</span>
            </div>

            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-900/80 border border-gray-800 backdrop-blur-md shadow-lg shadow-purple-500/10">
              <div className="h-2 w-2 rounded-full bg-cyan-400" />
              <span className="text-gray-300">Showing</span>
              <span className="font-semibold text-purple-200">{entities.length}</span>
              <span className="text-gray-500">players</span>
            </div>

            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-900/80 border border-gray-800 backdrop-blur-md shadow-lg shadow-purple-500/10">
              <div className="h-2 w-2 rounded-full bg-amber-400" />
              <span className="text-gray-300">Updated</span>
              <span className="font-semibold text-purple-200">
                {updatedAt ? formatUpdatedAt(updatedAt) : "Refreshing soon"}
              </span>
            </div>
          </div>
        </div>

        {/* Leaderboard */}
        {isLoading ? (
          <LeaderboardSkeleton />
        ) : entities.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-400 text-lg">No players found.</p>
            <p className="text-gray-500 text-sm mt-2">
              Leaderboard data is being refreshed. Please check back in a few minutes.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {entities.map((entity, idx) => (
              <LeaderboardRow
                key={entity.entityId}
                entry={entity}
                rank={idx + 1}
              />
            ))}
          </div>
        )}

        {/* Total count */}
        {total > 0 && (
          <p className="text-center text-gray-500 text-sm mt-8">
            Showing top {entities.length} of {formatNumber(total)} unique players
          </p>
        )}
      </div>

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

        .animate-fade-in {
          animation: fade-in 0.6s ease-out forwards;
          opacity: 0;
        }
      `}</style>
    </div>
  );
}

export default function EntitiesPage() {
  return (
    <Suspense fallback={<LeaderboardSkeleton />}>
      <EntitiesPageContent />
    </Suspense>
  );
}



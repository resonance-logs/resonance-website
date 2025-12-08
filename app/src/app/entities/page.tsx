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

// Filter drawer component
function FilterControls({
  params,
  setParams,
}: {
  params: GetEntitiesParams;
  setParams: React.Dispatch<React.SetStateAction<GetEntitiesParams>>;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = React.useRef<HTMLDivElement | null>(null);

  const [selectedClass, setSelectedClass] = useState<number | null>(
    params.classId ? Number(params.classId) : null
  );

  // Click outside to close
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  // Sync local state to params
  useEffect(() => {
    setParams({
      classId: selectedClass ?? undefined,
    });
  }, [selectedClass, setParams]);

  const clearFilters = () => {
    setSelectedClass(null);
  };

  return (
    <>
      {/* Active filter chips */}
      {(selectedClass) && (
        <div className="fixed top-20 left-6 z-30 flex flex-wrap gap-2 max-w-xl animate-fade-in">
          {selectedClass && (
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-500/20 border border-purple-500/40 backdrop-blur-md text-sm text-purple-200 font-medium shadow-lg">
              <span>Class: {CLASS_MAP[selectedClass]}</span>
              <button
                onClick={() => {
                  setSelectedClass(null);
                }}
                className="hover:bg-purple-500/30 rounded-full p-0.5 transition-colors"
              >
                <svg
                  className="w-3.5 h-3.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2.5}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          )}
        </div>
      )}

      <div
        className="fixed top-20 right-6 z-40 animate-fade-in"
        ref={dropdownRef}
      >
        <div className="group relative">
          <div className="absolute inset-0 -m-0.5 bg-linear-to-r from-purple-600 to-pink-600 rounded-2xl opacity-20 blur group-hover:opacity-40 transition-all duration-300 pointer-events-none"></div>

          <div
            className={`relative w-50 bg-gray-900/95 border border-purple-500/30 backdrop-blur-xl shadow-2xl shadow-purple-500/10 transition-all duration-300 overflow-hidden ${isOpen
              ? "rounded-2xl"
              : "rounded-2xl hover:shadow-purple-500/20 hover:border-purple-500/50"
              }`}
          >
            <button
              onClick={() => setIsOpen((v) => !v)}
              className="relative flex items-center gap-3 px-5 py-3.5 w-full transition-all duration-300"
            >
              <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-linear-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30 transition-all duration-300">
                <svg
                  className="w-4.5 h-4.5 text-purple-300"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2.5"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"></path>
                </svg>
              </div>
              <div className="h-8 w-px bg-linear-to-b from-transparent via-purple-500/40 to-transparent" />
              <div className="flex flex-col gap-1 flex-1">
                <label className="text-[10px] uppercase tracking-widest text-purple-300/70 font-semibold">
                  Filters
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-white text-sm font-medium truncate">
                    {selectedClass
                      ? CLASS_MAP[selectedClass]
                      : "All Classes"}
                  </span>
                  <svg
                    className={`w-4 h-4 text-purple-300 transition-transform duration-300 ${isOpen ? "rotate-180" : ""
                      }`}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2.5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </button>

            <div
              className={`transition-all duration-300 ease-in-out ${isOpen ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"
                }`}
            >
              <div className="max-h-[500px] overflow-y-auto py-2 px-4 space-y-4">
                {/* Class selector */}
                <div>
                  <div className="text-xs font-semibold text-purple-300 mb-2 uppercase tracking-wide">
                    Class
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {Object.entries(CLASS_MAP).map(([idStr, name]) => {
                      const id = Number(idStr);
                      const active = selectedClass === id;
                      return (
                        <button
                          key={id}
                          onClick={() => {
                            setSelectedClass(id);
                          }}
                          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${active
                            ? "bg-purple-500/30 border border-purple-500 text-purple-200"
                            : "bg-gray-800/80 border border-gray-700 hover:bg-gray-800 text-gray-300"
                            }`}
                        >
                          <Image
                            src={`/images/classes/${getClassIconName(id)}`}
                            alt={name}
                            width={18}
                            height={18}
                            className="object-contain"
                          />
                          <span>{name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex gap-2 pt-2 border-t border-gray-800">
                  <button
                    className="flex-1 px-4 py-2.5 rounded-lg bg-gray-800/80 border border-gray-700 hover:bg-gray-800 text-gray-300 text-sm font-medium transition-colors"
                    onClick={clearFilters}
                  >
                    Reset All
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

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
      <FilterControls params={params} setParams={setParams} />

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



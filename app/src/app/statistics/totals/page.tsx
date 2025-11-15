"use client"

import React from "react"
import Image from "next/image"
import { useQuery } from "@tanstack/react-query"
import { fetchTotals, TotalsResponse } from "@/api/statistics/statistics"
import { CLASS_MAP, CLASS_COLORS, CLASS_SPEC_MAP, getClassIconName, getSpecsForClass, getRealClassType } from "@/utils/classData"

function TableCardSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="rounded-2xl border border-gray-800/80 bg-linear-to-br from-gray-900/90 via-gray-900/80 to-gray-900/70 backdrop-blur-md p-6 animate-pulse">
      <div className="h-4 w-40 rounded bg-gray-700/50 mb-4" />
      <div className="space-y-3">
        {[...Array(rows)].map((_, i) => (
          <div key={i} className="flex items-center justify-between">
            <div className="h-3 w-32 rounded bg-gray-700/50" />
            <div className="h-3 w-16 rounded bg-gray-700/50" />
          </div>
        ))}
      </div>
    </div>
  )
}

export default function TotalsPage() {
  const { data, isLoading, error } = useQuery<TotalsResponse>({
    queryKey: ["statisticsTotals"],
    queryFn: fetchTotals,
    staleTime: 5 * 60 * 1000,
  })

  const { totalPlayers, classSpec, classId, abilityScore } = data || {}

  // Calculate role distribution from classId data
  const roleCount = { dps: 0, healer: 0, tank: 0 };
  let totalRolePlayers = 0;
  let dpsPercent = 0;
  let healerPercent = 0;
  let tankPercent = 0;
  let validClassEntries: [string, number][] = [];
  let maxCount = 1;
  const specsByClass: Record<number, Record<number, number>> = {};

  if (classId) {
    Object.entries(classId).forEach(([cid, cnt]) => {
      const classIdNum = Number(cid);
      if (classIdNum === -1 || !CLASS_MAP[classIdNum]) return;
      
      const role = getRealClassType(classIdNum);
      if (role !== 'error') {
        roleCount[role as keyof typeof roleCount] += cnt;
      }
    });
    
    totalRolePlayers = roleCount.dps + roleCount.healer + roleCount.tank;
    dpsPercent = totalRolePlayers > 0 ? (roleCount.dps / totalRolePlayers) * 100 : 0;
    healerPercent = totalRolePlayers > 0 ? (roleCount.healer / totalRolePlayers) * 100 : 0;
    tankPercent = totalRolePlayers > 0 ? (roleCount.tank / totalRolePlayers) * 100 : 0;

    // Filter out -1 and unknown classes
    validClassEntries = Object.entries(classId)
      .filter(([cid]) => Number(cid) !== -1 && CLASS_MAP[Number(cid)])
      .sort(([, a], [, b]) => b - a);
    
    maxCount = Math.max(...validClassEntries.map(([, cnt]) => cnt), 1);
  }

  // Group classSpec data by classId
  if (classSpec) {
    Object.entries(classSpec).forEach(([specName, cnt]) => {
      const specId = Number(specName);
      if (specId === -1 || specId === 0) return; // Skip unknown specs
      
      // Find which class this spec belongs to
      for (const classIdStr of Object.keys(CLASS_MAP)) {
        const classIdNum = Number(classIdStr);
        const specs = getSpecsForClass(classIdNum);
        if (specs.includes(specId)) {
          if (!specsByClass[classIdNum]) {
            specsByClass[classIdNum] = {};
          }
          specsByClass[classIdNum][specId] = cnt;
          break;
        }
      }
    });
  }

  return (
    <div className="min-h-screen text-white">
      <div className="max-w-7xl mx-auto py-12 px-4">
        {/* Header */}
        <div className="text-center mb-12 animate-fade-in">
          <div className="inline-flex items-center gap-3 px-6 py-2 rounded-full bg-purple-500/10 border border-purple-500/20 backdrop-blur-md mb-4">
            <div className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
            <p className="text-sm uppercase tracking-[0.35em] text-purple-300 font-semibold">Statistics</p>
          </div>
          <h1 className="text-6xl font-bold bg-linear-to-r from-purple-200 via-purple-300 to-pink-200 bg-clip-text text-transparent pb-4">
            Overview
          </h1>
          <p className="text-gray-400 mt-2">Explore comprehensive statistics across all players, classes, and ability scores</p>
        </div>

        {/* Error state */}
        {error && !isLoading && (
          <div className="text-center py-12">
            <div className="inline-flex items-center gap-3 px-6 py-4 rounded-xl bg-red-500/10 border border-red-500/30">
              <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-red-400 font-medium">Failed to load statistics data</span>
            </div>
          </div>
        )}

        {/* Total Players Hero Card */}
        {isLoading ? (
          <div className="mb-8">
            <div className="rounded-2xl border border-gray-800/80 bg-linear-to-br from-gray-900/90 via-gray-900/80 to-gray-900/70 backdrop-blur-md p-12 text-center animate-pulse">
              <div className="h-6 w-40 rounded bg-gray-700/50 mb-4 mx-auto" />
              <div className="h-16 w-48 rounded bg-gray-700/50 mx-auto" />
            </div>
          </div>
        ) : data && (
          <div className="mb-8">
            <div className="rounded-2xl border border-gray-800/80 bg-linear-to-br from-gray-900/90 via-gray-900/80 to-gray-900/70 backdrop-blur-md p-12 text-center transition-all duration-300 hover:border-purple-500/50 hover:shadow-xl hover:shadow-purple-500/10">
              <p className="text-sm uppercase tracking-[0.35em] text-purple-300/70 mb-4 font-semibold">Total Players</p>
              <p className="text-7xl font-bold bg-linear-to-r from-purple-200 via-white to-purple-200 bg-clip-text text-transparent">
                {totalPlayers?.toLocaleString() ?? '—'}
              </p>
            </div>
          </div>
        )}

        {/* Role Distribution */}
        <div className="mb-8">
          {isLoading ? (
            <div className="rounded-2xl border border-gray-800/80 bg-linear-to-br from-gray-900/90 via-gray-900/80 to-gray-900/70 backdrop-blur-md p-6 animate-pulse">
              <div className="h-6 w-40 rounded bg-gray-700/50 mb-6" />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="p-6 rounded-xl bg-gray-800/50">
                    <div className="h-4 w-20 rounded bg-gray-700/50 mb-4 mx-auto" />
                    <div className="h-12 w-24 rounded bg-gray-700/50 mx-auto" />
                  </div>
                ))}
              </div>
            </div>
          ) : data && (
            <div className="rounded-2xl border border-gray-800/80 bg-linear-to-br from-gray-900/90 via-gray-900/80 to-gray-900/70 backdrop-blur-md p-6 transition-all duration-300 hover:border-purple-500/50 hover:shadow-xl hover:shadow-purple-500/10">
              <div className="flex items-center gap-3 mb-6">
                <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/30">
                  <svg className="w-5 h-5 text-purple-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Role Distribution</h2>
                  <p className="text-xs text-gray-400">Player distribution across roles</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                {/* DPS */}
                <div className="group relative p-6 rounded-xl bg-linear-to-br from-red-500/10 to-red-600/5 border border-red-500/20 hover:border-red-500/40 transition-all duration-300 hover:scale-105 animate-fade-in" style={{ animationDelay: '100ms' }}>
                  <div className="absolute inset-0 rounded-xl bg-linear-to-br from-red-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  <div className="relative z-10">
                    <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 rounded-full bg-red-500/20 border border-red-500/40">
                      <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    </div>
                    <p className="text-sm uppercase tracking-wide text-red-300/70 text-center mb-2 font-semibold">DPS</p>
                    <p className="text-4xl font-bold text-red-400 text-center mb-1">{dpsPercent.toFixed(1)}%</p>
                    <p className="text-xs text-gray-400 text-center">{roleCount.dps.toLocaleString()} players</p>
                  </div>
                </div>

                {/* Healer */}
                <div className="group relative p-6 rounded-xl bg-linear-to-br from-green-500/10 to-green-600/5 border border-green-500/20 hover:border-green-500/40 transition-all duration-300 hover:scale-105 animate-fade-in" style={{ animationDelay: '150ms' }}>
                  <div className="absolute inset-0 rounded-xl bg-linear-to-br from-green-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  <div className="relative z-10">
                    <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 rounded-full bg-green-500/20 border border-green-500/40">
                      <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                      </svg>
                    </div>
                    <p className="text-sm uppercase tracking-wide text-green-300/70 text-center mb-2 font-semibold">Healer</p>
                    <p className="text-4xl font-bold text-green-400 text-center mb-1">{healerPercent.toFixed(1)}%</p>
                    <p className="text-xs text-gray-400 text-center">{roleCount.healer.toLocaleString()} players</p>
                  </div>
                </div>

                {/* Tank */}
                <div className="group relative p-6 rounded-xl bg-linear-to-br from-blue-500/10 to-blue-600/5 border border-blue-500/20 hover:border-blue-500/40 transition-all duration-300 hover:scale-105 animate-fade-in" style={{ animationDelay: '200ms' }}>
                  <div className="absolute inset-0 rounded-xl bg-linear-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  <div className="relative z-10">
                    <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 rounded-full bg-blue-500/20 border border-blue-500/40">
                      <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                    </div>
                    <p className="text-sm uppercase tracking-wide text-blue-300/70 text-center mb-2 font-semibold">Tank</p>
                    <p className="text-4xl font-bold text-blue-400 text-center mb-1">{tankPercent.toFixed(1)}%</p>
                    <p className="text-xs text-gray-400 text-center">{roleCount.tank.toLocaleString()} players</p>
                  </div>
                </div>
              </div>

              {/* Visual bar showing overall distribution */}
              <div className="relative h-3 rounded-full overflow-hidden flex bg-gray-800/50">
                <div
                  className="h-full transition-all duration-700 bg-linear-to-r from-red-500 to-red-600"
                  style={{ width: `${dpsPercent}%` }}
                  title={`DPS: ${dpsPercent.toFixed(1)}%`}
                />
                <div
                  className="h-full transition-all duration-700 bg-linear-to-r from-green-500 to-green-600"
                  style={{ width: `${healerPercent}%` }}
                  title={`Healer: ${healerPercent.toFixed(1)}%`}
                />
                <div
                  className="h-full transition-all duration-700 bg-linear-to-r from-blue-500 to-blue-600"
                  style={{ width: `${tankPercent}%` }}
                  title={`Tank: ${tankPercent.toFixed(1)}%`}
                />
              </div>
            </div>
          )}
        </div>

        {/* Class Distribution - Full Width */}
        <div className="mb-8">
          {isLoading ? (
            <TableCardSkeleton rows={8} />
          ) : data && (
            <div className="rounded-2xl border border-gray-800/80 bg-linear-to-br from-gray-900/90 via-gray-900/80 to-gray-900/70 backdrop-blur-md p-6 transition-all duration-300 hover:border-purple-500/50 hover:shadow-xl hover:shadow-purple-500/10">
              <div className="flex items-center gap-3 mb-5">
                <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/30">
                  <svg className="w-5 h-5 text-purple-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <h2 className="text-lg font-bold text-white">Class Distribution</h2>
              </div>
              <div className="space-y-3">
                {validClassEntries.map(([cid, cnt]) => {
                  const classIdNum = Number(cid);
                  const className = CLASS_MAP[classIdNum];
                  const classColor = CLASS_COLORS[className];
                  const percentage = (cnt / maxCount) * 100;

                  return (
                    <div
                      key={cid}
                      className="flex items-center gap-4 p-4 rounded-xl bg-gray-800/60 hover:bg-gray-800/80 transition-colors"
                    >
                      <div className="relative h-10 w-10 rounded-full overflow-hidden shrink-0">
                        <Image
                          src={`/images/classes/${getClassIconName(classIdNum)}`}
                          alt={className}
                          fill
                          sizes="40px"
                          className="object-contain"
                        />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-gray-200 font-semibold">{className}</span>
                          <span className="font-bold text-sm" style={{ color: classColor }}>
                            {cnt.toLocaleString()}
                          </span>
                        </div>
                        <div className="h-3 bg-gray-700/50 rounded-full overflow-hidden">
                          <div
                            className="h-full transition-all duration-700"
                            style={{
                              width: `${percentage}%`,
                              backgroundColor: classColor
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Spec Distribution by Class */}
        <div className="mb-8">
          {isLoading ? (
            <TableCardSkeleton rows={8} />
          ) : data && (
            <div className="rounded-2xl border border-gray-800/80 bg-linear-to-br from-gray-900/90 via-gray-900/80 to-gray-900/70 backdrop-blur-md p-6 transition-all duration-300 hover:border-purple-500/50 hover:shadow-xl hover:shadow-purple-500/10">
              <div className="flex items-center gap-3 mb-5">
                <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/30">
                  <svg className="w-5 h-5 text-purple-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Specialization Distribution</h2>
                  <p className="text-xs text-gray-400">Spec preference breakdown by class</p>
                </div>
              </div>
              <div className="space-y-4">
                {Object.entries(specsByClass)
                  .sort(([, specsA], [, specsB]) => {
                    const totalA = Object.values(specsA).reduce((sum, v) => sum + v, 0);
                    const totalB = Object.values(specsB).reduce((sum, v) => sum + v, 0);
                    return totalB - totalA;
                  })
                  .map(([classIdStr, specs]) => {
                    const classIdNum = Number(classIdStr);
                    const className = CLASS_MAP[classIdNum];
                    const specIds = getSpecsForClass(classIdNum);
                    
                    const spec1Id = specIds[0];
                    const spec2Id = specIds[1];
                    const spec1Count = specs[spec1Id] || 0;
                    const spec2Count = specs[spec2Id] || 0;
                    const total = spec1Count + spec2Count;
                    
                    if (total === 0) return null;
                    
                    const spec1Percent = (spec1Count / total) * 100;
                    const spec2Percent = (spec2Count / total) * 100;
                    const spec1Name = CLASS_SPEC_MAP[spec1Id];
                    const spec2Name = CLASS_SPEC_MAP[spec2Id];
                    
                    return (
                      <div
                        key={classIdNum}
                        className="p-4 rounded-xl bg-gray-800/60 hover:bg-gray-800/80 transition-colors"
                      >
                        <div className="flex items-center gap-3 mb-3">
                          <div className="relative h-8 w-8 rounded-full overflow-hidden shrink-0">
                            <Image
                              src={`/images/classes/${getClassIconName(classIdNum)}`}
                              alt={className}
                              fill
                              sizes="32px"
                              className="object-contain"
                            />
                          </div>
                          <div className="flex-1">
                            <span className="text-gray-200 font-semibold">{className}</span>
                            <p className="text-xs text-gray-400">{total.toLocaleString()} total players</p>
                          </div>
                        </div>
                        
                        {/* Split bar showing spec distribution */}
                        <div className="relative h-3 rounded-full overflow-hidden flex bg-gray-800/50">
                          <div
                            className="h-full transition-all duration-700 bg-linear-to-r from-purple-500 to-purple-600"
                            style={{ width: `${spec1Percent}%` }}
                            title={`${spec1Name}: ${spec1Count.toLocaleString()} (${spec1Percent.toFixed(1)}%)`}
                          />
                          <div
                            className="h-full transition-all duration-700 bg-linear-to-r from-pink-500 to-pink-600"
                            style={{ width: `${spec2Percent}%` }}
                            title={`${spec2Name}: ${spec2Count.toLocaleString()} (${spec2Percent.toFixed(1)}%)`}
                          />
                        </div>

                        {/* Legend */}
                        <div className="flex items-center justify-between mt-3 text-xs">
                          <div className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 rounded-full bg-linear-to-r from-purple-500 to-purple-600"></div>
                            <span className="text-gray-400">{spec1Name}</span>
                            <span className="font-semibold text-purple-300">{spec1Count.toLocaleString()}</span>
                            <span className="text-gray-500">({spec1Percent.toFixed(1)}%)</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 rounded-full bg-linear-to-r from-pink-500 to-pink-600"></div>
                            <span className="text-gray-400">{spec2Name}</span>
                            <span className="font-semibold text-pink-300">{spec2Count.toLocaleString()}</span>
                            <span className="text-gray-500">({spec2Percent.toFixed(1)}%)</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}
        </div>

        {/* Ability Score Distribution */}
        {isLoading ? (
          <TableCardSkeleton rows={10} />
        ) : data && (
          <div className="rounded-2xl border border-gray-800/80 bg-linear-to-br from-gray-900/90 via-gray-900/80 to-gray-900/70 backdrop-blur-md p-6 transition-all duration-300 hover:border-purple-500/50 hover:shadow-xl hover:shadow-purple-500/10">
            <div className="flex items-center gap-3 mb-5">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/30">
                <svg className="w-5 h-5 text-purple-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Ability Score Distribution</h2>
                <p className="text-xs text-gray-400">Grouped by 1000-point brackets</p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {Object.entries(abilityScore || {})
                .sort(([a], [b]) => Number(a) - Number(b))
                .map(([br, cnt]) => {
                  const rangeStart = Number(br);
                  const rangeEnd = rangeStart + 999;
                  const maxAbilityCount = Math.max(...Object.values(abilityScore || {}), 1);
                  const percentage = (cnt / maxAbilityCount) * 100;
                  
                  return (
                    <div
                      key={br}
                      className="p-4 rounded-xl bg-gray-800/60 hover:bg-gray-800/80 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                          {rangeStart.toLocaleString()} - {rangeEnd.toLocaleString()}
                        </span>
                        <span className="text-sm font-bold text-purple-300">
                          {cnt.toLocaleString()}
                        </span>
                      </div>
                      <div className="h-2 bg-gray-700/50 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-linear-to-r from-purple-500 to-pink-500 transition-all duration-700 group-hover:from-purple-400 group-hover:to-pink-400"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
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
  )
}

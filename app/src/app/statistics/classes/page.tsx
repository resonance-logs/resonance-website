"use client";

import Image from 'next/image'
import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchStatisticsTotals, TotalsResponse } from '@/api/statistics/statistics'
import { CLASS_MAP, CLASS_SPEC_MAP, getClassIconName, getClassTooltip, getClassColor, getSpecsForClass } from '@/utils/classData'

function Skeleton() {
  return (
    <div className="space-y-4">
      <div className="h-28 rounded-2xl bg-gray-800/40 animate-pulse" />
      {[...Array(6)].map((_,i)=>(<div key={i} className="h-16 rounded-lg bg-gray-800/30 animate-pulse"/>))}
    </div>
  )
}

export default function ClassStatisticsPage() {
  const { data, isLoading, error } = useQuery<TotalsResponse>({ queryKey: ['statistics','totals'], queryFn: () => fetchStatisticsTotals() })

  const totals = data

  // helpers
  const classMap = React.useMemo(() => {
    const m = new Map<number, number>();
    (totals?.by_class_id ?? []).forEach(it => m.set(it.class_id, it.count));
    return m;
  }, [totals])

  const specMap = React.useMemo(() => {
    const m = new Map<number, number>();
    (totals?.by_class_spec ?? []).forEach(it => m.set(it.class_spec, it.count));
    return m;
  }, [totals])

  const maxClassCount = React.useMemo(() => {
    const vals = Array.from(classMap.values())
    return vals.length ? Math.max(...vals) : 1
  }, [classMap])

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 text-white">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Class Distribution</h1>
          <p className="text-sm text-gray-400">Overview of players and class/spec distribution</p>
        </div>
      </div>

      {isLoading && <Skeleton />}

      {!isLoading && (!totals || error) && (
        <div className="text-red-400">Failed to load statistics.</div>
      )}

      {!isLoading && totals && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Total players card */}
          <div className="col-span-1 md:col-span-1 rounded-2xl bg-gray-900/70 border border-gray-800 p-6">
            <div className="flex items-center gap-4">
              <div className="rounded-full bg-gradient-to-br from-purple-600 to-pink-500 w-16 h-16 flex items-center justify-center text-white text-2xl font-bold">👥</div>
              <div>
                <div className="text-xs text-gray-400 uppercase tracking-wider">Total Players</div>
                <div className="text-3xl font-bold mt-1">{totals.total_players.toLocaleString()}</div>
              </div>
            </div>
            <div className="text-sm text-gray-400 mt-4">
              Distinct players (one most-recent character row per player)
            </div>
          </div>

          {/* Class distribution */}
          <div className="col-span-1 md:col-span-1 rounded-2xl bg-gray-900/70 border border-gray-800 p-6">
            <h3 className="text-lg font-semibold mb-4">Players by Class</h3>
            <div className="space-y-3">
              { (totals.by_class_id ?? []).sort((a,b)=>b.count - a.count).map(cls => {
                const clsId = cls.class_id
                const count = cls.count
                const pct = Math.round((count / Math.max(1, maxClassCount)) * 100)
                const name = CLASS_MAP[clsId] ?? `Class ${clsId}`
                const color = getClassColor(name)
                return (
                  <div key={clsId} className="flex items-center gap-3">
                    <div className="flex items-center gap-3 w-44">
                      <div className="relative w-9 h-9 rounded-full bg-gray-800/50 overflow-hidden">
                        <Image src={`/images/classes/${getClassIconName(clsId)}`} alt={name} fill sizes="36px" className="object-contain" title={getClassTooltip(clsId, undefined)} />
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate">{name}</div>
                        <div className="text-xs text-gray-400">{count.toLocaleString()} players</div>
                      </div>
                    </div>

                    <div className="flex-1">
                      <div className="w-full bg-gray-800/40 h-3 rounded-full overflow-hidden">
                        <div className="h-3 rounded-full" style={{ width: `${pct}%`, background: color }} />
                      </div>
                    </div>
                    <div className="w-12 text-right text-sm text-gray-300">{pct}%</div>
                  </div>
                )
              }) }
            </div>
          </div>

          {/* Spec distribution + Gear brackets */}
          <div className="col-span-1 md:col-span-1 space-y-6">
            <div className="rounded-2xl bg-gray-900/70 border border-gray-800 p-6">
              <h3 className="text-lg font-semibold mb-4">Class Spec Split</h3>
              <div className="space-y-4">
                { (totals.by_class_id ?? []).sort((a,b)=>b.count-a.count).map(cls => {
                  const clsId = cls.class_id
                  const classCount = cls.count
                  const specs = getSpecsForClass(clsId)
                  if (specs.length === 0) return null
                  const s0 = specs[0]
                  const s1 = specs[1]
                  const c0 = specMap.get(s0) ?? 0
                  const c1 = specMap.get(s1) ?? 0
                  const p0 = classCount > 0 ? Math.round((c0 / classCount) * 100) : 0
                  const p1 = classCount > 0 ? Math.round((c1 / classCount) * 100) : 0
                  const name = CLASS_MAP[clsId] ?? `Class ${clsId}`
                  const color = getClassColor(name)
                  return (
                    <div key={`spec-${clsId}`}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <div className="relative w-8 h-8 rounded-full overflow-hidden bg-gray-800/50">
                            <Image src={`/images/classes/${getClassIconName(clsId)}`} alt={name} fill sizes="32px" className="object-contain" />
                          </div>
                          <div className="text-sm font-medium">{name}</div>
                        </div>
                        <div className="text-sm text-gray-400">{classCount.toLocaleString()} players</div>
                      </div>

                      <div className="w-full bg-gray-800/40 h-3 rounded-full overflow-hidden flex">
                        <div className="h-3" style={{ width: `${p0}%`, background: color }} title={`${CLASS_SPEC_MAP[s0] ?? s0} ${p0}%`} />
                        <div className="h-3" style={{ width: `${p1}%`, background: '#444' }} title={`${CLASS_SPEC_MAP[s1] ?? s1} ${p1}%`} />
                      </div>
                      <div className="flex items-center justify-between text-xs text-gray-400 mt-1">
                        <div>{CLASS_SPEC_MAP[s0] ?? s0}: {p0}%</div>
                        <div>{CLASS_SPEC_MAP[s1] ?? s1}: {p1}%</div>
                      </div>
                    </div>
                  )
                }) }
              </div>
            </div>

            <div className="rounded-2xl bg-gray-900/70 border border-gray-800 p-6">
              <h3 className="text-lg font-semibold mb-4">Characters by Gear Score</h3>
              <div className="space-y-2">
                { (totals.gear_brackets ?? []).sort((a,b)=>a.bracket - b.bracket).map(g => (
                  <div key={g.bracket} className="flex items-center justify-between">
                    <div className="text-sm text-gray-300">{g.bracket}-{g.bracket + 99}</div>
                    <div className="text-sm text-gray-300">{g.count.toLocaleString()}</div>
                  </div>
                )) }
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}



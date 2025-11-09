"use client";

import { useEffect, useMemo, useState } from "react";
import { fetchEncounters, EncounterRowDTO, fetchEncounterScenes } from "@/api/encounter";
import Link from "next/link";
import { getClassIconName, getClassTooltip } from "@/lib/classIcon";

const bossesPreset: string[] = [];

function formatDuration(ms: number) {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

export default function EncounterLeaderboardPage() {
  const [rows, setRows] = useState<EncounterRowDTO[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [scene, setScene] = useState("");
  const [scenes, setScenes] = useState<string[]>([]);
  const [orderBy, setOrderBy] = useState("dps");
  const [sort, setSort] = useState("desc");

  useEffect(() => {
    setLoading(true);
    fetchEncounters({ limit: 30, orderBy, sort, scene_id: undefined, scene_name: scene || undefined })
      .then((d) => { setRows(d.rows); setTotal(d.totalCount); })
      .finally(() => setLoading(false));
  }, [scene, orderBy, sort]);

  useEffect(() => {
    fetchEncounterScenes().then(setScenes).catch(() => setScenes([]));
  }, []);

  const topDpsByEncounter = useMemo(() => {
    return rows.reduce<Record<number, number>>((acc, r) => {
      const dur = Math.max(1, Math.floor(r.durationMs / 1000));
      const dps = Math.round(r.totalDmg / dur);
      acc[r.id] = dps;
      return acc;
    }, {});
  }, [rows]);

  return (
    <div className="max-w-6xl mx-auto py-8 text-white">
      <div className="flex items-end justify-between mb-6">
        <h1 className="text-3xl font-bold">Encounter Leaderboard</h1>
        <div className="flex flex-col sm:flex-row gap-4">
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Sort By</label>
            <select 
              className="bg-gray-800 border border-gray-600 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent" 
              value={orderBy} 
              onChange={(e) => {
                const newOrderBy = e.target.value;
                setOrderBy(newOrderBy);
                // Reset sort to sensible default based on metric
                if (newOrderBy === 'dps') {
                  setSort('desc');
                } else if (newOrderBy === 'duration') {
                  setSort('asc');
                } else {
                  setSort('desc');
                }
              }}
            >
              <option value="duration">Duration</option>
              <option value="dps">DPS</option>
              <option value="date">Date</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Order</label>
            <select 
              className="bg-gray-800 border border-gray-600 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent" 
              value={sort} 
              onChange={(e) => setSort(e.target.value)}
            >
              <option value="asc">Ascending</option>
              <option value="desc">Descending</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Scene</label>
            <select 
              className="bg-gray-800 border border-gray-600 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent" 
              value={scene} 
              onChange={(e) => setScene(e.target.value)}
            >
              <option value="">All Scenes</option>
              {scenes.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-gray-700">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-800/50">
            <tr>
              <th className="px-3 py-2 text-left">Rank</th>
              <th className="px-3 py-2 text-left">Team</th>
              <th className="px-3 py-2 text-left">Avg. Combat Score</th>
              <th className="px-3 py-2 text-left">DPS</th>
              <th className="px-3 py-2 text-left">Duration</th>
              <th className="px-3 py-2 text-left">Date</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="px-3 py-6 text-center text-gray-400">Loading…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={6} className="px-3 py-6 text-center text-gray-400">No encounters found.</td></tr>
            ) : (
              rows.map((r, idx) => {
                const dps = Math.round(r.totalDmg / Math.max(1, Math.floor(r.durationMs / 1000)));
                const date = new Date(r.startedAtMs);
                // compute top DPS among players in this encounter for relative bar
                const durationSec = Math.max(1, Math.floor(r.durationMs / 1000));
                const topPlayerDps = r.players.reduce((mx, p) => {
                  const pdps = Math.round(p.damageDealt / durationSec);
                  return Math.max(mx, pdps);
                }, 0);
                return (
                  <>
                    <tr key={r.id} className="hover:bg-gray-800/40 cursor-pointer" onClick={() => window.location.href = `/encounter/${r.id}`}>                    
                      <td className="px-3 py-2">{idx + 1}</td>
                      <td className="px-3 py-2">{r.team}</td>
                      <td className="px-3 py-2">{r.teamAvgAbilityScore ?? '-'}</td>
                      <td className="px-3 py-2">{dps.toLocaleString()}</td>
                      <td className="px-3 py-2">{formatDuration(r.durationMs)}</td>
                      <td className="px-3 py-2">{date.toLocaleDateString()}</td>
                    </tr>
                    <tr key={`players-${r.id}`} className="bg-gray-900/40">
                      <td className="px-3 py-2" colSpan={6}>
                        <div className="flex flex-wrap gap-3">
                          {r.players.map((p) => {
                            const pdps = Math.round(p.damageDealt / Math.max(1, Math.floor(r.durationMs/1000)));
                            const rel = topPlayerDps > 0 ? Math.round((pdps / topPlayerDps) * 100) : 0;
                            const icon = getClassIconName(p.classId as any);
                            return (
                              <div key={`${r.id}-${p.actorId}`} className="flex items-center gap-2 bg-gray-800/40 rounded px-2 py-1">
                                <img className="w-6 h-6 rounded bg-gray-700" src={`/images/classes/${icon}`} alt="class" title={getClassTooltip(p.classId as any, p.classSpec as any)} />
                                <span className="text-xs text-gray-200">{p.name ?? 'Unknown'}</span>
                                <div className="w-40 h-2 bg-gray-700 rounded overflow-hidden">
                                  <div className="h-full bg-purple-500" style={{ width: `${rel}%` }} />
                                </div>
                                <span className="text-[10px] text-gray-400">{pdps} dps</span>
                              </div>
                            );
                          })}
                        </div>
                      </td>
                    </tr>
                  </>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

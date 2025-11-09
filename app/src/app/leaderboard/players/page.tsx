"use client";

import { useEffect, useState, useMemo } from "react";
// Assume this API function exists or needs to be created.
// It should fetch aggregated player stats.
// import { fetchPlayersLeaderboard, PlayerLeaderboardRowDTO } from "@/api/player";

// Placeholder type for the player data
interface PlayerLeaderboardRowDTO {
  actorId: number;
  name: string;
  classId: number;
  totalDamage: number;
  avgDps: number;
  encounterCount: number;
}

export default function PlayersLeaderboard() {
  const [rows, setRows] = useState<PlayerLeaderboardRowDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [orderBy, setOrderBy] = useState("avgDps");
  const [sort, setSort] = useState("desc");
  const [page, setPage] = useState(1);
  const pageSize = 25;

  useEffect(() => {
    setLoading(true);
    // TODO: Implement the API call
    // fetchPlayersLeaderboard({ page, pageSize, orderBy, sort })
    //   .then((data) => { setRows(data.rows); /* setTotal(data.totalCount); */ })
    //   .finally(() => setLoading(false));
    
    // Mock data for now
    setTimeout(() => {
      setRows([
        { actorId: 1, name: "PlayerOne", classId: 1, totalDamage: 1234567, avgDps: 12345, encounterCount: 50 },
        { actorId: 2, name: "PlayerTwo", classId: 2, totalDamage: 2345678, avgDps: 23456, encounterCount: 60 },
      ]);
      setLoading(false);
    }, 500);
  }, [page, orderBy, sort]);

  const sortedRows = useMemo(() => {
    return [...rows].sort((a, b) => {
      let aVal: any = a[orderBy as keyof PlayerLeaderboardRowDTO];
      let bVal: any = b[orderBy as keyof PlayerLeaderboardRowDTO];

      if (sort === "asc") {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });
  }, [rows, orderBy, sort]);

  return (
    <div className="max-w-6xl mx-auto py-8 text-white">
      <div className="flex items-end justify-between mb-6">
        <h1 className="text-3xl font-bold">Players Leaderboard</h1>
        <div className="flex gap-3">
          <select className="bg-transparent border border-gray-600 rounded px-2 py-1" value={orderBy} onChange={(e) => setOrderBy(e.target.value)}>
            <option value="avgDps">Avg. DPS</option>
            <option value="totalDamage">Total Damage</option>
            <option value="encounterCount">Encounters</option>
          </select>
          <select className="bg-transparent border border-gray-600 rounded px-2 py-1" value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="desc">Desc</option>
            <option value="asc">Asc</option>
          </select>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-gray-700">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-800/50">
            <tr>
              <th className="px-3 py-2 text-left">Rank</th>
              <th className="px-3 py-2 text-left">Name</th>
              <th className="px-3 py-2 text-left">Class</th>
              <th className="px-3 py-2 text-left">Avg. DPS</th>
              <th className="px-3 py-2 text-left">Total Damage</th>
              <th className="px-3 py-2 text-left">Encounters</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="px-3 py-6 text-center text-gray-400">Loading…</td></tr>
            ) : sortedRows.length === 0 ? (
              <tr><td colSpan={6} className="px-3 py-6 text-center text-gray-400">No players found.</td></tr>
            ) : (
              sortedRows.map((r, idx) => (
                <tr key={r.actorId} className="hover:bg-gray-800/40">
                  <td className="px-3 py-2">{(page - 1) * pageSize + idx + 1}</td>
                  <td className="px-3 py-2">{r.name}</td>
                  <td className="px-3 py-2">{r.classId}</td>
                  <td className="px-3 py-2">{r.avgDps.toLocaleString()}</td>
                  <td className="px-3 py-2">{r.totalDamage.toLocaleString()}</td>
                  <td className="px-3 py-2">{r.encounterCount}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

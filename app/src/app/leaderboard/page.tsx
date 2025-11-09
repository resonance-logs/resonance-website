"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
// Assume these API functions exist or need to be created.
// import { fetchEncounters, EncounterRowDTO } from "@/api/encounter";
// import { fetchPlayersLeaderboard, PlayerLeaderboardRowDTO } from "@/api/player";

// Placeholder types
interface EncounterRowDTO { id: number; sceneName: string; totalDmg: number; durationMs: number; }
interface PlayerLeaderboardRowDTO { name: string; avgDps: number; }

export default function LeaderboardIndex() {
  const [topEncounters, setTopEncounters] = useState<EncounterRowDTO[]>([]);
  const [topPlayers, setTopPlayers] = useState<PlayerLeaderboardRowDTO[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // TODO: Implement API calls
    // Promise.all([
    //   fetchEncounters({ limit: 5, orderBy: "dps", sort: "desc" }),
    //   fetchPlayersLeaderboard({ page: 1, pageSize: 5, orderBy: "avgDps", sort: "desc" })
    // ]).then(([encData, playerData]) => {
    //   setTopEncounters(encData.rows);
    //   setTopPlayers(playerData.rows);
    // }).finally(() => setLoading(false));

    // Mock data for now
    setTimeout(() => {
      setTopEncounters([{ id: 1, sceneName: "Boss Arena", totalDmg: 999999, durationMs: 180000 }]);
      setTopPlayers([{ name: "TopPlayer", avgDps: 99999 }]);
      setLoading(false);
    }, 500);
  }, []);

  return (
    <div className="max-w-6xl mx-auto py-8 text-white">
      <h1 className="text-3xl font-bold mb-6">Leaderboard Dashboard</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-gray-800/40 rounded-lg p-4 border border-gray-700">
          <h2 className="text-xl font-semibold mb-3">Top Encounters (by DPS)</h2>
          {loading ? <div className="text-gray-400">Loading...</div> : (
            <ul className="space-y-2">
              {topEncounters.map(e => (
                <li key={e.id}>
                  <Link href={`/leaderboard/encounter/${e.id}`} className="text-purple-400 hover:underline">
                    {e.sceneName} - {Math.round(e.totalDmg / (e.durationMs / 1000)).toLocaleString()} DPS
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="bg-gray-800/40 rounded-lg p-4 border border-gray-700">
          <h2 className="text-xl font-semibold mb-3">Top Players (by Avg. DPS)</h2>
          {loading ? <div className="text-gray-400">Loading...</div> : (
            <ul className="space-y-2">
              {topPlayers.map((p, idx) => (
                <li key={idx}>
                  <Link href={`/leaderboard/players`} className="text-purple-400 hover:underline">
                    {p.name} - {p.avgDps.toLocaleString()} DPS
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="flex gap-4">
        <Link href="/leaderboard/encounter" className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded">
          View Encounter Leaderboard
        </Link>
        <Link href="/leaderboard/players" className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded">
          View Player Leaderboard
        </Link>
      </div>
    </div>
  );
}

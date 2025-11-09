"use client";
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchEncounterById } from "@/api/encounter/encounter";
import { useParams } from "next/navigation";
import { getClassIconName, getClassTooltip } from "@/lib/classIcon";

interface ActorRow {
  actorId: number;
  name?: string;
  classId?: number;
  classSpec?: number;
  damageDealt: number;
  healDealt: number;
  damageTaken: number;
  abilityScore?: number;
}

export default function EncounterDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  // skill expansion removed: endpoint not implemented server-side
  const { data, isLoading, error } = useQuery({
    queryKey: ["encounter", id],
    queryFn: () => fetchEncounterById(id),
    enabled: !!id,
  });

  const encounter = data?.encounter ?? null;
  const [playerOrderBy, setPlayerOrderBy] = useState("damageDealt");
  const [playerSort, setPlayerSort] = useState("desc");

  // Note: skill breakdown endpoint is not available in `@/api/encounter`.
  // The UI previously attempted to call `fetchEncounterSkill` which doesn't exist.
  // We keep the UI expansion state but do not attempt to fetch skill details here.

  const sortedActors = useMemo(() => {
    if (!encounter?.players) return [];

    return [...encounter.players].sort((a, b) => {
      let aVal: any = a[playerOrderBy as keyof ActorRow];
      let bVal: any = b[playerOrderBy as keyof ActorRow];

      if (aVal === null || aVal === undefined) aVal = -Infinity;
      if (bVal === null || bVal === undefined) bVal = -Infinity;

      if (typeof aVal === "string") aVal = aVal.toLowerCase();
      if (typeof bVal === "string") bVal = bVal.toLowerCase();

      if (playerSort === "asc") {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });
  }, [encounter?.players, playerOrderBy, playerSort]);

  if (isLoading) return <div className="max-w-6xl mx-auto py-8 text-white">Loading…</div>;
  if (!encounter || error) return <div className="max-w-6xl mx-auto py-8 text-white">Encounter not found.</div>;

  const ms = (() => {
    const started = new Date(encounter.startedAt).getTime();
    const ended = encounter.endedAt ? new Date(encounter.endedAt).getTime() : undefined;
    return (encounter as any).durationMs ?? (ended ? ended - started : Math.max(1, Date.now() - started));
  })();

  const durationFmt = (() => {
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  })();

  return (
    <div className="max-w-7xl mx-auto py-8 text-white">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Encounter #{encounter.id}</h1>
        <a href="/leaderboard/encounter" className="text-purple-400 hover:underline text-sm">Back to Leaderboard</a>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 text-sm">
        <div className="bg-gray-800/40 rounded p-3"><div className="text-gray-400 mb-1">Scene</div><div>{encounter.sceneName || '-'}</div></div>
        <div className="bg-gray-800/40 rounded p-3"><div className="text-gray-400 mb-1">Duration</div><div>{durationFmt}</div></div>
        <div className="bg-gray-800/40 rounded p-3"><div className="text-gray-400 mb-1">Total Damage</div><div>{encounter.totalDmg.toLocaleString()}</div></div>
        <div className="bg-gray-800/40 rounded p-3"><div className="text-gray-400 mb-1">Total Healing</div><div>{encounter.totalHeal.toLocaleString()}</div></div>
      </div>

      <h2 className="text-xl font-semibold mb-3">Players</h2>
      <div className="overflow-x-auto border border-gray-700 rounded-lg mb-8">
        <table className="min-w-full text-xs">
          <thead className="bg-gray-800/50">
            <tr>
              <th className="px-2 py-2 text-left cursor-pointer hover:bg-gray-700/50" onClick={() => { setPlayerOrderBy("name"); setPlayerSort(playerSort === "asc" ? "desc" : "asc"); }}>Name</th>
              <th className="px-2 py-2 text-left">Class</th>
              <th className="px-2 py-2 text-left cursor-pointer hover:bg-gray-700/50" onClick={() => { setPlayerOrderBy("abilityScore"); setPlayerSort(playerSort === "asc" ? "desc" : "asc"); }}>Ability</th>
              <th className="px-2 py-2 text-left cursor-pointer hover:bg-gray-700/50" onClick={() => { setPlayerOrderBy("damageDealt"); setPlayerSort(playerSort === "asc" ? "desc" : "asc"); }}>Damage</th>
              <th className="px-2 py-2 text-left cursor-pointer hover:bg-gray-700/50" onClick={() => { setPlayerOrderBy("damageDealt"); setPlayerSort(playerSort === "asc" ? "desc" : "asc"); }}>DPS</th>
              <th className="px-2 py-2 text-left cursor-pointer hover:bg-gray-700/50" onClick={() => { setPlayerOrderBy("healDealt"); setPlayerSort(playerSort === "asc" ? "desc" : "asc"); }}>Heal</th>
              <th className="px-2 py-2 text-left cursor-pointer hover:bg-gray-700/50" onClick={() => { setPlayerOrderBy("healDealt"); setPlayerSort(playerSort === "asc" ? "desc" : "asc"); }}>HPS</th>
              <th className="px-2 py-2 text-left cursor-pointer hover:bg-gray-700/50" onClick={() => { setPlayerOrderBy("damageTaken"); setPlayerSort(playerSort === "asc" ? "desc" : "asc"); }}>Taken</th>
            </tr>
          </thead>
          <tbody>
            {sortedActors.map((a: ActorRow) => {
              const dps = Math.round(a.damageDealt / Math.max(1, Math.floor(ms / 1000)));
              const hps = Math.round(a.healDealt / Math.max(1, Math.floor(ms / 1000)));
              return (
                <tr key={a.actorId} className="hover:bg-gray-800/40 cursor-pointer">
                  <td className="px-2 py-1">{a.name || 'Unknown'}</td>
                  <td className="px-2 py-1">
                    {a.classId ? (
                      <img
                        className="w-6 h-6 rounded bg-gray-700"
                        src={`/images/classes/${getClassIconName(a.classId as any)}`}
                        alt="class"
                        title={getClassTooltip(a.classId as any, a.classSpec as any)}
                      />
                    ) : (
                      '-'
                    )}
                  </td>
                  <td className="px-2 py-1">{a.abilityScore ?? '-'}</td>
                  <td className="px-2 py-1">{a.damageDealt.toLocaleString()}</td>
                  <td className="px-2 py-1">{dps}</td>
                  <td className="px-2 py-1">{a.healDealt.toLocaleString()}</td>
                  <td className="px-2 py-1">{hps}</td>
                  <td className="px-2 py-1">{a.damageTaken.toLocaleString()}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* skill breakdown removed (server endpoint not available) */}
    </div>
  );
}

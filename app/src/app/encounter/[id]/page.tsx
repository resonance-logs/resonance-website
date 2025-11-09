"use client";
import { useEffect, useState } from "react";
import { fetchEncounterById } from "@/api/encounter";
import { useParams } from "next/navigation";

export default function EncounterStandaloneDetail() {
  const params = useParams();
  const id = params?.id as string;
  const [encounter, setEncounter] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    fetchEncounterById(id)
      .then(setEncounter)
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="max-w-6xl mx-auto py-8 text-white">Loading…</div>;
  if (!encounter) return <div className="max-w-6xl mx-auto py-8 text-white">Encounter not found.</div>;

  const ms = encounter.durationMs as number;
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const sec = s % 60;
  const durationFmt = `${m}:${sec.toString().padStart(2, "0")}`;

  return (
    <div className="max-w-7xl mx-auto py-8 text-white">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Encounter #{encounter.id}</h1>
        <a href="/leaderboard/encounter" className="text-purple-400 hover:underline text-sm">Back</a>
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
              <th className="px-2 py-2 text-left">Name</th>
              <th className="px-2 py-2 text-left">Damage</th>
              <th className="px-2 py-2 text-left">DPS</th>
              <th className="px-2 py-2 text-left">Heal</th>
              <th className="px-2 py-2 text-left">HPS</th>
              <th className="px-2 py-2 text-left">Taken</th>
            </tr>
          </thead>
          <tbody>
            {encounter.actors.map((a: any) => {
              const dps = Math.round(a.damageDealt / Math.max(1, Math.floor(encounter.durationMs / 1000)));
              const hps = Math.round(a.healDealt / Math.max(1, Math.floor(encounter.durationMs / 1000)));
              return (
                <tr key={a.actorId} className="hover:bg-gray-800/40">
                  <td className="px-2 py-1">{a.name || 'Unknown'}</td>
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
    </div>
  );
}

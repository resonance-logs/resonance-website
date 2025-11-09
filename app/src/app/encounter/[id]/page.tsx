"use client";

import { useMemo } from "react";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { fetchEncounterById } from "@/api/encounter/encounter";
import { Encounter } from "@/types/commonTypes";

export default function EncounterStandaloneDetail() {
  const params = useParams();
  const id = params?.id as string;

  const { data, isLoading, error } = useQuery<{ encounter: Encounter }, Error>({
    queryKey: ["encounter", id],
    queryFn: () => fetchEncounterById(id),
    enabled: !!id,
  });

  const encounter = data?.encounter || null;

  if (isLoading) return <div className="max-w-6xl mx-auto py-8 text-white">Loading…</div>;
  if (!encounter || error) return <div className="max-w-6xl mx-auto py-8 text-white">Encounter not found.</div>;

  const ms = useMemo(() => {
    const started = new Date(encounter.startedAt).getTime();
    const ended = encounter.endedAt ? new Date(encounter.endedAt).getTime() : undefined;
    return (encounter as any).durationMs ?? (ended ? ended - started : Math.max(1, Date.now() - started));
  }, [encounter]);

  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const sec = s % 60;
  const durationFmt = `${m}:${sec.toString().padStart(2, "0")}`;

  return (
    <div className="max-w-7xl mx-auto py-8 text-white">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Encounter #{encounter.id}</h1>
        <Link href="/leaderboard/encounter" className="text-purple-400 hover:underline text-sm">Back</Link>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 text-sm">
        <div className="bg-gray-800/40 rounded p-3"><div className="text-gray-400 mb-1">Scene</div><div>{encounter.sceneName || '-'}</div></div>
        <div className="bg-gray-800/40 rounded p-3"><div className="text-gray-400 mb-1">Duration</div><div>{durationFmt}</div></div>
        <div className="bg-gray-800/40 rounded p-3"><div className="text-gray-400 mb-1">Total Damage</div><div>{(encounter.totalDmg ?? 0).toLocaleString()}</div></div>
        <div className="bg-gray-800/40 rounded p-3"><div className="text-gray-400 mb-1">Total Healing</div><div>{(encounter.totalHeal ?? 0).toLocaleString()}</div></div>
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
            {(encounter.players ?? []).map((a) => {
              const dps = Math.round((a.damageDealt ?? 0) / Math.max(1, Math.floor(ms / 1000)));
              const hps = Math.round((a.healDealt ?? 0) / Math.max(1, Math.floor(ms / 1000)));
              return (
                <tr key={a.actorId} className="hover:bg-gray-800/40">
                  <td className="px-2 py-1">{a.name || 'Unknown'}</td>
                  <td className="px-2 py-1">{(a.damageDealt ?? 0).toLocaleString()}</td>
                  <td className="px-2 py-1">{dps}</td>
                  <td className="px-2 py-1">{(a.healDealt ?? 0).toLocaleString()}</td>
                  <td className="px-2 py-1">{hps}</td>
                  <td className="px-2 py-1">{(a.damageTaken ?? 0).toLocaleString()}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

"use client";

import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import {
  fetchEncounterById,
  FetchEncounterByIdResponse,
  getPlayerSkillStats,
  GetPlayerSkillStatsResponse,
} from "@/api/encounter/encounter";
import { formatDuration, getDuration } from "@/utils/timeFormat";
import { formatNumber } from "@/utils/numberFormatter";

export default function EncounterPlayerDetail() {
  const params = useParams();
  const id = params?.id as string;
  const playerId = params?.playerId as string;

  const { data, isLoading, error } = useQuery<FetchEncounterByIdResponse>({
    queryKey: ["encounter", id],
    queryFn: () => fetchEncounterById(id),
    enabled: !!id,
  });

  const { data: playerStats, isLoading: statsLoading } = useQuery<GetPlayerSkillStatsResponse>({
    queryKey: ["encounter", id, "player", playerId],
    queryFn: () => getPlayerSkillStats(id, playerId),
    enabled: !!id && !!playerId,
  });

  const encounter = data?.encounter ?? null;
  const durationMs = encounter ? getDuration(encounter.startedAt, encounter.endedAt) : 0;
  const durationSec = Math.max(1, Math.floor(durationMs / 1000));

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto py-8 text-white">
        <div className="mb-6 h-8 bg-gray-700 rounded animate-pulse w-48"></div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {Array.from({ length: 4 }).map((_, idx) => (
            <div key={idx} className="h-20 bg-gray-700 rounded animate-pulse"></div>
          ))}
        </div>
        <div className="h-64 bg-gray-700 rounded animate-pulse"></div>
      </div>
    );
  }

  if (!encounter || error) {
    return (
      <div className="max-w-6xl mx-auto py-8 text-white">
        <div className="rounded-2xl border border-gray-800 bg-gray-900/60 p-12 text-center">
          <h2 className="text-xl font-semibold mb-2">Encounter not found</h2>
          <p className="text-gray-400 mb-4">The encounter you&apos;re looking for doesn&apos;t exist or has been removed.</p>
          <Link href="/leaderboard/encounter" className="text-purple-400 hover:text-purple-300 underline">
            Back to leaderboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto py-8 text-white">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Encounter #{encounter.id}</h1>
        <Link href="/leaderboard/encounter" className="text-purple-400 hover:underline text-sm">
          Back
        </Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 text-sm">
        <div className="bg-gray-800/40 rounded p-3">
          <div className="text-gray-400 mb-1">Scene</div>
          <div>{encounter.sceneName || "-"}</div>
        </div>
        <div className="bg-gray-800/40 rounded p-3">
          <div className="text-gray-400 mb-1">Duration</div>
          <div>{formatDuration(encounter.startedAt, encounter.endedAt)}</div>
        </div>
        <div className="bg-gray-800/40 rounded p-3">
          <div className="text-gray-400 mb-1">Total Damage</div>
          <div>{formatNumber(encounter.totalDmg ?? 0)}</div>
        </div>
        <div className="bg-gray-800/40 rounded p-3">
          <div className="text-gray-400 mb-1">Total Healing</div>
          <div>{formatNumber(encounter.totalHeal ?? 0)}</div>
        </div>
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
            {(encounter.players ?? []).map((player) => {
              const dps = formatNumber(Math.round((player.damageDealt ?? 0) / durationSec));
              const hps = formatNumber(Math.round((player.healDealt ?? 0) / durationSec));

              const isCurrent = String(player.actorId) === String(playerId);

              return (
                <tr key={player.actorId} className={`hover:bg-gray-800/40 ${isCurrent ? 'bg-gray-800/30' : ''}`}>
                  <td className="px-2 py-1 text-purple-400">{player.name || "Unknown"}</td>
                  <td className="px-2 py-1">{formatNumber(player.damageDealt ?? 0)}</td>
                  <td className="px-2 py-1">{dps}</td>
                  <td className="px-2 py-1">{formatNumber(player.healDealt ?? 0)}</td>
                  <td className="px-2 py-1">{hps}</td>
                  <td className="px-2 py-1">{formatNumber(player.damageTaken ?? 0)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <h2 className="text-xl font-semibold mb-3">Player Skill Stats</h2>

      {statsLoading && (
        <div className="text-gray-400 mb-4">Loading player skill stats...</div>
      )}

      {playerStats && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="border border-gray-700 rounded-lg p-4">
            <h3 className="font-semibold mb-3">Damage Skill Stats</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full text-xs">
                <thead className="bg-gray-800/50">
                  <tr>
                    <th className="px-2 py-2 text-left">Skill</th>
                    <th className="px-2 py-2 text-left">Hits</th>
                    <th className="px-2 py-2 text-left">Total</th>
                    <th className="px-2 py-2 text-left">Crits</th>
                  </tr>
                </thead>
                <tbody>
                  {(playerStats.damageSkillStats ?? []).map((s) => (
                    <tr key={s.id} className="hover:bg-gray-800/40">
                      <td className="px-2 py-1">{s.skillId}</td>
                      <td className="px-2 py-1">{s.hits}</td>
                      <td className="px-2 py-1">{formatNumber(s.totalValue)}</td>
                      <td className="px-2 py-1">{s.critHits}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="border border-gray-700 rounded-lg p-4">
            <h3 className="font-semibold mb-3">Heal Skill Stats</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full text-xs">
                <thead className="bg-gray-800/50">
                  <tr>
                    <th className="px-2 py-2 text-left">Skill</th>
                    <th className="px-2 py-2 text-left">Hits</th>
                    <th className="px-2 py-2 text-left">Total</th>
                    <th className="px-2 py-2 text-left">Crits</th>
                  </tr>
                </thead>
                <tbody>
                  {(playerStats.healSkillStats ?? []).map((s) => (
                    <tr key={s.id} className="hover:bg-gray-800/40">
                      <td className="px-2 py-1">{s.skillId}</td>
                      <td className="px-2 py-1">{s.hits}</td>
                      <td className="px-2 py-1">{formatNumber(s.totalValue)}</td>
                      <td className="px-2 py-1">{s.critHits}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

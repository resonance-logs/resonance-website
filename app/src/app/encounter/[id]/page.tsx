"use client";

import { useParams } from "next/navigation";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { fetchEncounterById, FetchEncounterByIdResponse } from "@/api/encounter/encounter";
import { formatDuration, getDuration } from "@/utils/timeFormat";
import { formatNumber } from "@/utils/numberFormatter";
import SkillStats from "@/components/ui/SkillStats";

export default function EncounterStandaloneDetail() {
  const params = useParams();
  const id = params?.id as string;

  const { data, isLoading, error } = useQuery<FetchEncounterByIdResponse>({
    queryKey: ["encounter", id],
    queryFn: () => fetchEncounterById(id),
    enabled: !!id,
  });

  // Derived values
  const encounter = data?.encounter ?? null;
  const durationMs = encounter ? getDuration(encounter.startedAt, encounter.endedAt) : 0;
  const durationSec = Math.max(1, durationMs / 1000);

  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto py-8 px-4 text-white">
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
      <div className="max-w-7xl mx-auto py-8 px-4 text-white">
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

  const totalDamage = encounter.totalDmg ?? 0;

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 text-white">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Encounter #{encounter.id}</h1>
        <Link href="/leaderboard/encounter" className="text-purple-400 hover:underline text-sm">
          Back to leaderboard
        </Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 text-sm">
        <div className="bg-gray-800/40 rounded p-3">
          <div className="text-gray-400 mb-1">Scene</div>
          <div>{encounter.sceneName || '-'}</div>
        </div>
        <div className="bg-gray-800/40 rounded p-3">
          <div className="text-gray-400 mb-1">Duration</div>
          <div>{formatDuration(encounter.startedAt, encounter.endedAt)}</div>
        </div>
        <div className="bg-gray-800/40 rounded p-3">
          <div className="text-gray-400 mb-1">Total Damage</div>
          <div>{formatNumber(totalDamage)}</div>
        </div>
        <div className="bg-gray-800/40 rounded p-3">
          <div className="text-gray-400 mb-1">Total Healing</div>
          <div>{formatNumber(encounter.totalHeal ?? 0)}</div>
        </div>
      </div>

      <h2 className="text-xl font-semibold mb-3">Players</h2>
      <div className="rounded-lg border border-gray-800 bg-gray-900/40 mb-8 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-800/50">
              <tr className="border-b border-gray-800">
                <th className="text-left px-6 py-3 font-semibold text-gray-300">Name</th>
                <th className="text-right px-6 py-3 font-semibold text-gray-300">Ability Score</th>
                <th className="text-right px-6 py-3 font-semibold text-gray-300">Damage</th>
                <th className="text-right px-6 py-3 font-semibold text-gray-300">D%</th>
                <th className="text-right px-6 py-3 font-semibold text-gray-300">DPS</th>
                <th className="text-right px-6 py-3 font-semibold text-gray-300">Heal</th>
                <th className="text-right px-6 py-3 font-semibold text-gray-300">HPS</th>
                <th className="text-right px-6 py-3 font-semibold text-gray-300">Taken</th>
                <th className="text-right px-6 py-3 font-semibold text-gray-300">Hits Dealt</th>
                <th className="text-right px-6 py-3 font-semibold text-gray-300">Hits Heal</th>
                <th className="text-right px-6 py-3 font-semibold text-gray-300">Hits Taken</th>
              </tr>
            </thead>
            <tbody>
              {(encounter.players ?? [])
                .sort((a, b) => {
                  const damagePercentA = totalDamage > 0 ? ((a.damageDealt ?? 0) / totalDamage) * 100 : 0;
                  const damagePercentB = totalDamage > 0 ? ((b.damageDealt ?? 0) / totalDamage) * 100 : 0;
                  return damagePercentB - damagePercentA; // Descending order
                })
                .map((player) => {
                const dps = (player.damageDealt ?? 0) / durationSec;
                const hps = (player.healDealt ?? 0) / durationSec;
                const damagePercent = totalDamage > 0 ? ((player.damageDealt ?? 0) / totalDamage) * 100 : 0;
                const playerIdStr = String(player.actorId);
                const isSelected = selectedPlayerId === playerIdStr;

                return (
                  <tr
                    key={player.actorId}
                    role="button"
                    tabIndex={0}
                    onClick={() => setSelectedPlayerId((p) => (p === playerIdStr ? null : playerIdStr))}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        setSelectedPlayerId((p) => (p === playerIdStr ? null : playerIdStr));
                      }
                    }}
                    className={`border-b border-gray-800/50 cursor-pointer transition-colors ${
                      isSelected ? 'bg-purple-900/20' : 'hover:bg-gray-800/40'
                    }`}
                  >
                    <td className="px-6 py-3 text-purple-400 font-medium">{player.name || "Unknown"}</td>
                    <td className="px-6 py-3 text-right text-gray-300">{player.abilityScore ?? '-'}</td>
                    <td className="px-6 py-3 text-right">{formatNumber(player.damageDealt ?? 0)}</td>
                    <td className="px-6 py-3 text-right text-yellow-400">{damagePercent.toFixed(1)}%</td>
                    <td className="px-6 py-3 text-right text-red-400">{formatNumber(Math.round(dps))}</td>
                    <td className="px-6 py-3 text-right">{formatNumber(player.healDealt ?? 0)}</td>
                    <td className="px-6 py-3 text-right text-green-400">{formatNumber(Math.round(hps))}</td>
                    <td className="px-6 py-3 text-right text-orange-400">{formatNumber(player.damageTaken ?? 0)}</td>
                    <td className="px-6 py-3 text-right text-gray-400">{formatNumber(player.hitsDealt ?? 0)}</td>
                    <td className="px-6 py-3 text-right text-gray-400">{formatNumber(player.hitsHeal ?? 0)}</td>
                    <td className="px-6 py-3 text-right text-gray-400">{formatNumber(player.hitsTaken ?? 0)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Skill stats for selected player (click a player row to load) */}
      {selectedPlayerId && (() => {
        const selectedPlayer = encounter.players?.find(p => String(p.actorId) === selectedPlayerId);
        return (
          <div className="mb-8">
            <SkillStats
              encounterId={id}
              playerId={selectedPlayerId}
              durationSec={durationSec}
              classId={selectedPlayer?.classId ?? undefined}
              classSpec={selectedPlayer?.classSpec ?? undefined}
              showTitle={true}
              playerName={selectedPlayer?.name || 'Player'}
            />
          </div>
        );
      })()}
    </div>
  );
}

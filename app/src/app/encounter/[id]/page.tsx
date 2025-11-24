"use client";

import { useParams } from "next/navigation";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import Image from "next/image"
import { fetchEncounterById, FetchEncounterByIdResponse } from "@/api/encounter/encounter";
import { formatDuration, getDuration } from "@/utils/timeFormat";
import { formatNumber } from "@/utils/numberFormatter";
import SkillStats from "@/components/ui/SkillStats";
import SkillTimelineChart from "@/components/ui/SkillTimelineChart";
import DpsOverTimeChart from "@/components/ui/DpsOverTimeChart";
import TableRowGlow from "@/components/ui/TableRowGlow";
import { CLASS_MAP, getClassIconName, getClassTooltip } from "@/utils/classData";
import { Tooltip } from 'antd'
import { calculateAllPlayerStats } from "@/utils/encounterStats";

export default function EncounterStandaloneDetail() {
  const params = useParams();
  const id = params?.id as string;

  const { data, isLoading, error } = useQuery<FetchEncounterByIdResponse>({
    queryKey: ["encounter", id],
    queryFn: () => fetchEncounterById(id),
  });

  // Derived values
  const encounter = data?.encounter ?? null;
  const durationMs = encounter ? getDuration(encounter.startedAt, encounter.endedAt) : 0;
  const durationSec = Math.max(1, durationMs / 1000);

  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<{ start: number; end: number } | null>(null);

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto py-8 px-4 text-white">
        {/* Header Skeleton */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-6">
            <div>
              <div className="h-9 bg-gray-700 rounded animate-pulse w-56 mb-3"></div>
              <div className="flex items-center gap-6">
                <div className="h-4 bg-gray-700 rounded animate-pulse w-32"></div>
                <div className="h-4 bg-gray-700 rounded animate-pulse w-24"></div>
                <div className="h-4 bg-gray-700 rounded animate-pulse w-20"></div>
              </div>
            </div>
            <div className="h-9 bg-gray-700 rounded animate-pulse w-48"></div>
          </div>
          {/* Stats Bar Skeleton */}
          <div className="flex items-center gap-8 border-l-2 border-purple-500/50 pl-4 py-2">
            <div className="h-4 bg-gray-700 rounded animate-pulse w-36"></div>
            <div className="h-4 bg-gray-700 rounded animate-pulse w-36"></div>
            <div className="h-4 bg-gray-700 rounded animate-pulse w-32"></div>
          </div>
        </div>

        {/* Players Section Skeleton */}
        <div className="h-6 bg-gray-700 rounded animate-pulse w-20 mb-3"></div>
        <div className="h-96 bg-gray-700/40 rounded-lg animate-pulse"></div>
      </div>
    );
  }

  if (!encounter || error) {
    return (
      <div className="max-w-7xl mx-auto py-8 px-4 text-white">
        <div className="rounded-2xl border border-gray-800 bg-gray-900/60 p-12 text-center">
          <h2 className="text-xl font-semibold mb-2">Encounter not found</h2>
          <p className="text-gray-400 mb-4">The encounter you&apos;re looking for doesn&apos;t exist or has been removed.</p>
        </div>
      </div>
    );
  }

  // Player convenience values used in the table
  const players = encounter.players ?? [];

  // Calculate filtered stats based on time range
  const filteredPlayerStats = calculateAllPlayerStats(
    players,
    data?.damageSkillStats ?? [],
    data?.healSkillStats ?? [],
    timeRange,
    durationSec
  );

  // Calculate total damage for the filtered range
  const filteredTotalDamage = Array.from(filteredPlayerStats.values()).reduce(
    (sum, stats) => sum + stats.damageDealt,
    0
  );

  const maxDamagePlayer = Array.from(filteredPlayerStats.values()).reduce(
    (max, stats) => Math.max(max, stats.damageDealt),
    0
  );

  const sortedPlayers = [...players].sort((a, b) => {
    const statsA = filteredPlayerStats.get(a.actorId);
    const statsB = filteredPlayerStats.get(b.actorId);
    const damageA = statsA?.damageDealt ?? 0;
    const damageB = statsB?.damageDealt ?? 0;
    return damageB - damageA;
  });

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 text-white">
      {/* Header Section */}
      <div className="mb-8">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold mb-2">
              Encounter #{encounter.id}
            </h1>
            <div className="flex items-center gap-6 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-gray-400">Scene:</span>
                <span className="text-white font-medium">{encounter.sceneName || 'Unknown'}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-400">Duration:</span>
                <span className="text-white font-medium">{formatDuration(encounter.startedAt, encounter.endedAt)}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-400">Players:</span>
                <span className="text-white font-medium">{players.length}</span>
              </div>
            </div>
          </div>

          {/* Uploaded By Section */}
          {encounter.user && (
            <div className="flex items-center gap-3">
              <span className="text-gray-400 text-sm">Uploaded by:</span>
              <div className="flex items-center gap-2">
                {encounter.user.discord_avatar_url ? (
                  <Image
                    src={encounter.user.discord_avatar_url}
                    alt={encounter.user.discord_global_name || encounter.user.discord_username}
                    width={28}
                    height={28}
                    className="rounded-full"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-linear-to-br from-purple-500 to-blue-500 flex items-center justify-center text-xs font-semibold">
                    {(encounter.user.discord_global_name || encounter.user.discord_username).charAt(0).toUpperCase()}
                  </div>
                )}
                <span className="font-medium text-white">
                  {encounter.user.discord_global_name || encounter.user.discord_username}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Compact Stats Bar */}
        <div className="flex items-center gap-8 text-sm border-l-2 border-purple-500/50 pl-4 py-2">
          <div className="flex items-center gap-2">
            <span className="text-gray-400">Total Damage:</span>
            <span className="text-red-400 font-semibold">{formatNumber(filteredTotalDamage)}</span>
            {timeRange && <span className="text-gray-500 text-xs ml-1">(filtered)</span>}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-400">Total Healing:</span>
            <span className="text-green-400 font-semibold">
              {formatNumber(
                Array.from(filteredPlayerStats.values()).reduce((sum, stats) => sum + stats.healDealt, 0)
              )}
            </span>
            {timeRange && <span className="text-gray-500 text-xs ml-1">(filtered)</span>}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-400">Group DPS:</span>
            <span className="text-orange-400 font-semibold">
              {formatNumber(Math.round(filteredTotalDamage / (timeRange ? (timeRange.end - timeRange.start) : durationSec)))}
            </span>
            {timeRange && <span className="text-gray-500 text-xs ml-1">(filtered)</span>}
          </div>
        </div>
      </div>

      <h2 className="text-xl font-semibold mb-3">Players</h2>
      <div className="rounded-lg border border-gray-800 bg-gray-900/40 mb-8 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-800/50">
            <tr className="border-b border-gray-800">
              <th className="text-left px-6 py-3 font-semibold text-gray-300">Name</th>
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
            {sortedPlayers.map((player) => {
              const stats = filteredPlayerStats.get(player.actorId);
              const damageDealt = stats?.damageDealt ?? 0;
              const damagePercent = filteredTotalDamage > 0 ? (damageDealt / filteredTotalDamage) * 100 : 0;
              // Percentage relative to top damage among players
              const relativeToTop = maxDamagePlayer > 0 ? (damageDealt / maxDamagePlayer) * 100 : damagePercent;
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
                    className={`relative border-b border-gray-800/50 cursor-pointer transition-colors ${
                      isSelected ? 'hover:bg-gray-800/40' : 'hover:bg-gray-800/40'
                    }`}
                >
                  <td className="px-6 py-3 text-white font-medium relative">
                    <div className="flex items-center gap-2">
                      <Tooltip title={getClassTooltip(player.classId ?? undefined, player.classSpec ?? undefined)} placement="top">
                        <div className="w-6 h-6 relative rounded-full overflow-hidden">
                          <Image
                            src={`/images/classes/${getClassIconName(player.classId ?? undefined)}`}
                            alt={CLASS_MAP[player.classId ?? 0] ?? 'class'}
                            fill
                            style={{ objectFit: 'cover' }}
                          />
                        </div>
                      </Tooltip>
                      <div className="flex items-baseline">
                        <span className="mr-2">{player.name || "Unknown"}</span>
                        <span className="text-gray-400 text-xs">{formatNumber(player.abilityScore ?? 0)}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-3 text-right">{formatNumber(stats?.damageDealt ?? 0)}</td>
                  <td className="px-6 py-3 text-right">{damagePercent.toFixed(1)}%</td>
                  <td className="px-6 py-3 text-right">{formatNumber(Math.round(stats?.dps ?? 0))}</td>
                  <td className="px-6 py-3 text-right">{formatNumber(stats?.healDealt ?? 0)}</td>
                  <td className="px-6 py-3 text-right">{formatNumber(Math.round(stats?.hps ?? 0))}</td>
                  <td className="px-6 py-3 text-right">{formatNumber(stats?.damageTaken ?? 0)}</td>
                  <td className="px-6 py-3 text-right">{formatNumber(stats?.hitsDealt ?? 0)}</td>
                  <td className="px-6 py-3 text-right">{formatNumber(stats?.hitsHeal ?? 0)}</td>
                  <td className="px-6 py-3 text-right">{formatNumber(stats?.hitsTaken ?? 0)}</td>
                  <TableRowGlow className={CLASS_MAP[player.classId ?? 0] ?? ''} percentage={relativeToTop}/>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mb-8">
        <DpsOverTimeChart
          players={players}
          damageSkillStats={data?.damageSkillStats}
          healSkillStats={data?.healSkillStats}
          durationMs={durationMs}
          dungeonSegments={encounter.dungeonSegments}
          encounterStartedAt={encounter.startedAt}
          onRangeChange={setTimeRange}
        />
      </div>

      {/* Skill stats for selected player (click a player row to load) */}
      {selectedPlayerId && (() => {
        const selectedPlayer = encounter.players?.find(p => String(p.actorId) === selectedPlayerId);
        const pid = Number(selectedPlayerId);
        const preloadedDamage = (data?.damageSkillStats ?? []).filter(s => s.attackerId === pid);
        const preloadedHeal = (data?.healSkillStats ?? []).filter(s => s.healerId === pid);
        return (
          <div className="mb-8 space-y-6">
            <SkillStats
              encounterId={id}
              playerId={selectedPlayerId}
              durationSec={timeRange ? (timeRange.end - timeRange.start) : durationSec}
              classId={selectedPlayer?.classId ?? undefined}
              showTitle={true}
              playerName={selectedPlayer?.name || 'Player'}
              damageSkillStats={preloadedDamage}
              healSkillStats={preloadedHeal}
              timeRange={timeRange}
            />
            <SkillTimelineChart
              playerId={selectedPlayerId}
              playerName={selectedPlayer?.name || 'Player'}
              durationMs={durationMs}
              damageSkillStats={data?.damageSkillStats}
              healSkillStats={data?.healSkillStats}
              timeRange={timeRange}
            />
          </div>
        );
      })()}
    </div>
  );
}

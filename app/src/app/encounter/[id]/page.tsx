"use client";

import { useParams } from "next/navigation";
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import Image from "next/image"
import { fetchEncounterById, FetchEncounterByIdResponse } from "@/api/encounter/encounter";
import { EncounterBuffDto, User } from "@/types/commonTypes";
import { Tooltip } from 'antd';
import { formatDuration, formatRelativeTime } from "@/utils/timeFormat";
import { formatDate } from "@/utils/formatDate";
import { formatNumber } from "@/utils/numberFormatter";
import SkillStats from "@/components/ui/SkillStats";
import SkillTimelineChart from "@/components/ui/SkillTimelineChart";
import DpsOverTimeChart from "@/components/ui/DpsOverTimeChart";
import PlayerSkillBreakdownChart from "@/components/ui/PlayerSkillBreakdownChart";
import EncounterTableRow from '@/components/ui/EncounterTableRow';
import { calculateAllPlayerStats } from "@/utils/encounterStats";
import { UploaderAvatar, getUploaderName } from "@/components/ui/UploaderAvatar";
import SceneData from "@/data/SceneData.json";

export default function EncounterStandaloneDetail() {
  const params = useParams();
  const id = params?.id as string;

  const { data, isLoading, error } = useQuery<FetchEncounterByIdResponse>({
    queryKey: ["encounter", id],
    queryFn: () => fetchEncounterById(id),
    retry: 0,
    refetchOnMount: false,
  });

  // Helper: group buff events by stackCount and compute per-stack stats
  const getBuffStacks = (buff: EncounterBuffDto) => {
    const map = new Map<number, { stackCount: number; casts: number; totalDurationMs: number }>();
    for (const ev of buff.events || []) {
      const sc = ev.stackCount ?? 0;
      const entry = map.get(sc);
      if (entry) {
        entry.casts += 1;
        entry.totalDurationMs += ev.durationMs ?? 0;
      } else {
        map.set(sc, { stackCount: sc, casts: 1, totalDurationMs: ev.durationMs ?? 0 });
      }
    }
    return Array.from(map.values()).sort((a, b) => a.stackCount - b.stackCount);
  };

  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<{ start: number; end: number }>({ start: 0, end: 0 });
  const [activeTab, setActiveTab] = useState<'dps' | 'buffs' | 'skills' | 'timeline' | 'breakdown'>('dps');

  // Handler for player selection - switches to skills tab
  const handlePlayerSelect = (playerIdStr: string) => {
    if (selectedPlayerId === playerIdStr) {
      setSelectedPlayerId(null);
    } else {
      setSelectedPlayerId(playerIdStr);
      setActiveTab('skills');
    }
  };

  const filteredPlayerStats = useMemo(() => {
    return calculateAllPlayerStats(
      timeRange,
      data,
    );
  }, [data, timeRange]);

  // helpers for boss name and uploaded time
  const bossName = data?.encounter?.bosses && data.encounter.bosses.length > 0 ? data.encounter.bosses[0].monsterName : null;
  const uploadedAtRaw = (((data?.encounter as unknown) as { createdAt?: string | undefined })?.createdAt) ?? data?.encounter?.startedAt;

  const uploadedRelative = formatRelativeTime(uploadedAtRaw as string | Date | number | null);
  const formatFullDate = (iso?: string) => (iso ? formatDate(iso as string | Date, 'short') : '');

  // Determine difficulty suffix
  const difficultySuffix = useMemo(() => {
    if (!data?.encounter?.sceneId || !data?.encounter?.bosses?.[0]?.maxHp) return '';

    const sceneInfo = (SceneData as any)[String(data.encounter.sceneId)];
    const values = sceneInfo?.boss?.values as number[] | undefined;

    if (values) {
      const idx = values.indexOf(data.encounter.bosses[0].maxHp);
      if (idx !== -1) {
        return ` ${idx + 1}`;
      }
    }
    return '';
  }, [data]);

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

  if (!data?.encounter || error) {
    return (
      <div className="max-w-7xl mx-auto py-8 px-4 text-white">
        <div className="rounded-2xl border border-gray-800 bg-gray-900/60 p-12 text-center">
          <h2 className="text-xl font-semibold mb-2">Encounter not found</h2>
          <p className="text-gray-400 mb-4">The encounter you&apos;re looking for doesn&apos;t exist or has been removed.</p>
        </div>
      </div>
    );
  }

  // Calculate total damage for the filtered range from state
  const filteredTotalDamage = Array.from(filteredPlayerStats.values()).reduce((sum, stats) => sum + stats.damageDealt, 0);

  const maxDamagePlayer = Array.from(filteredPlayerStats.values()).reduce((max, stats) => Math.max(max, stats.damageDealt), 0);

  const sortedPlayers = [...(data?.encounter?.players || [])].sort((a, b) => {
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
              Encounter #{data?.encounter.id}
            </h1>
            <div className="flex items-center gap-6 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-gray-400">Scene:</span>
                <span className="text-white font-medium">
                  {data?.encounter.sceneName || 'Unknown'}
                  {difficultySuffix}
                </span>
                {bossName && (
                  <div className="ml-4 flex items-center gap-2">
                    <span className="text-gray-400">Boss:</span>
                    <span className="text-white font-medium">{bossName}</span>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-400">Duration:</span>
                <span className="text-white font-medium">{formatDuration(data?.encounter.startedAt, data?.encounter.endedAt)}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-400">Players:</span>
                <span className="text-white font-medium">{(data?.encounter?.players || []).length}</span>
              </div>
            </div>
          </div>

          {/* Uploaded By Section */}
          {data?.encounter.user && (
            <div className="flex flex-col items-end">
              <div className="flex items-center gap-3">
                <span className="text-gray-400 text-sm">Uploaded by:</span>

                <div className="flex items-center gap-2">
                  <UploaderAvatar user={data.encounter.user} size={28} />
                  <span className="font-medium text-white">{getUploaderName(data.encounter.user)}</span>
                </div>

                {/* Co-owners */}
                {data.encounter.owners && data.encounter.owners.length > 0 &&
                  data.encounter.owners.some(o => o.userId !== data.encounter.user?.id) && (
                    <div className="flex items-center -space-x-2 pl-2 border-l border-gray-700 ml-2 py-1">
                      {data.encounter.owners
                        .filter(o => o.userId !== data.encounter.user?.id)
                        .slice(0, 5)
                        .map(o => {
                          const u = o.user || ({
                            id: o.userId,
                            discord_username: "Anonymous",
                            discord_user_id: "",
                            role: "user",
                            created_at: "",
                            updated_at: "",
                            anonymize_uploader: true,
                          } as User);
                          return (
                            <div key={u.id} className="relative transition-transform hover:z-20 hover:scale-110 ring-2 ring-gray-900 rounded-full bg-gray-900">
                              <Tooltip title={`Co-owner: ${getUploaderName(u)}`}>
                                <div>
                                  <UploaderAvatar user={u} size={24} />
                                </div>
                              </Tooltip>
                            </div>
                          )
                        })}
                    </div>
                  )}
              </div>
            </div>
          )}
        </div>

        {/* Compact Stats Bar */}

        {/* Compact Stats Bar */}
        <div className="flex items-center gap-8 text-sm border-l-2 border-purple-500/50 pl-4 py-2">
          <div className="flex items-center gap-2">
            <span className="text-gray-400">Total Damage:</span>
            <span className="text-red-400 font-semibold">{formatNumber(filteredTotalDamage)}</span>

          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-400">Total Healing:</span>
            <span className="text-green-400 font-semibold">
              {formatNumber(
                Array.from(filteredPlayerStats.values()).reduce((sum, stats) => sum + stats.healDealt, 0)
              )}
            </span>

          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-400">Group DPS:</span>
            <span className="text-orange-400 font-semibold">
              {formatNumber(Math.round(filteredTotalDamage / (timeRange.end - timeRange.start)))}
            </span>

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
                <EncounterTableRow
                  key={player.actorId}
                  player={player}
                  stats={stats}
                  damagePercent={damagePercent}
                  relativeToTop={relativeToTop}
                  isSelected={isSelected}
                  onToggleSelect={() => handlePlayerSelect(playerIdStr)}
                />
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 mb-4 border-b border-gray-800 pb-2">
        <button
          onClick={() => setActiveTab('dps')}
          className={`px-4 py-2 text-sm font-medium rounded-t transition-colors ${activeTab === 'dps'
            ? 'bg-gray-800 text-white border-b-2 border-purple-500'
            : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
            }`}
        >
          Damage Over Time
        </button>
        <button
          onClick={() => setActiveTab('buffs')}
          className={`px-4 py-2 text-sm font-medium rounded-t transition-colors ${activeTab === 'buffs'
            ? 'bg-gray-800 text-white border-b-2 border-purple-500'
            : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
            }`}
        >
          Buffs
        </button>
        <button
          onClick={() => setActiveTab('skills')}
          className={`px-4 py-2 text-sm font-medium rounded-t transition-colors ${activeTab === 'skills'
            ? 'bg-gray-800 text-white border-b-2 border-purple-500'
            : selectedPlayerId
              ? 'text-gray-400 hover:text-white hover:bg-gray-800/50'
              : 'text-gray-600 cursor-default'
            }`}
        >
          Skill Stats
        </button>
        <button
          onClick={() => setActiveTab('timeline')}
          className={`px-4 py-2 text-sm font-medium rounded-t transition-colors ${activeTab === 'timeline'
            ? 'bg-gray-800 text-white border-b-2 border-purple-500'
            : selectedPlayerId
              ? 'text-gray-400 hover:text-white hover:bg-gray-800/50'
              : 'text-gray-600 cursor-default'
            }`}
        >
          Skill Timeline
        </button>
        <button
          onClick={() => setActiveTab('breakdown')}
          className={`px-4 py-2 text-sm font-medium rounded-t transition-colors ${activeTab === 'breakdown'
            ? 'bg-gray-800 text-white border-b-2 border-purple-500'
            : selectedPlayerId
              ? 'text-gray-400 hover:text-white hover:bg-gray-800/50'
              : 'text-gray-600 cursor-default'
            }`}
        >
          Skill Breakdown
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'dps' && (
        <div className="mb-8">
          <DpsOverTimeChart
            players={data?.encounter?.players || []}
            damageSkillStats={data?.damageSkillStats}
            healSkillStats={data?.healSkillStats}
            durationMs={data?.encounter.duration || 0}
            dungeonSegments={data?.encounter.dungeonSegments}
            encounterStartedAt={data?.encounter.startedAt}
            setTimeRange={setTimeRange}
            timeRange={timeRange}
          />
        </div>
      )}

      {/* Buffs Tab */}
      {activeTab === 'buffs' && (
        <div className="mb-8">
          {data?.encounter_buffs && data.encounter_buffs.length > 0 ? (
            <div className="space-y-4">
              {data.encounter_buffs.map((entity) => {
                const validBuffs = entity.buffs.filter(buff => buff.buffName && buff.buffNameLong);
                if (validBuffs.length === 0) return null;
                return (
                  <div key={entity.entityUid} className="rounded-lg border border-gray-800 bg-gray-900/40 p-4">
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span className="text-sm font-semibold text-white truncate">
                        {entity.entityName}
                      </span>
                      <span className="text-xs text-gray-400">{validBuffs.length} buffs</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {validBuffs.map((buff) =>
                        getBuffStacks(buff).map((s) => {
                          const startMs = data?.encounter?.startedAt ? new Date(data.encounter.startedAt).getTime() : 0;
                          const endMs = data?.encounter?.endedAt ? new Date(data.encounter.endedAt).getTime() : Date.now();
                          const encounterDurationMs = Math.max(1, endMs - startMs);
                          const uptimePct = Math.min(100, Math.round((s.totalDurationMs / encounterDurationMs) * 100));
                          return (
                            <Tooltip key={`${buff.buffId}-${s.stackCount}`} title={buff.buffNameLong || ''} placement="top">
                              <div
                                className="flex flex-col gap-0.5 rounded border border-gray-700 bg-gray-800/60 px-3 py-2 text-xs min-w-[140px] max-w-[200px] cursor-default"
                              >
                                <span className="font-semibold text-white truncate">
                                  {getBuffStacks(buff).length > 1 ? `${buff.buffName} (${s.stackCount})` : buff.buffName}
                                </span>
                                <div className="flex items-center gap-1 text-gray-400">
                                  <span className="text-purple-400">{uptimePct}%</span>
                                  <span>•</span>
                                  <span>{s.casts} casts</span>
                                </div>
                              </div>
                            </Tooltip>
                          );
                        })
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-gray-500 italic">No buff data available</div>
          )}
        </div>
      )}

      {/* Skill Stats Tab */}
      {activeTab === 'skills' && (
        <div className="mb-8">
          {selectedPlayerId ? (() => {
            const selectedPlayer = data?.encounter.players?.find(p => String(p.actorId) === selectedPlayerId);
            const pid = Number(selectedPlayerId);
            const preloadedDamage = (data?.damageSkillStats ?? []).filter(s => s.attackerId === pid);
            const preloadedHeal = (data?.healSkillStats ?? []).filter(s => s.healerId === pid);
            return (
              <SkillStats
                encounterId={id}
                playerId={selectedPlayerId}
                durationSec={(timeRange.end - timeRange.start)}
                classId={selectedPlayer?.classId ?? undefined}
                showTitle={true}
                playerName={selectedPlayer?.name || 'Player'}
                damageSkillStats={preloadedDamage}
                healSkillStats={preloadedHeal}
                timeRange={timeRange}
              />
            );
          })() : (
            <div className="text-center py-12 text-gray-500">
              <p className="text-lg">Please select a player from the table above</p>
              <p className="text-sm mt-2">Click on a player row to view their skill breakdown</p>
            </div>
          )}
        </div>
      )}

      {/* Skill Timeline Tab */}
      {activeTab === 'timeline' && (
        <div className="mb-8">
          {selectedPlayerId ? (() => {
            const selectedPlayer = data?.encounter.players?.find(p => String(p.actorId) === selectedPlayerId);
            return (
              <SkillTimelineChart
                playerId={selectedPlayerId}
                playerName={selectedPlayer?.name || 'Player'}
                durationMs={data?.encounter.duration || 0}
                damageSkillStats={data?.damageSkillStats}
                healSkillStats={data?.healSkillStats}
                timeRange={timeRange}
              />
            );
          })() : (
            <div className="text-center py-12 text-gray-500">
              <p className="text-lg">Please select a player from the table above</p>
              <p className="text-sm mt-2">Click on a player row to view their skill timeline</p>
            </div>
          )}
        </div>
      )}

      {/* Skill Breakdown Tab */}
      {activeTab === 'breakdown' && (
        <div className="mb-8">
          {selectedPlayerId ? (
            <PlayerSkillBreakdownChart
              damageSkillStats={data?.damageSkillStats || []}
              players={data?.encounter?.players || []}
              selectedPlayerId={selectedPlayerId}
            />
          ) : (
            <div className="text-center py-12 text-gray-500">
              <p className="text-lg">Please select a player from the table above</p>
              <p className="text-sm mt-2">Click on a player row to view their skill breakdown</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}


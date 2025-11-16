"use client";

import { useEffect, useState } from "react";
// import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from '@/hooks/useAuth'
import Image from 'next/image';
import AoyiSkillName from '@/data/AoyiSkillName.json';
import SkillIcon from '@/data/SkillIcon.json';
import SkillName from '@/data/SkillName.json';
import { getClassIconName, getClassTooltip, CLASS_MAP } from '@/utils/classData';
// import { GlassCard } from "@/components/landing/GlassCard";
import { fetchEncounters, FetchEncountersParams, FetchEncountersResponse, DEFAULT_FETCH_ENCOUNTERS_PARAMS } from "@/api/encounter/encounter";
import { fetchDetailedPlayerData, GetDetailedPlayerDataResponse } from "@/api/player/player";
import EncounterTable from "@/components/ui/EncounterTable";
import { formatDate, getRelativeTime } from "@/utils/formatDate";

import { keepPreviousData, useQuery } from '@tanstack/react-query'

export default function LogsPage() {
  const params: FetchEncountersParams = DEFAULT_FETCH_ENCOUNTERS_PARAMS;
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  // Redirect to get-started if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/get-started');
    }
  }, [user, authLoading, router]);

  const { data, isLoading } = useQuery<FetchEncountersResponse>({
    queryKey: ["encounters", params, user],
    queryFn: () => fetchEncounters({ ...params, user_id: user?.id || 0}),
    placeholderData: keepPreviousData,
  })

  // Fetch detailed player data for the authenticated user
  const { data: playerDataResponse, isLoading: isLoadingPlayerData } = useQuery<GetDetailedPlayerDataResponse>({
    queryKey: ["detailedPlayerData", user?.id],
    queryFn: () => fetchDetailedPlayerData(),
    enabled: !!user, // Only fetch when user is authenticated
  })

  const rows = data?.encounters || []
  const count = data?.count || 0
  const playerData = playerDataResponse?.playerData || []

  const [selectedProfessionByPlayer, setSelectedProfessionByPlayer] = useState<Record<number, number>>({});

  const skillNameMap = SkillName as Record<string, string>;
  const skillIconMap = SkillIcon as Record<string, string>;
  const aoyiNameMap = AoyiSkillName as Record<string, any>;

  const limit = params.limit || 20
  const offset = params.offset || 0
  const page = Math.max(1, Math.floor(offset / limit) + 1)
  const totalPages = Math.max(1, Math.ceil(count / limit))

  

  return (
    <div className="max-w-7xl mx-auto py-20 px-6 text-white">
      <div className="text-center mb-12 animate-fade-in">
        <div className="inline-flex items-center gap-3 px-6 py-2 rounded-full bg-purple-500/10 border border-purple-500/20 backdrop-blur-md mb-4">
          <div className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
          <p className="text-sm uppercase tracking-[0.35em] text-purple-300 font-semibold">Profile</p>
        </div>
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
          <span className="bg-linear-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
            Dashboard
          </span>
        </h1>
        <p className="text-xl text-gray-300 max-w-2xl mx-auto">
          Recent encounters and combat data
        </p>
      </div>

      {/* Character Cards Section */}
      {playerData.length > 0 && (
        <div className="mb-12">
          <h2 className="text-3xl font-bold text-white mb-6">Your Characters</h2>
          {playerData.map((player) => {
            const charBase = player.charBase;
            if (!charBase) return null;

            // Parse timestamps
            const createDate = charBase.createTime ? new Date(parseInt(charBase.createTime) * 1000) : null;
            const lastOffline = charBase.lastOfflineTime ? new Date(parseInt(charBase.lastOfflineTime) * 1000) : null;

            // Calculate hours from seconds (totalOnlineTime is a string)
            const totalHours = charBase.totalOnlineTime ? (parseInt(charBase.totalOnlineTime) / 3600).toFixed(1) : '0.0';

            // Equipment slot mapping
            const equipSlotNames: Record<number, string> = {
              200: 'Weapon',
              201: 'Helmet',
              202: 'Clothes',
              203: 'Handguards',
              204: 'Shoe',
              205: 'Earring',
              206: 'Necklace',
              207: 'Ring',
              208: 'Left Bracelet',
              209: 'Right Bracelet',
              210: 'Amulet',
            };

            const equip = player.equip as any;
            const equipList = equip?.EquipList || {};
            const equipEnchant = equip?.EquipEnchant || {};
            // Fight point mapping and convenience refs
            const fightPoint = (player as any).fightPoint || null;
            const functionTypeNames: Record<number, string> = {
              100: 'Talents',
              101: 'Levels',
              200: 'Equip',
              202: 'EquipRefinement',
              300: 'Modules',
              400: 'Skill',
              402: 'SlotSkill',
              500: 'Emblem',
              600: 'Talent',
            };

            return (
              <div key={player.playerId} className="mb-8">
                <div className="grid grid-cols-[auto_1fr] grid-rows-5 gap-6 items-stretch min-h-[284px]">
                  {/* Left Column: portrait spans both rows */}
                  <div className="row-span-2 flex items-center justify-center">
                    <div className="h-full flex items-center">
                      {charBase.avatarInfo?.HalfBody?.Url && (
                        <div style={{ height: '100%' }} className="rounded-lg overflow-hidden border-2 border-purple-500/30 bg-linear-to-b from-purple-900/50 to-blue-900/50 p-5">
                          <Image
                            src={charBase.avatarInfo.HalfBody.Url}
                            alt={charBase.name || 'Character'}
                            width={188}
                            height={284}
                            className="h-full w-auto object-cover block rounded-lg"
                            unoptimized
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Top-right: Player Data */}
                  <div className="relative overflow-hidden rounded-2xl bg-linear-to-br from-purple-900/30 via-blue-900/20 to-purple-900/30 border border-purple-500/30 backdrop-blur-xl hover:border-purple-500/50 transition-all duration-300 group">
                    <div className="absolute inset-0 bg-linear-to-br from-purple-500/5 via-transparent to-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                    <div className="relative p-6">
                      <div className="flex justify-center mb-4">
                        {charBase.avatarInfo?.Profile?.Url && (
                          <div className="relative w-24 h-24 rounded-full overflow-hidden border-3 border-purple-500/50 bg-linear-to-br from-purple-900 to-blue-900 shadow-lg">
                            <Image
                              src={charBase.avatarInfo.Profile.Url}
                              alt={`${charBase.name || 'Character'} profile`}
                              fill
                              className="object-cover"
                              unoptimized
                            />
                          </div>
                        )}
                      </div>

                      <h3 className="text-3xl font-bold text-white mb-6 text-center">
                        {charBase.name || 'Unknown Character'}
                      </h3>

                      <div className="grid grid-cols-2 gap-3 mb-4">
                        <div className="bg-black/20 rounded-lg p-3 border border-purple-500/20">
                          <div className="text-xs text-gray-400 mb-1">Character ID</div>
                          <div className="text-sm font-semibold text-purple-300">
                            {charBase.charId || 'N/A'}
                          </div>
                        </div>

                        <div className="bg-black/20 rounded-lg p-3 border border-blue-500/20">
                          <div className="text-xs text-gray-400 mb-1">Created</div>
                          <div className="text-sm font-semibold text-blue-300">
                            {createDate ? formatDate(createDate) : 'N/A'}
                          </div>
                        </div>

                        <div className="bg-black/20 rounded-lg p-3 border border-green-500/20">
                          <div className="text-xs text-gray-400 mb-1">Total Playtime</div>
                          <div className="text-sm font-semibold text-green-300">
                            {totalHours} hrs
                          </div>
                        </div>

                        <div className="bg-black/20 rounded-lg p-3 border border-orange-500/20">
                          <div className="text-xs text-gray-400 mb-1">Last Seen</div>
                          <div className="text-sm font-semibold text-orange-300">
                            {lastOffline ? getRelativeTime(lastOffline) : 'N/A'}
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-2 flex-wrap justify-center">
                        <span className="px-3 py-1 bg-purple-500/20 text-purple-300 text-xs rounded-full border border-purple-500/30">
                          Player #{player.playerId}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Bottom-right: Equipment */}
                  <div className="relative overflow-hidden rounded-2xl bg-linear-to-br from-purple-900/30 via-blue-900/20 to-purple-900/30 border border-purple-500/30 backdrop-blur-xl">
                    <div className="p-6">
                      <h3 className="text-xl font-bold text-white mb-4">Equipment</h3>
                      <div className="grid grid-cols-2 gap-2">
                        {Object.keys(equipSlotNames).map((slotIdStr) => {
                          const slotId = parseInt(slotIdStr);
                          const slotName = equipSlotNames[slotId];
                          const equipItem = equipList[slotId];

                          if (!equipItem) return null;

                          const refineLevel = equipItem.EquipSlotRefineLevel || 0;
                          const itemUuid = equipItem.ItemUuid;
                          const enchant = itemUuid ? equipEnchant[itemUuid] : null;
                          const enchantLevel = enchant?.EnchantLevel || 0;

                          return (
                            <div
                              key={slotId}
                              className="bg-black/20 rounded-lg p-2 border border-purple-500/20"
                            >
                              <div className="text-xs font-semibold text-purple-300">
                                {slotName}: +{refineLevel}
                              </div>
                              {enchantLevel > 0 && (
                                <div className="text-xs text-gray-400 mt-1">
                                  Gem - Lv. {enchantLevel}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Row 3 Col 1: Fight points left column */}
                  {fightPoint && (
                    (() => {
                      const entries = Object.entries(fightPoint.FightPointData || {});
                      const half = Math.ceil(entries.length / 2);
                      const left = entries.slice(0, half);
                      const right = entries.slice(half);
                      return (
                        <>
                          <div className="row-start-3 col-start-1 space-y-3">
                            {left.map(([ftKey, entryAny]) => {
                              const keyNum = parseInt(ftKey, 10);
                              const entry = entryAny as any;
                              if (!entry) return null;
                              const label = functionTypeNames[keyNum] || `Type ${keyNum}`;
                              const parentPoints = entry.TotalPoint ?? entry.Point ?? 0;
                              const subData = entry.SubFunctionData || {};

                              return (
                                <div key={ftKey} className="bg-black/10 rounded-lg p-3 border border-purple-500/10">
                                  <div className="flex justify-between items-center mb-2">
                                    <div className="text-sm font-semibold text-white">{label}</div>
                                    <div className="text-sm font-semibold text-purple-300">{parentPoints}</div>
                                  </div>

                                  {Object.keys(subData).length > 0 && (
                                    <div className="space-y-1 text-xs text-gray-300">
                                      {Object.keys(subData).map((subKey) => {
                                        const subNum = parseInt(subKey, 10);
                                        const subEntry = subData[subKey];
                                        const subLabel = functionTypeNames[subNum] || `${subNum}`;
                                        const subPoints = subEntry.TotalPoint ?? subEntry.Point ?? 0;
                                        return (
                                          <div key={subKey} className="flex justify-between">
                                            <div>{subLabel}</div>
                                            <div className="font-medium text-blue-300">{subPoints}</div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>

                          {/* Row 3 Col 2: Fight points right column */}
                          <div className="row-start-3 col-start-2 space-y-3">
                            {right.map(([ftKey, entryAny]) => {
                              const keyNum = parseInt(ftKey, 10);
                              const entry = entryAny as any;
                              if (!entry) return null;
                              const label = functionTypeNames[keyNum] || `Type ${keyNum}`;
                              const parentPoints = entry.TotalPoint ?? entry.Point ?? 0;
                              const subData = entry.SubFunctionData || {};

                              return (
                                <div key={ftKey} className="bg-black/10 rounded-lg p-3 border border-purple-500/10">
                                  <div className="flex justify-between items-center mb-2">
                                    <div className="text-sm font-semibold text-white">{label}</div>
                                    <div className="text-sm font-semibold text-purple-300">{parentPoints}</div>
                                  </div>

                                  {Object.keys(subData).length > 0 && (
                                    <div className="space-y-1 text-xs text-gray-300">
                                      {Object.keys(subData).map((subKey) => {
                                        const subNum = parseInt(subKey, 10);
                                        const subEntry = subData[subKey];
                                        const subLabel = functionTypeNames[subNum] || `${subNum}`;
                                        const subPoints = subEntry.TotalPoint ?? subEntry.Point ?? 0;
                                        return (
                                          <div key={subKey} className="flex justify-between">
                                            <div>{subLabel}</div>
                                            <div className="font-medium text-blue-300">{subPoints}</div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </>
                      );
                    })()
                  )}
                </div>

                {/* Row 4: Imagines (Aoyi skills) */}
                <div className="row-start-4 col-span-2 mt-4">
                  {(() => {
                    const aoyiMap = player.professionList?.AoyiSkillInfoMap || (player as any).AoyiSkillInfoMap || {};
                    const entries = Object.entries(aoyiMap);
                    if (entries.length === 0) return null;

                    return (
                      <div className="overflow-hidden rounded-2xl bg-linear-to-br from-purple-900/20 via-blue-900/8 to-purple-900/20 border border-purple-500/20 backdrop-blur-xl p-4">
                        <div className="text-lg font-bold text-white mb-3">Imagines</div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                          {entries.map(([skillId, infoAny]) => {
                            const sid = parseInt(skillId, 10);
                            const info = (infoAny as {RemodelLevel?: number; Level?: number}) || {};
                            const name = aoyiNameMap[skillId]?.ResonanceObject || aoyiNameMap[sid]?.ResonanceObject || `Skill ${skillId}`;
                            const iconKey = skillIconMap[skillId] || skillIconMap[sid] || 'skill_aoyi_skill_icon_001';
                            const iconPath = `/images/skills/${iconKey}.webp`;
                            const level = info.RemodelLevel ?? info.Level ?? 0;

                            return (
                              <div key={skillId} className="bg-black/10 rounded-lg p-2 border border-purple-500/10 text-center">
                                <div className="text-xs text-gray-300 mb-1">{name}</div>
                                <div className="mx-auto w-16 h-16 relative mb-2">
                                  <Image src={iconPath} alt={name} fill className="object-contain" unoptimized />
                                </div>
                                <div className="text-sm font-semibold text-purple-300">Lv. {level}</div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* Row 5: Professions & Skills */}
                <div className="row-start-5 col-span-2 mt-4">
                  {(() => {
                    const profList = player.professionList.ProfessionList || {};
                    const profKeys = Object.keys(profList).filter(k => !isNaN(parseInt(k,10)));
                    if (profKeys.length === 0) return null;

                    const defaultProf = player.professionList?.CurProfessionId || (profKeys.length ? parseInt(profKeys[0],10) : undefined);
                    const selectedForPlayer = selectedProfessionByPlayer[player.playerId] ?? defaultProf;

                    return (
                      <div className="overflow-hidden rounded-2xl bg-linear-to-br from-purple-900/20 via-blue-900/8 to-purple-900/20 border border-purple-500/20 backdrop-blur-xl p-4">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-lg font-bold text-white">Professions</h4>
                          <div className="flex gap-2 items-center">
                            {profKeys.map((k) => {
                              const cid = parseInt(k,10);
                              const iconFile = getClassIconName(cid);
                              const tooltip = getClassTooltip(cid, (profList[k]?.classSpec ?? profList[k]?.ClassSpec) || null);
                              const displayName = CLASS_MAP[cid] || tooltip;
                              return (
                                <button
                                  key={k}
                                  onClick={() => setSelectedProfessionByPlayer(prev => ({...prev, [player.playerId]: cid}))}
                                  className={`flex items-center gap-2 px-2 py-1 rounded-md ${selectedForPlayer===cid ? 'ring-2 ring-purple-400' : 'ring-0'}`}
                                  title={tooltip}
                                >
                                  <div className="w-8 h-8 relative rounded-full overflow-hidden">
                                    <Image src={`/images/classes/${iconFile}`} alt={displayName} width={32} height={32} className="object-cover" unoptimized />
                                  </div>
                                  <div className="text-sm text-gray-200">{displayName}</div>
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Skills for selected profession */}
                        {(() => {
                          const prof = profList[selectedForPlayer] || profList[String(selectedForPlayer)];
                          if (!prof) return <div className="text-sm text-gray-400">No profession data</div>;
                          const skillMap = prof.SkillInfoMap || {};
                          // prefer ActiveSkillIds ordering and filter to only include active skills
                          const activeIds: number[] = prof.ActiveSkillIds || prof.ActiveSkillIds || [];

                          let entries: [string, unknown][] = [];
                          if (Array.isArray(activeIds) && activeIds.length > 0) {
                            entries = activeIds
                              .map((id) => String(id))
                              .filter((idStr) => typeof skillMap[idStr] !== 'undefined')
                              .map((idStr) => [idStr, skillMap[idStr]] as [string, unknown]);
                          } else {
                            entries = Object.entries(skillMap || {});
                          }

                          if (entries.length === 0) return <div className="text-sm text-gray-400">No skills</div>;

                          return (
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                              {entries.map(([skillId, infoAny]) => {
                                const sid = parseInt(skillId,10);
                                const info = (infoAny as {RemodelLevel?: number; Level?: number}) || {};
                                const name = skillNameMap[skillId] || skillNameMap[sid] || `Skill ${skillId}`;
                                const iconKey = skillIconMap[skillId] || skillIconMap[sid] || 'skill_aoyi_skill_icon_001';
                                const iconPath = `/images/skills/${iconKey}.webp`;
                                const remodel = info.RemodelLevel ?? 1;
                                const level = info.Level ?? 1;

                                return (
                                  <div key={skillId} className="bg-black/10 rounded-lg p-2 border border-purple-500/10 text-center">
                                    <div className="text-xs text-gray-300 mb-1">{name}</div>
                                    <div className="mx-auto w-14 h-14 relative mb-2">
                                      <Image src={iconPath} alt={name} fill className="object-contain" unoptimized />
                                    </div>
                                    <div className="text-xs text-gray-200">Advance Level: <span className="font-semibold text-purple-300">{remodel}</span></div>
                                    <div className="text-xs text-gray-200">Level: <span className="font-semibold text-purple-300">{level}</span></div>
                                  </div>
                                );
                              })}
                            </div>
                          );
                        })()}
                      </div>
                    );
                  })()}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Results count and controls */}
      <div className="flex justify-between items-center mb-4">
        <div className="text-gray-400">
          {count > 0 ? `Showing ${rows.length} of ${count} encounters` : "No encounters found"}
        </div>
        <div className="flex items-center gap-4">
          <div className="text-sm text-gray-400">Per page: {params.limit || 20}</div>
        </div>
      </div>
      
      <div>
        {!isLoading && rows.length === 0 ? (
          <div className="text-center py-12">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-700/50 rounded-full mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">No encounters found</h3>
            <p className="text-gray-400">Try adjusting your filters or check back later for new encounters.</p>
          </div>
        ) : (
          <EncounterTable
            rows={rows}
            isLoading={isLoading}
            limit={limit}
            onRowClick={(enc) => router.push(`/encounter/${enc.id}`)}
          />
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2 mt-6">
          <div className="text-gray-400 text-sm">Page {page} of {totalPages}</div>
        </div>
      )}
    </div>
  );
}

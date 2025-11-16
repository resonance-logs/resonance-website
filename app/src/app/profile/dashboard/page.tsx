"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from '@/hooks/useAuth'
import Image from 'next/image';
import AoyiSkillName from '@/data/AoyiSkillName.json';
import SkillIcon from '@/data/SkillIcon.json';
import SkillName from '@/data/SkillName.json';
import type {
  DetailedPlayerData,
  AoyiSkillInfo,
  SkillInfo,
  ProfessionEntry,
  EquipSlot,
  EquipEnchantItem,
  FightPointEntry,
} from '@/types/commonTypes';
import { getClassIconName, CLASS_MAP } from '@/utils/classData';
import { GlassCard } from "@/components/landing/GlassCard";
import { fetchEncounters, FetchEncountersParams, FetchEncountersResponse, DEFAULT_FETCH_ENCOUNTERS_PARAMS } from "@/api/encounter/encounter";
import { fetchDetailedPlayerData, GetDetailedPlayerDataResponse } from "@/api/player/player";
import EncounterTable from "@/components/ui/EncounterTable";
import { formatDate, getRelativeTime } from "@/utils/formatDate";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  const { data: playerDataResponse } = useQuery<GetDetailedPlayerDataResponse>({
    queryKey: ["detailedPlayerData", user?.id],
    queryFn: () => fetchDetailedPlayerData(),
    enabled: !!user, // Only fetch when user is authenticated
  })

  const rows = data?.encounters || []
  const count = data?.count || 0
  const playerData: DetailedPlayerData[] = playerDataResponse?.playerData || []

  const [selectedCharacterIndex, setSelectedCharacterIndex] = useState<number>(0);
  const [selectedProfessionByPlayer, setSelectedProfessionByPlayer] = useState<Record<number, number>>({});

  const skillNameMap = SkillName as Record<string, string>;
  const skillIconMap = SkillIcon as Record<string, string>;
  const aoyiNameMap = AoyiSkillName as Record<string, string>;

  // Typed helper for Object.entries preserving value type
  function entriesOf<T>(obj?: Record<string, T> | null): [string, T][] {
    return Object.entries(obj || {}) as [string, T][]
  }

  const limit = params.limit || 20
  const offset = params.offset || 0
  const page = Math.max(1, Math.floor(offset / limit) + 1)
  const totalPages = Math.max(1, Math.ceil(count / limit))

  // Get current player
  const player = playerData[selectedCharacterIndex];
  const charBase = player?.charBase;

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

      {/* Character Profile Section */}
      {playerData.length > 0 && player && charBase && (
        <div className="mb-12 relative">
          {/* Character Selector & Screenshot Button */}
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-3xl font-bold text-white">Character Profile</h2>
            
            <div className="flex items-center gap-4">
              {playerData.length > 1 && (
                <Select 
                  value={String(selectedCharacterIndex)} 
                  onValueChange={(val) => setSelectedCharacterIndex(Number(val))}
                >
                  <SelectTrigger className="w-[280px] bg-black/30 border-purple-500/30 text-white hover:border-purple-500/50 transition-colors">
                    <SelectValue>
                      <div className="flex items-center gap-3">
                        {charBase?.avatarInfo?.Profile?.Url && (
                          <div className="w-8 h-8 rounded-full overflow-hidden border border-purple-500/50">
                            <Image
                              src={charBase.avatarInfo.Profile.Url}
                              alt={charBase.name || 'Character'}
                              width={32}
                              height={32}
                              className="object-cover"
                              unoptimized
                            />
                          </div>
                        )}
                        <span>{charBase?.name || 'Unknown Character'}</span>
                      </div>
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="bg-black/95 border-purple-500/30 backdrop-blur-xl">
                    {playerData.map((p, idx) => {
                      const cb = p.charBase;
                      return (
                        <SelectItem key={p.playerId} value={String(idx)} className="text-white hover:bg-purple-500/20 cursor-pointer">
                          <div className="flex items-center gap-3">
                            {cb?.avatarInfo?.Profile?.Url && (
                              <div className="w-6 h-6 rounded-full overflow-hidden border border-purple-500/50">
                                <Image
                                  src={cb.avatarInfo.Profile.Url}
                                  alt={cb?.name || 'Character'}
                                  width={24}
                                  height={24}
                                  className="object-cover"
                                  unoptimized
                                />
                              </div>
                            )}
                            <span>{cb?.name || 'Unknown Character'}</span>
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>

          {/* Character Card */}
          <GlassCard className="p-0 overflow-hidden">
              <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-0">
                {/* Left: Character Portrait & Basic Info */}
                <div className="bg-linear-to-br from-purple-900/20 to-blue-900/20 p-6 border-r border-purple-500/10">
                  {charBase.avatarInfo?.HalfBody?.Url && (
                    <div className="mb-4">
                      <Image
                        src={charBase.avatarInfo.HalfBody.Url}
                        alt={charBase.name || 'Character'}
                        width={250}
                        height={377}
                        className="w-full h-auto object-cover rounded-lg"
                        unoptimized
                      />
                    </div>
                  )}
                  
                  <div className="text-center">
                    <h3 className="text-2xl font-bold text-white mb-2">
                      {charBase.name || 'Unknown Character'}
                    </h3>
                    <p className="text-xs text-gray-400 mb-4">
                      Character ID: {charBase.charId || 'N/A'}
                    </p>
                    
                    {/* Quick Stats */}
                    <div className="space-y-2">
                      <div className="bg-black/20 rounded-lg p-2 border border-blue-500/20">
                        <div className="text-xs text-gray-400">Created</div>
                        <div className="text-sm font-semibold text-blue-300">
                          {charBase.createTime ? formatDate(new Date(parseInt(charBase.createTime) * 1000)) : 'N/A'}
                        </div>
                      </div>
                      
                      <div className="bg-black/20 rounded-lg p-2 border border-green-500/20">
                        <div className="text-xs text-gray-400">Playtime</div>
                        <div className="text-sm font-semibold text-green-300">
                          {charBase.totalOnlineTime ? (parseInt(charBase.totalOnlineTime) / 3600).toFixed(1) : '0.0'} hrs
                        </div>
                      </div>
                      
                      <div className="bg-black/20 rounded-lg p-2 border border-orange-500/20">
                        <div className="text-xs text-gray-400">Last Seen</div>
                        <div className="text-sm font-semibold text-orange-300">
                          {charBase.lastOfflineTime ? getRelativeTime(new Date(parseInt(charBase.lastOfflineTime) * 1000)) : 'N/A'}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right: Detailed Stats */}
                <div className="p-6 space-y-4">
                  {/* Equipment Section */}
                  <div>
                    <h4 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                      <span className="w-1 h-5 bg-purple-500 rounded"></span>
                      Equipment
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                      {(() => {
                        const equipSlotNames: Record<number, string> = {
                          200: 'Weapon', 201: 'Helmet', 202: 'Clothes', 203: 'Handguards',
                          204: 'Shoe', 205: 'Earring', 206: 'Necklace', 207: 'Ring',
                          208: 'L.Bracelet', 209: 'R.Bracelet', 210: 'Amulet',
                        };
                        const equip = player.equip;
                        const equipList = (equip?.EquipList || {}) as Record<string, EquipSlot>;
                        const equipEnchant = (equip?.EquipEnchant || {}) as Record<string, EquipEnchantItem>;

                        return Object.keys(equipSlotNames).map((slotIdStr) => {
                          const slotId = parseInt(slotIdStr);
                          const slotName = equipSlotNames[slotId];
                          const equipItem = equipList[String(slotId)];
                          if (!equipItem) return null;

                          const refineLevel = equipItem.EquipSlotRefineLevel || 0;
                          const itemUuid = equipItem.ItemUuid;
                          const enchant = itemUuid ? equipEnchant[itemUuid] : null;
                          const enchantLevel = enchant?.EnchantLevel || 0;

                          return (
                            <div key={slotId} className="bg-black/20 rounded-lg p-2 border border-purple-500/10 text-xs">
                              <div className="font-semibold text-purple-300">{slotName}</div>
                              <div className="text-gray-400">+{refineLevel}</div>
                              {enchantLevel > 0 && <div className="text-blue-400">Gem Lv.{enchantLevel}</div>}
                            </div>
                          );
                        });
                      })()}
                    </div>
                  </div>

                  {/* Fight Points Section */}
                  {player.fightPoint && (
                    <div>
                      <h4 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                        <span className="w-1 h-5 bg-blue-500 rounded"></span>
                        Combat Power
                      </h4>
                      <div className="grid grid-cols-2 gap-2">
                        {(() => {
                          const functionTypeNames: Record<number, string> = {
                            100: 'Talents', 101: 'Levels', 200: 'Equip', 202: 'Refinement',
                            300: 'Modules', 400: 'Skills', 402: 'Slot Skills', 500: 'Emblem', 600: 'Talent',
                          };
                          const entries = entriesOf<FightPointEntry>(player.fightPoint.FightPointData);

                          return entries.map(([ftKey, entry]) => {
                            if (!entry) return null;
                            const keyNum = parseInt(ftKey, 10);
                            const label = functionTypeNames[keyNum] || `Type ${keyNum}`;
                            const points = entry.TotalPoint ?? entry.Point ?? 0;

                            return (
                              <div key={ftKey} className="bg-black/20 rounded-lg p-2 border border-purple-500/10">
                                <div className="flex justify-between items-center text-xs">
                                  <span className="text-gray-300">{label}</span>
                                  <span className="font-semibold text-purple-300">{points}</span>
                                </div>
                              </div>
                            );
                          });
                        })()}
                      </div>
                    </div>
                  )}

                  {/* Professions & Skills */}
                  {(() => {
                    const profList = (player.professionList?.ProfessionList || {}) as Record<string, ProfessionEntry>;
                    const profKeys = Object.keys(profList).filter(k => !isNaN(parseInt(k,10)));
                    if (profKeys.length === 0) return null;

                    const defaultProf = player.professionList?.CurProfessionId || (profKeys.length ? parseInt(profKeys[0],10) : undefined);
                    const selectedForPlayer = selectedProfessionByPlayer[player.playerId] ?? defaultProf;

                    return (
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-lg font-bold text-white flex items-center gap-2">
                            <span className="w-1 h-5 bg-green-500 rounded"></span>
                            Skills
                          </h4>
                          <div className="flex gap-2">
                            {profKeys.map((k) => {
                              const cid = parseInt(k,10);
                              const iconFile = getClassIconName(cid);
                              const displayName = CLASS_MAP[cid];
                              return (
                                <button
                                  key={k}
                                  onClick={() => setSelectedProfessionByPlayer(prev => ({...prev, [player.playerId]: cid}))}
                                  className={`flex items-center gap-1 px-2 py-1 rounded-md transition-all text-xs ${
                                    selectedForPlayer===cid 
                                      ? 'bg-purple-500/30 ring-2 ring-purple-400 text-white' 
                                      : 'bg-black/20 text-gray-400 hover:bg-black/30'
                                  }`}
                                  title={displayName}
                                >
                                  <div className="w-6 h-6 relative rounded-full overflow-hidden">
                                    <Image src={`/images/classes/${iconFile}`} alt={displayName} width={24} height={24} className="object-cover" unoptimized />
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {(() => {
                          const prof = profList[selectedForPlayer] || profList[String(selectedForPlayer)];
                          if (!prof) return <div className="text-sm text-gray-400">No skills data</div>;
                          const skillMap = (prof.SkillInfoMap || {}) as Record<string, SkillInfo>;
                          const activeIds: number[] = prof.ActiveSkillIds || [];

                          let entries: [string, SkillInfo][] = [];
                          if (Array.isArray(activeIds) && activeIds.length > 0) {
                            entries = activeIds
                              .map((id) => String(id))
                              .filter((idStr) => typeof skillMap[idStr] !== 'undefined')
                              .map((idStr) => [idStr, skillMap[idStr]] as [string, SkillInfo]);
                          } else {
                            entries = entriesOf<SkillInfo>(skillMap);
                          }

                          if (entries.length === 0) return <div className="text-sm text-gray-400">No skills</div>;

                          return (
                            <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2">
                              {entries.map(([skillId, info]) => {
                                const sid = parseInt(skillId,10);
                                const name = skillNameMap[skillId] || skillNameMap[String(sid)] || `Skill ${skillId}`;
                                const iconKey = skillIconMap[skillId] ?? skillIconMap[String(sid)] ?? 'skill_aoyi_skill_icon_001';
                                const iconPath = `/images/skills/${iconKey}.webp`;
                                const remodel = info?.RemodelLevel ?? 1;
                                const level = info?.Level ?? 1;

                                return (
                                  <div key={skillId} className="bg-black/20 rounded-lg p-2 border border-purple-500/10 text-center" title={name}>
                                    <div className="mx-auto w-10 h-10 relative mb-1">
                                      <Image src={iconPath} alt={name} fill className="object-contain" unoptimized />
                                    </div>
                                    <div className="text-[10px] text-gray-300 truncate">{name}</div>
                                    <div className="text-[10px] text-purple-300">Adv:{remodel} Lv:{level}</div>
                                  </div>
                                );
                              })}
                            </div>
                          );
                        })()}
                      </div>
                    );
                  })()}

                  {/* Imagines (Aoyi Skills) */}
                  {(() => {
                    const aoyiMap = player.professionList?.AoyiSkillInfoMap || {};
                    const entries = entriesOf<AoyiSkillInfo>(aoyiMap);
                    if (entries.length === 0) return null;

                    return (
                      <div>
                        <h4 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                          <span className="w-1 h-5 bg-yellow-500 rounded"></span>
                          Imagines
                        </h4>
                        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2">
                          {entries.map(([skillId, info]) => {
                            const sid = parseInt(skillId, 10);
                            const name = aoyiNameMap[skillId] || `Skill ${skillId}`;
                            const iconKey = skillIconMap[skillId] ?? skillIconMap[String(sid)] ?? 'skill_aoyi_skill_icon_001';
                            const iconPath = `/images/skills/${iconKey}.webp`;
                            const level = info?.RemodelLevel ?? info?.Level ?? 0;

                            return (
                              <div key={skillId} className="bg-black/20 rounded-lg p-2 border border-purple-500/10 text-center" title={name}>
                                <div className="mx-auto w-10 h-10 relative mb-1">
                                  <Image src={iconPath} alt={name} fill className="object-contain" unoptimized />
                                </div>
                                <div className="text-[10px] text-gray-300 truncate">{name}</div>
                                <div className="text-[10px] text-purple-300">Lv.{level}</div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            </GlassCard>
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

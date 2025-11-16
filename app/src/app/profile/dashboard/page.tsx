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
import { fetchDetailedPlayerData, GetDetailedPlayerDataResponse } from "@/api/player/player";
import { formatDate, getRelativeTime } from "@/utils/formatDate";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from '@tanstack/react-query'

export default function LogsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  // Redirect to get-started if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/get-started');
    }
  }, [user, authLoading, router]);

  // Fetch detailed player data for the authenticated user
  const { data: playerDataResponse, isLoading: isPlayerLoading } = useQuery<GetDetailedPlayerDataResponse>({
    queryKey: ["detailedPlayerData", user?.id],
    queryFn: () => fetchDetailedPlayerData(user!.id),
    enabled: !!user, // Only fetch when user is authenticated
  })

  const playerData: DetailedPlayerData[] = playerDataResponse?.playerData || []
  const isProfileLoading = isPlayerLoading && playerData.length === 0

  const [selectedCharacterIndex, setSelectedCharacterIndex] = useState<number>(0);
  const [selectedProfessionByPlayer, setSelectedProfessionByPlayer] = useState<Record<number, number>>({});

  const skillNameMap = SkillName as Record<string, string>;
  const skillIconMap = SkillIcon as Record<string, string>;
  const aoyiNameMap = AoyiSkillName as Record<string, string>;

  // Typed helper for Object.entries preserving value type
  function entriesOf<T>(obj?: Record<string, T> | null): [string, T][] {
    return Object.entries(obj || {}) as [string, T][]
  }


  // Get current player
  const player = playerData[selectedCharacterIndex];
  const charBase = player?.charBase;

  const profList = (player?.professionList?.ProfessionList || {}) as Record<string, ProfessionEntry>;
  const profKeys = Object.keys(profList).filter((k) => !isNaN(parseInt(k, 10)));
  const defaultProfessionId = player?.professionList?.CurProfessionId || (profKeys.length ? parseInt(profKeys[0], 10) : undefined);
  const selectedProfessionId = player ? (selectedProfessionByPlayer[player.playerId] ?? defaultProfessionId) : undefined;
  const totalSkillCount = profKeys.reduce((acc, key) => {
    const entry = profList[key];
    if (!entry?.SkillInfoMap) return acc;
    return acc + Object.keys(entry.SkillInfoMap).length;
  }, 0);
  const aoyiEntries = entriesOf<AoyiSkillInfo>(player?.professionList?.AoyiSkillInfoMap || {});
  const imagineCount = aoyiEntries.length;
  const fightPointTotal = player?.fightPoint?.TotalFightPoint;

  return (
    <div className="max-w-7xl mx-auto py-20 px-6 text-white">
      <div className="text-center animate-fade-in">
        <div className="inline-flex items-center gap-3 px-6 py-2 rounded-full bg-purple-500/10 border border-purple-500/20 backdrop-blur-md mb-4">
          <div className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
          <p className="text-sm uppercase tracking-[0.35em] text-purple-300 font-semibold">Profile</p>
        </div>
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
          <span className="bg-linear-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
            Character Overview
          </span>
        </h1>
      </div>

      {/* Character Profile Section */}
      {isProfileLoading ? (
        <ProfileOverviewSkeleton />
      ) : playerData.length > 0 && player && charBase && (
        <div className="mb-12 space-y-8">
          {/* Character Selector */}
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm uppercase tracking-[0.35em] text-purple-300">Character</p>
              <h2 className="text-3xl font-bold text-white">Profile Overview</h2>
            </div>
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

          {/* Hero Card */}
          <GlassCard className="relative overflow-hidden border border-purple-500/20 p-0">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(124,58,237,0.35),transparent_60%)] opacity-70" />
            <div className="relative grid grid-cols-1 xl:grid-cols-[360px_1fr]">
              <div className="bg-linear-to-br from-purple-900/40 via-blue-900/30 to-slate-900/40 p-4 flex flex-col gap-8 rounded-3xl">
                {charBase.avatarInfo?.HalfBody?.Url && (
                  <div className="relative h-[440px] w-full overflow-hidden rounded-3xl border border-white/10 bg-black/40 ">
                    <Image
                      src={charBase.avatarInfo.HalfBody.Url}
                      alt={charBase.name || 'Character'}
                      fill
                      className="object-cover"
                      sizes="(max-width: 1280px) 100vw, 400px"
                      unoptimized
                    />
                    <div className="absolute inset-0 bg-linear-to-t from-black/70 to-transparent" />
                  </div>
                )}
              </div>

              <div className="p-8 flex flex-col gap-8">
                <div>
                  <p className="text-sm uppercase tracking-[0.35em] text-purple-200">Vitals</p>
                  <h3 className="text-2xl font-semibold text-white">Account Snapshot</h3>
                </div>
                <div className="rounded-2xl border border-purple-500/30 bg-purple-500/10 px-4 py-4 text-center">
                  <h3 className="text-3xl font-bold text-white">
                    {charBase.name || 'Unknown Character'}
                  </h3>
                  <p className="text-sm text-purple-100 mt-1">Character ID · {charBase.charId || 'N/A'}</p>
                </div>
                <div className="flex flex-wrap gap-4 text-sm text-gray-200">
                  {[{
                    label: 'Created',
                    value: charBase.createTime ? formatDate(new Date(parseInt(charBase.createTime, 10) * 1000)) : 'N/A',
                    accent: 'border-blue-500/30 bg-blue-500/10 text-blue-200'
                  }, {
                    label: 'Playtime',
                    value: `${charBase.totalOnlineTime ? (parseInt(charBase.totalOnlineTime, 10) / 3600).toFixed(1) : '0.0'} hrs`,
                    accent: 'border-green-500/30 bg-green-500/10 text-green-200'
                  }, {
                    label: 'Last Seen',
                    value: charBase.lastOfflineTime ? getRelativeTime(new Date(parseInt(charBase.lastOfflineTime, 10) * 1000)) : 'N/A',
                    accent: 'border-orange-400/30 bg-orange-500/10 text-orange-200'
                  }].map((item) => (
                    <div key={item.label} className={`flex-1 min-w-[180px] rounded-2xl border ${item.accent.replace('text-', '')} px-4 py-3`}>
                      <p className={`text-xs uppercase tracking-[0.25em] ${item.accent.split(' ').pop()}`}>{item.label}</p>
                      <p className="text-lg font-semibold text-white">{item.value}</p>
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {[{
                    label: 'Combat Power',
                    value: fightPointTotal ? fightPointTotal.toLocaleString() : '—',
                    accent: 'from-purple-500/40 via-blue-500/20 to-blue-900/20'
                  }, {
                    label: 'Professions',
                    value: profKeys.length,
                    accent: 'from-blue-500/30 via-cyan-500/20 to-slate-900/20'
                  }, {
                    label: 'Tracked Skills',
                    value: totalSkillCount,
                    accent: 'from-pink-500/30 via-purple-500/10 to-slate-900/10'
                  }, {
                    label: 'Imagines',
                    value: imagineCount,
                    accent: 'from-amber-500/30 via-orange-500/10 to-slate-900/10'
                  }].map((card) => (
                    <div key={card.label} className={`rounded-2xl border border-white/10 bg-linear-to-br ${card.accent} px-5 py-4 backdrop-blur`}>
                      <p className="text-xs uppercase tracking-[0.3em] text-gray-300">{card.label}</p>
                      <p className="mt-2 text-3xl font-semibold text-white">{card.value}</p>
                    </div>
                  ))}
                </div>

              </div>
            </div>
          </GlassCard>

          {/* Mid-section cards */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <GlassCard className="border border-purple-500/15">
              <div className="flex items-center gap-3 mb-6">
                <span className="h-8 w-1 rounded-full bg-purple-400" />
                <div>
                  <p className="text-sm uppercase tracking-[0.3em] text-purple-200">Armory</p>
                  <h3 className="text-2xl font-semibold text-white">Equipment Overview</h3>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                    const slotId = parseInt(slotIdStr, 10);
                    const slotName = equipSlotNames[slotId];
                    const equipItem = equipList[String(slotId)];
                    if (!equipItem) return null;

                    const refineLevel = equipItem.EquipSlotRefineLevel || 0;
                    const itemUuid = equipItem.ItemUuid;
                    const enchant = itemUuid ? equipEnchant[itemUuid] : null;
                    const enchantLevel = enchant?.EnchantLevel || 0;

                    return (
                      <div key={slotId} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                        <div className="flex flex-wrap items-center gap-2 text-base font-semibold text-white">
                          <span>{slotName}</span>
                          <span className="text-purple-300">+{refineLevel}</span>
                          {enchantLevel > 0 ? (
                            <span className="text-blue-300">Gem Lv.{enchantLevel}</span>
                          ) : (
                            <span className="text-gray-500 text-xs font-medium">No Gem</span>
                          )}
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            </GlassCard>

            {player.fightPoint && (
              <GlassCard className="border border-blue-500/20">
                <div className="flex items-center gap-3 mb-6">
                  <span className="h-8 w-1 rounded-full bg-blue-400" />
                  <div>
                    <p className="text-sm uppercase tracking-[0.3em] text-blue-200">Distribution</p>
                    <h3 className="text-2xl font-semibold text-white">Ability Score</h3>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                        <div key={ftKey} className="rounded-2xl border border-blue-500/30 bg-blue-500/10 px-4 py-3">
                          <p className="text-xs uppercase tracking-[0.3em] text-blue-100">{label}</p>
                          <p className="mt-2 text-2xl font-semibold text-white">{points}</p>
                        </div>
                      );
                    });
                  })()}
                </div>
              </GlassCard>
            )}
          </div>

          {/* Skills Section */}
          {profKeys.length > 0 && player && (
            <GlassCard className="border border-green-400/20">
              <div className="flex items-center justify-between gap-4 flex-wrap mb-6">
                <div className="flex items-center gap-3">
                  <span className="h-8 w-1 rounded-full bg-green-400"></span>
                  <div>
                    <p className="text-sm uppercase tracking-[0.3em] text-green-200">Loadouts</p>
                    <h4 className="text-2xl font-semibold text-white">Skills</h4>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {profKeys.map((k) => {
                    const cid = parseInt(k, 10);
                    const iconFile = getClassIconName(cid);
                    const displayName = CLASS_MAP[cid] || `Class ${cid}`;
                    const isActive = selectedProfessionId === cid;
                    return (
                      <button
                        key={k}
                        onClick={() => setSelectedProfessionByPlayer((prev) => ({ ...prev, [player.playerId]: cid }))}
                        className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-all ${
                          isActive
                            ? 'border-purple-400 bg-purple-500/20 text-white shadow-lg shadow-purple-500/20'
                            : 'border-white/10 bg-white/5 text-gray-300 hover:border-purple-400/60'
                        }`}
                        title={displayName}
                      >
                        <div className="relative h-7 w-7 overflow-hidden rounded-full">
                          <Image src={`/images/classes/${iconFile}`} alt={displayName} fill className="object-cover" unoptimized />
                        </div>
                        <span className="hidden sm:inline-block">{displayName}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {(() => {
                const activeProfessionId = selectedProfessionId ?? defaultProfessionId;
                const prof = activeProfessionId ? (profList[activeProfessionId] || profList[String(activeProfessionId)]) : undefined;
                if (!prof) return <div className="text-base text-gray-400">No skills data</div>;
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

                if (entries.length === 0) return <div className="text-base text-gray-400">No skills</div>;

                return (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                    {entries.map(([skillId, info]) => {
                      const sid = parseInt(skillId, 10);
                      const name = skillNameMap[skillId] || skillNameMap[String(sid)] || `Skill ${skillId}`;
                      const iconKey = skillIconMap[skillId] ?? skillIconMap[String(sid)] ?? 'skill_aoyi_skill_icon_001';
                      const iconPath = `/images/skills/${iconKey}.webp`;
                      const remodel = info?.RemodelLevel ?? 1;
                      const level = info?.Level ?? 1;

                      return (
                        <div key={skillId} className="rounded-2xl border border-purple-500/20 bg-purple-500/5 px-4 py-4 text-center" title={name}>
                          <div className="relative mx-auto mb-3 h-16 w-16">
                            <Image src={iconPath} alt={name} fill className="object-contain" unoptimized />
                          </div>
                          <div className="text-xs uppercase tracking-wide text-gray-300 truncate">{name}</div>
                          <div className="text-sm font-semibold text-purple-200">Adv {remodel} · Lv {level}</div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </GlassCard>
          )}

          {/* Imagines Section */}
          {imagineCount > 0 && (
            <GlassCard className="border border-amber-400/30">
              <div className="flex items-center gap-3 mb-6">
                <span className="h-8 w-1 rounded-full bg-amber-400"></span>
                <div>
                  <p className="text-sm uppercase tracking-[0.3em] text-amber-200">Imagines</p>
                  <h4 className="text-2xl font-semibold text-white">All Imagines</h4>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {aoyiEntries.map(([skillId, info]) => {
                  const sid = parseInt(skillId, 10);
                  const name = aoyiNameMap[skillId] || `Skill ${skillId}`;
                  const iconKey = skillIconMap[skillId] ?? skillIconMap[String(sid)] ?? 'skill_aoyi_skill_icon_001';
                  const iconPath = `/images/skills/${iconKey}.webp`;
                  const level = info?.RemodelLevel ?? info?.Level ?? 0;

                  return (
                    <div key={skillId} className="rounded-2xl border border-amber-400/30 bg-amber-500/5 px-4 py-4 text-center" title={name}>
                      <div className="relative mx-auto mb-3 h-16 w-16">
                        <Image src={iconPath} alt={name} fill className="object-contain" unoptimized />
                      </div>
                      <div className="text-xs uppercase tracking-wide text-amber-100 truncate">{name}</div>
                      <div className="text-sm font-semibold text-amber-200">Lv {level}</div>
                    </div>
                  );
                })}
              </div>
            </GlassCard>
          )}
        </div>
      )}
    </div>
  );
}

function ProfileOverviewSkeleton() {
  return (
    <div className="mb-12 space-y-8 animate-pulse">
      <div className="flex justify-between items-center">
        <div className="space-y-2">
          <div className="h-3 w-32 rounded-full bg-white/10" />
          <div className="h-10 w-64 rounded-full bg-white/5" />
        </div>
        <div className="h-10 w-72 rounded-full bg-white/5" />
      </div>

      <GlassCard className="relative overflow-hidden border border-purple-500/20 p-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(124,58,237,0.2),transparent_60%)]" />
        <div className="relative grid grid-cols-1 xl:grid-cols-[360px_1fr]">
          <div className="bg-linear-to-br from-purple-900/40 via-blue-900/30 to-slate-900/40 p-6">
            <div className="h-[420px] w-full rounded-3xl bg-white/5" />
          </div>
          <div className="p-8 space-y-6">
            <div className="space-y-2">
              <div className="h-3 w-24 rounded-full bg-white/10" />
              <div className="h-8 w-48 rounded-full bg-white/5" />
            </div>
            <div className="h-20 rounded-2xl border border-purple-500/30 bg-purple-500/10" />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[...Array(3)].map((_, idx) => (
                <div key={idx} className="h-20 rounded-2xl border border-white/10 bg-white/5" />
              ))}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[...Array(4)].map((_, idx) => (
                <div key={idx} className="h-24 rounded-2xl border border-white/10 bg-white/5" />
              ))}
            </div>
          </div>
        </div>
      </GlassCard>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {[...Array(2)].map((_, idx) => (
          <GlassCard key={idx} className="border border-white/10 p-6 space-y-4">
            <div className="h-8 w-48 rounded-full bg-white/10" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[...Array(4)].map((_, innerIdx) => (
                <div key={innerIdx} className="h-16 rounded-2xl border border-white/10 bg-white/5" />
              ))}
            </div>
          </GlassCard>
        ))}
      </div>

      <GlassCard className="border border-white/10 p-6 space-y-4">
        <div className="h-8 w-56 rounded-full bg-white/10" />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {[...Array(10)].map((_, idx) => (
            <div key={idx} className="h-32 rounded-2xl border border-white/10 bg-white/5" />
          ))}
        </div>
      </GlassCard>

      <GlassCard className="border border-white/10 p-6 space-y-4">
        <div className="h-8 w-40 rounded-full bg-white/10" />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {[...Array(12)].map((_, idx) => (
            <div key={idx} className="h-28 rounded-2xl border border-white/10 bg-white/5" />
          ))}
        </div>
      </GlassCard>
    </div>
  );
}

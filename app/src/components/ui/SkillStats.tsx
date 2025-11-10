"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  getPlayerSkillStats,
  GetPlayerSkillStatsResponse,
} from "@/api/encounter/encounter";
import { formatNumber } from "@/utils/numberFormatter";
import TableRowGlow from "@/components/ui/TableRowGlow";
import { CLASS_MAP } from "@/utils/classData";
import SkillName from "@/data/SkillName.json";

const SKILL_MAP: Record<string, string> = SkillName as unknown as Record<string, string>;

interface Props {
  encounterId: string;
  playerId: string;
  durationSec: number;
  showTitle?: boolean;
  classId?: number;
  playerName?: string;
}

export default function SkillStats({ encounterId, playerId, durationSec, showTitle = false, classId, playerName }: Props) {
  const enabled = !!encounterId && !!playerId;
  const [activeTab, setActiveTab] = useState<'damage' | 'heal'>('damage');

  const { data, isLoading, error } = useQuery<GetPlayerSkillStatsResponse>({
    queryKey: ["encounter", encounterId, "player", playerId],
    queryFn: () => getPlayerSkillStats(encounterId, playerId),
    enabled,
  });

  // Derived values - sorted by percentage descending
  const damageSkillStats = useMemo(() => {
    const stats = data?.damageSkillStats ?? [];
    const totalDamage = stats.reduce((sum, skill) => sum + skill.totalValue, 0);
    return [...stats].sort((a, b) => {
      const percentA = totalDamage > 0 ? (a.totalValue / totalDamage) * 100 : 0;
      const percentB = totalDamage > 0 ? (b.totalValue / totalDamage) * 100 : 0;
      return percentB - percentA;
    });
  }, [data?.damageSkillStats]);

  const healSkillStats = useMemo(() => {
    const stats = data?.healSkillStats ?? [];
    const totalHeal = stats.reduce((sum, skill) => sum + skill.totalValue, 0);
    return [...stats].sort((a, b) => {
      const percentA = totalHeal > 0 ? (a.totalValue / totalHeal) * 100 : 0;
      const percentB = totalHeal > 0 ? (b.totalValue / totalHeal) * 100 : 0;
      return percentB - percentA;
    });
  }, [data?.healSkillStats]);

  // Calculate total damage for percentage
  const totalDamage = useMemo(
    () => damageSkillStats.reduce((sum, skill) => sum + skill.totalValue, 0),
    [damageSkillStats]
  );

  const totalHeal = useMemo(
    () => healSkillStats.reduce((sum, skill) => sum + skill.totalValue, 0),
    [healSkillStats]
  );

  // max values per-list to compute relative percentage for the glow
  const maxDamageSkill = useMemo(() => {
    return damageSkillStats.reduce((m, s) => Math.max(m, s.totalValue), 0);
  }, [damageSkillStats]);

  const maxHealSkill = useMemo(() => {
    return healSkillStats.reduce((m, s) => Math.max(m, s.totalValue), 0);
  }, [healSkillStats]);
  
  if (!enabled) return null;

  if (isLoading) {
    return (
      <div className="w-full space-y-6">
        {/* Skills Skeleton */}
        <div className="rounded-lg border border-gray-800 bg-gray-900/40 overflow-hidden w-full">
          <div className="bg-gray-800/50 px-6 py-3 border-b border-gray-800">
            <div className="h-5 bg-gray-700 rounded animate-pulse w-32"></div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-800/30">
                <tr className="border-b border-gray-800/50">
                  <th className="text-left px-6 py-3">
                    <div className="h-4 bg-gray-700 rounded animate-pulse w-16"></div>
                  </th>
                  <th className="text-right px-6 py-3">
                    <div className="h-4 bg-gray-700 rounded animate-pulse w-12 ml-auto"></div>
                  </th>
                  <th className="text-right px-6 py-3">
                    <div className="h-4 bg-gray-700 rounded animate-pulse w-12 ml-auto"></div>
                  </th>
                  <th className="text-right px-6 py-3">
                    <div className="h-4 bg-gray-700 rounded animate-pulse w-12 ml-auto"></div>
                  </th>
                  <th className="text-right px-6 py-3">
                    <div className="h-4 bg-gray-700 rounded animate-pulse w-12 ml-auto"></div>
                  </th>
                  <th className="text-right px-6 py-3">
                    <div className="h-4 bg-gray-700 rounded animate-pulse w-12 ml-auto"></div>
                  </th>
                  <th className="text-right px-6 py-3">
                    <div className="h-4 bg-gray-700 rounded animate-pulse w-12 ml-auto"></div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: 5 }).map((_, idx) => (
                  <tr key={idx} className="border-b border-gray-800/50">
                    <td className="px-6 py-3">
                      <div className="h-4 bg-gray-700 rounded animate-pulse w-24"></div>
                    </td>
                    <td className="px-6 py-3">
                      <div className="h-4 bg-gray-700 rounded animate-pulse w-12 ml-auto"></div>
                    </td>
                    <td className="px-6 py-3">
                      <div className="h-4 bg-gray-700 rounded animate-pulse w-16 ml-auto"></div>
                    </td>
                    <td className="px-6 py-3">
                      <div className="h-4 bg-gray-700 rounded animate-pulse w-16 ml-auto"></div>
                    </td>
                    <td className="px-6 py-3">
                      <div className="h-4 bg-gray-700 rounded animate-pulse w-16 ml-auto"></div>
                    </td>
                    <td className="px-6 py-3">
                      <div className="h-4 bg-gray-700 rounded animate-pulse w-12 ml-auto"></div>
                    </td>
                    <td className="px-6 py-3">
                      <div className="h-4 bg-gray-700 rounded animate-pulse w-12 ml-auto"></div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-800 bg-red-900/20 p-4 text-center">
        <p className="text-red-400">Failed to load skill stats</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        {showTitle ? (
          <h2 className="text-xl font-semibold">Skill Stats — {playerName || 'Player'}</h2>
        ) : (
          <div />
        )}

        <div className="flex border border-gray-800 rounded overflow-hidden">
          <button
            onClick={() => setActiveTab('damage')}
            className={`px-3 py-1 text-sm font-medium transition-colors border-r border-gray-800 ${
              activeTab === 'damage'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-800/40 text-gray-400 hover:bg-gray-800/60'
            }`}
          >
            Damage
          </button>
          <button
            onClick={() => setActiveTab('heal')}
            className={`px-3 py-1 text-sm font-medium transition-colors ${
              activeTab === 'heal'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-800/40 text-gray-400 hover:bg-gray-800/60'
            }`}
          >
            Heal
          </button>
        </div>
      </div>

      <div className="w-full space-y-6">
        {/* Damage Skill Stats */}
        {activeTab === 'damage' && (
        <div className="rounded-lg border border-gray-800 bg-gray-900/40 overflow-hidden w-full">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-800/30">
                <tr className="border-b border-gray-800/50">
                  <th className="text-left px-6 py-3 font-semibold text-gray-400">Skill</th>
                  <th className="text-right px-6 py-3 font-semibold text-gray-400">D%</th>
                  <th className="text-right px-6 py-3 font-semibold text-gray-400">DPS</th>
                  <th className="text-right px-6 py-3 font-semibold text-gray-400">Damage</th>
                  <th className="text-right px-6 py-3 font-semibold text-gray-400">Casts</th>
                  <th className="text-right px-6 py-3 font-semibold text-gray-400">Crit%</th>
                  <th className="text-right px-6 py-3 font-semibold text-gray-400">Lucky%</th>
                </tr>
              </thead>
              <tbody>
                {damageSkillStats.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                      No damage skills recorded
                    </td>
                  </tr>
                ) : (
                  damageSkillStats.map((skill) => {
                    const skillName = SKILL_MAP[String(skill.skillId)] || `Skill ${skill.skillId}`;
                    const damagePercent = totalDamage > 0 ? (skill.totalValue / totalDamage) * 100 : 0;
                    const dps = skill.totalValue / durationSec;
                    const critPercent = skill.hits > 0 ? (skill.critHits / skill.hits) * 100 : 0;
                    const luckyPercent = skill.hits > 0 ? (skill.luckyHits / skill.hits) * 100 : 0;
                    const relativeToTopSkill = maxDamageSkill > 0 ? (skill.totalValue / maxDamageSkill) * 100 : damagePercent;

                    return (
                      <tr key={skill.id} className="border-b border-gray-800/50 hover:bg-gray-800/40 transition-colors relative">
                        <td className="px-6 py-3 text-gray-300 relative"> {skillName}</td>
                        <td className="px-6 py-3 text-right text-yellow-400">{damagePercent.toFixed(1)}%</td>
                        <td className="px-6 py-3 text-right text-red-400">{formatNumber(Math.round(dps))}</td>
                        <td className="px-6 py-3 text-right">{formatNumber(skill.totalValue)}</td>
                        <td className="px-6 py-3 text-right text-gray-400">{formatNumber(skill.hits)}</td>
                        <td className="px-6 py-3 text-right text-purple-400">{critPercent.toFixed(1)}%</td>
                        <td className="px-6 py-3 text-right text-blue-400">{luckyPercent.toFixed(1)}%</td>
                        <TableRowGlow className={CLASS_MAP[classId ?? 0] ?? ''} percentage={relativeToTopSkill} />
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
        )}

        {/* Heal Skill Stats */}
        {activeTab === 'heal' && (
        <div className="rounded-lg border border-gray-800 bg-gray-900/40 overflow-hidden w-full">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-800/30">
                <tr className="border-b border-gray-800/50">
                  <th className="text-left px-6 py-3 font-semibold text-gray-400">Skill</th>
                  <th className="text-right px-6 py-3 font-semibold text-gray-400">H%</th>
                  <th className="text-right px-6 py-3 font-semibold text-gray-400">HPS</th>
                  <th className="text-right px-6 py-3 font-semibold text-gray-400">Healing</th>
                  <th className="text-right px-6 py-3 font-semibold text-gray-400">Casts</th>
                  <th className="text-right px-6 py-3 font-semibold text-gray-400">Crit%</th>
                  <th className="text-right px-6 py-3 font-semibold text-gray-400">Lucky%</th>
                </tr>
              </thead>
              <tbody>
                {healSkillStats.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                      No heal skills recorded
                    </td>
                  </tr>
                ) : (
                  healSkillStats.map((skill) => {
                    const skillName = SKILL_MAP[String(skill.skillId)] || `Skill ${skill.skillId}`;
                    const healPercent = totalHeal > 0 ? (skill.totalValue / totalHeal) * 100 : 0;
                    const hps = skill.totalValue / durationSec;
                    const critPercent = skill.hits > 0 ? (skill.critHits / skill.hits) * 100 : 0;
                    const luckyPercent = skill.hits > 0 ? (skill.luckyHits / skill.hits) * 100 : 0;

                    const relativeToTopSkill = maxHealSkill > 0 ? (skill.totalValue / maxHealSkill) * 100 : healPercent;

                    return (
                      <tr key={skill.id} className="border-b border-gray-800/50 hover:bg-gray-800/40 transition-colors relative">
                        <td className="px-6 py-3 text-gray-300 relative">{skillName}</td>
                        <td className="px-6 py-3 text-right text-yellow-400">{healPercent.toFixed(1)}%</td>
                        <td className="px-6 py-3 text-right text-green-400">{formatNumber(Math.round(hps))}</td>
                        <td className="px-6 py-3 text-right">{formatNumber(skill.totalValue)}</td>
                        <td className="px-6 py-3 text-right text-gray-400">{formatNumber(skill.hits)}</td>
                        <td className="px-6 py-3 text-right text-purple-400">{critPercent.toFixed(1)}%</td>
                        <td className="px-6 py-3 text-right text-blue-400">{luckyPercent.toFixed(1)}%</td>
                        <TableRowGlow className={CLASS_MAP[classId ?? 0] ?? ''} percentage={relativeToTopSkill} />
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
        )}
      </div>
    </div>
  );
}

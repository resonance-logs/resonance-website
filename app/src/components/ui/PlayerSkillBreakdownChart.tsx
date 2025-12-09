"use client"

import React, { useMemo } from "react"
import dynamic from "next/dynamic"
import { DamageSkillStat, ActorEncounterStat } from "@/types/commonTypes"
import SKILL_NAMES from "@/data/SkillName.json"

// Dynamic import for ApexCharts to avoid SSR issues
const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

const skillNames = SKILL_NAMES as Record<string, string>;

// Modern color palette for the pie chart
const MODERN_COLORS = [
  '#8b5cf6', // violet-500
  '#ec4899', // pink-500
  '#3b82f6', // blue-500
  '#10b981', // emerald-500
  '#f59e0b', // amber-500
  '#6366f1', // indigo-500
  '#14b8a6', // teal-500
  '#f43f5e', // rose-500
  '#0ea5e9', // sky-500
  '#84cc16', // lime-500
  '#a855f7', // purple-500
  '#22d3ee', // cyan-500
  '#fb923c', // orange-400
  '#4ade80', // green-400
  '#c084fc', // violet-400
  '#64748b', // slate-500 (for "Other")
];

interface PlayerSkillBreakdownChartProps {
  damageSkillStats: DamageSkillStat[];
  players: ActorEncounterStat[];
  selectedPlayerId?: string | null;
}

interface SkillBreakdown {
  skillId: number;
  skillName: string;
  totalDamage: number;
  percentage: number;
}

export default function PlayerSkillBreakdownChart({
  damageSkillStats,
  players,
  selectedPlayerId,
}: PlayerSkillBreakdownChartProps) {
  // Calculate skill breakdown for each player
  const playerBreakdowns = useMemo(() => {
    const breakdowns = new Map<number, SkillBreakdown[]>();

    // Get player IDs to include
    const playerActorIds = players.filter(p => p.isPlayer).map(p => p.actorId);

    // If a specific player is selected, only show that player
    const targetPlayerIds = selectedPlayerId
      ? [Number(selectedPlayerId)]
      : playerActorIds;

    for (const playerId of targetPlayerIds) {
      // Filter damage stats for this player
      const playerDamageStats = damageSkillStats.filter(s => s.attackerId === playerId);

      if (playerDamageStats.length === 0) continue;

      // Group by skill and sum total damage
      const skillMap = new Map<number, number>();
      let totalDamage = 0;

      for (const stat of playerDamageStats) {
        const current = skillMap.get(stat.skillId) || 0;
        skillMap.set(stat.skillId, current + stat.totalValue);
        totalDamage += stat.totalValue;
      }

      // Convert to breakdown array with percentages
      const breakdown: SkillBreakdown[] = [];
      for (const [skillId, damage] of skillMap) {
        breakdown.push({
          skillId,
          skillName: skillNames[skillId.toString()] || `Skill ${skillId}`,
          totalDamage: damage,
          percentage: totalDamage > 0 ? (damage / totalDamage) * 100 : 0,
        });
      }

      // Sort by percentage descending
      breakdown.sort((a, b) => b.percentage - a.percentage);

      breakdowns.set(playerId, breakdown);
    }

    return breakdowns;
  }, [damageSkillStats, players, selectedPlayerId]);

  // Get chart data - combine all players if no selection, else show single player
  const chartData = useMemo(() => {
    if (selectedPlayerId) {
      const breakdown = playerBreakdowns.get(Number(selectedPlayerId));
      if (!breakdown || breakdown.length === 0) {
        return { series: [], labels: [] };
      }

      // Take top 15, bundle rest as "Other"
      if (breakdown.length > 15) {
        const top15 = breakdown.slice(0, 15);
        const other = breakdown.slice(15);
        const otherTotal = other.reduce((acc, curr) => acc + curr.percentage, 0);
        return {
          series: [...top15.map(s => s.percentage), otherTotal],
          labels: [...top15.map(s => s.skillName), "Other"],
        };
      }

      return {
        series: breakdown.map(s => s.percentage),
        labels: breakdown.map(s => s.skillName),
      };
    }

    // No player selected - show aggregate for all players
    const allStats: SkillBreakdown[] = [];
    const skillTotals = new Map<number, number>();
    let grandTotal = 0;

    for (const breakdown of playerBreakdowns.values()) {
      for (const skill of breakdown) {
        const current = skillTotals.get(skill.skillId) || 0;
        skillTotals.set(skill.skillId, current + skill.totalDamage);
        grandTotal += skill.totalDamage;
      }
    }

    for (const [skillId, damage] of skillTotals) {
      allStats.push({
        skillId,
        skillName: skillNames[skillId.toString()] || `Skill ${skillId}`,
        totalDamage: damage,
        percentage: grandTotal > 0 ? (damage / grandTotal) * 100 : 0,
      });
    }

    allStats.sort((a, b) => b.percentage - a.percentage);

    if (allStats.length > 15) {
      const top15 = allStats.slice(0, 15);
      const other = allStats.slice(15);
      const otherTotal = other.reduce((acc, curr) => acc + curr.percentage, 0);
      return {
        series: [...top15.map(s => s.percentage), otherTotal],
        labels: [...top15.map(s => s.skillName), "Other"],
      };
    }

    return {
      series: allStats.map(s => s.percentage),
      labels: allStats.map(s => s.skillName),
    };
  }, [playerBreakdowns, selectedPlayerId]);

  const chartOptions: ApexCharts.ApexOptions = {
    chart: {
      type: 'pie',
      background: 'transparent',
      animations: {
        enabled: true,
        speed: 500,
        animateGradually: {
          enabled: true,
          delay: 50
        },
        dynamicAnimation: {
          enabled: true,
          speed: 300
        }
      },
    },
    colors: MODERN_COLORS,
    labels: chartData.labels,
    theme: {
      mode: 'dark',
    },
    stroke: {
      show: true,
      colors: ['#0f172a'],
      width: 2
    },
    legend: {
      position: 'right',
      fontSize: '13px',
      fontFamily: 'inherit',
      labels: {
        colors: '#e5e7eb',
      },
      markers: {
        offsetX: -4,
      },
      itemMargin: {
        horizontal: 8,
        vertical: 3
      },
    },
    tooltip: {
      enabled: true,
      theme: 'dark',
      style: {
        fontSize: '14px',
        fontFamily: 'inherit',
      },
      y: {
        formatter: function (val) {
          return val.toFixed(2) + "%"
        }
      }
    },
    dataLabels: {
      enabled: true,
      style: {
        fontSize: '11px',
        fontFamily: 'inherit',
        fontWeight: 600,
      },
      dropShadow: {
        enabled: true,
        top: 1,
        left: 1,
        blur: 2,
        opacity: 0.5
      },
      formatter: function (val: number) {
        if (val < 3) return '';
        return val.toFixed(1) + "%"
      }
    },
    plotOptions: {
      pie: {
        expandOnClick: true,
        donut: {
          size: '0%',
        }
      }
    },
    responsive: [{
      breakpoint: 768,
      options: {
        legend: {
          position: 'bottom'
        }
      }
    }]
  };

  // Get player name for title
  const selectedPlayer = selectedPlayerId
    ? players.find(p => p.actorId === Number(selectedPlayerId))
    : null;

  const titleText = selectedPlayer
    ? `${selectedPlayer.name || 'Player'}'s Skill Breakdown`
    : 'Team Skill Breakdown';

  if (chartData.series.length === 0) {
    return (
      <div className="rounded-lg border border-gray-800 bg-gray-900/40 p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <span className="w-1 h-5 bg-purple-500 rounded-full"></span>
          {titleText}
        </h3>
        <div className="text-center py-12 text-gray-500">
          <p>No skill data available</p>
          {!selectedPlayerId && (
            <p className="text-sm mt-2">Select a player to view their skill breakdown</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-gray-800 bg-gray-900/40 p-6">
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <span className="w-1 h-5 bg-purple-500 rounded-full"></span>
        {titleText}
      </h3>
      <div className="w-full h-[400px]">
        <Chart options={chartOptions} series={chartData.series} type="pie" height="100%" width="100%" />
      </div>
    </div>
  );
}

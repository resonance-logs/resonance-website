"use client"

import React, { useState, useMemo, useEffect, useRef } from "react"
import { useQuery } from "@tanstack/react-query"
import { fetchSkillBreakdown, SkillBreakdownResponse } from "@/api/statistics/statistics"
import { CLASS_DATA, CLASS_SPEC_MAP, getSpecsForClass } from "@/utils/classData"
import dynamic from "next/dynamic"
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

export default function SkillBreakdownPage() {
  const [selectedClassId, setSelectedClassId] = useState<number | null>(null);
  const [selectedSpecId, setSelectedSpecId] = useState<number | null>(null);

  const { data, isLoading, error } = useQuery<SkillBreakdownResponse>({
    queryKey: ["skillBreakdown"],
    queryFn: fetchSkillBreakdown,
    staleTime: 10 * 60 * 1000,
  });

  // Default selection when data loads
  useEffect(() => {
    if (!selectedClassId && !selectedSpecId) {
      // Default to first class/spec if available
      const firstClassId = parseInt(Object.keys(CLASS_DATA)[0] || "1");
      setSelectedClassId(firstClassId);
      const specs = getSpecsForClass(firstClassId);
      if (specs.length > 0) {
        setSelectedSpecId(specs[0]);
      }
    }
  }, []);

  // Update spec when class changes
  useEffect(() => {
    if (selectedClassId) {
      const specs = getSpecsForClass(selectedClassId);
      if (specs.length > 0 && (!selectedSpecId || !specs.includes(selectedSpecId))) {
        setSelectedSpecId(specs[0]);
      }
    }
  }, [selectedClassId]);

  const currentSpecData = useMemo(() => {
    if (!data || !selectedSpecId) return null;
    return data.specs[selectedSpecId];
  }, [data, selectedSpecId]);

  const chartSeries = useMemo(() => {
    if (!currentSpecData) return [];
    // Sort skills by percentage descending
    const sortedSkills = [...currentSpecData.skills].sort((a, b) => b.percentage - a.percentage);
    // Take top 15, bundle rest as "Other"
    if (sortedSkills.length > 15) {
      const top15 = sortedSkills.slice(0, 15);
      const other = sortedSkills.slice(15);
      const otherTotal = other.reduce((acc, curr) => acc + curr.percentage, 0);
      return [...top15.map(s => s.percentage), otherTotal];
    }
    return sortedSkills.map(s => s.percentage);
  }, [currentSpecData]);

  const chartLabels = useMemo(() => {
    if (!currentSpecData) return [];
    const sortedSkills = [...currentSpecData.skills].sort((a, b) => b.percentage - a.percentage);
    if (sortedSkills.length > 15) {
      const top15 = sortedSkills.slice(0, 15);
      return [...top15.map(s => skillNames[s.skill_id.toString()] || `Skill ${s.skill_id}`), "Other"];
    }
    return sortedSkills.map(s => skillNames[s.skill_id.toString()] || `Skill ${s.skill_id}`);
  }, [currentSpecData]);

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
    labels: chartLabels,
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
      fontSize: '14px',
      fontFamily: 'inherit',
      labels: {
        colors: '#e5e7eb',
      },
      markers: {
        offsetX: -4,
      },
      itemMargin: {
        horizontal: 8,
        vertical: 4
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
        fontSize: '12px',
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

  // Get list of classes from CLASS_DATA
  const classList = Object.entries(CLASS_DATA).map(([id, data]) => ({
    id: parseInt(id),
    name: data.name
  }));

  const specList = selectedClassId ? getSpecsForClass(selectedClassId).map(id => ({
    id,
    name: CLASS_SPEC_MAP[id] || `Spec ${id}`
  })) : [];

  return (
    <div className="min-h-screen text-white relative">
      {/* Class/Spec Selection - Fixed top right */}
      <div className="fixed top-20 right-6 z-40 animate-fade-in">
        <div className="flex gap-2 p-3 bg-gray-900/95 border border-purple-500/30 backdrop-blur-xl rounded-xl shadow-lg">
          <select
            value={selectedClassId ?? ""}
            onChange={(e) => setSelectedClassId(e.target.value ? Number(e.target.value) : null)}
            className="px-3 py-2 bg-gray-800/80 border border-gray-700 rounded-lg text-sm text-gray-200 focus:border-purple-500 focus:outline-none"
          >
            {classList.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <select
            value={selectedSpecId ?? ""}
            onChange={(e) => setSelectedSpecId(e.target.value ? Number(e.target.value) : null)}
            className="px-3 py-2 bg-gray-800/80 border border-gray-700 rounded-lg text-sm text-gray-200 focus:border-purple-500 focus:outline-none"
          >
            {specList.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="max-w-7xl mx-auto py-20 px-6">
        {/* Header */}
        <div className="text-center mb-12 animate-fade-in">
          <div className="inline-flex items-center gap-3 px-6 py-2 rounded-full bg-purple-500/10 border border-purple-500/20 backdrop-blur-md mb-4">
            <div className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
            <p className="text-sm uppercase tracking-[0.35em] text-purple-300 font-semibold">Statistics</p>
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
            <span className="bg-linear-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
              Skill Damage Breakdown
            </span>
          </h1>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto">
            Analyze damage distribution across skills for each specialization
            {currentSpecData && (
              <span className="block mt-2 text-lg text-purple-300">
                {currentSpecData.total_players.toLocaleString()} players analyzed
              </span>
            )}
          </p>
        </div>

        {/* Content */}
        {isLoading && (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
          </div>
        )}

        {error && (
          <div className="text-center py-12">
            <div className="inline-flex items-center gap-3 px-6 py-4 rounded-xl bg-red-500/10 border border-red-500/30">
              <span className="text-red-400 font-medium">Failed to load statistics</span>
            </div>
          </div>
        )}

        {!isLoading && !error && currentSpecData && (
          <div className="w-full">
            {/* Chart Card - Full Width */}
            <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-8 backdrop-blur-sm shadow-xl">
              <h3 className="text-xl font-semibold mb-6 flex items-center gap-2">
                <span className="w-1 h-6 bg-purple-500 rounded-full"></span>
                Damage Distribution by Skill
              </h3>
              <div className="w-full h-[600px]">
                {currentSpecData.skills.length > 0 ? (
                  <Chart options={chartOptions} series={chartSeries} type="pie" height="100%" width="100%" />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-gray-400">No skill data available for this spec.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        {!isLoading && !error && !currentSpecData && selectedSpecId && (
          <div className="text-center py-20 bg-gray-900/30 rounded-2xl border border-gray-800/50">
            <p className="text-gray-400 text-lg">No data available for the selected spec yet.</p>
            <p className="text-gray-500 text-sm mt-2">Data refresh job runs every 2 hours.</p>
          </div>
        )}
      </div>
    </div >
  )
}

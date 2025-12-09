"use client"

import React, { useState, useMemo, useEffect } from "react"
import { useQuery } from "@tanstack/react-query"
import { fetchSkillBreakdown, SkillBreakdownResponse } from "@/api/statistics/statistics"
import { CLASS_DATA, CLASS_SPEC_MAP, getSpecsForClass } from "@/utils/classData"
import dynamic from "next/dynamic"
import SKILL_NAMES from "@/data/SkillName.json"

// Dynamic import for ApexCharts to avoid SSR issues
const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

const skillNames = SKILL_NAMES as Record<string, string>;

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
    },
    labels: chartLabels,
    theme: {
      mode: 'dark',
      palette: 'palette1',
    },
    stroke: {
      show: true,
      colors: ['#1f2937'], // Match bg-gray-800/900
      width: 1
    },
    legend: {
      position: 'right',
      labels: {
        colors: '#e5e7eb', // text-gray-200
      },
    },
    tooltip: {
      y: {
        formatter: function (val) {
          return val.toFixed(2) + "%"
        }
      }
    },
    dataLabels: {
      enabled: true,
      formatter: function (val: number) {
        return val.toFixed(1) + "%"
      }
    }
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
    <div className="min-h-screen text-white">
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
          </p>
        </div>

        {/* Controls */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-10">
          <select
            className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-purple-500 text-gray-200"
            value={selectedClassId || ""}
            onChange={(e) => setSelectedClassId(parseInt(e.target.value))}
          >
            {classList.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          <select
            className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-purple-500 text-gray-200"
            value={selectedSpecId || ""}
            onChange={(e) => setSelectedSpecId(parseInt(e.target.value))}
            disabled={!selectedClassId}
          >
            {specList.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
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
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Chart Card */}
            <div className="lg:col-span-2 bg-gray-900/50 border border-gray-800 rounded-2xl p-6 backdrop-blur-sm shadow-xl">
              <h3 className="text-xl font-semibold mb-6 flex items-center gap-2">
                <span className="w-1 h-6 bg-purple-500 rounded-full"></span>
                Configured Skills
              </h3>
              <div className="min-h-[400px] flex items-center justify-center">
                {currentSpecData.skills.length > 0 ? (
                  <Chart options={chartOptions} series={chartSeries} type="pie" height={400} width={"100%"} />
                ) : (
                  <p className="text-gray-400">No skill data available for this spec.</p>
                )}
              </div>
            </div>

            {/* Stats Card */}
            <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-6 backdrop-blur-sm shadow-xl h-fit">
              <h3 className="text-xl font-semibold mb-6 flex items-center gap-2">
                <span className="w-1 h-6 bg-blue-500 rounded-full"></span>
                Overview
              </h3>

              <div className="space-y-6">
                <div>
                  <p className="text-sm text-gray-400 uppercase tracking-wider font-semibold mb-1">Total Players Analyzed</p>
                  <p className="text-4xl font-bold text-white tracking-tight">{currentSpecData.total_players.toLocaleString()}</p>
                </div>

                <div>
                  <p className="text-sm text-gray-400 uppercase tracking-wider font-semibold mb-1">Total Damage Recorded</p>
                  <p className="text-4xl font-bold text-transparent bg-clip-text bg-linear-to-r from-purple-400 to-pink-400 tracking-tight">
                    {currentSpecData.total_damage.toLocaleString()}
                  </p>
                </div>

                <div className="pt-6 border-t border-gray-800">
                  <p className="text-sm text-gray-500 italic">
                    Data reflects aggregated statistics from all uploaded logs over the last 30 days.
                    Refreshed every 2 hours.
                  </p>
                </div>
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
    </div>
  )
}

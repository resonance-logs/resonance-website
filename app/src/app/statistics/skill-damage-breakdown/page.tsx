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

function FilterControls({
  selectedClassId,
  setSelectedClassId,
  selectedSpecId,
  setSelectedSpecId,
  classList,
  specList,
}: {
  selectedClassId: number | null;
  setSelectedClassId: (id: number) => void;
  selectedSpecId: number | null;
  setSelectedSpecId: (id: number) => void;
  classList: { id: number; name: string }[];
  specList: { id: number; name: string }[];
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const currentClassName = classList.find(c => c.id === selectedClassId)?.name || 'Select Class';
  const currentSpecName = specList.find(s => s.id === selectedSpecId)?.name || 'Select Spec';

  return (
    <div className="fixed top-20 right-6 z-40 animate-fade-in" ref={dropdownRef}>
      <div className="group relative">
        {/* Unified glow effect */}
        <div className="absolute inset-0 -m-0.5 bg-linear-to-r from-purple-600 to-pink-600 rounded-2xl opacity-20 blur group-hover:opacity-40 transition-all duration-300 pointer-events-none"></div>

        {/* Unified container */}
        <div className={`relative bg-gray-900/95 border border-purple-500/30 backdrop-blur-xl shadow-2xl shadow-purple-500/10 transition-all duration-300 overflow-hidden ${isOpen ? 'rounded-2xl' : 'rounded-2xl hover:shadow-purple-500/20 hover:border-purple-500/50'}`}>
          {/* Main button */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="relative flex items-center gap-3 px-5 py-3.5 w-full transition-all duration-300"
          >
            {/* Filter icon with animated bg */}
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-linear-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30 group-hover:from-purple-500/30 group-hover:to-pink-500/30 transition-all duration-300">
              <svg className="w-4.5 h-4.5 text-purple-300" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" viewBox="0 0 24 24" stroke="currentColor">
                <path d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"></path>
              </svg>
            </div>

            {/* Divider */}
            <div className="h-8 w-px bg-linear-to-b from-transparent via-purple-500/40 to-transparent"></div>

            {/* Current selection */}
            <div className="flex flex-col gap-0.5 text-left">
              <span className="text-white text-sm font-medium">{currentClassName}</span>
              <span className="text-purple-300/70 text-xs">{currentSpecName}</span>
            </div>
            <svg
              className={`w-4 h-4 text-purple-300 transition-transform duration-300 ml-2 ${isOpen ? 'rotate-180' : ''}`}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2.5"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path d="M19 9l-7 7-7-7"></path>
            </svg>
          </button>

          {/* Expandable drawer section */}
          <div className={`transition-all duration-300 ease-in-out ${isOpen ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}`}>
            {/* Class Section */}
            <div className="px-4 pt-2 pb-1">
              <label className="text-[10px] uppercase tracking-widest text-purple-300/70 font-semibold">Class</label>
            </div>
            <div className="max-h-40 overflow-y-auto">
              {classList.map((c) => (
                <button
                  key={c.id}
                  onClick={() => {
                    setSelectedClassId(c.id);
                  }}
                  className={`w-full px-5 py-2.5 text-left transition-all duration-200 flex items-center justify-between ${selectedClassId === c.id
                    ? 'bg-purple-500/20 text-purple-200'
                    : 'text-gray-300 hover:bg-purple-500/10 hover:text-white'
                    }`}
                >
                  <span className="text-sm font-medium">{c.name}</span>
                  {selectedClassId === c.id && (
                    <svg className="w-4 h-4 text-purple-400" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" viewBox="0 0 24 24" stroke="currentColor">
                      <path d="M5 13l4 4L19 7"></path>
                    </svg>
                  )}
                </button>
              ))}
            </div>

            {/* Spec Section */}
            <div className="px-4 pt-3 pb-1 border-t border-purple-500/20 mt-2">
              <label className="text-[10px] uppercase tracking-widest text-purple-300/70 font-semibold">Specialization</label>
            </div>
            <div className="max-h-40 overflow-y-auto pb-2">
              {specList.map((s) => (
                <button
                  key={s.id}
                  onClick={() => {
                    setSelectedSpecId(s.id);
                    setIsOpen(false);
                  }}
                  className={`w-full px-5 py-2.5 text-left transition-all duration-200 flex items-center justify-between ${selectedSpecId === s.id
                    ? 'bg-purple-500/20 text-purple-200'
                    : 'text-gray-300 hover:bg-purple-500/10 hover:text-white'
                    }`}
                >
                  <span className="text-sm font-medium">{s.name}</span>
                  {selectedSpecId === s.id && (
                    <svg className="w-4 h-4 text-purple-400" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" viewBox="0 0 24 24" stroke="currentColor">
                      <path d="M5 13l4 4L19 7"></path>
                    </svg>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

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
      {/* Filter Controls - Fixed top right */}
      <FilterControls
        selectedClassId={selectedClassId}
        setSelectedClassId={setSelectedClassId}
        selectedSpecId={selectedSpecId}
        setSelectedSpecId={setSelectedSpecId}
        classList={classList}
        specList={specList}
      />

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
    </div>
  )
}

"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import type { ApexOptions } from "apexcharts";
import SkillIcon from "@/data/SkillIcon.json";
import SkillName from "@/data/SkillName.json";
import type {
  DamageHitDetail,
  DamageSkillStat,
  HealDetail,
  HealSkillStat,
} from "@/types/commonTypes";
import { formatNumber } from "@/utils/numberFormatter";

const ReactApexChart = dynamic(() => import("react-apexcharts"), {
  ssr: false,
  loading: () => (
    <div className="flex h-48 items-center justify-center text-sm text-gray-400">
      Rendering skill timeline...
    </div>
  ),
});

const SKILL_ICON_MAP = SkillIcon as Record<string, string>;
const SKILL_NAME_MAP = SkillName as Record<string, string>;
const DEFAULT_ICON = "/images/classes/blank.png";

interface SkillTimelineChartProps {
  playerId?: string | number | null;
  playerName?: string;
  durationMs: number;
  damageSkillStats?: DamageSkillStat[];
  healSkillStats?: HealSkillStat[];
  timeRange?: { start: number; end: number } | null;
}

type TimelineMode = "damage" | "heal";

interface NormalizedDetail {
  damageEventTime: number;
  crit: boolean;
  lucky: boolean;
  value: number;
}

interface TimelineDatum {
  x: number;
  y: number;
  iconPath: string;
  skillName: string;
  detailType: TimelineMode;
  crit: boolean;
  lucky: boolean;
  value: number;
}

type TimelineSeries = Array<{ name: string; data: TimelineDatum[] }>;

const numberOrNull = (value: unknown): number | null => {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const pickFirstNumber = (
  ...values: Array<number | string | null | undefined>
): number | null => {
  for (const candidate of values) {
    const parsed = numberOrNull(candidate);
    if (parsed !== null) {
      return parsed;
    }
  }
  return null;
};

const msToSeconds = (value: number) => Math.max(0, value / 1000);

const formatSecondsLabel = (value: number) => {
  if (!Number.isFinite(value)) return "0:00";
  const totalSeconds = Math.max(0, value);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60)
    .toString()
    .padStart(2, "0");
  return `${minutes}:${seconds}`;
};

const getSkillName = (skillId: number) =>
  SKILL_NAME_MAP[String(skillId)] ?? `Skill ${skillId}`;

const getSkillIcon = (skillId: number) => {
  const slug = SKILL_ICON_MAP[String(skillId)];
  if (!slug) return DEFAULT_ICON;
  return `/images/skills/${slug}.webp`;
};

const normalizeDamageDetail = (
  detail: DamageHitDetail
): NormalizedDetail | null => {
  const startMs = pickFirstNumber(detail.ms_from_start, detail.timestamp);
  if (startMs === null) return null;
  const value = numberOrNull(detail.damage ?? detail.hp_loss ?? detail.shield_loss ?? 0) ?? 0;
  return {
    damageEventTime: msToSeconds(startMs),
    crit: Boolean(detail.crit),
    lucky: Boolean(detail.lucky),
    value,
  };
};

const normalizeHealDetail = (
  detail: HealDetail
): NormalizedDetail | null => {
  const startMs = pickFirstNumber(detail.ms_from_start, detail.timestamp);
  if (startMs === null) return null;
  const value = numberOrNull(detail.heal ?? 0) ?? 0;
  return {
    damageEventTime: msToSeconds(startMs),
    crit: Boolean(detail.crit),
    lucky: Boolean(detail.lucky),
    value,
  };
};

export default function SkillTimelineChart({
  playerId,
  playerName,
  durationMs,
  damageSkillStats,
  healSkillStats,
  timeRange,
}: SkillTimelineChartProps) {
  const [mode, setMode] = useState<TimelineMode>("damage");
  const numericPlayerId = numberOrNull(playerId);

  const { series, chartHeight, maxSeconds, hasData } = useMemo(() => {
    if (!numericPlayerId) {
      return {
        series: [] as TimelineSeries,
        chartHeight: 240,
        maxSeconds: Math.max(1, msToSeconds(durationMs)),
        hasData: false,
      };
    }

    const grouped = new Map<number, NormalizedDetail[]>();

    const upsertSkillDetails = (skillId: number, entries: NormalizedDetail[]) => {
      if (entries.length === 0) return;
      const existing = grouped.get(skillId) ?? [];
      existing.push(...entries);
      grouped.set(skillId, existing);
    };

    // Filter function based on time range
    const isInTimeRange = (detail: NormalizedDetail): boolean => {
      if (!timeRange) return true;
      return detail.damageEventTime >= timeRange.start && detail.damageEventTime <= timeRange.end;
    };

    if (mode === "damage") {
      (damageSkillStats ?? []).forEach((stat) => {
        if (stat.attackerId !== numericPlayerId) return;
        const details = (stat.hitDetails as DamageHitDetail[] | undefined) ?? [];
        if (details.length === 0) return;
        const normalized = details
          .map((detail) =>
            normalizeDamageDetail(detail)
          )
          .filter((value): value is NormalizedDetail => Boolean(value))
          .filter(isInTimeRange);
        upsertSkillDetails(stat.skillId, normalized);
      });
    } else {
      (healSkillStats ?? []).forEach((stat) => {
        if (stat.healerId !== numericPlayerId) return;
        const details = (stat.healDetails as HealDetail[] | undefined) ?? [];
        if (details.length === 0) return;
        const normalized = details
          .map((detail) =>
            normalizeHealDetail(detail)
          )
          .filter((value): value is NormalizedDetail => Boolean(value))
          .filter(isInTimeRange);
        upsertSkillDetails(stat.skillId, normalized);
      });
    }

    const skills = Array.from(grouped.entries())
    .map(([skillId, details]) => ({
      skillId,
      details: details.sort((a, b) => a.damageEventTime - b.damageEventTime),
      iconPath: getSkillIcon(skillId),
      skillName: getSkillName(skillId),
    }))
    .sort((a, b) => {
      if (b.details.length !== a.details.length) {
        return b.details.length - a.details.length;
      }
      return a.skillName.localeCompare(b.skillName);
    });
    
    console.log(skills, grouped, damageSkillStats?.filter((e) => e.attackerId === numericPlayerId))
    console.log(skills.length, chartHeight)
    const data: TimelineDatum[] = [];
    let computedMax = msToSeconds(durationMs);

    skills.forEach((skill, trackIndex) => {
      skill.details.forEach((detail) => {
        computedMax = Math.max(computedMax, detail.damageEventTime);
        data.push({
          x: detail.damageEventTime,
          y: 20 + trackIndex *18,
          iconPath: skill.iconPath,
          skillName: skill.skillName,
          detailType: mode,
          crit: detail.crit,
          lucky: detail.lucky,
          value: detail.value,
        });
      });
    });

    const trackCount = Math.max(1, skills.length);
    const height = Math.min(720, Math.max(260, trackCount * 18 + 20));

    if (data.length === 0) {
      return {
        series: [] as TimelineSeries,
        chartHeight: height,
        maxSeconds: Math.max(1, computedMax),
        hasData: false,
      };
    }

    return {
      series: [
        {
          name: mode === "damage" ? "Damage" : "Healing",
          data,
        },
      ] as TimelineSeries,
      chartHeight: height,
      maxSeconds: Math.max(1, computedMax),
      hasData: true,
    };
  }, [numericPlayerId, mode, damageSkillStats, healSkillStats, durationMs, timeRange]);

  const chartOptions: ApexOptions = useMemo(() => {
    const baseColor = mode === "damage" ? "rgba(248,113,113,0.9)" : "rgba(74,222,128,0.9)";

    // Calculate x-axis range based on timeRange or use full maxSeconds
    const xAxisMin = timeRange ? timeRange.start - (timeRange.end - timeRange.start) * 0.02 : -maxSeconds * 0.02;
    const xAxisMax = timeRange ? timeRange.end + (timeRange.end - timeRange.start) * 0.02 : maxSeconds * 1.02;

    return {
      chart: {
        type: "scatter",
        animations: { enabled: false },
        background: "transparent",
        toolbar: { show: false },
        parentHeightOffset: 0,
        fontFamily: "inherit",
        selection: { enabled: false },
        zoom: { enabled: false },
        events: {
          mounted: (chartContext) => {
            const seriesData = chartContext.w.config.series?.[0]?.data as TimelineDatum[] | undefined;
            if (!seriesData || seriesData.length === 0) return;

            seriesData.forEach((point) => {
              chartContext.addPointAnnotation({
                x: point.x,
                y: point.y,
                image: {
                  path: point.iconPath,
                  width: 28,
                  height: 28,
                },
              }, false);
            });
          },
          updated: (chartContext) => {
            chartContext.clearAnnotations();
            const seriesData = chartContext.w.config.series?.[0]?.data as TimelineDatum[] | undefined;
            if (!seriesData || seriesData.length === 0) return;

            seriesData.forEach((point) => {
              chartContext.addPointAnnotation({
                x: point.x,
                y: point.y,
                image: {
                  path: point.iconPath,
                  width: 28,
                  height: 28,
                },
                mouseEnter: undefined,
                mouseLeave: undefined,
              }, false);
            });
          },
        },
      },
      states: {
        hover: {
          filter: { type: "none" },
        },
        active: {
          allowMultipleDataPointsSelection: false,
          filter: { type: "none" },
        },
      },
      grid: {
        borderColor: "rgba(75,85,99,0.2)",
        strokeDashArray: 4,
        xaxis: { lines: { show: true } },
        yaxis: { lines: { show: false } },
      },
      xaxis: {
        min: xAxisMin,
        max: xAxisMax,
        labels: {
          style: { colors: "#9CA3AF" },
          formatter: (value) => formatSecondsLabel(Number(value)),
        },
        axisBorder: { color: "rgba(75,85,99,0.4)" },
        axisTicks: { color: "rgba(75,85,99,0.4)" },
        tooltip: { enabled: false },
      },
      yaxis: {
        labels: { show: false },
        min: -2,
        max: Math.max(0, (series[0]?.data.length ?? 1) - 5),
      },
      markers: {
        size: 15,
        strokeWidth: 0,
        fillOpacity: 0,
        hover: {
          size: 15,
          sizeOffset: 0,
        },
      },
      dataLabels: {
        enabled: false,
      },
      tooltip: {
        theme: "dark",
        x: { show: false },
        custom: ({ seriesIndex, dataPointIndex, w }) => {
          const point =
            (w?.config?.series?.[seriesIndex]?.data?.[
              dataPointIndex
            ] as TimelineDatum | undefined) ?? undefined;
          if (!point) return "";
          return `
            <div class="rounded-md border border-slate-700 bg-slate-900/90 px-2 py-2 text-xs text-slate-100">
              <div class="flex items-center gap-2">
                <div class="font-semibold">${point.skillName}</div>
                 <span>${formatNumber(point.value)}</span> 
                 ${point.crit ? `<span>⚡</span>` : ''}
                 ${point.lucky ? `<span>🍀</span>` : ''}
              </div>
            </div>`;
        },
      },
      colors: [baseColor],
      legend: { show: false },
      noData: {
        text: "No skill events recorded",
        style: { color: "#9CA3AF" },
      },
    };
  }, [maxSeconds, mode, series, timeRange]);

  console.log(series, chartOptions)

  return (
    <div className="rounded-lg border border-gray-800 bg-gray-900/40 p-4">
      <style jsx global>{`
        .apexcharts-point-annotations {
          pointer-events: none !important;
        }
        .apexcharts-marker {
          pointer-events: all !important;
        }
      `}</style>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-white">
            Skill Timeline {playerName ? `— ${playerName}` : ""}
          </h3>
          <p className="text-xs text-gray-400">
            Visualizes each registered skill hit or heal along the encounter timeline.
          </p>
        </div>
        <div className="flex rounded border border-gray-800 text-sm font-medium">
          <button
            type="button"
            onClick={() => setMode("damage")}
            className={`px-3 py-1 transition-colors ${
              mode === "damage"
                ? "bg-purple-600 text-white"
                : "bg-gray-800/40 text-gray-400 hover:bg-gray-800/70"
            }`}
          >
            Damage hits
          </button>
          <button
            type="button"
            onClick={() => setMode("heal")}
            className={`px-3 py-1 border-l border-gray-800 transition-colors ${
              mode === "heal"
                ? "bg-purple-600 text-white"
                : "bg-gray-800/40 text-gray-400 hover:bg-gray-800/70"
            }`}
          >
            Heal ticks
          </button>
        </div>
      </div>

      {!numericPlayerId && (
        <div className="rounded-md border border-gray-800 bg-gray-900/60 px-4 py-10 text-center text-sm text-gray-400">
          Select a player to view their skill timeline.
        </div>
      )}

      {numericPlayerId && !hasData && (
        <div className="rounded-md border border-gray-800 bg-gray-900/60 px-4 py-10 text-center text-sm text-gray-400">
          No {mode === "damage" ? "damage" : "healing"} skill events available for this player.
        </div>
      )}

      {numericPlayerId && hasData && (
        <ReactApexChart
          options={chartOptions}
          series={series as unknown as ApexOptions["series"]}
          type="scatter"
          height={chartHeight}
        />
      )}
    </div>
  );
}

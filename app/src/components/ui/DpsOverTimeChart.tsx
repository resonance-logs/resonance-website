"use client";

import dynamic from "next/dynamic";
import type { PointerEvent as ReactPointerEvent } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ApexOptions } from "apexcharts";
import {
  ActorEncounterStat,
  DamageSkillStat,
  HealSkillStat,
  DamageHitDetail,
  HealDetail,
  DungeonSegment,
} from "@/types/commonTypes";
import { CLASS_MAP, CLASS_COLORS } from "@/utils/classData";
import { formatNumber } from "@/utils/numberFormatter";

const ReactApexChart = dynamic(() => import("react-apexcharts"), {
  ssr: false,
  loading: () => (
    <div className="flex h-64 items-center justify-center text-sm text-gray-400">
      Rendering DPS graph...
    </div>
  ),
});

interface PlayerSeriesRaw {
  actorId: number;
  name: string;
  color: string;
  totals: Array<{ second: number; total: number }>;
}

interface DpsOverTimeChartProps {
  players: ActorEncounterStat[];
  damageSkillStats?: DamageSkillStat[];
  healSkillStats?: HealSkillStat[];
  durationMs: number;
  dungeonSegments?: DungeonSegment[];
  encounterStartedAt?: string;
}

const DEFAULT_SERIES_COLOR = "#8B5CF6";

const MS_PER_SECOND = 1000;
const SCRUBBER_PADDING_PX = 36;

const formatSecondsLabel = (seconds: number) => {
  if (!Number.isFinite(seconds) || seconds < 0) return "0s";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  if (mins <= 0) {
    return `${secs}s`;
  }
  return `${mins}m ${secs.toString().padStart(2, "0")}s`;
};

const safeNumber = (value: unknown, fallback = 0) => {
  if (value === null || value === undefined || value === "") {
    return fallback;
  }
  const num = typeof value === "number" ? value : Number(value);
  return Number.isFinite(num) ? num : fallback;
};

export default function DpsOverTimeChart({
  players,
  damageSkillStats,
  healSkillStats,
  durationMs,
  dungeonSegments,
  encounterStartedAt,
}: DpsOverTimeChartProps) {
  const [mode, setMode] = useState<'damage' | 'healing'>('damage');
  const [rangeOverride, setRangeOverride] = useState<{ start: number; end: number } | null>(null);
  const [draggingHandle, setDraggingHandle] = useState<null | 'start' | 'end'>(null);
  const scrubberRef = useRef<HTMLDivElement>(null);

  const { rawSeries, colors, totalSeconds } = useMemo(() => {

    type PlayerEntry = {
      name: string;
      color: string;
      events: { timeMs: number; value: number }[];
    };

    const allowedActorIds = new Set(players.map((p) => p.actorId));
    const playerMap = new Map<number, PlayerEntry>();
    let maxEventTime = Math.max(durationMs, 1);

    const ensurePlayerEntry = (actorId: number) => {
      if (!allowedActorIds.has(actorId)) {
        return undefined;
      }
      if (!playerMap.has(actorId)) {
        const player = players.find((p) => p.actorId === actorId);
        const className = player?.classId ? CLASS_MAP[player.classId] : undefined;
        const classColor = className ? CLASS_COLORS[className] : undefined;
        const color = classColor ?? DEFAULT_SERIES_COLOR;
        playerMap.set(actorId, {
          name: player?.name || `Player ${actorId}`,
          color,
          events: [],
        });
      }
      return playerMap.get(actorId);
    };

    const pushDamageEvent = (actorId: number, timeMs: number, value: number) => {
      if (!Number.isFinite(actorId) || actorId === 0) return;
      if (!allowedActorIds.has(actorId)) return;
      if (!Number.isFinite(timeMs) || timeMs < 0) return;
      if (!Number.isFinite(value) || value <= 0) return;
      const entry = ensurePlayerEntry(actorId);
      if (!entry) return;
      entry.events.push({ timeMs, value });
      maxEventTime = Math.max(maxEventTime, timeMs);
    };

    if (mode === 'damage') {
      damageSkillStats?.forEach((stat) => {
        if (!stat.hitDetails || stat.hitDetails.length === 0) return;
        (stat.hitDetails as DamageHitDetail[]).forEach((detail) => {
          const msValue = safeNumber(detail.ms_from_start, undefined);
          if (!Number.isFinite(msValue)) {
            return;
          }
          const value = safeNumber(detail.damage ?? detail.hp_loss ?? 0);
          pushDamageEvent(stat.attackerId, msValue, value);
        });
      });
    } else {
      healSkillStats?.forEach((stat) => {
        if (!stat.healDetails || stat.healDetails.length === 0) return;
        (stat.healDetails as HealDetail[]).forEach((detail) => {
          const msValue = safeNumber(detail.ms_from_start, undefined);
          if (!Number.isFinite(msValue)) {
            return;
          }
          const value = safeNumber(detail.heal ?? 0);
          pushDamageEvent(stat.healerId, msValue, value);
        });
      });
    }

    // Ensure every player in the encounter has at least an empty series
    players.forEach((player) => {
      ensurePlayerEntry(player.actorId);
    });

    const computedSeries: PlayerSeriesRaw[] = [];
    const bucketSeconds = Math.max(1, Math.ceil(Math.max(maxEventTime, 1) / MS_PER_SECOND));

    playerMap.forEach((entry, actorId) => {
      const sortedEvents = entry.events.sort((a, b) => a.timeMs - b.timeMs);
      let cumulative = 0;
      let eventIndex = 0;
      const totals: Array<{ second: number; total: number }> = [];

      for (let second = 1; second <= bucketSeconds; second += 1) {
        const cutoff = second * MS_PER_SECOND;
        while (eventIndex < sortedEvents.length && sortedEvents[eventIndex].timeMs <= cutoff) {
          cumulative += sortedEvents[eventIndex].value;
          eventIndex += 1;
        }
        totals.push({ second, total: cumulative });
      }

      computedSeries.push({
        actorId,
        name: entry.name,
        color: entry.color,
        totals,
      });
    });

    const colorPalette = computedSeries.map((s) => s.color);
    return { rawSeries: computedSeries, colors: colorPalette, totalSeconds: bucketSeconds };
  }, [players, damageSkillStats, healSkillStats, durationMs, mode]);

  const totalSecondsSafe = Math.max(1, totalSeconds);

  const clampSecond = useCallback(
    (value: number) => {
      if (!Number.isFinite(value)) return 0;
      return Math.min(Math.max(Math.round(value), 0), totalSecondsSafe);
    },
    [totalSecondsSafe],
  );

  const effectiveRange = useMemo(() => {
    const base = rangeOverride ?? { start: 0, end: totalSecondsSafe };
    const start = clampSecond(base.start);
    let end = clampSecond(base.end);
    if (end <= start) {
      end = Math.min(totalSecondsSafe, start + 1);
    }
    return { start, end };
  }, [rangeOverride, clampSecond, totalSecondsSafe]);

  const percentFromSecond = useCallback(
    (second: number) => {
      if (totalSecondsSafe <= 0) return 0;
      return (second / totalSecondsSafe) * 100;
    },
    [totalSecondsSafe],
  );

  const selectionLeftPct = percentFromSecond(effectiveRange.start);
  const selectionRightPct = percentFromSecond(effectiveRange.end);
  const selectionWidthPct = Math.max(0, selectionRightPct - selectionLeftPct);

  const indicators = useMemo(() => {
    if (totalSecondsSafe <= 0) return [] as { second: number; label: string }[];

    // Only show indicators if we have dungeon segments
    if (!dungeonSegments || dungeonSegments.length === 0 || !encounterStartedAt) {
      return [];
    }

    const encounterStart = new Date(encounterStartedAt).getTime();
    const values: { second: number; label: string }[] = [];

    // Add segment boundaries
    dungeonSegments.forEach((segment, idx) => {
      const segmentStart = new Date(segment.startedAt).getTime();
      const segmentStartSecond = Math.max(0, Math.round((segmentStart - encounterStart) / MS_PER_SECOND));

      if (segmentStartSecond > 0) {
        const label = segment.bossName || `${segment.segmentType} ${idx + 1}`;
        const clampedSecond = Math.min(segmentStartSecond, totalSecondsSafe);
        values.push({ second: clampedSecond, label: `Start: ${label}` });
      }

      if (segment.endedAt) {
        const segmentEnd = new Date(segment.endedAt).getTime();
        const segmentEndSecond = Math.max(0, Math.round((segmentEnd - encounterStart) / MS_PER_SECOND));

        if (segmentEndSecond > 0) {
          const label = segment.bossName || `${segment.segmentType} ${idx + 1}`;
          const clampedSecond = Math.min(segmentEndSecond, totalSecondsSafe);
          values.push({ second: clampedSecond, label: `End: ${label}` });
        }
      }
    });

    // Sort by second and remove duplicates
    return values
      .sort((a, b) => a.second - b.second)
      .filter((v, i, arr) => i === 0 || v.second !== arr[i - 1].second);
  }, [totalSecondsSafe, dungeonSegments, encounterStartedAt]);

  const secondsFromClientX = useCallback(
    (clientX: number) => {
      const trackEl = scrubberRef.current;
      if (!trackEl) return null;
      const rect = trackEl.getBoundingClientRect();
      if (rect.width <= 0) return null;
      const usableWidth = rect.width - 2 * SCRUBBER_PADDING_PX;
      const relative = (clientX - rect.left - SCRUBBER_PADDING_PX) / usableWidth;
      const clamped = Math.min(Math.max(relative, 0), 1);
      const second = clamped * totalSecondsSafe;
      return clampSecond(second);
    },
    [clampSecond, totalSecondsSafe],
  );

  const applyHandleChange = useCallback(
    (handle: 'start' | 'end', value: number) => {
      const clampedValue = clampSecond(value);
      setRangeOverride((prev) => {
        const base = prev ?? { start: 0, end: totalSecondsSafe };
        let start = clampSecond(base.start);
        let end = clampSecond(base.end);
        if (handle === 'start') {
          start = Math.min(clampedValue, end - 1);
        } else {
          end = Math.max(clampedValue, start + 1);
        }
        return { start, end };
      });
    },
    [clampSecond, totalSecondsSafe],
  );

  const handleDragStart = useCallback(
    (handle: 'start' | 'end') => (event: ReactPointerEvent<HTMLButtonElement>) => {
      event.preventDefault();
      event.stopPropagation();
      const second = secondsFromClientX(event.clientX);
      if (second !== null) {
        applyHandleChange(handle, second);
      }
      setDraggingHandle(handle);
    },
    [applyHandleChange, secondsFromClientX],
  );

  useEffect(() => {
    if (!draggingHandle) return undefined;

    const handlePointerMove = (event: PointerEvent) => {
      const second = secondsFromClientX(event.clientX);
      if (second !== null) {
        applyHandleChange(draggingHandle, second);
      }
    };

    const stopDragging = () => setDraggingHandle(null);

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', stopDragging);
    window.addEventListener('pointercancel', stopDragging);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', stopDragging);
      window.removeEventListener('pointercancel', stopDragging);
    };
  }, [applyHandleChange, draggingHandle, secondsFromClientX]);

  const handleIndicatorClick = (indicator: { second: number; label: string }) => {
    const target = clampSecond(indicator.second);
    setRangeOverride((prev) => {
      const base = prev ?? { start: effectiveRange.start, end: effectiveRange.end };
      let start = clampSecond(base.start);
      let end = clampSecond(base.end);
      const startDiff = Math.abs(target - start);
      const endDiff = Math.abs(target - end);
      if (startDiff <= endDiff) {
        start = Math.min(target, end - 1);
      } else {
        end = Math.max(target, start + 1);
      }
      return { start, end };
    });
  };

  const getTotalAtSecond = useCallback(
    (totals: Array<{ second: number; total: number }>, second: number) => {
      if (second <= 0) return 0;
      const idx = Math.min(Math.max(second - 1, 0), totals.length - 1);
      return totals[idx]?.total ?? 0;
    },
    [],
  );

  const apexSeries = useMemo(() => {
    const baselineSecond = Math.max(0, effectiveRange.start - 1);
    return rawSeries.map(({ name, totals }) => {
      const baseTotal = getTotalAtSecond(totals, baselineSecond);
      const points = [] as Array<{ x: number; y: number }>; // Apex expects numeric x/y
      for (let second = effectiveRange.start; second <= effectiveRange.end; second += 1) {
        const totalAtSecond = getTotalAtSecond(totals, second);
        const elapsed = second - baselineSecond;
        const dps = elapsed > 0 ? (totalAtSecond - baseTotal) / elapsed : 0;
        points.push({ x: second, y: Number(dps.toFixed(2)) });
      }
      return { name, data: points };
    });
  }, [rawSeries, effectiveRange, getTotalAtSecond]);

  if (apexSeries.length === 0) {
    return (
      <div className="rounded-lg border border-gray-800 bg-gray-900/40 p-6 text-center text-sm text-gray-400">
        DPS over time data is unavailable for this encounter.
      </div>
    );
  }

  const chartOptions: ApexOptions = {
    chart: {
      type: "line",
      height: 320,
      background: "transparent",
      toolbar: { show: false },
      zoom: { enabled: false },
      foreColor: "#9CA3AF",
    },
    colors,
    stroke: {
      width: 2,
      curve: "smooth",
    },
    grid: {
      borderColor: "rgba(75,85,99,0.4)",
      strokeDashArray: 4,
      yaxis: {
        lines: { show: true },
      },
    },
    xaxis: {
      type: "numeric",
      tickAmount: Math.min(10, Math.max(2, Math.floor(totalSeconds / 15))),
      labels: {
        style: {
          colors: "#9CA3AF",
        },
        formatter: (value) => formatSecondsLabel(Number(value)),
      },
      axisBorder: { color: "rgba(75,85,99,0.6)" },
      axisTicks: { color: "rgba(75,85,99,0.6)" },
      min: effectiveRange.start,
      max: effectiveRange.end,
      tooltip: { enabled: false },
    },
    yaxis: {
      labels: {
        style: { colors: "#9CA3AF" },
        formatter: (value) => formatNumber(Number(value)),
      },
      min: 0,
    },
    markers: {
      size: 0,
      hover: {
        size: 6,
      },
    },
    legend: {
      position: "top",
      horizontalAlign: "left",
      labels: {
        colors: "#E5E7EB",
      },
    },
    tooltip: {
      shared: true,
      intersect: false,
      theme: "dark",
      custom: ({ series, dataPointIndex, w }) => {
        const pointSeconds = apexSeries[0]?.data?.[dataPointIndex]?.x ?? 0;
        const header = `<div class="text-xs text-gray-300 mb-2">${formatSecondsLabel(Number(pointSeconds))}</div>`;
        const rowData: Array<{ name: string; val: number; color: string }> = w.globals.seriesNames
          .map((name: string, idx: number) => {
            const val = Number(series[idx]?.[dataPointIndex] ?? 0);
            const color = (w.globals.colors[idx] as string) || "#fff";
            return { name, val, color };
          });

        const rows = rowData
          .sort((a, b) => b.val - a.val)
          .map(({ name, val, color }) => `
              <div class="flex items-center justify-between gap-4 text-xs">
                <span class="flex items-center gap-2"><span class="w-2 h-2 rounded-full" style="background:${color}"></span>${name}</span>
                <span class="font-semibold text-white">${formatNumber(val)} ${mode === 'damage' ? 'DPS' : 'HPS'}</span>
              </div>`)
          .join("");
        return `<div class="bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 shadow-xl">${header}${rows}</div>`;
      },
    },
    dataLabels: {
      enabled: false,
    },
  };

  return (
    <div className="rounded-2xl border border-gray-800 bg-gray-900/50 p-4 shadow-lg">
      <div className="flex flex-col gap-3 pb-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white">{mode === 'damage' ? 'Damage' : 'Healing'} Over Time</h3>
          <p className="text-xs text-gray-400">{mode === 'damage' ? 'Damage' : 'Healing'} sampled every second</p>
        </div>
        <div className="inline-flex overflow-hidden rounded-lg border border-gray-800">
          <button
            type="button"
            onClick={() => setMode('damage')}
            className={`px-3 py-1 text-sm font-medium transition-colors ${
              mode === 'damage' ? 'bg-purple-600 text-white' : 'bg-gray-900/40 text-gray-400 hover:bg-gray-800/60'
            }`}
          >
            Damage
          </button>
          <button
            type="button"
            onClick={() => setMode('healing')}
            className={`px-3 py-1 text-sm font-medium transition-colors ${
              mode === 'healing' ? 'bg-purple-600 text-white' : 'bg-gray-900/40 text-gray-400 hover:bg-gray-800/60'
            }`}
          >
            Healing
          </button>
        </div>
      </div>
      <ReactApexChart options={chartOptions} series={apexSeries} type="line" height={340} />
      {totalSecondsSafe > 1 && (
        <div ref={scrubberRef} className="relative h-16 w-full select-none">
          {/* Background track */}
          <div className="absolute left-9 right-9 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-gray-800/80" />

          {/* Selection highlight */}
          <div
            className="pointer-events-none absolute top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-linear-to-r from-purple-500/50 via-fuchsia-500/40 to-blue-500/40 shadow-[0_0_15px_rgba(192,132,252,0.45)]"
            style={{
              left: `calc(${SCRUBBER_PADDING_PX}px + ${selectionLeftPct}% * (100% - ${2 * SCRUBBER_PADDING_PX}px) / 100%)`,
              width: `calc(${selectionWidthPct}% * (100% - ${2 * SCRUBBER_PADDING_PX}px) / 100%)`,
            }}
          />

          {/* Segment indicators */}
          {indicators.map((indicator, idx) => {
            const normalized = clampSecond(indicator.second);
            const percent = percentFromSecond(normalized);
            const isSelected =
              normalized === effectiveRange.start || normalized === effectiveRange.end;
            return (
              <button
                key={`${indicator.second}-${idx}`}
                type="button"
                className="absolute -translate-x-1/2 focus:outline-none"
                style={{ left: `calc(${SCRUBBER_PADDING_PX}px + ${percent}% * (100% - ${2 * SCRUBBER_PADDING_PX}px) / 100%)`, top: '0' }}
                onClick={() => handleIndicatorClick(indicator)}
              >
                <span
                  className={`block whitespace-nowrap rounded-full border px-2 py-0.5 text-[10px] transition-colors ${
                    isSelected
                      ? 'border-purple-400 bg-purple-600/40 text-white'
                      : 'border-gray-700 bg-gray-900/80 text-gray-300 hover:border-purple-400 hover:text-white'
                  }`}
                >
                  {indicator.label}
                </span>
              </button>
            );
          })}

          {/* Start handle */}
          <button
            type="button"
            className={`absolute top-1/2 -translate-x-1/2 -translate-y-1/2 cursor-ew-resize focus:outline-none ${
              draggingHandle === 'start' ? 'z-20' : 'z-10'
            }`}
            style={{ left: `calc(${SCRUBBER_PADDING_PX}px + ${selectionLeftPct}% * (100% - ${2 * SCRUBBER_PADDING_PX}px) / 100%)` }}
            onPointerDown={handleDragStart('start')}
          >
            <div
              className={`flex h-6 w-6 items-center justify-center rounded-full border text-xs font-semibold transition shadow-lg ${
                draggingHandle === 'start'
                  ? 'border-purple-300 bg-purple-600 text-white'
                  : 'border-gray-700 bg-gray-900 text-gray-200 hover:border-purple-400'
              }`}
            />
            <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] text-gray-400">
              {formatSecondsLabel(effectiveRange.start)}
            </span>
          </button>

          {/* End handle */}
          <button
            type="button"
            className={`absolute top-1/2 -translate-x-1/2 -translate-y-1/2 cursor-ew-resize focus:outline-none ${
              draggingHandle === 'end' ? 'z-20' : 'z-10'
            }`}
            style={{ left: `calc(${SCRUBBER_PADDING_PX}px + ${selectionRightPct}% * (100% - ${2 * SCRUBBER_PADDING_PX}px) / 100%)` }}
            onPointerDown={handleDragStart('end')}
          >
            <div
              className={`flex h-6 w-6 items-center justify-center rounded-full border text-xs font-semibold transition shadow-lg ${
                draggingHandle === 'end'
                  ? 'border-purple-300 bg-blue-600 text-white'
                  : 'border-gray-700 bg-gray-900 text-gray-200 hover:border-purple-400'
              }`}
            />
            <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] text-gray-400">
              {formatSecondsLabel(effectiveRange.end)}
            </span>
          </button>
        </div>
      )}
    </div>
  );
}

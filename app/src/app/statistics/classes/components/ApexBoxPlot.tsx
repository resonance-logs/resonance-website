"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState, useEffect } from "react";
import type { ClassStatsItem } from "@/api/statistics/statistics";
import { getQuartiles, getClassInfo, filterAndSortData } from "../utils";
import { formatNumber } from "@/utils/numberFormatter";

interface ApexBoxPlotProps {
  title: string;
  data: ClassStatsItem[];
  metric: "dps" | "hps";
  className?: string;
  limit?: number;
  subtitle?: string;
}

interface OutlierInfo {
  classSpec: number;
  specName: string;
  encounterId: number;
  value: number;
  color: string;
}

export function ApexBoxPlot({
  title,
  data,
  metric,
  className = "",
  limit,
  subtitle,
}: ApexBoxPlotProps) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const [crosshairX, setCrosshairX] = useState<number | null>(null);
  const [hoveredRowIdx, setHoveredRowIdx] = useState<number | null>(null);
  const [tooltip, setTooltip] = useState<{
    visible: boolean;
    x: number;
    y: number;
    item: ClassStatsItem | null;
    isOutlier?: boolean;
    outlier?: OutlierInfo;
  }>({ visible: false, x: 0, y: 0, item: null });

  // Filter out unknown classes and sort by median performance
  let validData = filterAndSortData(data, metric);

  // Apply limit if specified
  if (limit && limit > 0) {
    validData = validData.slice(0, limit);
  }

  // Build chart data
  const { chartData, outlierData, maxValue } = useMemo(() => {
    const items: Array<{
      item: ClassStatsItem;
      specName: string;
      color: string;
      whiskerMin: number;
      whiskerMax: number;
      q1: number;
      q3: number;
      median: number;
      avg: number;
    }> = [];
    const outliers: OutlierInfo[] = [];
    let max = 0;

    validData.forEach((item) => {
      const quartiles = getQuartiles(item, metric);
      const classInfo = getClassInfo(item.class_spec);
      const specName = classInfo.name || `Spec ${item.class_spec}`;

      items.push({
        item,
        specName,
        color: classInfo.color,
        whiskerMin: quartiles.whiskerMin,
        whiskerMax: quartiles.whiskerMax,
        q1: quartiles.q1,
        q3: quartiles.q3,
        median: quartiles.median,
        avg: quartiles.avg,
      });

      max = Math.max(max, quartiles.whiskerMax);

      if (quartiles.bestOutlier) {
        outliers.push({
          classSpec: item.class_spec,
          specName,
          encounterId: quartiles.bestOutlier.encounterId,
          value: quartiles.bestOutlier.value,
          color: classInfo.color,
        });
        max = Math.max(max, quartiles.bestOutlier.value);
      }
    });

    return { chartData: items, outlierData: outliers, maxValue: max * 1.1 };
  }, [validData, metric]);

  const handleOutlierClick = (outlier: OutlierInfo) => {
    router.push(`/encounter/${outlier.encounterId}`);
  };

  if (validData.length === 0) {
    return (
      <div
        className={`rounded-2xl border border-gray-800/80 bg-linear-to-br from-gray-900/90 via-gray-900/80 to-gray-900/70 backdrop-blur-md p-6 ${className}`}
      >
        <h3 className="text-lg font-semibold text-white mb-1">{title}</h3>
        {subtitle && <p className="text-sm text-gray-400 mb-4">{subtitle}</p>}
        <p className="text-gray-400">No data available</p>
      </div>
    );
  }

  // Chart dimensions
  const rowHeight = 36; // Fatter rows
  const rowGap = 2; // Less gap between rows
  const leftPadding = 140; // Space for labels
  const rightPadding = 20;
  const topPadding = 10;
  const bottomPadding = 30;
  const chartHeight = chartData.length * (rowHeight + rowGap) + topPadding + bottomPadding;

  // Chart positioning as percentages (SVG doesn't support calc())
  // leftPadding ~12% of typical width, rightPadding ~2%
  const leftPaddingPct = 12;
  const rightPaddingPct = 2;
  const chartWidthPct = 100 - leftPaddingPct - rightPaddingPct; // 86%

  // Helper to calculate x position as percentage
  const getXPct = (value: number) => {
    const fraction = maxValue > 0 ? value / maxValue : 0;
    return `${leftPaddingPct + fraction * chartWidthPct}%`;
  };

  // Helper to calculate width as percentage
  const getWidthPct = (startValue: number, endValue: number) => {
    const fractionDiff = maxValue > 0 ? (endValue - startValue) / maxValue : 0;
    return `${fractionDiff * chartWidthPct}%`;
  };

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    setCrosshairX(x > leftPadding && x < rect.width - rightPadding ? x : null);
  };

  const handleMouseLeave = () => {
    setCrosshairX(null);
    setTooltip({ visible: false, x: 0, y: 0, item: null });
  };

  const handleRowHover = (
    e: React.MouseEvent,
    item: ClassStatsItem,
    rowY: number,
    rowIdx: number
  ) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setHoveredRowIdx(rowIdx);
    setTooltip({
      visible: true,
      x: e.clientX - rect.left,
      y: rowY,
      item,
    });
  };

  const handleRowLeave = () => {
    setHoveredRowIdx(null);
    setTooltip({ visible: false, x: 0, y: 0, item: null });
  };

  const handleOutlierHover = (
    e: React.MouseEvent,
    outlier: OutlierInfo,
    rowY: number
  ) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setTooltip({
      visible: true,
      x: e.clientX - rect.left,
      y: rowY,
      item: null,
      isOutlier: true,
      outlier,
    });
  };

  // X-axis ticks - limit to ~5-6 ticks to avoid overlap
  const xTicks = useMemo(() => {
    if (maxValue <= 0) return [0];

    const targetTickCount = 5;
    const rawStep = maxValue / targetTickCount;

    // Safeguard: ensure valid step
    if (rawStep <= 0 || !isFinite(rawStep)) return [0, maxValue];

    // Round to a nice number
    const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep)));
    if (!isFinite(magnitude) || magnitude <= 0) return [0, maxValue];

    const normalized = rawStep / magnitude;
    let niceMultiplier = 1;
    if (normalized <= 1.5) niceMultiplier = 1;
    else if (normalized <= 3) niceMultiplier = 2;
    else if (normalized <= 7) niceMultiplier = 5;
    else niceMultiplier = 10;

    const tickStep = niceMultiplier * magnitude;
    if (tickStep <= 0) return [0, maxValue];

    const ticks: number[] = [];
    for (let v = 0; v <= maxValue && ticks.length < 8; v += tickStep) {
      ticks.push(Math.round(v));
    }
    return ticks;
  }, [maxValue]);

  return (
    <div
      ref={containerRef}
      className={`rounded-2xl border border-gray-800/80 bg-linear-to-br from-gray-900/90 via-gray-900/80 to-gray-900/70 backdrop-blur-md p-5 transition-all duration-300 hover:border-purple-500/50 hover:shadow-xl hover:shadow-purple-500/10 ${className}`}
    >
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-white">{title}</h3>
        {subtitle && <p className="text-sm text-gray-400 mt-1">{subtitle}</p>}
      </div>

      <div className="relative">
        <svg
          width="100%"
          height={chartHeight}
          className="overflow-visible"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          {/* Grid lines */}
          {xTicks.map((tick) => (
            <line
              key={tick}
              x1={getXPct(tick)}
              x2={getXPct(tick)}
              y1={topPadding}
              y2={chartHeight - bottomPadding}
              stroke="rgba(75,85,99,0.3)"
              strokeDasharray="4"
            />
          ))}

          {/* Row highlight on hover */}
          {hoveredRowIdx !== null && (
            <rect
              x={0}
              y={topPadding + hoveredRowIdx * (rowHeight + rowGap)}
              width="100%"
              height={rowHeight}
              fill="rgba(255,255,255,0.08)"
              pointerEvents="none"
            />
          )}

          {/* X-axis line */}
          <line
            x1={leftPadding}
            x2="100%"
            y1={chartHeight - bottomPadding}
            y2={chartHeight - bottomPadding}
            stroke="rgba(75,85,99,0.6)"
            strokeWidth={1}
          />

          {/* Y-axis line */}
          <line
            x1={leftPadding}
            x2={leftPadding}
            y1={topPadding}
            y2={chartHeight - bottomPadding}
            stroke="rgba(75,85,99,0.6)"
            strokeWidth={1}
          />

          {/* Box plots */}
          {chartData.map((row, idx) => {
            const y = topPadding + idx * (rowHeight + rowGap) + rowHeight / 2;
            const barHeight = rowHeight * 0.7;

            return (
              <g
                key={row.specName}
                className="cursor-pointer"
                onMouseEnter={(e) => handleRowHover(e, row.item, y, idx)}
                onMouseMove={(e) => handleRowHover(e, row.item, y, idx)}
                onMouseLeave={handleRowLeave}
              >
                {/* Invisible hit area for the whole row */}
                <rect
                  x={leftPadding}
                  y={y - rowHeight / 2}
                  width={`calc(100% - ${leftPadding + rightPadding}px)`}
                  height={rowHeight}
                  fill="transparent"
                />

                {/* Y-axis label */}
                <text
                  x={leftPadding - 8}
                  y={y}
                  textAnchor="end"
                  dominantBaseline="middle"
                  className="fill-gray-300 text-xs font-medium"
                >
                  {row.specName}
                </text>

                {/* Whisker line (min to max) */}
                <line
                  x1={getXPct(row.whiskerMin)}
                  x2={getXPct(row.whiskerMax)}
                  y1={y}
                  y2={y}
                  stroke={row.color}
                  strokeWidth={2}
                  strokeOpacity={0.5}
                />

                {/* Whisker end caps */}
                <line
                  x1={getXPct(row.whiskerMin)}
                  x2={getXPct(row.whiskerMin)}
                  y1={y - barHeight / 3}
                  y2={y + barHeight / 3}
                  stroke={row.color}
                  strokeWidth={2}
                />
                <line
                  x1={getXPct(row.whiskerMax)}
                  x2={getXPct(row.whiskerMax)}
                  y1={y - barHeight / 3}
                  y2={y + barHeight / 3}
                  stroke={row.color}
                  strokeWidth={2}
                />

                {/* IQR box (Q1 to Q3) */}
                <rect
                  x={getXPct(row.q1)}
                  y={y - barHeight / 2}
                  width={getWidthPct(row.q1, row.q3)}
                  height={barHeight}
                  fill={row.color}
                  fillOpacity={0.4}
                  stroke={row.color}
                  strokeWidth={1}
                  rx={3}
                />

                {/* Median line */}
                <line
                  x1={getXPct(row.median)}
                  x2={getXPct(row.median)}
                  y1={y - barHeight / 2 - 2}
                  y2={y + barHeight / 2 + 2}
                  stroke="white"
                  strokeWidth={2}
                />
              </g>
            );
          })}

          {/* Outlier diamonds */}
          {outlierData.map((outlier, idx) => {
            const rowIdx = chartData.findIndex(
              (r) => r.specName === outlier.specName
            );
            if (rowIdx === -1) return null;
            const y =
              topPadding + rowIdx * (rowHeight + rowGap) + rowHeight / 2;

            return (
              <g
                key={`outlier-${outlier.classSpec}`}
                className="cursor-pointer"
                onClick={() => handleOutlierClick(outlier)}
                onMouseEnter={(e) => handleOutlierHover(e, outlier, y)}
                onMouseMove={(e) => handleOutlierHover(e, outlier, y)}
                onMouseLeave={handleRowLeave}
              >
                <rect
                  x={`calc(${getXPct(outlier.value)} - 6px)`}
                  y={y - 6}
                  width={12}
                  height={12}
                  fill="#6b7280"
                  stroke="#9ca3af"
                  strokeWidth={1}
                  transform={`rotate(45)`}
                  style={{
                    transformOrigin: `${getXPct(outlier.value)} ${y}px`,
                  }}
                />
                {/* Hover area for outlier */}
                <circle
                  cx={getXPct(outlier.value)}
                  cy={y}
                  r={12}
                  fill="transparent"
                />
              </g>
            );
          })}

          {/* X-axis labels */}
          {xTicks.map((tick) => (
            <text
              key={`label-${tick}`}
              x={getXPct(tick)}
              y={chartHeight - 8}
              textAnchor="middle"
              className="fill-gray-400 text-xs"
            >
              {formatNumber(tick)}
            </text>
          ))}

          {/* Crosshair */}
          {crosshairX !== null && (
            <line
              x1={crosshairX}
              x2={crosshairX}
              y1={topPadding}
              y2={chartHeight - bottomPadding}
              stroke="#a78bfa"
              strokeWidth={1}
              strokeDasharray="4"
              pointerEvents="none"
            />
          )}
        </svg>

        {/* Tooltip */}
        {tooltip.visible && (tooltip.item || tooltip.isOutlier) && (
          <div
            className="absolute z-50 pointer-events-none bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 shadow-xl min-w-[180px]"
            style={{
              left: Math.min(tooltip.x + 10, (containerRef.current?.offsetWidth ?? 300) - 200),
              top: tooltip.y - 80,
            }}
          >
            {tooltip.isOutlier && tooltip.outlier ? (
              // Outlier tooltip
              <>
                <div className="flex items-center gap-2 mb-2 pb-2 border-b border-gray-700">
                  <div
                    className="w-2 h-2 bg-gray-500 border border-gray-400"
                    style={{ transform: "rotate(45deg)" }}
                  />
                  <span className="text-white font-semibold">Best Outlier</span>
                </div>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between gap-4">
                    <span className="text-gray-400">Class:</span>
                    <span className="text-white">{tooltip.outlier.specName}</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-gray-400">{metric.toUpperCase()}:</span>
                    <span className="text-purple-300 font-bold">
                      {formatNumber(tooltip.outlier.value)}
                    </span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-gray-400">Encounter ID:</span>
                    <span className="text-blue-300">{tooltip.outlier.encounterId}</span>
                  </div>
                  <div className="text-gray-500 text-center mt-2 pt-2 border-t border-gray-700">
                    Click to view encounter
                  </div>
                </div>
              </>
            ) : tooltip.item ? (
              (() => {
                const quartiles = getQuartiles(tooltip.item, metric);
                const classInfo = getClassInfo(tooltip.item.class_spec);
                const specName = classInfo.name || `Spec ${tooltip.item.class_spec}`;

                return (
                  <>
                    <div className="flex items-center gap-2 mb-2 pb-2 border-b border-gray-700">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: classInfo.color }}
                      />
                      <span className="text-white font-semibold">{specName}</span>
                    </div>
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between gap-4">
                        <span className="text-gray-400">Whisker Min:</span>
                        <span className="text-white">
                          {formatNumber(quartiles.whiskerMin)}
                        </span>
                      </div>
                      <div className="flex justify-between gap-4">
                        <span className="text-gray-400">Q1 (25%):</span>
                        <span className="text-white">
                          {formatNumber(quartiles.q1)}
                        </span>
                      </div>
                      <div className="flex justify-between gap-4 font-semibold">
                        <span className="text-gray-300">Median:</span>
                        <span className="text-purple-300">
                          {formatNumber(quartiles.median)}
                        </span>
                      </div>
                      <div className="flex justify-between gap-4">
                        <span className="text-gray-400">Q3 (75%):</span>
                        <span className="text-white">
                          {formatNumber(quartiles.q3)}
                        </span>
                      </div>
                      <div className="flex justify-between gap-4">
                        <span className="text-gray-400">Whisker Max:</span>
                        <span className="text-white">
                          {formatNumber(quartiles.whiskerMax)}
                        </span>
                      </div>
                      <div className="flex justify-between gap-4 pt-1 border-t border-gray-700">
                        <span className="text-yellow-400">Average:</span>
                        <span className="text-yellow-300">
                          {formatNumber(quartiles.avg)}
                        </span>
                      </div>
                      {quartiles.bestOutlier && (
                        <div className="flex justify-between gap-4">
                          <span className="text-red-400">Best Outlier:</span>
                          <span className="text-red-300">
                            {formatNumber(quartiles.bestOutlier.value)}
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between gap-4 pt-1 border-t border-gray-700">
                        <span className="text-gray-400">Sample Size:</span>
                        <span className="text-white">
                          {tooltip.item.count.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </>
                );
              })()
            ) : null}
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="mt-3 pt-3 border-t border-gray-700/50">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-3 text-gray-400">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-0.5 bg-white"></div>
              <span>Median</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm bg-purple-500/60 border border-purple-400"></div>
              <span>IQR (Q1-Q3)</span>
            </div>
            {outlierData.length > 0 && (
              <div className="flex items-center gap-1.5">
                <div
                  className="w-2 h-2 bg-gray-500 border border-gray-400"
                  style={{ transform: "rotate(45deg)" }}
                ></div>
                <span>Best Outlier (clickable)</span>
              </div>
            )}
          </div>
          <span className="text-gray-500 text-xs">
            Sorted by median • Hover for details
          </span>
        </div>
      </div>
    </div>
  );
}

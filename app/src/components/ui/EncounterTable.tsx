"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Encounter } from "@/types/commonTypes";
import { formatDuration, formatRelativeTime, getDuration } from "@/utils/timeFormat";
import { formatNumber } from "@/utils/numberFormatter";
import { getType } from "@/utils/classData";

interface Props {
  rows: Encounter[];
  isLoading?: boolean;
  limit?: number;
  onRowClick?: (encounter: Encounter) => void;
}

export default function EncounterTable({ rows, isLoading = false, limit = 20, onRowClick }: Props) {
  const router = useRouter();

  const SkeletonRow = () => (
    <tr className="border-b border-gray-800">
      <td className="px-6 py-4 h-[77px] box-border align-middle">
        <div className="h-4 bg-gray-700 rounded animate-pulse w-48"></div>
      </td>
      <td className="px-6 py-4 h-[77px] box-border text-right align-middle">
        <div className="h-4 bg-gray-700 rounded animate-pulse w-28 inline-block"></div>
      </td>
      <td className="px-6 py-4 h-[77px] box-border text-right align-middle">
        <div className="h-4 bg-gray-700 rounded animate-pulse w-24 inline-block"></div>
      </td>
      <td className="px-6 py-4 h-[77px] box-border text-right align-middle">
        <div className="h-4 bg-gray-700 rounded animate-pulse w-32 inline-block"></div>
      </td>
    </tr>
  );

  return (
    <div className="rounded-lg border border-gray-800 bg-gray-900/40">
      <table className="w-full">
        <thead className="table-fixed">
          <tr className="border-b border-gray-800">
            <th className="text-left px-6 py-4 box-border not-odd:font-semibold text-gray-300 w-1/2">Encounter</th>
            <th className="text-right px-6 py-4 box-border font-semibold text-gray-300 w-1/6">Performance</th>
            <th className="text-right px-6 py-4 box-border font-semibold text-gray-300 w-1/6">Duration</th>
            <th className="text-right px-6 py-4 box-border font-semibold text-gray-300 w-1/6">Date</th>
          </tr>
        </thead>
        <tbody>
          {isLoading ? (
            Array.from({ length: limit }).map((_, idx) => <SkeletonRow key={idx} />)
          ) : (
            rows?.map((encounter) => {
              const localPlayer = encounter?.players?.filter((e) => e.isLocalPlayer)[0];
              const duration = Math.max(1, getDuration(encounter?.startedAt, encounter?.endedAt));
              const classType = localPlayer ? getType(localPlayer.classId ?? 0, localPlayer.classSpec ?? 0) : "damage";

              const dps = formatNumber(Math.round((localPlayer?.damageDealt || 0) / duration));
              const hps = formatNumber(Math.round((localPlayer?.healDealt || 0) / duration));

              const showDps = classType === "damage" || classType === "tank" || classType === "damagehealer";
              const showHps = classType === "healer" || classType === "damagehealer";

              return (
                <tr
                  key={encounter?.id}
                  onClick={() => (onRowClick ? onRowClick(encounter) : router.push(`/encounter/${encounter?.id}`))}
                  className="border-b border-gray-800/50 transition-all duration-150 group cursor-pointer"
                  style={{ backgroundImage: 'linear-gradient(90deg, rgba(124,58,237,0.06), rgba(0,0,0,0))' }}
                >
                    <td className="px-6 py-4 box-border align-top w-1/2">
                    <div className="flex flex-col">
                      <div className="font-medium text-white group-hover:text-purple-300 transition-colors">{encounter?.sceneName || 'Unknown Scene'}</div>
                      <div className="text-xs text-gray-400 mt-1">{encounter?.bosses?.[0]?.monsterName || 'Unknown Boss'}</div>
                    </div>
                  </td>
                    <td className="px-6 py-4 box-border align-center w-1/6 text-right">
                      <div className="inline-flex items-center gap-2 justify-end whitespace-nowrap">
                      {showDps && (
                        <div className="inline-flex items-center gap-2 bg-gray-800/40 px-3 py-1 rounded-md">
                          <span className="text-gray-400 text-xs">DPS</span>
                          <span className="text-red-400 font-mono text-sm">{dps}</span>
                        </div>
                      )}
                      {showHps && (
                        <div className="inline-flex items-center gap-2 bg-gray-800/40 px-3 py-1 rounded-md">
                          <span className="text-gray-400 text-xs">HPS</span>
                          <span className="text-green-400 font-mono text-sm">{hps}</span>
                        </div>
                      )}
                    </div>
                  </td>
                    <td className="px-6 py-4 box-border  align-center w-1/6 text-right">
                      <div className="text-sm text-gray-300 font-mono">{formatDuration(encounter?.startedAt, encounter?.endedAt)}</div>
                    </td>
                    <td className="px-6 py-4 box-border  align-center w-1/6 text-right">
                      <div className="text-sm text-gray-300">{formatRelativeTime(encounter?.startedAt)}</div>
                    </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}

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
      <td className="px-6 py-4">
        <div className="h-4 bg-gray-700 rounded animate-pulse w-32"></div>
      </td>
      <td className="px-6 py-4">
        <div className="h-4 bg-gray-700 rounded animate-pulse w-24"></div>
      </td>
      <td className="px-6 py-4">
        <div className="h-4 bg-gray-700 rounded animate-pulse w-20"></div>
      </td>
      <td className="px-6 py-4">
        <div className="h-4 bg-gray-700 rounded animate-pulse w-16"></div>
      </td>
    </tr>
  );

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-700">
            <th className="text-left px-6 py-4 font-semibold text-gray-300 w-2xl">Encounter</th>
            <th className="text-left px-6 py-4 font-semibold text-gray-300">Performance</th>
            <th className="text-left px-6 py-4 font-semibold text-gray-300">Duration</th>
            <th className="text-left px-6 py-4 font-semibold text-gray-300">Date</th>
          </tr>
        </thead>
        <tbody>
          {isLoading ? (
            Array.from({ length: limit }).map((_, idx) => <SkeletonRow key={idx} />)
          ) : (
            rows?.map((encounter) => {
              const localPlayer = encounter?.players?.filter((e) => e.isLocalPlayer)[0];
              const duration = getDuration(encounter?.startedAt, encounter?.endedAt);
              const classType = localPlayer ? getType(localPlayer.classId ?? 0, localPlayer.classSpec ?? 0) : "damage";

              const dps = formatNumber((localPlayer?.damageDealt || 0) / duration);
              const hps = formatNumber((localPlayer?.healDealt || 0) / duration);

              const showDps = classType === "damage" || classType === "tank" || classType === "damagehealer";
              const showHps = classType === "healer" || classType === "damagehealer";

              return (
                <tr
                  key={encounter?.id}
                  onClick={() => (onRowClick ? onRowClick(encounter) : router.push(`/encounter/${encounter?.id}`))}
                  className="border-b border-gray-800/50 hover:bg-purple-900/20 transition-all duration-200 group cursor-pointer"
                >
                  <td className="px-6 py-4">
                    <div className="font-medium text-white group-hover:text-purple-300 transition-colors">
                      {`${encounter?.sceneName} · ${encounter?.bosses?.[0].monsterName}` || "Unknown Scene"}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1">
                      {showDps && (
                        <div className="text-sm font-mono">
                          <span className="text-gray-400 text-xs mr-2">DPS</span>
                          <span className="text-red-400">{dps}</span>
                        </div>
                      )}
                      {showHps && (
                        <div className="text-sm font-mono">
                          <span className="text-gray-400 text-xs mr-2">HPS</span>
                          <span className="text-green-400">{hps}</span>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-300 font-mono">{formatDuration(encounter?.startedAt, encounter?.endedAt)}</div>
                  </td>
                  <td className="px-6 py-4">
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

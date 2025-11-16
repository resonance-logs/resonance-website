"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { Encounter } from "@/types/commonTypes";
import { formatDuration, formatRelativeTime, getDuration } from "@/utils/timeFormat";
import { formatNumber } from "@/utils/numberFormatter";
import { CLASS_MAP, getClassIconName, getClassTooltip, getType } from "@/utils/classData";

interface Props {
  rows: Encounter[];
  isLoading?: boolean;
  limit?: number;
  onRowClick?: (encounter: Encounter) => void;
  showLocalPlayerDetails?: boolean;
}

export default function EncounterTable({ rows, isLoading = false, limit = 20, onRowClick, showLocalPlayerDetails = false }: Props) {
  const router = useRouter();

  const handleNavigate = (encounter: Encounter) => {
    if (onRowClick) {
      onRowClick(encounter);
    } else {
      router.push(`/encounter/${encounter.id}`);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: limit }).map((_, idx) => (
          <SkeletonCard key={idx} />
        ))}
      </div>
    );
  }

  if (!rows.length) {
    return (
      <div className="text-center py-12 border border-dashed border-gray-800/80 rounded-2xl bg-gray-900/40">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-800/60 rounded-full mb-4">
          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-white mb-2">No encounters found</h3>
        <p className="text-gray-400">Try adjusting your filters or check back later.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {rows.map((encounter, idx) => {
        const localPlayer = encounter?.players?.find((player) => player.isLocalPlayer);
        const duration = Math.max(1, getDuration(encounter?.startedAt, encounter?.endedAt));
        const classType = localPlayer ? getType(localPlayer.classId ?? 0, localPlayer.classSpec ?? 0) : "damage";
        const dps = formatNumber(Math.round((localPlayer?.damageDealt || 0) / duration));
        const hps = formatNumber(Math.round((localPlayer?.healDealt || 0) / duration));
        const showDps = classType === "damage" || classType === "tank" || classType === "damagehealer";
        const showHps = classType === "healer" || classType === "damagehealer";
        const teamDps = Math.round((encounter.totalDmg ?? 0) / duration);
        const playerCount = encounter.players?.filter((p) => p.isPlayer)?.length ?? 0;
        const showPlayerSummary = showLocalPlayerDetails && !!localPlayer;
        const classLabel = localPlayer?.classId ? CLASS_MAP[localPlayer.classId] : undefined;
        const classTooltip = localPlayer ? getClassTooltip(localPlayer.classId ?? undefined, localPlayer.classSpec ?? undefined) : "";
        const specLabel = classTooltip.includes(" · ") ? classTooltip.split(" · ")[1] : undefined;
        const uploaderName = (encounter.user?.discord_global_name ?? encounter.user?.discord_username) ?? "Fireteam";
        const uploaderAvatarUrl = encounter.user?.discord_avatar_url;
        const uploaderInitial = uploaderName.charAt(0).toUpperCase();

        const avatarNode = (
          <div className="relative h-10 w-10 rounded-full overflow-hidden border-2 border-gray-700/80 bg-white/5 flex items-center justify-center text-sm font-semibold text-white shadow-md shrink-0">
            {uploaderAvatarUrl ? (
              <Image src={uploaderAvatarUrl} alt={uploaderName} fill sizes="40px" className="object-cover" />
            ) : (
              <span>{uploaderInitial}</span>
            )}
          </div>
        );

        return (
          <button
            type="button"
            key={encounter.id ?? idx}
            onClick={() => handleNavigate(encounter)}
            className="w-full group flex h-[120px] rounded-xl border border-gray-800/80 bg-linear-to-br from-gray-900/90 via-gray-900/80 to-gray-900/70 backdrop-blur-md p-4 transition-all duration-300 hover:border-purple-500/50 hover:shadow-xl hover:shadow-purple-500/10 hover:scale-[1.01] relative overflow-hidden text-left animate-slide-up"
            style={{ animationDelay: `${idx * 50}ms` }}
          >
            <div className="absolute inset-0 opacity-5 pointer-events-none" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width="40" height="40" xmlns="http://www.w3.org/2000/svg"%3E%3Cpath d="M0 0h40v40H0z" fill="none"/%3E%3Cpath d="M20 0v40M0 20h40" stroke="%23fff" stroke-width="0.5" opacity="0.1"/%3E%3C/svg%3E")' }}></div>

            <div className="flex flex-col lg:flex-row items-stretch justify-between gap-4 w-full relative z-10">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                {avatarNode}
                <div className="flex-1 min-w-0">
                  <p className="text-lg font-bold text-white group-hover:text-purple-200 transition-colors truncate">
                    {encounter.sceneName || "Unknown Scene"}
                  </p>
                  <div className="flex items-center gap-2 text-sm text-gray-400 flex-wrap">
                    <span>{encounter.bosses?.[0]?.monsterName || "Unknown Boss"}</span>
                    <span className="hidden sm:inline">•</span>
                    <span>Session #{encounter.id}</span>
                  </div>
                  <div className="text-xs text-gray-500 flex flex-wrap gap-2 items-center">
                    <span>{formatRelativeTime(encounter.startedAt)}</span>
                    <span>•</span>
                    <span>{playerCount} player{playerCount !== 1 ? "s" : ""}</span>
                    <span>•</span>
                    <span>{uploaderName}</span>
                  </div>
                </div>
              </div>



              <div className="flex gap-2 shrink-0 min-w-0 justify-items-end">

                {showPlayerSummary && localPlayer && (
                  <div className="flex justify-center rounded-2xl border border-purple-500/30 bg-purple-500/10 px-4 py-3 self-stretch">
                    <div className="flex items-center gap-1">
                      <div
                        className="relative h-14 w-14 rounded-full overflow-hidden flex items-center justify-center shrink-0"
                        title={classTooltip}
                      >
                        <Image
                          src={`/images/classes/${getClassIconName(localPlayer.classId ?? undefined)}`}
                          alt={classLabel || "Class icon"}
                          fill
                          sizes="48px"
                          className="object-contain"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-white truncate">{localPlayer.name || "Unknown Player"}</p>
                        <p className="text-xs text-gray-300 truncate">
                          {classLabel || "Unknown Class"}
                          
                        </p>
                        <p className="text-xs text-gray-300 truncate">
                          {specLabel && <span className="text-gray-500">{specLabel}</span>}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {showPlayerSummary && localPlayer && showDps && <StatCard label="Your DPS" value={dps} accent="red" />}

                {showPlayerSummary && localPlayer && showHps && <StatCard label="Your HPS" value={hps} accent="green" />}

                <StatCard label="Team DPS" value={formatNumber(teamDps)} accent="purple" />

                <StatCard label="Total DMG" value={formatNumber(encounter.totalDmg ?? 0)} accent="slate" />

                <StatCard label="Duration" value={formatDuration(encounter.startedAt, encounter.endedAt)} accent="white" />
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="flex h-full rounded-2xl border border-gray-800/80 bg-linear-to-br from-gray-900/90 via-gray-900/80 to-gray-900/70 backdrop-blur-md p-6 animate-pulse">
      <div className="flex flex-wrap items-start justify-between gap-6 w-full">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-full bg-gray-700/50" />
          <div>
            <div className="h-5 w-32 rounded bg-gray-700/50 mb-2" />
            <div className="h-3 w-24 rounded bg-gray-700/50 mb-1" />
            <div className="h-3 w-20 rounded bg-gray-700/50" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="text-right">
              <div className="h-3 w-16 rounded bg-gray-700/50 mb-2 ml-auto" />
              <div className="h-5 w-20 rounded bg-gray-700/50 ml-auto" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function PlayerStatPill({ label, value, tone }: { label: string; value: string; tone: "red" | "green" }) {
  const toneClasses = tone === "red" ? "text-red-300 bg-red-500/10 border-red-500/30" : "text-green-300 bg-green-500/10 border-green-500/30";
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full border text-[10px] font-semibold ${toneClasses}`}>
      <span className="uppercase tracking-wide text-gray-300">{label}</span>
      <span className="font-mono text-xs">{value}</span>
    </span>
  );
}

function StatCard({ label, value, accent }: { label: string; value: string | number; accent: "purple" | "red" | "green" | "slate" | "white" }) {
  const accentClasses: Record<string, string> = {
    purple: "bg-purple-500/10 border border-purple-500/20 text-purple-200",
    red: "bg-red-500/10 border border-red-500/20 text-red-200",
    green: "bg-green-500/10 border border-green-500/20 text-green-200",
    slate: "bg-gray-800/70 border border-gray-700 text-gray-200",
    white: "bg-gray-800/70 border border-gray-700 text-white",
  };

  return (
    <div className={`text-center p-3 rounded-lg min-w-[90px] min-h-[60px] flex flex-col justify-center ${accentClasses[accent]}`}>
      <p className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold">{label}</p>
      <p className="mt-1 text-lg font-bold truncate">{value}</p>
    </div>
  );
}

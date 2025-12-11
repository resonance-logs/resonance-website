"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import type { CSSProperties, ReactNode } from "react";
import { Encounter, EncounterTableEntryThemeKey, User } from "@/types/commonTypes";
import { formatDuration, formatRelativeTime, getDuration } from "@/utils/timeFormat";
import { formatNumber } from "@/utils/numberFormatter";
import { CLASS_MAP, getClassIconName, getClassTooltip, getType } from "@/utils/classData";
import { UploaderAvatar, getUploaderName } from "@/components/ui/UploaderAvatar";
import { Tooltip } from "antd";
import SceneData from "@/data/SceneData.json";

export type ThemeConfig = {
  containerClass?: string;
  containerStyle?: CSSProperties;
  backgroundBlur?: string;
  overlay?: ReactNode;
  statCardClass?: string;
  avatarRingClass?: string;
  fontClass?: string;
  titleClass?: string;
};

export const ENCOUNTER_THEME_METADATA: Record<EncounterTableEntryThemeKey, { name: string; description: string; swatch: string }> = {
  default: {
    name: "Classic",
    description: "Glassmorphism with subtle grid lines.",
    swatch: "from-gray-800 via-gray-900 to-slate-800",
  },
  "blossoming-sakura-tree": {
    name: "Blossoming Sakura Tree",
    description: "Petal glow, rose gradients, and gentle spring light.",
    swatch: "from-rose-500 via-pink-500 to-amber-300",
  },
  "starry-night": {
    name: "Starry Night",
    description: "Deep indigo sky with drifting stars and cyan highlights.",
    swatch: "from-indigo-900 via-slate-800 to-cyan-600",
  },
  "summer-sunset": {
    name: "Summer Sunset",
    description: "Warm sunset over the sea with soft evening tones.",
    swatch: "from-amber-300 via-orange-400 to-rose-400",
  },
  "cyberpunk": {
    name: "Cyberpunk",
    description: "Neon city nights with synthwave colors and chrome accents.",
    swatch: "from-fuchsia-500 via-purple-700 to-blue-600",
  },
};

export const ENCOUNTER_THEME_KEYS = Object.keys(ENCOUNTER_THEME_METADATA) as EncounterTableEntryThemeKey[];



const THEME_CONFIGS: Record<EncounterTableEntryThemeKey, ThemeConfig> = {
  default: {
    containerClass:
      "border-gray-800/80 bg-linear-to-br from-gray-900/90 via-gray-900/80 to-gray-900/70 hover:border-purple-500/50 hover:shadow-xl hover:shadow-purple-500/10",
    statCardClass: "",
  },
  "blossoming-sakura-tree": {
    containerClass:
      "border-rose-200/60 bg-gradient-to-br from-[#2b0b21]/90 via-[#3f0f2d]/85 to-[#4b1736]/80 shadow-rose-500/25 hover:shadow-rose-400/30 hover:border-rose-200/80",
    containerStyle: {
      backgroundImage: 'url("/images/themes/sakura-tree.gif")',
      backgroundSize: 'cover',
      backgroundPosition: 'center 45%',
      backgroundRepeat: 'no-repeat',
    },
    statCardClass: "bg-rose-500/15 border-rose-200/50 text-rose-50 shadow-rose-500/20 backdrop-blur",
    avatarRingClass: "ring-2 ring-rose-200/80 rounded-full p-1 shadow-rose-400/40",
    titleClass: "text-rose-50",
    fontClass: "tracking-wide",
  },
  "starry-night": {
    containerClass:
      "border-indigo-400/60 bg-gradient-to-br from-[#0b1026]/95 via-[#0f1838]/90 to-[#0d244d]/85 shadow-cyan-500/20 hover:border-cyan-300/70 hover:shadow-cyan-500/25",
    containerStyle: {
      backgroundImage: 'url("/images/themes/shooting-star-anime.gif")',
      backgroundSize: 'cover',
      backgroundPosition: '10% 90%',
      backgroundRepeat: 'no-repeat',
    },
    statCardClass: "bg-slate-900/70 border-cyan-300/30 text-cyan-50 shadow-cyan-400/20",
    avatarRingClass: "ring-2 ring-cyan-300/70 rounded-full p-0.5 shadow-cyan-500/30",
    titleClass: "text-cyan-50",
    fontClass: "tracking-tight",
  },
  "summer-sunset": {
    containerClass:
      "border-indigo-400/60 bg-gradient-to-br from-[#0b1026]/95 via-[#0f1838]/90 to-[#0d244d]/85 shadow-cyan-500/20 hover:border-cyan-300/70 hover:shadow-cyan-500/25",
    containerStyle: {
      backgroundImage: 'url("/images/themes/sunset.png")',
      backgroundSize: 'cover',
      backgroundPosition: 'center 65%',
      backgroundRepeat: 'no-repeat',
    },
    statCardClass: "bg-slate-900/70 border-cyan-300/30 text-white shadow-amber-200/40",
    avatarRingClass: "ring-2 ring-white/80 rounded-full p-1 shadow-cyan-200/50",
    titleClass: "text-white",
    fontClass: "text-white tracking-wide",
  },
  "cyberpunk": {
    containerClass:
      "border-pink-400/70 bg-gradient-to-br from-[#18002b]/90 via-[#1b0a3d]/85 to-[#061226]/90 shadow-pink-500/30 hover:border-cyan-300/80 hover:shadow-pink-500/40",
    containerStyle: {
      backgroundImage: 'url("/images/themes/cyberpunk.gif")',
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
    },
    statCardClass: "bg-gradient-to-br from-[#3b0764]/60 via-[#0ea5e9]/30 to-[#111827]/80 border-pink-400/50 text-white shadow-cyan-400/30",
    avatarRingClass: "ring-2 ring-pink-300/70 rounded-full p-1 shadow-pink-500/40",
    titleClass: "text-white",
    fontClass: "text-white tracking-[0.02em]",
  },
};

interface Props {
  encounter?: Encounter;
  idx: number;
  loading?: boolean;
  showLocalPlayerDetails?: boolean;
  disableNavigation?: boolean;
  onRowClick?: (encounter: Encounter) => void;
  themeKey?: EncounterTableEntryThemeKey;
}

export default function EncounterTableEntry({ encounter, idx, loading = false, showLocalPlayerDetails = false, disableNavigation = false, onRowClick, themeKey }: Props) {
  const router = useRouter();

  if (loading) {
    return <SkeletonCard />;
  }

  if (!encounter) return null;

  const handleNavigate = (e: Encounter) => {
    if (disableNavigation) return;
    if (onRowClick) {
      onRowClick(e);
    } else {
      router.push(`/encounter/${e.id}`);
    }
  };

  const resolvedThemeKey: EncounterTableEntryThemeKey =
    themeKey || (encounter.user?.customization?.encounterTableEntryTheme as EncounterTableEntryThemeKey) || "default";
  const theme = THEME_CONFIGS[resolvedThemeKey] ?? THEME_CONFIGS.default;
  const baseContainerClasses =
    "w-full group flex h-[120px] rounded-xl border backdrop-blur-md p-4 transition-all duration-300 hover:scale-[1.01] relative overflow-hidden text-left";
  const buttonStyle: CSSProperties = { ...(theme.containerStyle ?? {}) };
  // If theme requests a blurred background, don't set the backgroundImage on the button
  if (theme.backgroundBlur && (buttonStyle as unknown as Record<string, unknown>).backgroundImage) {
    const bs = buttonStyle as Record<string, unknown>;
    delete bs.backgroundImage;
  }

  const localPlayer = encounter.players?.find((player) => player.isLocalPlayer);
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
  const uploaderName = getUploaderName(encounter.user, "Fireteam");

  const coOwners = (encounter.owners || [])
    .filter((o) => o.userId !== encounter.user?.id)
    .map((o) => o.user || ({
      id: o.userId,
      discord_username: "Anonymous",
      discord_user_id: "",
      role: "user",
      created_at: "",
      updated_at: "",
      anonymize_uploader: true,
    } as User));

  const avatarNode = (
    <div className="relative inline-block" style={{ width: 68, height: 68 }}>
      <div className="absolute inset-0 flex items-center justify-center">
        <UploaderAvatar user={encounter.user} size={56} />
      </div>
      {(coOwners || []).slice(0, 4).map((u, i) => {
        const positions = [
          { bottom: -2, right: -2 },
          { bottom: 18, right: -8 },
          { top: 10, right: -4 },
          { top: -4, right: 14 }
        ];
        const pos = positions[i] || {};

        return (
          <Tooltip key={u.id} title={`Co-owner: ${getUploaderName(u)}`}>
            <div
              className="absolute z-20 ring-2 ring-gray-900 rounded-full bg-gray-900 hover:z-30 hover:scale-125 transition-transform"
              style={{ ...pos }}
            >
              <UploaderAvatar user={u} size={22} />
            </div>
          </Tooltip>
        );
      })}
    </div>
  );

  return (
    <button
      type="button"
      key={encounter.id ?? idx}
      onClick={() => handleNavigate(encounter)}
      className={`${baseContainerClasses} ${theme.containerClass ?? ""}`}
      style={buttonStyle}
    >
      {/* blurred background div (separate from button background) */}
      {theme.backgroundBlur && theme.containerStyle?.backgroundImage && (
        <div
          className="absolute inset-0 pointer-events-none z-0"
          style={{
            backgroundImage: theme.containerStyle.backgroundImage,
            backgroundSize: theme.containerStyle.backgroundSize ?? "cover",
            backgroundPosition: theme.containerStyle.backgroundPosition ?? "center",
            backgroundRepeat: theme.containerStyle.backgroundRepeat ?? "no-repeat",
            filter: `blur(${theme.backgroundBlur})`,
            transform: "scale(1.08)",
          }}
        />
      )}

      <div className={`flex flex-col lg:flex-row items-stretch justify-between gap-4 w-full relative z-10 ${theme.fontClass ?? ""}`}>
        <div className="flex items-center gap-3 min-w-0">
          {avatarNode}
          <div className={`py-2 px-3 rounded-lg min-h-[60px] flex flex-col border bg-gray-800/70 ${theme.statCardClass ?? ""}`}>
            <p className={`text-lg font-bold group-hover:text-purple-200 transition-colors truncate ${theme.titleClass ?? ""}`}>
              {encounter.sceneName || "Unknown Scene"}
              {(() => {
                const boss = encounter.bosses?.[0];
                const sceneId = encounter.sceneId;
                if (boss?.maxHp && sceneId) {
                  console.log(sceneId)
                  const scene = (SceneData as Record<string, any>)[String(sceneId)];
                  if (!scene) {
                    console.log("unknown", scene)
                    return ""
                  } else if (scene?.boss?.values && scene?.boss?.name === boss.monsterName) {
                    const idx = scene.boss.values.indexOf(boss.maxHp);
                    return idx !== -1 ? ` ${idx + 1}` : "";
                  } else {
                    return " Unknown"
                  }
                }
                return "";
              })()}
            </p>
            <div className="flex items-center gap-2 text-sm text-gray-400 flex-wrap">
              <span>{encounter.bosses?.[0]?.monsterName || "Unknown Boss"}</span>
              <span className="hidden sm:inline">•</span>
              <span>#{encounter.id}</span>
            </div>
            <div className="text-xs text-gray-400 mt-1 flex flex-wrap gap-2 items-center">
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
            <div className={`flex justify-center rounded-2xl px-4 py-3 self-stretch ${theme.statCardClass ?? 'border-purple-500/30 bg-purple-500/10 border'}`}>
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
                  <p className={`text-sm font-semibold truncate ${theme.titleClass ?? 'text-white'}`}>{localPlayer.name || "Unknown Player"}</p>
                  <p className={`text-xs truncate ${theme.titleClass ? 'text-gray-200' : 'text-gray-300'}`}>
                    {classLabel || "Unknown Class"}
                  </p>
                  <p className={`text-xs truncate ${theme.titleClass ? 'text-gray-200' : 'text-gray-300'}`}>
                    {specLabel && <span className="text-gray-500">{specLabel}</span>}
                  </p>
                </div>
              </div>
            </div>
          )}

          {showPlayerSummary && localPlayer && showDps && <StatCard label="Your DPS" value={dps} accent="red" extraClassName={theme.statCardClass} />}

          {showPlayerSummary && localPlayer && showHps && <StatCard label="Your HPS" value={hps} accent="green" extraClassName={theme.statCardClass} />}

          <StatCard label="Team DPS" value={formatNumber(teamDps)} accent="slate" extraClassName={theme.statCardClass} />

          <StatCard label="Total DMG" value={formatNumber(encounter.totalDmg ?? 0)} accent="slate" extraClassName={theme.statCardClass} />

          <StatCard label="Duration" value={formatDuration(encounter.startedAt, encounter.endedAt)} accent="white" extraClassName={theme.statCardClass} />
        </div>
      </div>
    </button >
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

export function PlayerStatPill({ label, value, tone }: { label: string; value: string; tone: "red" | "green" }) {
  const toneClasses = tone === "red" ? "text-red-300 bg-red-500/10 border-red-500/30" : "text-green-300 bg-green-500/10 border-green-500/30";
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full border text-[10px] font-semibold ${toneClasses}`}>
      <span className="uppercase tracking-wide text-gray-300">{label}</span>
      <span className="font-mono text-xs">{value}</span>
    </span>
  );
}

export function StatCard({ label, value, accent, extraClassName }: { label: string; value: string | number; accent: "purple" | "red" | "green" | "slate" | "white"; extraClassName?: string }) {
  const accentClasses: Record<string, string> = {
    purple: "bg-purple-500/10 border border-purple-500/20 text-purple-200",
    red: "bg-red-500/10 border border-red-500/20 text-red-200",
    green: "bg-green-500/10 border border-green-500/20 text-green-200",
    slate: "bg-gray-800/70 border border-gray-700 text-gray-200",
    white: "bg-gray-800/70 border border-gray-700 text-white",
  };

  return (
    <div className={`text-center p-3 rounded-lg min-w-[90px] min-h-[60px] flex flex-col justify-center ${accentClasses[accent]} ${extraClassName ?? ""}`}>
      <p className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold">{label}</p>
      <p className="mt-1 text-lg font-bold truncate">{value}</p>
    </div>
  );
}

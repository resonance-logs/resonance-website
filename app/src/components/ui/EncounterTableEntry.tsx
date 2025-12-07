"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import type { CSSProperties, ReactNode } from "react";
import { Encounter, EncounterTableEntryThemeKey } from "@/types/commonTypes";
import { formatDuration, formatRelativeTime, getDuration } from "@/utils/timeFormat";
import { formatNumber } from "@/utils/numberFormatter";
import { CLASS_MAP, getClassIconName, getClassTooltip, getType } from "@/utils/classData";
import { UploaderAvatar, getUploaderName } from "@/components/ui/UploaderAvatar";

export type ThemeConfig = {
  containerClass?: string;
  containerStyle?: CSSProperties;
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
  "summer-beach-vibe": {
    name: "Summer Beach Vibe",
    description: "Turquoise seas, warm sun flares, and playful waves.",
    swatch: "from-cyan-400 via-sky-400 to-amber-200",
  },
  "retro-1990s": {
    name: "Retro 1990s",
    description: "Neon grid, synthwave glow, and chrome-like cards.",
    swatch: "from-fuchsia-500 via-purple-700 to-blue-600",
  },
  "green-oasis": {
    name: "Green Oasis",
    description: "Lush emerald gradients with leaf silhouettes and dew.",
    swatch: "from-emerald-400 via-green-600 to-emerald-800",
  },
};

export const ENCOUNTER_THEME_KEYS = Object.keys(ENCOUNTER_THEME_METADATA) as EncounterTableEntryThemeKey[];

const DEFAULT_OVERLAY = (
  <div
    className="absolute inset-0 opacity-5 pointer-events-none"
    style={{
      backgroundImage:
        'url("data:image/svg+xml,%3Csvg width=\"40\" height=\"40\" xmlns=\"http://www.w3.org/2000/svg\"%3E%3Cpath d=\"M0 0h40v40H0z\" fill=\"none\"/%3E%3Cpath d=\"M20 0v40M0 20h40\" stroke=\"%23fff\" stroke-width=\"0.5\" opacity=\"0.1\"/%3E%3C/svg%3E")',
    }}
  />
);

const SAKURA_OVERLAY = (
  <>
    <div className="absolute inset-0 bg-linear-to-br from-rose-500/20 via-fuchsia-400/10 to-amber-200/20 blur-3xl opacity-80 pointer-events-none" />
    <svg className="absolute -right-6 -top-8 w-48 h-48 opacity-70 pointer-events-none" viewBox="0 0 200 200" fill="none">
      <defs>
        <linearGradient id="sakuraPetal" x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#fb7185" stopOpacity="0.8" />
          <stop offset="1" stopColor="#fca5a5" stopOpacity="0.35" />
        </linearGradient>
      </defs>
      <path d="M90 10c22 14 32 32 0 64c-32-32-22-50 0-64Z" fill="url(#sakuraPetal)" />
      <path d="M150 82c18 10 30 30 0 52c-28-24-18-40 0-52Z" fill="url(#sakuraPetal)" opacity="0.65" />
      <path d="M60 120c14 8 24 20 0 34c-24-14-14-26 0-34Z" fill="url(#sakuraPetal)" opacity="0.5" />
      <circle cx="120" cy="150" r="12" fill="#f9a8d4" fillOpacity="0.6" />
    </svg>
    <svg className="absolute -left-10 bottom-0 w-52 h-52 opacity-60 pointer-events-none" viewBox="0 0 200 200" fill="none">
      <path d="M30 200c70-18 90-80 110-120" stroke="#f472b6" strokeWidth="8" strokeOpacity="0.35" strokeLinecap="round" />
      <path d="M60 170c28-16 42-46 60-78" stroke="#f9a8d4" strokeWidth="5" strokeOpacity="0.4" strokeLinecap="round" />
    </svg>
  </>
);

const STARRY_OVERLAY = (
  <>
    <div className="absolute inset-0 bg-linear-to-br from-[#0b1026]/80 via-[#0f1f3d]/80 to-[#0d2a52]/70 pointer-events-none" />
    <div
      className="absolute inset-0 opacity-60 pointer-events-none"
      style={{
        backgroundImage:
          "radial-gradient(1px 1px at 10% 20%, rgba(255,255,255,0.7), transparent 60%)," +
          "radial-gradient(1.5px 1.5px at 40% 40%, rgba(130,202,255,0.8), transparent 60%)," +
          "radial-gradient(2px 2px at 70% 30%, rgba(255,255,255,0.5), transparent 55%)," +
          "radial-gradient(1px 1px at 85% 65%, rgba(255,255,255,0.6), transparent 55%)," +
          "radial-gradient(1.5px 1.5px at 20% 75%, rgba(160,220,255,0.7), transparent 60%)",
      }}
    />
    <svg className="absolute -left-8 -bottom-10 w-64 h-64 opacity-50 pointer-events-none" viewBox="0 0 200 200" fill="none">
      <path d="M10 140c50-24 90-14 160-80" stroke="#67e8f9" strokeWidth="3" strokeLinecap="round" strokeOpacity="0.4" />
      <circle cx="50" cy="110" r="6" fill="#bae6fd" fillOpacity="0.6" />
      <circle cx="120" cy="60" r="5" fill="#e0f2fe" fillOpacity="0.6" />
      <circle cx="170" cy="80" r="4" fill="#7dd3fc" fillOpacity="0.6" />
    </svg>
  </>
);

const BEACH_OVERLAY = (
  <>
    <div className="absolute inset-0 bg-linear-to-br from-[#0c9cb5]/80 via-[#2ec5f4]/70 to-[#ffd27f]/70 pointer-events-none" />
    <svg className="absolute -left-6 -top-8 w-48 h-48 opacity-70 pointer-events-none" viewBox="0 0 160 160" fill="none">
      <circle cx="70" cy="70" r="38" fill="#ffd27f" fillOpacity="0.7" />
      <circle cx="70" cy="70" r="48" stroke="#ffedd5" strokeWidth="8" strokeOpacity="0.35" />
    </svg>
    <svg className="absolute bottom-0 right-0 w-64 h-32 opacity-75 pointer-events-none" viewBox="0 0 400 200" fill="none">
      <path d="M0 80c60 40 120-10 190 10c70 20 140 70 210 10v110H0V80Z" fill="#0ea5e9" fillOpacity="0.35" />
      <path d="M0 110c70 30 130-20 200 0c70 20 130 50 200 0" stroke="#bae6fd" strokeWidth="6" strokeOpacity="0.5" strokeLinecap="round" />
    </svg>
  </>
);

const RETRO_OVERLAY = (
  <>
    <div className="absolute inset-0 bg-linear-to-br from-[#1b0034]/90 via-[#120026]/90 to-[#041226]/90 pointer-events-none" />
    <svg className="absolute inset-0 w-full h-full opacity-50 pointer-events-none" viewBox="0 0 400 240" fill="none">
      <defs>
        <linearGradient id="retroGrid" x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#ff7edb" stopOpacity="0.5" />
          <stop offset="1" stopColor="#7dd3fc" stopOpacity="0.4" />
        </linearGradient>
      </defs>
      {[...Array(12)].map((_, i) => (
        <line key={`v-${i}`} x1={(i + 1) * 30} y1="0" x2={(i + 1) * 40} y2="240" stroke="url(#retroGrid)" strokeWidth="1" />
      ))}
      {[...Array(8)].map((_, i) => (
        <line key={`h-${i}`} x1="0" y1={(i + 1) * 30} x2="400" y2={(i + 1) * 24 + 40} stroke="url(#retroGrid)" strokeWidth="1" />
      ))}
      <circle cx="340" cy="40" r="26" fill="#7c3aed" fillOpacity="0.4" />
      <circle cx="300" cy="30" r="12" fill="#ec4899" fillOpacity="0.5" />
    </svg>
    <div className="absolute inset-0 bg-[radial-gradient(circle_at_10%_20%,rgba(255,255,255,0.08),transparent_40%)]" />
  </>
);

const OASIS_OVERLAY = (
  <>
    <div className="absolute inset-0 bg-linear-to-br from-[#0a3a2a]/90 via-[#0f4d36]/85 to-[#0d5e3d]/80 pointer-events-none" />
    <svg className="absolute -right-10 -top-6 w-60 h-60 opacity-65 pointer-events-none" viewBox="0 0 200 200" fill="none">
      <path d="M120 10c-8 40-10 70 30 110" stroke="#34d399" strokeWidth="10" strokeLinecap="round" strokeOpacity="0.4" />
      <path d="M80 30c-6 30-12 60 24 96" stroke="#6ee7b7" strokeWidth="8" strokeLinecap="round" strokeOpacity="0.35" />
      <circle cx="140" cy="60" r="12" fill="#a7f3d0" fillOpacity="0.45" />
    </svg>
    <svg className="absolute left-0 bottom-0 w-64 h-52 opacity-60 pointer-events-none" viewBox="0 0 240 200" fill="none">
      <path d="M20 180c40-60 70-70 120-150" stroke="#10b981" strokeWidth="12" strokeLinecap="round" strokeOpacity="0.35" />
      <path d="M40 190c32-46 60-70 110-140" stroke="#22c55e" strokeWidth="9" strokeLinecap="round" strokeOpacity="0.35" />
      <circle cx="70" cy="150" r="10" fill="#bbf7d0" fillOpacity="0.5" />
    </svg>
  </>
);

const THEME_CONFIGS: Record<EncounterTableEntryThemeKey, ThemeConfig> = {
  default: {
    containerClass:
      "border-gray-800/80 bg-linear-to-br from-gray-900/90 via-gray-900/80 to-gray-900/70 hover:border-purple-500/50 hover:shadow-xl hover:shadow-purple-500/10",
    overlay: DEFAULT_OVERLAY,
    statCardClass: "",
  },
  "blossoming-sakura-tree": {
    containerClass:
      "border-rose-200/60 bg-gradient-to-br from-[#2b0b21]/90 via-[#3f0f2d]/85 to-[#4b1736]/80 shadow-rose-500/25 hover:shadow-rose-400/30 hover:border-rose-200/80",
    overlay: SAKURA_OVERLAY,
    statCardClass: "bg-rose-500/15 border-rose-200/50 text-rose-50 shadow-rose-500/20 backdrop-blur",
    avatarRingClass: "ring-2 ring-rose-200/80 rounded-full p-1 shadow-rose-400/40",
    titleClass: "text-rose-50",
    fontClass: "tracking-wide",
  },
  "starry-night": {
    containerClass:
      "border-indigo-400/60 bg-gradient-to-br from-[#0b1026]/95 via-[#0f1838]/90 to-[#0d244d]/85 shadow-cyan-500/20 hover:border-cyan-300/70 hover:shadow-cyan-500/25",
    overlay: STARRY_OVERLAY,
    statCardClass: "bg-slate-900/70 border-cyan-300/30 text-cyan-50 shadow-cyan-400/20",
    avatarRingClass: "ring-2 ring-cyan-300/70 rounded-full p-0.5 shadow-cyan-500/30",
    titleClass: "text-cyan-50",
    fontClass: "tracking-tight",
  },
  "summer-beach-vibe": {
    containerClass:
      "border-white/70 bg-gradient-to-br from-[#0a91a3]/85 via-[#16b3d4]/80 to-[#f6c453]/80 shadow-amber-300/30 hover:border-white hover:shadow-amber-200/50",
    overlay: BEACH_OVERLAY,
    statCardClass: "bg-white/30 border-white/60 text-sky-900 shadow-amber-200/40 backdrop-blur",
    avatarRingClass: "ring-2 ring-white/80 rounded-full p-1 shadow-cyan-200/50",
    titleClass: "text-white",
    fontClass: "tracking-wide",
  },
  "retro-1990s": {
    containerClass:
      "border-pink-400/70 bg-gradient-to-br from-[#18002b]/90 via-[#1b0a3d]/85 to-[#061226]/90 shadow-pink-500/30 hover:border-cyan-300/80 hover:shadow-pink-500/40",
    overlay: RETRO_OVERLAY,
    statCardClass: "bg-gradient-to-br from-[#3b0764]/60 via-[#0ea5e9]/30 to-[#111827]/80 border-pink-400/50 text-pink-50 shadow-cyan-400/30",
    avatarRingClass: "ring-2 ring-pink-300/70 rounded-full p-1 shadow-pink-500/40",
    titleClass: "text-pink-100",
    fontClass: "tracking-[0.02em]",
  },
  "green-oasis": {
    containerClass:
      "border-emerald-300/70 bg-gradient-to-br from-[#0b3a2d]/90 via-[#0c4b36]/85 to-[#0f5e3f]/85 shadow-emerald-500/25 hover:border-emerald-200/80 hover:shadow-emerald-400/30",
    overlay: OASIS_OVERLAY,
    statCardClass: "bg-emerald-500/15 border-emerald-300/50 text-emerald-50 shadow-emerald-500/20 backdrop-blur",
    avatarRingClass: "ring-2 ring-emerald-300/70 rounded-full p-1 shadow-emerald-500/30",
    titleClass: "text-emerald-50",
    fontClass: "tracking-tight",
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
    "w-full group flex h-[120px] rounded-xl border backdrop-blur-md p-4 transition-all duration-300 hover:scale-[1.01] relative overflow-hidden text-left animate-slide-up";
  const buttonStyle: CSSProperties = { ...(theme.containerStyle ?? {}), animationDelay: `${idx * 50}ms` };

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

  const avatarNode = (
    <div className={`inline-flex ${theme.avatarRingClass ?? ""}`}>
      <UploaderAvatar user={encounter.user} size={60} />
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
      {theme.overlay ?? DEFAULT_OVERLAY}

      <div className={`flex flex-col lg:flex-row items-stretch justify-between gap-4 w-full relative z-10 ${theme.fontClass ?? ""}`}>
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {avatarNode}
          <div className="flex-1 min-w-0">
            <p className={`text-lg font-bold text-white group-hover:text-purple-200 transition-colors truncate ${theme.titleClass ?? ""}`}>
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

          {showPlayerSummary && localPlayer && showDps && <StatCard label="Your DPS" value={dps} accent="red" extraClassName={theme.statCardClass} />}

          {showPlayerSummary && localPlayer && showHps && <StatCard label="Your HPS" value={hps} accent="green" extraClassName={theme.statCardClass} />}

          <StatCard label="Team DPS" value={formatNumber(teamDps)} accent="purple" extraClassName={theme.statCardClass} />

          <StatCard label="Total DMG" value={formatNumber(encounter.totalDmg ?? 0)} accent="slate" extraClassName={theme.statCardClass} />

          <StatCard label="Duration" value={formatDuration(encounter.startedAt, encounter.endedAt)} accent="white" extraClassName={theme.statCardClass} />
        </div>
      </div>
    </button>
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

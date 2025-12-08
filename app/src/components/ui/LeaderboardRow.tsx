import React from "react";
import Image from "next/image";
import { EntityLeaderboardEntry } from "@/api/entity/entity";
import { CLASS_MAP, getClassIconName } from "@/utils/classData";
import { formatNumber } from "@/utils/numberFormatter";

export default function LeaderboardRow({
  entry,
  rank,
}: {
  entry: EntityLeaderboardEntry;
  rank: number;
}) {
  const isTopThree = rank <= 3;
  const ringClass =
    rank === 1
      ? "ring-2 ring-yellow-400/60"
      : rank === 2
        ? "ring-2 ring-gray-300/60"
        : rank === 3
          ? "ring-2 ring-amber-600/60"
          : "";

  const rankBadgeClass =
    rank === 1
      ? "bg-gradient-to-br from-yellow-300 to-amber-400 text-gray-900"
      : rank === 2
        ? "bg-gradient-to-br from-gray-200 to-gray-400 text-gray-900"
        : rank === 3
          ? "bg-gradient-to-br from-amber-500 to-amber-700 text-white"
          : "bg-gray-700 text-gray-200";

  // Use entity leaderboard theme from user customization
  const themeKey = (entry.user?.customization?.entityLeaderboardTheme as string) || "default";

  // Theme configs matching EncounterTableEntry
  const THEME_CONFIGS: Record<string, {
    containerClass?: string;
    containerStyle?: React.CSSProperties;
    titleClass?: string;
    secondaryClass?: string;
    scoreLabelClass?: string;
    scoreValueClass?: string;
    textShadowClass?: string;
  }> = {
    default: {
      containerClass: "border-gray-800/80 bg-gradient-to-br from-gray-900/90 via-gray-900/80 to-gray-900/70 hover:border-purple-500/50 hover:shadow-xl hover:shadow-purple-500/10",
      secondaryClass: "text-gray-300",
      scoreLabelClass: "text-gray-300",
      scoreValueClass: "text-gray-100",
      textShadowClass: "drop-shadow-md",
    },
    "blossoming-sakura-tree": {
      containerClass: "border-rose-200/60 bg-gradient-to-br from-[#2b0b21]/90 via-[#3f0f2d]/85 to-[#4b1736]/80 shadow-rose-500/25 hover:shadow-rose-400/30 hover:border-rose-200/80",
      containerStyle: { backgroundImage: 'url("/images/themes/sakura-tree.gif")', backgroundSize: "cover", backgroundPosition: "center 45%" },
      titleClass: "text-rose-50",
      secondaryClass: "text-rose-200/80",
      scoreLabelClass: "text-rose-200/70",
      scoreValueClass: "text-rose-50",
      textShadowClass: "drop-shadow-md",
    },
    "starry-night": {
      containerClass: "border-indigo-400/60 bg-gradient-to-br from-[#0b1026]/95 via-[#0f1838]/90 to-[#0d244d]/85 shadow-cyan-500/20 hover:border-cyan-300/70 hover:shadow-cyan-500/25",
      containerStyle: { backgroundImage: 'url("/images/themes/shooting-star-anime.gif")', backgroundSize: "cover", backgroundPosition: "10% 90%" },
      titleClass: "text-gray-900", // Dark text requested
      secondaryClass: "text-gray-700",
      scoreLabelClass: "text-gray-700",
      scoreValueClass: "text-gray-900",
      textShadowClass: "drop-shadow-none", // Remove dark shadow for dark text
    },
    "summer-sunset": {
      containerClass: "border-orange-400/60 bg-gradient-to-br from-[#2a1005]/80 via-[#4a1c10]/80 to-[#1f0802]/85 shadow-orange-500/20 hover:border-orange-300/70 hover:shadow-orange-500/25",
      containerStyle: { backgroundImage: 'url("/images/themes/sunset.png")', backgroundSize: "cover", backgroundPosition: "center 65%" },
      titleClass: "text-gray-900", // Dark text requested
      secondaryClass: "text-gray-800",
      scoreLabelClass: "text-gray-800",
      scoreValueClass: "text-gray-900",
      textShadowClass: "drop-shadow-none",
    },
    cyberpunk: {
      containerClass: "border-pink-400/70 bg-gradient-to-br from-[#18002b]/90 via-[#1b0a3d]/85 to-[#061226]/90 shadow-pink-500/30 hover:border-cyan-300/80 hover:shadow-pink-500/40",
      containerStyle: { backgroundImage: 'url("/images/themes/cyberpunk.gif")', backgroundSize: "cover", backgroundPosition: "center" },
      titleClass: "text-white",
      secondaryClass: "text-purple-200/80",
      scoreLabelClass: "text-purple-200/70",
      scoreValueClass: "text-purple-50",
      textShadowClass: "drop-shadow-md",
    },
  };
  const theme = THEME_CONFIGS[themeKey] ?? THEME_CONFIGS.default;

  return (
    <div
      className={`group flex items-center gap-4 p-4 rounded-xl border backdrop-blur-md transition-all duration-300 overflow-hidden relative ${ringClass} ${theme.containerClass ?? ""}`}
      style={theme.containerStyle}
    >
      {/* Rank badge */}
      <div
        className={`flex h-10 w-10 items-center justify-center rounded-lg text-base font-bold shrink-0 z-10 shadow-lg ${rankBadgeClass}`}
      >
        {rank}
      </div>

      {/* Class icon */}
      <div className={`relative h-12 w-12 flex items-center justify-center shrink-0 z-10 ${theme.textShadowClass ?? "drop-shadow-md"}`}>
        <Image
          src={`/images/classes/${getClassIconName(entry.classId ?? 0)}`}
          alt={entry.name ?? "Player"}
          fill
          sizes="48px"
          className="object-contain"
        // Removed tooltip since spec info is hidden
        />
      </div>

      {/* Player info */}
      <div className="flex-1 min-w-0 z-10">
        <div className="flex items-center gap-2">
          <p className={`text-base font-semibold group-hover:text-purple-200 transition-colors truncate ${theme.textShadowClass ?? "drop-shadow-md"} ${theme.titleClass ?? "text-white"}`}>
            {entry.name ?? "Unknown"}
          </p>
          {entry.user && (
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-black/40 border border-white/10 backdrop-blur-sm shadow-sm">
              {entry.user.discord_avatar_url && (
                <Image
                  src={entry.user.discord_avatar_url}
                  alt={entry.user.discord_username}
                  width={16}
                  height={16}
                  className="rounded-full"
                />
              )}
              <span className={`text-xs font-medium truncate max-w-[100px] text-purple-200 ${themeKey === 'starry-night' || themeKey === 'summer-sunset' ? 'text-gray-200' : 'text-purple-200'} drop-shadow-sm`}>
                {entry.user.discord_global_name || entry.user.discord_username}
              </span>
            </div>
          )}
        </div>
        <div className={`flex items-center gap-2 text-xs mt-0.5 font-medium ${theme.textShadowClass ?? "drop-shadow-md"} ${theme.secondaryClass ?? "text-gray-300"}`}>
          <span>{CLASS_MAP[entry.classId ?? 0] ?? "Unknown"}</span>
        </div>
      </div>

      {/* Ability Score */}
      <div className="text-right shrink-0 z-10">
        <p className={`text-xs uppercase tracking-wide font-medium mb-0.5 ${theme.textShadowClass ?? "drop-shadow-md"} ${theme.scoreLabelClass ?? "text-gray-300"}`}>
          Ability Score
        </p>
        <p
          className={`text-xl font-bold ${theme.textShadowClass ?? "drop-shadow-md"} ${isTopThree ? "text-purple-300" : (theme.scoreValueClass ?? "text-gray-100")}`}
        >
          {formatNumber(entry.abilityScore ?? 0)}
        </p>
      </div>
    </div>
  );
}

"use client";

import React from 'react';
import Image from 'next/image';
import { Tooltip } from 'antd';
import { formatNumber } from '@/utils/numberFormatter';
import { CLASS_MAP, getClassIconName, getClassTooltip } from '@/utils/classData';
import type { FilteredPlayerStats } from '@/utils/encounterStats';
import TableRowGlow from '@/components/ui/TableRowGlow';
import type { ActorEncounterStat, EncounterTableRowSettings, EncounterTableRowFont, EncounterTableRowGradient, CustomTagSettings, EncounterTableRowTagIcon } from '@/types/commonTypes';
import { ROW_FONTS, ROW_GRADIENTS, TAG_ICONS } from './EncounterTableRowCustomization';

type Props = {
  player: ActorEncounterStat;
  stats?: FilteredPlayerStats;
  damagePercent: number;
  relativeToTop: number;
  isSelected: boolean;
  onToggleSelect: () => void;
  compact?: boolean;
};

// Helper to get the name text style and class
function getNameStyleAndClass(settings?: EncounterTableRowSettings): { style: React.CSSProperties; className: string } {
  const style: React.CSSProperties = {
    fontSize: '1rem', // Slightly larger name
  };
  let className = '';

  // Apply font
  if (settings?.font) {
    const fontConfig = ROW_FONTS[settings.font as EncounterTableRowFont];
    if (fontConfig?.fontFamily && fontConfig.fontFamily !== 'inherit') {
      style.fontFamily = fontConfig.fontFamily;
    }
  }

  // Apply color (gradient or solid)
  if (settings?.color) {
    const gradientConfig = ROW_GRADIENTS[settings.color as EncounterTableRowGradient];
    if (gradientConfig?.css) {
      // For gradient text, use Tailwind's bg-clip-text class for better browser support
      style.backgroundImage = gradientConfig.css;
      className = 'bg-clip-text text-transparent';
    } else if (settings.color.startsWith('#')) {
      // Solid hex color
      style.color = settings.color;
    }
  }

  return { style, className };
}

// Helper to get contrasting text color for a background
function getContrastTextColor(hexColor: string): string {
  // Remove # if present
  const hex = hexColor.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  // Calculate luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? '#000000' : '#ffffff';
}

// Custom Tag component
function PlayerTag({ tag }: { tag: CustomTagSettings }) {
  if (!tag || (!tag.text && !tag.icon)) return null;

  const bgColor = tag.color || '#6b7280'; // Default gray
  const textColor = getContrastTextColor(bgColor);
  const iconConfig = tag.icon ? TAG_ICONS[tag.icon as EncounterTableRowTagIcon] : null;

  return (
    <Tooltip title={tag.text || 'Custom Tag'} placement="top">
      <span
        className="ml-2 inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-bold rounded"
        style={{ backgroundColor: bgColor, color: textColor }}
      >
        {tag.text && <span>{tag.text}</span>}
        {iconConfig?.svgPath && (
          <svg
            className="w-3 h-3"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d={iconConfig.svgPath} />
          </svg>
        )}
      </span>
    </Tooltip>
  );
}

export default function EncounterTableRow({ player, stats, damagePercent, relativeToTop, isSelected, onToggleSelect, compact = false }: Props) {
  // Get customization settings from the player's user
  const rowSettings = player.user?.customization?.encounterTableRow as EncounterTableRowSettings | undefined;
  const { style: nameStyle, className: nameClassName } = getNameStyleAndClass(rowSettings);
  const customTag = rowSettings?.tag as CustomTagSettings | undefined;

  return (
    <tr
      role="button"
      tabIndex={0}
      onClick={onToggleSelect}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') onToggleSelect();
      }}
      className={`relative border-b border-gray-800/50 cursor-pointer transition-colors ${isSelected ? 'hover:bg-gray-800/40' : 'hover:bg-gray-800/40'
        }`}
    >
      {compact ? (
        <>
          <td className="px-4 py-2 text-white font-medium">
            <div className="flex items-center gap-2">
              <Tooltip title={getClassTooltip(player.classId ?? undefined, player.classSpec ?? undefined)} placement="top">
                <div className="w-7 h-7 relative rounded-full overflow-hidden">
                  <Image
                    src={`/images/classes/${getClassIconName(player.classId ?? undefined)}`}
                    alt={CLASS_MAP[player.classId ?? 0] ?? 'class'}
                    fill
                    style={{ objectFit: 'contain', objectPosition: 'center' }}
                  />
                </div>
              </Tooltip>
              <span style={nameStyle} className={nameClassName}>{player.name || 'Unknown'}</span>
              <span className="text-gray-400 text-xs">{formatNumber(player.abilityScore ?? 0)}</span>
              {player.isLocalPlayer && (
                <Tooltip title="Uploader" placement="top">
                  <span className="ml-2 inline-flex items-center justify-center w-4 h-4 text-[10px] font-semibold rounded-none bg-gray-800/70 text-white">U</span>
                </Tooltip>
              )}
              {customTag && <PlayerTag tag={customTag} />}
            </div>
          </td>
          <td className="px-4 py-2 text-right">{formatNumber(stats?.damageDealt ?? 0)}</td>
          <td className="px-4 py-2 text-right">{formatNumber(stats?.dps ?? 0)}</td>
          <td className="px-4 py-2 text-right">{formatNumber(stats?.healDealt ?? 0)}</td>
          <td className="px-4 py-2 text-right">{formatNumber(stats?.damageTaken ?? 0)}</td>
          <td className="px-4 py-2 text-right">{formatNumber(stats?.hitsDealt ?? 0)}</td>
          <td className="px-4 py-2 text-right">{formatNumber(player.abilityScore ?? 0)}</td>
          <TableRowGlow className={CLASS_MAP[player.classId ?? 0] ?? ''} percentage={relativeToTop} />
        </>
      ) : (
        <>
          <td className="px-6 py-3 text-white font-medium relative">
            <div className="flex items-center gap-2">
              <Tooltip title={getClassTooltip(player.classId ?? undefined, player.classSpec ?? undefined)} placement="top">
                <div className="w-7 h-7 relative rounded-full overflow-hidden">
                  <Image
                    src={`/images/classes/${getClassIconName(player.classId ?? undefined)}`}
                    alt={CLASS_MAP[player.classId ?? 0] ?? 'class'}
                    fill
                    style={{ objectFit: 'contain', objectPosition: 'center' }}
                  />
                </div>
              </Tooltip>
              <div className="flex items-baseline">
                <span style={nameStyle} className={nameClassName}>{player.name || 'Unknown'}</span>
                <span className="text-gray-400 text-xs ml-2">{formatNumber(player.abilityScore ?? 0)}</span>
                {player.isLocalPlayer && (
                  <Tooltip title="Uploader" placement="top">
                    <span className="ml-2 inline-flex items-center justify-center w-4 h-4 text-[10px] font-semibold rounded-none bg-gray-800/70 text-white">U</span>
                  </Tooltip>
                )}
                {customTag && <PlayerTag tag={customTag} />}
              </div>
            </div>
          </td>
          <td className="px-6 py-3 text-right">{formatNumber(stats?.damageDealt ?? 0)}</td>
          <td className="px-6 py-3 text-right">{damagePercent.toFixed(1)}%</td>
          <td className="px-6 py-3 text-right">{formatNumber(stats?.dps ?? 0)}</td>
          <td className="px-6 py-3 text-right">{formatNumber(stats?.healDealt ?? 0)}</td>
          <td className="px-6 py-3 text-right">{formatNumber(stats?.hps ?? 0)}</td>
          <td className="px-6 py-3 text-right">{formatNumber(stats?.damageTaken ?? 0)}</td>
          <td className="px-6 py-3 text-right">{formatNumber(stats?.hitsDealt ?? 0)}</td>
          <td className="px-6 py-3 text-right">{formatNumber(stats?.hitsHeal ?? 0)}</td>
          <td className="px-6 py-3 text-right">{formatNumber(stats?.hitsTaken ?? 0)}</td>
          <TableRowGlow className={CLASS_MAP[player.classId ?? 0] ?? ''} percentage={relativeToTop} />
        </>
      )}
    </tr>
  );
}


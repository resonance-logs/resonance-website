// Encounter Table Row Customization Constants

import type { EncounterTableRowFont, EncounterTableRowGradient, EncounterTableRowTagIcon } from "@/types/commonTypes";

// Font definitions with their Google Fonts URL
export const ROW_FONTS: Record<EncounterTableRowFont, { name: string; fontFamily: string; weight?: string }> = {
  "": { name: "Default", fontFamily: "inherit" },
  "Knewave": { name: "Knewave", fontFamily: "'Knewave', cursive" },
  "Merienda": { name: "Merienda", fontFamily: "'Merienda', cursive", weight: "300..900" },
  "Playwrite": { name: "Playwrite DE Grund", fontFamily: "'Playwrite DE Grund', cursive", weight: "100..400" },
  "Viaoda Libre": { name: "Viaoda Libre", fontFamily: "'Viaoda Libre', cursive" },
};

export const ROW_FONT_KEYS = Object.keys(ROW_FONTS) as EncounterTableRowFont[];

// Gradient definitions with CSS value and preview swatch
export const ROW_GRADIENTS: Record<EncounterTableRowGradient, { name: string; css: string; swatch: string }> = {
  "": { name: "White", css: "", swatch: "bg-white" },
  "neon-pulse": {
    name: "Neon Pulse",
    css: "linear-gradient(90deg, #ff00ff 0%, #00ffff 50%, #ff00ff 100%)",
    swatch: "bg-gradient-to-r from-fuchsia-500 via-cyan-400 to-fuchsia-500",
  },
  "golden-hour": {
    name: "Golden Hour",
    css: "linear-gradient(90deg, #f59e0b 0%, #fcd34d 35%, #f97316 65%, #f59e0b 100%)",
    swatch: "bg-gradient-to-r from-amber-500 via-yellow-300 to-orange-500",
  },
  "aurora": {
    name: "Aurora",
    css: "linear-gradient(90deg, #06b6d4 0%, #8b5cf6 33%, #ec4899 66%, #06b6d4 100%)",
    swatch: "bg-gradient-to-r from-cyan-500 via-violet-500 to-pink-500",
  },
  "candy": {
    name: "Candy",
    css: "linear-gradient(90deg, #f472b6 0%, #a78bfa 50%, #f472b6 100%)",
    swatch: "bg-gradient-to-r from-pink-400 via-purple-400 to-pink-400",
  },
  "fire-ice": {
    name: "Fire & Ice",
    css: "linear-gradient(90deg, #ef4444 0%, #f97316 25%, #3b82f6 75%, #0ea5e9 100%)",
    swatch: "bg-gradient-to-r from-red-500 via-orange-500 to-blue-500",
  },
  "electric": {
    name: "Electric",
    css: "linear-gradient(90deg, #facc15 0%, #22c55e 50%, #facc15 100%)",
    swatch: "bg-gradient-to-r from-yellow-400 via-green-500 to-yellow-400",
  },
};

export const ROW_GRADIENT_KEYS = Object.keys(ROW_GRADIENTS).filter(k => k !== "") as EncounterTableRowGradient[];

// Tag icon definitions with SVG path data
export interface TagIconConfig {
  name: string;
  svgPath: string;
}

export const TAG_ICONS: Record<EncounterTableRowTagIcon, TagIconConfig> = {
  "": { name: "None", svgPath: "" },
  "star": {
    name: "Star",
    svgPath: "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z",
  },
  "crown": {
    name: "Crown",
    svgPath: "M2 20h20v-2H2v2zm2-4l1-5 3 2 4-4 4 4 3-2 1 5H4zm8-13l2.5 5 5.5.75-4 3.9.95 5.6L12 15l-4.95 2.6.95-5.6-4-3.9 5.5-.75L12 3z",
  },
  "shield": {
    name: "Shield",
    svgPath: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z",
  },
  "heart": {
    name: "Heart",
    svgPath: "M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z",
  },
  "sparkles": {
    name: "Sparkles",
    svgPath: "M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z",
  },
  "fire": {
    name: "Fire",
    svgPath: "M12 23c-3.866 0-7-3.134-7-7 0-2.485 1.644-5.09 3.322-7.022.862-.992 1.831-1.862 2.678-2.533V3s3.5 2.5 5.5 6c.5 1 1 2 1 3.5 0 1-.5 2-1.5 3 0 0 1.5-1.5 1.5-3.5 0-1-.5-2-1-3 2 2 3.5 4.5 3.5 7.5 0 3.866-3.134 7-7 7z",
  },
  "bolt": {
    name: "Bolt",
    svgPath: "M13 2L3 14h9l-1 8 10-12h-9l1-8z",
  },
  "trophy": {
    name: "Trophy",
    svgPath: "M6 9H4.5a2.5 2.5 0 0 1 0-5H6m12 5h1.5a2.5 2.5 0 0 0 0-5H18M5 20h14M9 20v-3a6 6 0 0 1 6 0v3M6 4v6a6 6 0 0 0 12 0V4H6z",
  },
};

export const TAG_ICON_KEYS = Object.keys(TAG_ICONS).filter(k => k !== "") as EncounterTableRowTagIcon[];

// Preset tag colors for easy selection
export const TAG_PRESET_COLORS = [
  { name: "Gold", hex: "#f59e0b" },
  { name: "Purple", hex: "#a855f7" },
  { name: "Cyan", hex: "#06b6d4" },
  { name: "Rose", hex: "#f43f5e" },
  { name: "Blue", hex: "#3b82f6" },
  { name: "Green", hex: "#22c55e" },
  { name: "Orange", hex: "#f97316" },
  { name: "Slate", hex: "#64748b" },
];

// Helper function to get color style based on customization
export function getRowColorStyle(color: string | undefined): React.CSSProperties {
  if (!color) return {};
  
  // Check if it's a gradient key
  const gradientKey = color as EncounterTableRowGradient;
  if (ROW_GRADIENTS[gradientKey]?.css) {
    return { background: ROW_GRADIENTS[gradientKey].css };
  }
  
  // Otherwise it's a hex color
  if (color.startsWith('#')) {
    return { background: color };
  }
  
  return {};
}

// Helper function to get font style based on customization
export function getRowFontStyle(font: string | undefined): React.CSSProperties {
  if (!font) return {};
  
  const fontKey = font as EncounterTableRowFont;
  if (ROW_FONTS[fontKey]?.fontFamily) {
    return { fontFamily: ROW_FONTS[fontKey].fontFamily };
  }
  
  return {};
}

// Google Fonts link for loading fonts
export const GOOGLE_FONTS_URL = "https://fonts.googleapis.com/css2?family=Knewave&family=Merienda:wght@300..900&family=Playwrite+DE+Grund:wght@100..400&family=Viaoda+Libre&display=swap";


const CLASS_DATA: Record<number, { file: string; name: string }> = {
  13: { file: "Beat Performer.png", name: "Beat Performer" },
  4: { file: "Wind Knight.png", name: "Wind Knight" },
  2: { file: "Frost Mage.png", name: "Frost Mage" },
  1: { file: "Stormblade.png", name: "Stormblade" },
  11: { file: "Marksman.png", name: "Marksman" },
  12: { file: "Shield Knight.png", name: "Shield Knight" },
  9: { file: "Heavy Guardian.png", name: "Heavy Guardian" },
  5: { file: "Verdant Oracle.png", name: "Verdant Oracle" },
};


export const CLASS_MAP: Record<number, string> = {
  1: 'Stormblade',
  2: 'Frost Mage',
  4: 'Wind Knight',
  5: 'Verdant Oracle',
  9: 'Heavy Guardian',
  11: 'Marksman',
  12: 'Shield Knight',
  13: 'Beat Performer'
};

export const CLASS_COLORS: Record<string, string> = {
  "Stormblade": "#674598",
  "Frost Mage": "#4de3d1",
  "Wind Knight": "#0099c6",
  "Verdant Oracle": "#66aa00",
  "Heavy Guardian": "#b38915",
  "Marksman": "#ffee00",
  "Shield Knight": "#7b9aa2",
  "Beat Performer": "#ee2e48",
};

const FALLBACK_ICON = "blank.png";
const FALLBACK_NAME = "Unknown Class";

export function getClassColor(className: string): string {
  return `rgb(from ${CLASS_COLORS[className] ?? "#ffc9ed"} r g b / 0.6)`;
}

export function getClassIconName(classId?: number | null): string {
  if (classId == null) return FALLBACK_ICON;
  const entry = CLASS_DATA[classId];
  if (!entry) return FALLBACK_ICON;
  return encodeURIComponent(entry.file);
}

export function getClassTooltip(classId?: number | null, classSpec?: number | null): string {
  if (classId == null) {
    return FALLBACK_NAME;
  }

  const entry = CLASS_DATA[classId];
  const base = entry?.name ?? `Class ID ${classId}`;

  if (classSpec == null) {
    return base;
  }
  return `${base} · Spec ${classSpec}`;
}

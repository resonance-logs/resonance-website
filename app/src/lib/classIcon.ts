const CLASS_DATA: Record<number, { file: string; name: string }> = {
  1: { file: "Beat Performer.png", name: "Beat Performer" },
  2: { file: "Wind Knight.png", name: "Wind Knight" },
  3: { file: "Frost Mage.png", name: "Frost Mage" },
  4: { file: "Stormblade.png", name: "Stormblade" },
  5: { file: "Marksman.png", name: "Marksman" },
  6: { file: "Shield Knight.png", name: "Shield Knight" },
  7: { file: "Heavy Guardian.png", name: "Heavy Guardian" },
  8: { file: "Verdant Oracle.png", name: "Verdant Oracle" },
};

const FALLBACK_ICON = "blank.png";
const FALLBACK_NAME = "Unknown Class";

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

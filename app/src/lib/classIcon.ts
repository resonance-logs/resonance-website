export function getClassIconName(classId?: number | null): string {
  // TODO: replace with real mapping when available; fallback to blank
  if (classId == null) return 'blank.png';
  // Example heuristic mapping can be inserted here.
  return 'blank.png';
}

export function getClassTooltip(classId?: number | null, classSpec?: number | null): string {
  const c = classId != null ? `Class ID ${classId}` : 'Unknown Class';
  const s = classSpec != null ? `, Spec ${classSpec}` : '';
  return `${c}${s}`;
}

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
  1: 'Stormblade', //damage
  2: 'Frost Mage', //damage
  4: 'Wind Knight', //damage
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

export const CLASS_SPEC_MAP: Record<number, string> = {
  0: "Unknown", //damage
  //stormblade
  1: "Iaido", //damage
  2: "Moonstrike", //damage
  //frost mage
  3: "Icicle", //damage
  4: "Frostbeam", //damage
  //wind knight
  5: "Vanguard", //damage
  6: "Skyward", //damage
  //verdant oracle
  7: "Smite", //damagehealer
  8: "Lifebind", //healer
  //heavy guardian
  9: "Earthfort", //tank
  10: "Block", //tank
   //marksman
  11: "Wildpack", //damage
  12: "Falconry", //damage
  //shieldknight
  13: "Recovery", //tank
  14: "Shield", //tank
  //beat preformer
  15: "Dissonance", //damagehealer
  16: "Concerto" //damagehealer
}

export const DUMMY_PLAYER_DATA = [
  {
    name: "Stormblade",
    actorId: 312141,
    classId: 1,
    classSpec: 1,
    damageDealt: 100000,
    abilityScore: 50000,
    healDealt: 100000,
  },
  {
    name: "Frost Mage",
    actorId: 312142,
    classId: 2,
    classSpec: 3,
    damageDealt: 90000,
    abilityScore: 45000,
    healDealt: 95000,
  },
  {
    name: "Wind Knight",
    actorId: 312143,
    classId: 4,
    classSpec: 5,
    damageDealt: 80000,
    abilityScore: 40000,
    healDealt: 90000,
  },
  {
    name: "Verdant Oracle",
    actorId: 312144,
    classId: 5,
    classSpec: 8,
    damageDealt: 70000,
    abilityScore: 35000,
    healDealt: 85000,
  },
  {
    name: "Heavy Guardian",
    actorId: 312145,
    classId: 9,
    classSpec: 9,
    damageDealt: 60000,
    abilityScore: 30000,
    healDealt: 80000,
  },
  {
    name: "Marksman",
    actorId: 312146,
    classId: 11,
    classSpec: 11,
    damageDealt: 50000,
    abilityScore: 25000,
    healDealt: 75000,
  },
  {
    name: "Shield Knight",
    actorId: 312147,
    classId: 12,
    classSpec: 13,
    damageDealt: 40000,
    abilityScore: 20000,
    healDealt: 70000,
  },
  {
    name: "Beat Performer",
    actorId: 312148,
    classId: 13,
    classSpec: 15,
    damageDealt: 30000,
    abilityScore: 15000,
    healDealt: 65000,
  },
];


enum ClassType {
  Damage = "damage",
  Healer = "healer",
  Tank = "tank",
  DamageHealer = "damagehealer"
}

const FALLBACK_ICON = "blank.png";
const FALLBACK_NAME = "Unknown Class";


export function getType(classId: number, classSpec: number): ClassType {
  switch (classSpec) {
    case 0: // Unknown
    case 1: // Iaido
    case 2: // Moonstrike
    case 3: // Icicle
    case 4: // Frostbeam
    case 5: // Vanguard
    case 6: // Skyward
    case 11: // Wildpack
    case 12: // Falconry
      return ClassType.Damage;

    case 7: // Smite
    case 15: // Dissonance
    case 16: // Concerto
      return ClassType.DamageHealer;

    case 8: // Lifebind
      return ClassType.Healer;

    case 9: // Earthfort
    case 10: // Block
    case 13: // Recovery
    case 14: // Shield
      return ClassType.Tank;

    default:
      return ClassType.DamageHealer;
  }
} 

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
  const specName = CLASS_SPEC_MAP[classSpec] ?? `Spec ${classSpec}`
  return `${base} · ${specName}`;
}

// Return the two spec IDs for a given class ID. Exposed for UI helpers.
export function getSpecsForClass(classId: number | null): number[] {
  if (!classId) return [];
  switch (classId) {
    case 1:
      return [1, 2];
    case 2:
      return [3, 4];
    case 4:
      return [5, 6];
    case 5:
      return [7, 8];
    case 9:
      return [9, 10];
    case 11:
      return [11, 12];
    case 12:
      return [13, 14];
    case 13:
      return [15, 16];
    default:
      return [];
  }
}

// Types generated from backend Go models (server/models)
// Keep these aligned with the JSON tags returned by the API.

export interface ApiKey {
  id: number;
  user_id: number;
  created_at: string;
  updated_at: string;
  revoked_at?: string | null;
  last_used_at?: string | null;
}

export interface User {
  id: number;
  discord_user_id: string;
  discord_username: string;
  discord_global_name?: string | null;
  discord_avatar_url?: string | null;
  role: string;
  created_at: string;
  updated_at: string;
  last_login_at?: string | null;
  encounters_uploaded?: number;
  encounters?: Encounter[];
  apiKey?: ApiKey | null;
}

export interface EncounterBoss {
  id: number;
  monsterName: string;
  hits: number;
  totalDamage: number;
  maxHp?: number | null;
  isDefeated: boolean;
  encounterId: number;
}

export interface Attempt {
  id: number;
  attemptIndex: number;
  startedAt: string;
  endedAt?: string | null;
  reason?: string | null;
  bossHpStart?: number | null;
  bossHpEnd?: number | null;
  totalDeaths: number;
  encounterId: number;
}

export interface ActorEncounterStat {
  id: number;
  actorId: number;
  classSpec?: number | null;
  damageDealt: number;
  healDealt: number;
  damageTaken: number;
  hitsDealt: number;
  hitsHeal: number;
  hitsTaken: number;

  // Crit stats
  critHitsDealt: number;
  critHitsHeal: number;
  critHitsTaken: number;
  critTotalDealt: number;
  critTotalHeal: number;
  critTotalTaken: number;

  // Lucky stats
  luckyHitsDealt: number;
  luckyHitsHeal: number;
  luckyHitsTaken: number;
  luckyTotalDealt: number;
  luckyTotalHeal: number;
  luckyTotalTaken: number;

  // Boss-specific stats
  bossDamageDealt: number;
  bossHitsDealt: number;
  bossCritHitsDealt: number;
  bossLuckyHitsDealt: number;
  bossCritTotalDealt: number;
  bossLuckyTotalDealt: number;

  // Performance snapshot
  dps: number;
  duration: number;

  name?: string | null;
  classId?: number | null;
  abilityScore?: number | null;
  level?: number | null;
  isPlayer: boolean;
  isLocalPlayer: boolean;
  attributes?: Record<string, any> | null;
  revives: number;
  encounterId: number;
}

export interface DamageSkillStat {
  id: number;
  attackerId: number;
  defenderId?: number | null;
  skillId: number;
  hits: number;
  totalValue: number;
  critHits: number;
  luckyHits: number;
  critTotal: number;
  luckyTotal: number;
  hpLossTotal: number;
  shieldLossTotal: number;
  hitDetails?: any;
  monsterName?: string | null;
  encounterId: number;
}

export interface HealSkillStat {
  id: number;
  healerId: number;
  targetId?: number | null;
  skillId: number;
  hits: number;
  totalValue: number;
  critHits: number;
  luckyHits: number;
  critTotal: number;
  luckyTotal: number;
  healDetails?: any;
  monsterName?: string | null;
  encounterId: number;
}

export interface DeathEvent {
  id: number;
  timestamp: string;
  actorId: number;
  killerId?: number | null;
  skillId?: number | null;
  isLocalPlayer: boolean;
  attemptIndex: number;
  encounterId: number;
}

export interface EncounterPhase {
  id: number;
  encounterId: number;
  phaseType: 'mob' | 'boss';
  startTime: string;
  endTime?: string | null;
  outcome: 'success' | 'wipe' | 'unknown';
}

export interface Entity {
  id: number;
  entityId?: number | null;
  name?: string | null;
  classId?: number | null;
  classSpec?: number | null;
  abilityScore?: number | null;
  level?: number | null;
  firstSeen?: string | null;
  lastSeen?: string | null;
  attributes?: Record<string, any> | null;
}

export interface DetailedPlayerData {
  playerId: number;
  userId?: number | null;
  lastSeenMs: number;
  charSerializeJson: string;
  professionListJson?: string | null;
  talentNodeIdsJson?: string | null;
  user?: User | null;
}

export interface Encounter {
  id: number;
  startedAt: string;
  endedAt?: string | null;
  localPlayerId?: number | null;
  totalDmg: number;
  totalHeal: number;
  sceneId?: number | null;
  sceneName?: string | null;
  user_id?: number;
  user?: User | null;
  bosses?: EncounterBoss[];
  players?: ActorEncounterStat[];
  attempts?: Attempt[];
  damageSkillStats?: DamageSkillStat[];
  healSkillStats?: HealSkillStat[];
  deathEvents?: DeathEvent[];
  detailedPlayerData?: DetailedPlayerData[];
  phases?: EncounterPhase[];
}

// Convenience list/response shapes used in frontend
export interface EncounterListResponse {
  rows: Encounter[];
  totalCount: number;
}

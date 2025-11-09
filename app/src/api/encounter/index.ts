import api from '@/api/axios';

export interface EncounterPlayerDTO {
  actorId: number;
  name?: string;
  classId?: number;
  classSpec?: number;
  damageDealt: number;
  healDealt: number;
  damageTaken: number;
  abilityScore?: number;
  isPlayer: boolean;
}

export interface EncounterRowDTO {
  id: number;
  startedAtMs: number;
  endedAtMs?: number;
  sceneId?: number;
  sceneName?: string;
  durationMs: number;
  totalDmg: number;
  totalHeal: number;
  team: string;
  teamAvgAbilityScore?: number;
  teamDps: number;
  bosses: { monsterName: string; isDefeated: boolean }[];
  players: EncounterPlayerDTO[];
}

export interface EncounterListResponse {
  rows: EncounterRowDTO[];
  totalCount: number;
}

export async function fetchEncounters(params: Record<string, any> = {}) {
  const { data } = await api.get<EncounterListResponse>('/encounter', { params });
  return data;
}

export async function fetchEncounterScenes() {
  const { data } = await api.get<{ scenes: string[] }>("/encounter/scenes");
  return data.scenes;
}

export async function fetchEncounterById(id: string | number) {
  const { data } = await api.get(`/encounter/${id}`);
  return data;
}

export async function fetchEncounterSkill(id: string | number, skillId: string | number, q: Record<string, any> = {}) {
  const { data } = await api.get(`/encounter/${id}/skill/${skillId}`, { params: q });
  return data;
}

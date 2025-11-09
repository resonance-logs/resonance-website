import api from '@/api/axios';
import { Encounter, ActorEncounterStat } from '@/types/commonTypes'

export interface FetchEncountersParams {
  limit?: number;
  offset?: number;

  orderBy?: 'dps' | 'date' | 'startedAt' | 'duration';
  sort?: 'asc' | 'desc';

  user_id?: number | string;
  scene_id?: number | string;
  scene_name?: string;
  monster_name?: string;
  class_id?: number | string;
  class_spec?: number | string;
  player_name?: string;
}

export interface FetchEncountersResponse {
  encounters: Encounter[];
  count: number;
}

// Legacy frontend DTOs expected by UI code. We expose them from the API module
// and transform server `Encounter` models into lightweight frontend rows.
export type EncounterPlayerDTO = ActorEncounterStat;

export interface EncounterRowDTO {
  id: number;
  startedAtMs: number;
  endedAtMs?: number;
  sceneId?: number | null;
  sceneName?: string | null;
  durationMs: number;
  totalDmg: number;
  totalHeal: number;
  team?: string | null;
  teamAvgAbilityScore?: number | null;
  bosses: { monsterName: string; isDefeated: boolean }[];
  players: EncounterPlayerDTO[];
}

export interface FetchEncountersResponse {
  encounters: Encounter[];
  count: number;
}

export interface FetchEncountersFrontendResponse {
  rows: EncounterRowDTO[];
  totalCount: number;
}

function transformEncounterToRow(enc: Encounter): EncounterRowDTO {
  const startedAtMs = enc.startedAt ? new Date(enc.startedAt).getTime() : Date.now();
  const endedAtMs = enc.endedAt ? new Date(enc.endedAt).getTime() : undefined;
  const durationMs = (enc as any).durationMs ?? (endedAtMs ? endedAtMs - startedAtMs : Math.max(1, Date.now() - startedAtMs));

  const players: EncounterPlayerDTO[] = (enc.players ?? []).map((p) => ({ ...p }));

  const teamAvg = players.length
    ? Math.round(players.reduce((s, p) => s + (p.abilityScore ?? 0), 0) / players.length)
    : null;

  return {
    id: enc.id,
    startedAtMs,
    endedAtMs,
    sceneId: enc.sceneId ?? null,
    sceneName: enc.sceneName ?? null,
    durationMs,
    totalDmg: enc.totalDmg ?? 0,
    totalHeal: enc.totalHeal ?? 0,
    team: enc.user?.discord_username ?? null,
    teamAvgAbilityScore: teamAvg,
    bosses: enc.bosses?.map((b) => ({ monsterName: b.monsterName, isDefeated: b.isDefeated })) ?? [],
    players,
  };
}

export async function fetchEncounters(params: FetchEncountersParams) {
  const { data } = await api.get<FetchEncountersResponse>('/encounter', { params });
  const rows = (data.encounters ?? []).map(transformEncounterToRow);
  return { rows, totalCount: data.count } as FetchEncountersFrontendResponse;
}

export interface FetchEncounterScenesResponse {
  scenes: string[]
}

export async function fetchEncounterScenes() {
  const { data } = await api.get<FetchEncounterScenesResponse>("/encounter/scenes");
  return data.scenes;
}

export interface FetchEncounterByIdResponse {
  encounter: Encounter;
}

export async function fetchEncounterById(id: string) {
  const { data } = await api.get<FetchEncounterByIdResponse>(`/encounter/${id}`);
  return data;
}
import api from '@/api/axios';
import { Encounter } from '@/types/commonTypes'

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

export async function fetchEncounters(params: FetchEncountersParams) {
  const { data } = await api.get<FetchEncountersResponse>('/encounter', { params });
  return data;
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
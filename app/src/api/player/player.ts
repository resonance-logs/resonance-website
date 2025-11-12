import api from '@/api/axios';
import { ActorEncounterStat } from '@/types/commonTypes'

// Params for fetching top 10 players. `scene_name` is required by the backend.
export interface GetTop10PlayersParams {
  scene_name: string;
  class_id?: number | string;
  class_spec?: number | string;

  // ability_score and duration expect CSV ranges: "min,max" where either side may be omitted
  ability_score?: string;
  duration?: string;

  // numeric filters
  dps?: number | string;
  hps?: number | string;
}

export interface PlayerTopRow extends ActorEncounterStat {
  hps?: number | null;
  sceneName?: string | null;
  startedAt?: string | null;
}

export interface GetTop10PlayersResponse {
  players: PlayerTopRow[];
}

export async function fetchTop10Players(params: GetTop10PlayersParams) {
  const { data } = await api.get<GetTop10PlayersResponse>('/player/top10', { params });
  return data;
}

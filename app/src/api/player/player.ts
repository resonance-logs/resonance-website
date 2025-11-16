import api from '@/api/axios';
import { ActorEncounterStat, DetailedPlayerData } from '@/types/commonTypes'

// Params for fetching top 10 players. `scene_name` is required by the backend.
export interface GetTop10PlayersParams {
  scene_name: string;
  class_id?: number | string;
  class_spec?: number | string;

  // ability_score and duration expect CSV ranges: "min,max" where either side may be omitted
  ability_score?: string;
  duration?: string;

  // numeric filters
  hps?: number | string;

  // ordering: choose which metric to sort by server-side
  orderBy?: 'dps' | 'hps' | 'bossDps';
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

/**
 * Fetches detailed player data for the currently authenticated user.
 * Requires authentication (JWT token).
 * Returns all character builds linked to the user's account.
 */

export interface GetDetailedPlayerDataResponse {
  playerData: DetailedPlayerData[];
}

export async function fetchDetailedPlayerData() {
  const { data } = await api.get<GetDetailedPlayerDataResponse>('/player/detailed-playerdata');
  return data;
}

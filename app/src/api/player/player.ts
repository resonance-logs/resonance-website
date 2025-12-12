import api from '@/api/axios';
import { ActorEncounterStat, DetailedPlayerData, PlayerSuggestion } from '@/types/commonTypes'

// Params for fetching top players. `scene_id` or `scene_name` is required by the backend.
export interface GetTop10PlayersParams {
  scene_id?: string | number;
  scene_name?: string;
  class_id?: number | string;
  class_spec?: number | string;

  // ability_score and duration expect CSV ranges: "min,max" where either side may be omitted
  ability_score?: string;
  duration?: string;

  // numeric filters
  hps?: number | string;
  maxHp?: number | string;

  // ordering: choose which metric to sort by server-side
  orderBy?: 'dps' | 'hps' | 'bossDps';

  // pagination
  limit?: number;
  offset?: number;
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

export async function fetchDetailedPlayerData(id: number | string) {
  const { data } = await api.get<GetDetailedPlayerDataResponse>(`/player/detailed-playerdata/${id}`);
  return data;
}

export interface SuggestPlayersParams {
  search: string;
}

export interface SuggestPlayersResponse {
  players: PlayerSuggestion[];
}

export async function suggestPlayers(params: SuggestPlayersParams) {
  const { data } = await api.get<SuggestPlayersResponse>('/player/suggest', { params });
  return data;
}

export type GetPlayerByIdResponse = DetailedPlayerData;

export async function fetchPlayerById(playerId: number | string) {
  const { data } = await api.get<GetPlayerByIdResponse>(`/player/by-player-id/${playerId}`);
  return data;
}

// New: getCharacters
export interface CharacterEntry {
  characterName: string
  characterId: string
  profileUrl?: string | null
}

export interface GetCharactersResponse {
  characters: CharacterEntry[]
}

export async function getCharacters() {
  const { data } = await api.get<GetCharactersResponse>('/player/getCharacters')
  return data
}

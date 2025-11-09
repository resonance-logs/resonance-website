import { API_BASE_URL } from '@/config/api';

// Interfaces matching the API response structure
export interface EncounterBoss {
  id: number;
  encounterId: number;
  monsterName: string;
  hits: number;
  totalDamage: number;
  maxHp?: number;
  isDefeated: boolean;
}

export interface EncounterPlayer {
  actorId: number;
  name?: string;
  classId?: number;
  classSpec?: number;
  damageDealt: number;
  healDealt: number;
  damageTaken: number;
  abilityScore?: number;
  isPlayer: boolean;
  hitsDealt?: number;
  hitsHeal?: number;
  hitsTaken?: number;
  level?: number;
  isLocalPlayer?: boolean;
  revives?: number;
}

export interface EncounterRow {
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
  bosses: EncounterBoss[];
  players: EncounterPlayer[];
}

export interface EncountersResponse {
  rows: EncounterRow[];
  totalCount: number;
}

export interface EncounterDetail {
  id: number;
  startedAtMs: number;
  endedAtMs?: number;
  sceneId?: number;
  sceneName?: string;
  durationMs: number;
  totalDmg: number;
  totalHeal: number;
  bosses: EncounterBoss[];
  actors: EncounterPlayer[];
  localPlayerId?: number;
}

// Query parameters for fetching encounters
export interface FetchLogsParams {
  limit?: number;
  offset?: number;
  orderBy?: 'duration' | 'dps' | 'date' | 'startedat';
  sort?: 'asc' | 'desc';
  userId?: string;
  sceneId?: string;
  sceneName?: string;
  monsterName?: string;
  classId?: string;
  classSpec?: string;
  playerName?: string;
}

// API error response interface
export interface ApiError {
  code: number;
  message: string;
  details?: any;
}

/**
 * Fetch encounters with optional filtering, pagination, and sorting
 */
export async function fetchLogs(params: FetchLogsParams = {}): Promise<EncountersResponse> {
  const searchParams = new URLSearchParams();

  // Add query parameters if they exist
  if (params.limit !== undefined) searchParams.append('limit', params.limit.toString());
  if (params.offset !== undefined) searchParams.append('offset', params.offset.toString());
  if (params.orderBy) searchParams.append('orderBy', params.orderBy);
  if (params.sort) searchParams.append('sort', params.sort);
  if (params.userId) searchParams.append('user_id', params.userId);
  if (params.sceneId) searchParams.append('scene_id', params.sceneId);
  if (params.sceneName) searchParams.append('scene_name', params.sceneName);
  if (params.monsterName) searchParams.append('monster_name', params.monsterName);
  if (params.classId) searchParams.append('class_id', params.classId);
  if (params.classSpec) searchParams.append('class_spec', params.classSpec);
  if (params.playerName) searchParams.append('player_name', params.playerName);

  const url = `${API_BASE_URL}/encounter${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include', // Include cookies for authentication
    });

    if (!response.ok) {
      const errorData: ApiError = await response.json().catch(() => ({
        code: response.status,
        message: 'Unknown error occurred',
      }));
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    const data: EncountersResponse = await response.json();
    return data;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to fetch encounters: ${error.message}`);
    }
    throw new Error('Failed to fetch encounters: Unknown error');
  }
}

/**
 * Fetch a single encounter by ID
 */
export async function fetchEncounterById(id: number): Promise<EncounterDetail> {
  const url = `${API_BASE_URL}/encounter/${id}`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include', // Include cookies for authentication
    });

    if (!response.ok) {
      const errorData: ApiError = await response.json().catch(() => ({
        code: response.status,
        message: 'Unknown error occurred',
      }));
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    const data: EncounterDetail = await response.json();
    return data;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to fetch encounter: ${error.message}`);
    }
    throw new Error('Failed to fetch encounter: Unknown error');
  }
}

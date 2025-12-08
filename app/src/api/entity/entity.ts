import api from '@/api/axios';
import { PlayerUser } from '@/types/commonTypes';

// Query params for fetching entities leaderboard
export interface GetEntitiesParams {
  classId?: number | string;
}

// Single entity in the leaderboard
export interface EntityLeaderboardEntry {
  entityId: number;
  name?: string | null;
  classId?: number | null;
  classSpec?: number | null;
  abilityScore?: number | null;
  level?: number | null;
   userId?: number | null;
  user?: PlayerUser | null;
}

// Response from GET /api/v1/entities
export interface GetEntitiesResponse {
  entities: EntityLeaderboardEntry[];
  total: number;
  updatedAt?: string;
}

export async function fetchEntities(params: GetEntitiesParams = {}) {
  const { data } = await api.get<GetEntitiesResponse>('/entities', { params });
  return data;
}

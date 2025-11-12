import api from '../axios';
import {
  SavedBuildsResponse,
  SavedBuildResponse,
  SavedBuildWithModulesResponse,
  SavedBuildRequest
} from '@/types/moduleOptimizer';

/**
 * Get all saved builds for the current user
 */
export async function getSavedBuilds() {
  const { data } = await api.get<SavedBuildsResponse>('/module-optimizer/builds');
  return data;
}

/**
 * Get specific saved build with full module details
 */
export async function getSavedBuild(id: number) {
  const { data } = await api.get<SavedBuildWithModulesResponse>(`/module-optimizer/builds/${id}`);
  return data;
}

/**
 * Save a new build
 */
export async function saveBuild(request: SavedBuildRequest) {
  const { data } = await api.post<SavedBuildResponse>('/module-optimizer/builds', request);
  return data;
}

/**
 * Update saved build (name and notes only)
 */
export async function updateSavedBuild(id: number, updates: { name?: string; notes?: string }) {
  const { data } = await api.put<SavedBuildResponse>(`/module-optimizer/builds/${id}`, updates);
  return data;
}

/**
 * Delete saved build
 */
export async function deleteSavedBuild(id: number) {
  await api.delete(`/module-optimizer/builds/${id}`);
}

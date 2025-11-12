import api from '../axios';
import { PaginationParams, OptimizationHistoryResponse, OptimizationResultResponse } from '@/types/moduleOptimizer';

/**
 * Get optimization history for the current user
 */
export async function getOptimizationHistory(params?: PaginationParams) {
  const { data } = await api.get<OptimizationHistoryResponse>('/module-optimizer/history', { params });
  return data;
}

/**
 * Get specific optimization result by ID
 */
export async function getOptimizationResult(id: number) {
  const { data } = await api.get<OptimizationResultResponse>(`/module-optimizer/history/${id}`);
  return data;
}

/**
 * Delete optimization result from history
 */
export async function deleteOptimizationResult(id: number) {
  await api.delete(`/module-optimizer/history/${id}`);
}

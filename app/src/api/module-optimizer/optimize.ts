/**
 * Module optimization API operations
 */

import { api, MODULE_OPTIMIZER_BASE, handleAPIError } from './index';
import type {
  OptimizationRequest,
  OptimizationResponse,
} from '@/types/moduleOptimizer';

/**
 * Run optimization algorithm to find best module combinations
 */
export async function optimizeModules(request: OptimizationRequest): Promise<OptimizationResponse> {
  try {
    const { data } = await api.post<OptimizationResponse>(
      `${MODULE_OPTIMIZER_BASE}/optimize`,
      request
    );
    return data;
  } catch (error) {
    throw handleAPIError(error);
  }
}

/**
 * Estimate processing time for optimization based on module count
 */
export function estimateProcessingTime(moduleCount: number): number {
  // Simple heuristic: ~1ms per 10 modules + 100ms overhead
  return Math.floor(moduleCount / 10) + 100;
}

/**
 * Validate optimization request parameters
 */
export function validateOptimizationRequest(request: OptimizationRequest): string | null {
  if (!request.category) {
    return 'Category is required';
  }

  if (!['ATTACK', 'DEFENSE', 'SUPPORT', 'ALL'].includes(request.category)) {
    return 'Invalid category';
  }

  if (request.constraints.max_solutions < 1 || request.constraints.max_solutions > 60) {
    return 'Max solutions must be between 1 and 60';
  }

  if (!['ByScore', 'ByTotalAttr'].includes(request.constraints.sort_mode)) {
    return 'Invalid sort mode';
  }

  // Validate priority attributes if present
  if (request.preferences?.priority_attributes) {
    if (request.preferences.priority_attributes.length === 0) {
      return 'Priority attributes cannot be empty';
    }
  }

  // Validate desired levels if present
  if (request.preferences?.desired_levels) {
    for (const [attr, level] of Object.entries(request.preferences.desired_levels)) {
      if (level < 1 || level > 6) {
        return `Invalid desired level for ${attr}: must be 1-6`;
      }
    }
  }

  return null;
}

/**
 * Build optimization request with defaults
 */
export function buildOptimizationRequest(
  category: 'ATTACK' | 'DEFENSE' | 'SUPPORT' | 'ALL',
  options?: {
    priorityAttributes?: string[];
    desiredLevels?: Record<string, number>;
    excludedAttributes?: string[];
    maxSolutions?: number;
    sortMode?: 'ByScore' | 'ByTotalAttr';
  }
): OptimizationRequest {
  return {
    category,
    preferences: options?.priorityAttributes || options?.desiredLevels || options?.excludedAttributes
      ? {
          priority_attributes: options?.priorityAttributes,
          desired_levels: options?.desiredLevels,
          excluded_attributes: options?.excludedAttributes,
        }
      : undefined,
    constraints: {
      max_solutions: options?.maxSolutions ?? 10,
      sort_mode: options?.sortMode ?? 'ByScore',
    },
  };
}

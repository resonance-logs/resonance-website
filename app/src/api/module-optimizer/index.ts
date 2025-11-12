/**
 * Module Optimizer API client utilities
 *
 * This file provides the base API instance and shared utilities for
 * making requests to the module optimizer backend endpoints.
 */

import api from '../axios';
import type {
  APIError,
} from '@/types/moduleOptimizer';

/**
 * Base URL for module optimizer endpoints
 */
export const MODULE_OPTIMIZER_BASE = '/module-optimizer';

/**
 * Handle API errors and convert to a standard format
 */
export function handleAPIError(error: unknown): APIError {
  if (error && typeof error === 'object' && 'response' in error) {
    const response = (error as { response?: { data?: unknown } }).response;
    if (response?.data && typeof response.data === 'object' && 'error' in response.data) {
      return response.data as APIError;
    }
  }

  // Default error response
  return {
    error: {
      code: 'internal_error',
      message: 'An unexpected error occurred',
    },
  };
}

/**
 * Build query string from params object
 */
export function buildQueryString(params: Record<string, unknown>): string {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      searchParams.append(key, String(value));
    }
  });

  const queryString = searchParams.toString();
  return queryString ? `?${queryString}` : '';
}

/**
 * Type guard to check if error is an APIError
 */
export function isAPIError(error: unknown): error is APIError {
  if (typeof error !== 'object' || error === null || !('error' in error)) {
    return false;
  }
  const err = (error as Record<string, unknown>).error;
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    'message' in err
  );
}

export { api };

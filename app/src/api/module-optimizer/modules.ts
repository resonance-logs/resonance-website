/**
 * Module CRUD API operations
 */

import { api, MODULE_OPTIMIZER_BASE, buildQueryString, handleAPIError } from './index';
import type {
  Module,
  ModuleCreateRequest,
  ModuleUpdateRequest,
  ModuleQueryParams,
  ModulesResponse,
  ModuleResponse,
} from '@/types/moduleOptimizer';

/**
 * Get user's module collection with optional filters
 */
export async function getModules(params?: ModuleQueryParams): Promise<ModulesResponse> {
  try {
    const queryString = params ? buildQueryString(params as Record<string, unknown>) : '';
    const { data } = await api.get<ModulesResponse>(`${MODULE_OPTIMIZER_BASE}/modules${queryString}`);
    return data;
  } catch (error) {
    throw handleAPIError(error);
  }
}

/**
 * Get a single module by ID
 */
export async function getModule(id: number): Promise<Module> {
  try {
    const { data } = await api.get<ModuleResponse>(`${MODULE_OPTIMIZER_BASE}/modules/${id}`);
    return data.module;
  } catch (error) {
    throw handleAPIError(error);
  }
}

/**
 * Add a new module to the collection
 */
export async function addModule(request: ModuleCreateRequest): Promise<Module> {
  try {
    const { data } = await api.post<ModuleResponse>(`${MODULE_OPTIMIZER_BASE}/modules`, request);
    return data.module;
  } catch (error) {
    throw handleAPIError(error);
  }
}

/**
 * Update an existing module
 */
export async function updateModule(id: number, request: ModuleUpdateRequest): Promise<Module> {
  try {
    const { data } = await api.put<ModuleResponse>(`${MODULE_OPTIMIZER_BASE}/modules/${id}`, request);
    return data.module;
  } catch (error) {
    throw handleAPIError(error);
  }
}

/**
 * Delete a module from the collection
 */
export async function deleteModule(id: number): Promise<void> {
  try {
    await api.delete(`${MODULE_OPTIMIZER_BASE}/modules/${id}`);
  } catch (error) {
    throw handleAPIError(error);
  }
}

/**
 * Export modules to JSON format
 */
export async function exportModules(): Promise<Blob> {
  try {
    const { data } = await api.get(`${MODULE_OPTIMIZER_BASE}/modules/export`, {
      responseType: 'blob',
    });
    return data;
  } catch (error) {
    throw handleAPIError(error);
  }
}

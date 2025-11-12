/**
 * Module import/export API operations
 */

import { api, MODULE_OPTIMIZER_BASE, handleAPIError } from './index';
import type {
  ModuleImportRequest,
  ImportSummaryResponse,
  ModuleExportResponse,
} from '@/types/moduleOptimizer';

/**
 * Import modules from JSON file
 */
export async function importModules(data: ModuleImportRequest): Promise<ImportSummaryResponse> {
  try {
    const { data: response } = await api.post<ImportSummaryResponse>(
      `${MODULE_OPTIMIZER_BASE}/modules/import`,
      data
    );
    return response;
  } catch (error) {
    throw handleAPIError(error);
  }
}

/**
 * Export user's modules to JSON format
 */
export async function exportModules(category?: string): Promise<ModuleExportResponse> {
  try {
    const params = category && category !== 'ALL' ? { category } : {};
    const { data } = await api.get<ModuleExportResponse>(
      `${MODULE_OPTIMIZER_BASE}/modules/export`,
      { params }
    );
    return data;
  } catch (error) {
    throw handleAPIError(error);
  }
}

/**
 * Parse and validate JSON file content for import
 */
export function parseImportFile(content: string): ModuleImportRequest {
  try {
    const data = JSON.parse(content);

    // Validate basic structure
    if (!data.version || !data.modules || !Array.isArray(data.modules)) {
      throw new Error('Invalid import file structure');
    }

    return data as ModuleImportRequest;
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error('Invalid JSON format');
    }
    throw error;
  }
}

/**
 * Download modules as JSON file
 */
export async function downloadModulesAsJSON(category?: string): Promise<void> {
  const data = await exportModules(category);

  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: 'application/json',
  });

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `modules-export-${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

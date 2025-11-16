/**
 * TypeScript type definitions for Module Optimizer API
 * Generated from OpenAPI specification
 *
 * These types should be kept in sync with backend Go models and OpenAPI schema
 */

// ============================================================================
// Core Entities
// ============================================================================

export interface Module {
  id: number;
  uuid: string;
  name: string;
  config_id: number;
  quality: 1 | 2 | 3 | 4 | 5;
  category: ModuleCategory;
  source?: 'manual' | 'import' | 'backfill';
  user_id: number;
  created_at: string;
  updated_at: string;
  parts?: ModulePart[];
}

export interface ModulePart {
  id: number;
  module_id: number;
  part_id: number;
  name: string;
  value: number;
  type: 'basic' | 'special';
  created_at: string;
}

export type ModuleCategory = 'ATTACK' | 'DEFENSE' | 'SUPPORT';

// ============================================================================
// Request Types
// ============================================================================

export interface ModuleCreateRequest {
  uuid: string;
  name: string;
  config_id: number;
  quality: 1 | 2 | 3 | 4 | 5;
  category: ModuleCategory;
  parts: ModulePartCreateRequest[];
}

export interface ModulePartCreateRequest {
  part_id: number;
  name: string;
  value: number;
  type: 'basic' | 'special';
}

export interface ModuleUpdateRequest {
  name?: string;
  quality?: 1 | 2 | 3 | 4 | 5;
  parts?: ModulePartCreateRequest[];
}

export interface ModuleImportRequest {
  version: string;
  modules: ModuleCreateRequest[];
}

// ============================================================================
// Optimization Types
// ============================================================================

export interface OptimizationRequest {
  category: ModuleCategory | 'ALL';
  preferences?: OptimizationPreferences;
  constraints: OptimizationConstraints;
}

export interface OptimizationPreferences {
  priority_attributes?: string[];
  desired_levels?: Record<string, number>; // attribute name -> level (1-6)
  excluded_attributes?: string[];
  required_attributes?: string[];
}

export interface OptimizationConstraints {
  max_solutions: number; // 1-60
  sort_mode: 'ByScore' | 'ByTotalAttr';
}

export interface OptimizationResponse {
  solutions: ModuleCombination[];
  metadata: OptimizationMetadata;
}

export interface OptimizationMetadata {
  total_modules: number;
  processing_time_ms: number;
  algorithm: string;
  cache_hit?: boolean;
}

export interface ModuleCombination {
  rank: number;
  score: number;
  priority_level: number; // 0-6
  total_attr_value: number;
  modules: ModuleSummary[];
  attr_breakdown: Record<string, number>; // attribute name -> total value
}

export interface ModuleSummary {
  id: number;
  uuid: string;
  name: string;
  quality: number;
  attributes?: ModuleAttributeSummary[];
}

export interface ModuleAttributeSummary {
  id: number;
  part_id: number;
  name: string;
  value: number;
  type: 'basic' | 'special';
}

// ============================================================================
// History & Saved Builds
// ============================================================================

export interface OptimizationHistoryItem {
  id: number;
  category: ModuleCategory;
  priority_attributes?: string[];
  processing_time_ms: number;
  top_score: number;
  created_at: string;
}

export interface SavedBuild {
  id: number;
  user_id: number;
  name: string;
  module_ids: [string, string, string, string]; // Exactly 4 UUIDs
  score: number;
  attr_breakdown: Record<string, number>;
  priority_level: number;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface SavedBuildWithModules extends SavedBuild {
  modules: [Module, Module, Module, Module]; // Exactly 4 modules
}

export interface SavedBuildRequest {
  name: string;
  module_ids: [string, string, string, string];
  score: number;
  attr_breakdown: Record<string, number>;
  priority_level?: number;
  notes?: string;
}

// ============================================================================
// Response Wrappers
// ============================================================================

export interface ModulesResponse {
  modules: Module[];
  total: number;
}

export interface ModuleResponse {
  module: Module;
}

export interface ModuleExportResponse {
  version: string;
  exported_at: string;
  modules: Module[];
}

export interface ImportSummaryResponse {
  summary: {
    added: number;
    updated: number;
    errors: number;
  };
  errors?: ImportError[];
}

export interface ImportError {
  index: number;
  uuid: string;
  error: string;
}

export interface OptimizationHistoryResponse {
  history: OptimizationHistoryItem[];
  total: number;
}

export interface OptimizationResultResponse {
  result: OptimizationResponse;
}

export interface SavedBuildsResponse {
  builds: SavedBuild[];
}

export interface SavedBuildResponse {
  build: SavedBuild;
}

export interface SavedBuildWithModulesResponse {
  build: SavedBuildWithModules;
}

// ============================================================================
// Error Types
// ============================================================================

export interface APIError {
  error: {
    code: string;
    message: string;
    fields?: Record<string, string>;
  };
}

export type ErrorCode =
  | 'bad_request'
  | 'unauthorized'
  | 'not_found'
  | 'conflict'
  | 'rate_limit_exceeded'
  | 'internal_error'
  | 'validation_error';

// ============================================================================
// Query Parameters
// ============================================================================

export interface ModuleQueryParams {
  category?: ModuleCategory;
  quality?: number;
  limit?: number;
  offset?: number;
}

export interface PaginationParams {
  limit?: number;
  offset?: number;
}

// ============================================================================
// Type Guards
// ============================================================================

export function isAPIError(error: unknown): error is APIError {
  if (typeof error !== 'object' || error === null || !('error' in error)) {
    return false;
  }
  const err = error.error;
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    'message' in err
  );
}

export function isModule(obj: unknown): obj is Module {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'id' in obj &&
    'uuid' in obj &&
    'name' in obj &&
    'category' in obj
  );
}

export function isModuleCombination(obj: unknown): obj is ModuleCombination {
  if (typeof obj !== 'object' || obj === null || !('modules' in obj)) {
    return false;
  }
  const modules = (obj as Record<string, unknown>).modules;
  return (
    'rank' in obj &&
    'score' in obj &&
    Array.isArray(modules) &&
    modules.length === 4
  );
}

// ============================================================================
// Constants
// ============================================================================

export const MODULE_CATEGORIES: ModuleCategory[] = ['ATTACK', 'DEFENSE', 'SUPPORT'];

export const QUALITY_LEVELS = [1, 2, 3, 4, 5] as const;

export const SORT_MODES = ['ByScore', 'ByTotalAttr'] as const;

export const MAX_MODULES_PER_BUILD = 4;

export const MAX_OPTIMIZATION_SOLUTIONS = 60;

export const ATTRIBUTE_TYPES = ['basic', 'special'] as const;

export const ATTRIBUTE_LEVELS = [0, 1, 2, 3, 4, 5, 6] as const;

export const ATTRIBUTE_THRESHOLDS = [1, 4, 8, 12, 16, 20] as const;

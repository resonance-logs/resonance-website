/**
 * React Query hooks for Module Optimizer feature
 *
 * These hooks provide data fetching, caching, and mutation logic for the module optimizer.
 * They integrate with React Query for automatic cache management and background refetching.
 */

import { useQuery, useMutation, useQueryClient, type UseQueryOptions, type UseMutationOptions } from '@tanstack/react-query';
import * as modulesAPI from '@/api/module-optimizer/modules';
import * as optimizeAPI from '@/api/module-optimizer/optimize';
import * as buildsAPI from '@/api/module-optimizer/builds';
import type {
  Module,
  ModuleCreateRequest,
  ModuleUpdateRequest,
  ModuleQueryParams,
  ModulesResponse,
  OptimizationRequest,
  OptimizationResponse,
  APIError,
  SavedBuildsResponse,
  SavedBuildWithModulesResponse,
  SavedBuildRequest,
} from '@/types/moduleOptimizer';

// ============================================================================
// Query Keys
// ============================================================================

export const moduleOptimizerKeys = {
  all: ['module-optimizer'] as const,
  modules: () => [...moduleOptimizerKeys.all, 'modules'] as const,
  modulesList: (params?: ModuleQueryParams) => [...moduleOptimizerKeys.modules(), 'list', params] as const,
  module: (id: number) => [...moduleOptimizerKeys.modules(), 'detail', id] as const,
  optimization: () => [...moduleOptimizerKeys.all, 'optimization'] as const,
  optimizationResult: (requestHash: string) => [...moduleOptimizerKeys.optimization(), requestHash] as const,
  // history keys removed - optimization history UI removed
  builds: () => [...moduleOptimizerKeys.all, 'builds'] as const,
  build: (id: number) => [...moduleOptimizerKeys.builds(), 'detail', id] as const,
};

// ============================================================================
// Module Queries
// ============================================================================

/**
 * Fetch user's module collection with optional filters
 */
export function useModules(
  params?: ModuleQueryParams,
  options?: Omit<UseQueryOptions<ModulesResponse, APIError>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: moduleOptimizerKeys.modulesList(params),
    queryFn: () => modulesAPI.getModules(params),
    staleTime: 5 * 60 * 1000, // 5 minutes
    ...options,
  });
}

/**
 * Fetch a single module by ID
 */
export function useModule(
  id: number,
  options?: Omit<UseQueryOptions<Module, APIError>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: moduleOptimizerKeys.module(id),
    queryFn: () => modulesAPI.getModule(id),
    staleTime: 5 * 60 * 1000, // 5 minutes
    ...options,
  });
}

// ============================================================================
// Module Mutations
// ============================================================================

/**
 * Add a new module to the collection
 */
export function useAddModule(
  options?: UseMutationOptions<Module, APIError, ModuleCreateRequest>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: modulesAPI.addModule,
    onSuccess: (...args) => {
      // Invalidate modules list to refetch
      queryClient.invalidateQueries({ queryKey: moduleOptimizerKeys.modules() });

      // Clear optimization cache (modules changed)
      queryClient.invalidateQueries({ queryKey: moduleOptimizerKeys.optimization() });

      // Call user's onSuccess if provided
      if (options?.onSuccess) {
        options.onSuccess(...args);
      }
    },
    ...options,
  });
}

/**
 * Update an existing module
 */
export function useUpdateModule(
  options?: UseMutationOptions<Module, APIError, { id: number; request: ModuleUpdateRequest }>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, request }) => modulesAPI.updateModule(id, request),
    onSuccess: (...args) => {
      const [, variables] = args;
      // Invalidate specific module and list
      queryClient.invalidateQueries({ queryKey: moduleOptimizerKeys.module(variables.id) });
      queryClient.invalidateQueries({ queryKey: moduleOptimizerKeys.modules() });

      // Clear optimization cache (modules changed)
      queryClient.invalidateQueries({ queryKey: moduleOptimizerKeys.optimization() });

      // Call user's onSuccess if provided
      if (options?.onSuccess) {
        options.onSuccess(...args);
      }
    },
    ...options,
  });
}

/**
 * Delete a module from the collection
 */
export function useDeleteModule(
  options?: UseMutationOptions<void, APIError, number>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: modulesAPI.deleteModule,
    onSuccess: (...args) => {
      // Invalidate modules list
      queryClient.invalidateQueries({ queryKey: moduleOptimizerKeys.modules() });

      // Clear optimization cache (modules changed)
      queryClient.invalidateQueries({ queryKey: moduleOptimizerKeys.optimization() });

      // Call user's onSuccess if provided
      if (options?.onSuccess) {
        options.onSuccess(...args);
      }
    },
    ...options,
  });
}

// ============================================================================
// Optimization Mutations
// ============================================================================

/**
 * Run optimization algorithm
 */
export function useOptimize(
  options?: UseMutationOptions<OptimizationResponse, APIError, OptimizationRequest>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: optimizeAPI.optimizeModules,
    onSuccess: (...args) => {
      const [data] = args;
      // Cache result by request parameters
      // Note: In a real implementation, you'd generate a hash of the request
      // For now, we just invalidate the general optimization key
      queryClient.setQueryData(
        moduleOptimizerKeys.optimization(),
        data
      );

      // Call user's onSuccess if provided
      if (options?.onSuccess) {
        options.onSuccess(...args);
      }
    },
    ...options,
  });
}

// ============================================================================
// Utility Hooks
// ============================================================================

/**
 * Get the total count of modules
 */
export function useModuleCount(params?: ModuleQueryParams) {
  const { data } = useModules(params);
  return data?.total ?? 0;
}

/**
 * Check if user has sufficient modules for optimization
 */
export function useHasSufficientModules(category?: 'ATTACK' | 'DEFENSE' | 'SUPPORT') {
  const { data, isLoading } = useModules(category ? { category } : undefined);

  return {
    hasSufficient: (data?.total ?? 0) >= 4,
    count: data?.total ?? 0,
    isLoading,
  };
}

/**
 * Get modules grouped by category
 */
export function useModulesByCategory() {
  const { data: attackModules } = useModules({ category: 'ATTACK' });
  const { data: defenseModules } = useModules({ category: 'DEFENSE' });
  const { data: supportModules } = useModules({ category: 'SUPPORT' });

  return {
    ATTACK: attackModules?.modules ?? [],
    DEFENSE: defenseModules?.modules ?? [],
    SUPPORT: supportModules?.modules ?? [],
  };
}

/**
 * Prefetch modules for better UX
 */
export function usePrefetchModules(params?: ModuleQueryParams) {
  const queryClient = useQueryClient();

  return () => {
    queryClient.prefetchQuery({
      queryKey: moduleOptimizerKeys.modulesList(params),
      queryFn: () => modulesAPI.getModules(params),
      staleTime: 5 * 60 * 1000,
    });
  };
}

// Optimization history related hooks and keys removed - page deprecated

// ============================================================================
// Saved Builds Queries
// ============================================================================

/**
 * Fetch all saved builds
 */
export function useSavedBuilds(
  options?: Omit<UseQueryOptions<SavedBuildsResponse, APIError>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: moduleOptimizerKeys.builds(),
    queryFn: buildsAPI.getSavedBuilds,
    staleTime: 5 * 60 * 1000, // 5 minutes
    ...options,
  });
}

/**
 * Fetch specific saved build with full module details
 */
export function useSavedBuild(
  id: number,
  options?: Omit<UseQueryOptions<SavedBuildWithModulesResponse, APIError>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: moduleOptimizerKeys.build(id),
    queryFn: () => buildsAPI.getSavedBuild(id),
    staleTime: 5 * 60 * 1000, // 5 minutes
    ...options,
  });
}

/**
 * Save a new build
 */
export function useSaveBuild(
  options?: UseMutationOptions<{ build: any }, APIError, SavedBuildRequest>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: buildsAPI.saveBuild,
    onSuccess: (...args) => {
      // Invalidate builds list
      queryClient.invalidateQueries({ queryKey: moduleOptimizerKeys.builds() });

      // Call user's onSuccess if provided
      if (options?.onSuccess) {
        options.onSuccess(...args);
      }
    },
    ...options,
  });
}

/**
 * Update saved build (name and notes only)
 */
export function useUpdateSavedBuild(
  options?: UseMutationOptions<{ build: any }, APIError, { id: number; updates: { name?: string; notes?: string } }>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, updates }) => buildsAPI.updateSavedBuild(id, updates),
    onSuccess: (...args) => {
      const [, variables] = args;
      // Invalidate specific build and list
      queryClient.invalidateQueries({ queryKey: moduleOptimizerKeys.build(variables.id) });
      queryClient.invalidateQueries({ queryKey: moduleOptimizerKeys.builds() });

      // Call user's onSuccess if provided
      if (options?.onSuccess) {
        options.onSuccess(...args);
      }
    },
    ...options,
  });
}

/**
 * Delete saved build
 */
export function useDeleteSavedBuild(
  options?: UseMutationOptions<void, APIError, number>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: buildsAPI.deleteSavedBuild,
    onSuccess: (...args) => {
      // Invalidate builds list
      queryClient.invalidateQueries({ queryKey: moduleOptimizerKeys.builds() });

      // Call user's onSuccess if provided
      if (options?.onSuccess) {
        options.onSuccess(...args);
      }
    },
    ...options,
  });
}

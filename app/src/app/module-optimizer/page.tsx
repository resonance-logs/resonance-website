/**
 * Module Optimizer Main Page
 *
 * This page provides the main interface for the module optimization feature.
 * Users can select categories, configure optimization parameters, and view results.
 */

'use client';

import { useState } from 'react';
import { OptimizationControls } from '@/components/module-optimizer/OptimizationControls';
import { OptimizationResults } from '@/components/module-optimizer/OptimizationResults';
import { Loader2, AlertCircle, Zap } from 'lucide-react';
import { useOptimize, useHasSufficientModules } from '@/hooks/useModuleOptimizer';
import type { OptimizationRequest, OptimizationResponse } from '@/types/moduleOptimizer';
import { ModuleOptimizerAuthGate } from '@/components/module-optimizer/ModuleOptimizerAuthGate';
import { ModuleSyncStatus } from '@/components/module-optimizer/ModuleSyncStatus';
import { GlassCard } from '@/components/landing/GlassCard';

export default function ModuleOptimizerPage() {
  return (
    <ModuleOptimizerAuthGate>
      <ModuleOptimizerContent />
    </ModuleOptimizerAuthGate>
  );
}

function ModuleOptimizerContent() {
  const [category, setCategory] = useState<'ATTACK' | 'DEFENSE' | 'SUPPORT'>('ATTACK');
  const [optimizationResult, setOptimizationResult] = useState<OptimizationResponse | null>(null);
  const [lastRequest, setLastRequest] = useState<OptimizationRequest | null>(null);

  const { hasSufficient, count, isLoading: checkingModules } = useHasSufficientModules(category);
  const optimizeMutation = useOptimize({
    onSuccess: (data) => {
      setOptimizationResult(data);
    },
  });

  const handleOptimize = (request: OptimizationRequest) => {
    setOptimizationResult(null);
    setLastRequest(request);
    optimizeMutation.mutate(request);
  };

  const handleReOptimize = () => {
    if (lastRequest) {
      setOptimizationResult(null);
      optimizeMutation.mutate(lastRequest);
    }
  };

  return (
    <div className="mt-24 mb-16 max-w-7xl mx-auto px-4 space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white">Module Optimizer</h1>
        <p className="text-gray-400 mt-2">
          Find the optimal 4-module equipment combinations for your build
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_2fr] items-start">
        {/* Controls Section */}
        <div className="space-y-4 self-start">
          <GlassCard className="p-6">
            <h2 className="text-lg font-semibold text-white mb-1">Optimization Settings</h2>
            <p className="text-sm text-gray-400 mb-6">
              Configure your optimization parameters
            </p>
            {checkingModules ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-purple-400" />
                <span className="ml-2 text-sm text-gray-300">Loading modules...</span>
              </div>
            ) : !hasSufficient ? (
              <div className="rounded-lg bg-red-500/10 border border-red-500/30 p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
                  <div className="text-sm text-red-200">
                    You need at least 4 modules in the {category} category to run optimization.
                    Current count: {count}
                  </div>
                </div>
              </div>
            ) : (
              <OptimizationControls
                category={category}
                onCategoryChange={setCategory}
                onOptimize={handleOptimize}
                disabled={optimizeMutation.isPending}
              />
            )}
          </GlassCard>

          {/* Module Count Info */}
          {hasSufficient && !checkingModules && (
            <GlassCard className="p-4">
              <div className="text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Modules in {category}:</span>
                  <span className="font-semibold text-white">{count}</span>
                </div>
              </div>
            </GlassCard>
          )}

          <ModuleSyncStatus />
        </div>

        {/* Results Section */}
        <div className="self-start">
          {optimizeMutation.isPending && (
            <GlassCard className="p-6">
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="h-12 w-12 animate-spin text-purple-400 mb-4" />
                <p className="text-lg font-medium text-white">Optimizing...</p>
                <p className="text-sm text-gray-400 mt-2">
                  Finding the best module combinations
                </p>
              </div>
            </GlassCard>
          )}

          {optimizeMutation.error && (
            <div className="rounded-lg bg-red-500/10 border border-red-500/30 p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
                <div className="text-sm text-red-200">
                  {optimizeMutation.error.error?.message || 'An error occurred during optimization'}
                </div>
              </div>
            </div>
          )}

          {optimizationResult && !optimizeMutation.isPending && (
            <div className="space-y-4">
              {/* Re-optimize button */}
              <div className="flex justify-end">
                <button
                  onClick={handleReOptimize}
                  disabled={!lastRequest || optimizeMutation.isPending}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-[rgba(5,7,16,0.6)] text-gray-300 hover:text-white border border-purple-500/30 hover:border-purple-400/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Zap className="h-4 w-4" />
                  Re-optimize
                </button>
              </div>
              <OptimizationResults
                solutions={optimizationResult.solutions}
                metadata={optimizationResult.metadata}
              />
            </div>
          )}

          {!optimizationResult && !optimizeMutation.isPending && !optimizeMutation.error && (
            <GlassCard className="p-6">
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="rounded-full bg-purple-500/10 p-4 mb-4 border border-purple-500/20">
                  <svg
                    className="h-8 w-8 text-purple-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 10V3L4 14h7v7l9-11h-7z"
                    />
                  </svg>
                </div>
                <p className="text-lg font-medium text-white">Ready to optimize</p>
                <p className="text-sm text-gray-400 mt-2 max-w-sm">
                  Configure your settings and click &quot;Optimize&quot; to find the best module combinations
                </p>
              </div>
            </GlassCard>
          )}
        </div>
      </div>
    </div>
  );
}

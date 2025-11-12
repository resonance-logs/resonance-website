/**
 * Module Optimizer Main Page
 *
 * This page provides the main interface for the module optimization feature.
 * Users can select categories, configure optimization parameters, and view results.
 */

'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { OptimizationControls } from '@/components/module-optimizer/OptimizationControls';
import { OptimizationResults } from '@/components/module-optimizer/OptimizationResults';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Loader2, AlertCircle, Zap } from 'lucide-react';
import { useOptimize, useHasSufficientModules } from '@/hooks/useModuleOptimizer';
import type { OptimizationRequest, OptimizationResponse } from '@/types/moduleOptimizer';
import { ModuleOptimizerAuthGate } from '@/components/module-optimizer/ModuleOptimizerAuthGate';

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
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-4xl font-bold tracking-tight">Module Optimizer</h1>
        <p className="text-muted-foreground mt-2">
          Find the optimal 4-module equipment combinations for your build
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_2fr]">
        {/* Controls Section */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Optimization Settings</CardTitle>
              <CardDescription>
                Configure your optimization parameters
              </CardDescription>
            </CardHeader>
            <CardContent>
              {checkingModules ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  <span className="ml-2 text-sm text-muted-foreground">Loading modules...</span>
                </div>
              ) : !hasSufficient ? (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    You need at least 4 modules in the {category} category to run optimization.
                    Current count: {count}
                  </AlertDescription>
                </Alert>
              ) : (
                <OptimizationControls
                  category={category}
                  onCategoryChange={setCategory}
                  onOptimize={handleOptimize}
                  disabled={optimizeMutation.isPending}
                />
              )}
            </CardContent>
          </Card>

          {/* Module Count Info */}
          {hasSufficient && !checkingModules && (
            <Card className="mt-4">
              <CardContent className="pt-6">
                <div className="text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Modules in {category}:</span>
                    <span className="font-semibold">{count}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Results Section */}
        <div>
          {optimizeMutation.isPending && (
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col items-center justify-center py-12">
                  <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
                  <p className="text-lg font-medium">Optimizing...</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Finding the best module combinations
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {optimizeMutation.error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {optimizeMutation.error.error?.message || 'An error occurred during optimization'}
              </AlertDescription>
            </Alert>
          )}

          {optimizationResult && !optimizeMutation.isPending && (
            <div className="space-y-4">
              {/* Re-optimize button */}
              <div className="flex justify-end">
                <Button
                  variant="outline"
                  onClick={handleReOptimize}
                  disabled={!lastRequest || optimizeMutation.isPending}
                >
                  <Zap className="mr-2 h-4 w-4" />
                  Re-optimize
                </Button>
              </div>
              <OptimizationResults
                solutions={optimizationResult.solutions}
                metadata={optimizationResult.metadata}
              />
            </div>
          )}

          {!optimizationResult && !optimizeMutation.isPending && !optimizeMutation.error && (
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="rounded-full bg-muted p-4 mb-4">
                    <svg
                      className="h-8 w-8 text-muted-foreground"
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
                  <p className="text-lg font-medium">Ready to optimize</p>
                  <p className="text-sm text-muted-foreground mt-2 max-w-sm">
                    Configure your settings and click &quot;Optimize&quot; to find the best module combinations
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

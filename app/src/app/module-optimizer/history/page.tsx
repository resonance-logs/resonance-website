'use client';

import { useState } from 'react';
import { useOptimizationHistory, useDeleteOptimizationResult } from '@/hooks/useModuleOptimizer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, ChevronRight, Trash2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ModuleOptimizerAuthGate } from '@/components/module-optimizer/ModuleOptimizerAuthGate';

export default function OptimizationHistoryPage() {
  return (
    <ModuleOptimizerAuthGate>
      <OptimizationHistoryContent />
    </ModuleOptimizerAuthGate>
  );
}

function OptimizationHistoryContent() {
  const [page, setPage] = useState(0);
  const limit = 20;
  const offset = page * limit;

  const { data, isLoading, error } = useOptimizationHistory({ limit, offset });
  const deleteResultMutation = useDeleteOptimizationResult();

  const handleDelete = async (id: number) => {
    if (confirm('Are you sure you want to delete this optimization result?')) {
      await deleteResultMutation.mutateAsync(id);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <h1 className="text-3xl font-bold mb-6">Optimization History</h1>
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i} className="h-32 w-full animate-pulse bg-muted" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Failed to load optimization history. Please try again later.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const history = data?.history || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / limit);

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Optimization History</h1>
          <p className="text-muted-foreground mt-2">
            View your past optimization attempts ({total} total)
          </p>
        </div>
      </div>

      {history.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              No optimization history yet. Run an optimization to see results here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="space-y-4">
            {history.map((item) => (
              <Card key={item.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg">
                        {item.category} Optimization
                      </CardTitle>
                      <CardDescription>
                        {new Date(item.created_at).toLocaleString()}
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          window.location.href = `/module-optimizer/history/${item.id}`;
                        }}
                      >
                        View Details
                        <ChevronRight className="ml-2 h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(item.id)}
                        disabled={deleteResultMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Top Score</p>
                      <p className="font-semibold">{item.top_score.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Processing Time</p>
                      <p className="font-semibold">{item.processing_time_ms}ms</p>
                    </div>
                    {item.priority_attributes && item.priority_attributes.length > 0 && (
                      <div className="col-span-2">
                        <p className="text-muted-foreground">Priority Attributes</p>
                        <p className="font-semibold">
                          {item.priority_attributes.join(', ')}
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="mt-6 flex justify-center gap-2">
              <Button
                variant="outline"
                onClick={() => setPage(Math.max(0, page - 1))}
                disabled={page === 0}
              >
                Previous
              </Button>
              <div className="flex items-center px-4">
                Page {page + 1} of {totalPages}
              </div>
              <Button
                variant="outline"
                onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                disabled={page >= totalPages - 1}
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

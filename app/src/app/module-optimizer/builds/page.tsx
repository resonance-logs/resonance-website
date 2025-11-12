'use client';

import { useSavedBuilds, useDeleteSavedBuild } from '@/hooks/useModuleOptimizer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, Trash2, Eye } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { ModuleOptimizerAuthGate } from '@/components/module-optimizer/ModuleOptimizerAuthGate';

export default function SavedBuildsPage() {
  return (
    <ModuleOptimizerAuthGate>
      <SavedBuildsContent />
    </ModuleOptimizerAuthGate>
  );
}

function SavedBuildsContent() {
  const { data, isLoading, error } = useSavedBuilds();
  const deleteBuildMutation = useDeleteSavedBuild();

  const handleDelete = async (id: number) => {
    if (confirm('Are you sure you want to delete this saved build?')) {
      await deleteBuildMutation.mutateAsync(id);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <h1 className="text-3xl font-bold mb-6">Saved Builds</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="h-64 w-full animate-pulse bg-muted" />
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
            Failed to load saved builds. Please try again later.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const builds = data?.builds || [];

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Saved Builds</h1>
          <p className="text-muted-foreground mt-2">
            Your bookmarked equipment combinations ({builds.length} total)
          </p>
        </div>
      </div>

      {builds.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              No saved builds yet. Run an optimization and save your favorite combinations.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {builds.map((build) => {
            // Parse attr_breakdown from JSONB
            let attrBreakdown: Record<string, number> = {};
            try {
              if (typeof build.attr_breakdown === 'string') {
                attrBreakdown = JSON.parse(build.attr_breakdown);
              } else {
                attrBreakdown = build.attr_breakdown;
              }
            } catch (e) {
              console.error('Failed to parse attr_breakdown', e);
            }

            return (
              <Card key={build.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg">{build.name}</CardTitle>
                      <CardDescription>
                        {new Date(build.created_at).toLocaleDateString()}
                      </CardDescription>
                    </div>
                    {build.priority_level > 0 && (
                      <Badge variant="secondary">
                        Level {build.priority_level}
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Score */}
                    <div>
                      <p className="text-sm text-muted-foreground">Combat Power</p>
                      <p className="text-2xl font-bold">{build.score.toFixed(2)}</p>
                    </div>

                    {/* Attribute Breakdown */}
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">Attributes</p>
                      <div className="space-y-1">
                        {Object.entries(attrBreakdown).slice(0, 3).map(([attr, value]) => (
                          <div key={attr} className="flex justify-between text-sm">
                            <span>{attr}</span>
                            <span className="font-semibold">{value}</span>
                          </div>
                        ))}
                        {Object.keys(attrBreakdown).length > 3 && (
                          <p className="text-xs text-muted-foreground">
                            +{Object.keys(attrBreakdown).length - 3} more
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Notes */}
                    {build.notes && (
                      <div>
                        <p className="text-sm text-muted-foreground">Notes</p>
                        <p className="text-sm line-clamp-2">{build.notes}</p>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2 pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => {
                          window.location.href = `/module-optimizer/builds/${build.id}`;
                        }}
                      >
                        <Eye className="mr-2 h-4 w-4" />
                        View
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(build.id)}
                        disabled={deleteBuildMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

/**
 * Module Management Page
 *
 * Page for viewing and managing the user's module collection.
 */

'use client';

// Note: Button import removed, Add Module action is intentionally disabled
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ModuleList } from '@/components/module-optimizer/ModuleList';
// Add module button/icon removed
import { useModules } from '@/hooks/useModuleOptimizer';
import { ModuleOptimizerAuthGate } from '@/components/module-optimizer/ModuleOptimizerAuthGate';

export default function ModulesPage() {
  return (
    <ModuleOptimizerAuthGate>
      <ModulesContent />
    </ModuleOptimizerAuthGate>
  );
}

function ModulesContent() {
  const { data: modulesData } = useModules();

  // Add/edit functionality is currently disabled; handlers removed

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold tracking-tight">Module Collection</h1>
        <p className="text-muted-foreground mt-2">
          Manage your equipment modules
        </p>
      </div>

      {/* Note: Add/Edit module actions are intentionally disabled */}

      <div className="grid gap-6 lg:grid-cols-[1fr_2fr]">
        {/* Sidebar with stats */}
        <div className="space-y-6">
          {/* Stats Card */}
          {modulesData && (
            <Card>
              <CardHeader>
                <CardTitle>Collection Stats</CardTitle>
                <CardDescription>Overview of your module collection</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Modules</p>
                    <p className="text-2xl font-bold">{modulesData.total}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Avg Quality</p>
                    <p className="text-2xl font-bold">
                      {modulesData.modules.length > 0
                        ? (modulesData.modules.reduce((sum, m) => sum + m.quality, 0) / modulesData.modules.length).toFixed(1)
                        : '0'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">5-Star</p>
                    <p className="text-2xl font-bold">
                      {modulesData.modules.filter(m => m.quality === 5).length}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Categories</p>
                    <p className="text-2xl font-bold">
                      {new Set(modulesData.modules.map(m => m.category)).size}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

        </div>

        {/* Module List */}
        <div>
          <ModuleList />
        </div>
      </div>
    </div>
  );
}

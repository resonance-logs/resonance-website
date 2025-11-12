/**
 * Module Management Page
 *
 * Page for viewing and managing the user's module collection.
 */

'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ModuleList } from '@/components/module-optimizer/ModuleList';
import { ModuleSyncStatus } from '@/components/module-optimizer/ModuleSyncStatus';
import { Plus, Upload, Download } from 'lucide-react';
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

  const handleExport = async () => {
    // TODO: Implement export functionality (T078)
    alert('Export functionality coming soon!');
  };

  const handleImport = () => {
    // TODO: Implement import modal (T070)
    alert('Import functionality coming soon!');
  };

  const handleAddModule = () => {
    // TODO: Implement add module form (T074)
    alert('Add module functionality coming soon!');
  };

  const handleEditModule = (moduleId: number) => {
    // TODO: Implement edit modal (T075)
    alert(`Edit module ${moduleId} - coming soon!`);
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold tracking-tight">Module Collection</h1>
        <p className="text-muted-foreground mt-2">
          Manage your equipment modules
        </p>
      </div>

      {/* Action Buttons */}
      <div className="mb-6 flex flex-wrap gap-3">
        <Button onClick={handleAddModule}>
          <Plus className="mr-2 h-4 w-4" />
          Add Module
        </Button>
        <Button variant="outline" onClick={handleImport}>
          <Upload className="mr-2 h-4 w-4" />
          Import Modules
        </Button>
        <Button variant="outline" onClick={handleExport}>
          <Download className="mr-2 h-4 w-4" />
          Export Collection
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_2fr]">
        {/* Sidebar with stats and sync */}
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

          {/* Sync Status Card */}
          <ModuleSyncStatus />
        </div>

        {/* Module List */}
        <div>
          <ModuleList onEdit={handleEditModule} />
        </div>
      </div>
    </div>
  );
}

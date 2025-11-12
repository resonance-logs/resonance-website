/**
 * Module Sync Status Component
 *
 * Shows sync status and allows users to backfill modules from stored encounter data
 */

'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, RefreshCw, CheckCircle, AlertCircle, Upload } from 'lucide-react';
import { backfillModules } from '@/api/module-optimizer/import';
import type { BackfillResponse } from '@/api/module-optimizer/import';
import { useQueryClient } from '@tanstack/react-query';

interface ModuleSyncStatusProps {
  lastSyncTimestamp?: string;
  onSyncComplete?: () => void;
}

export function ModuleSyncStatus({ lastSyncTimestamp, onSyncComplete }: ModuleSyncStatusProps) {
  const [isBackfilling, setIsBackfilling] = useState(false);
  const [backfillResult, setBackfillResult] = useState<BackfillResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const handleBackfill = async () => {
    setIsBackfilling(true);
    setError(null);
    setBackfillResult(null);

    try {
      const result = await backfillModules();
      setBackfillResult(result);

      // Invalidate module queries to refresh the list
      // Wrapped in try-catch to prevent query invalidation errors from showing as backfill errors
      try {
        await queryClient.invalidateQueries({ queryKey: ['modules'] });
      } catch (queryError) {
        console.warn('Query invalidation error (non-critical):', queryError);
      }

      onSyncComplete?.();
    } catch (err) {
      console.error('Backfill error:', err);
      const error = err as { error?: { message?: string } };
      const errorMessage = error?.error?.message || 'Failed to sync modules from encounters';
      setError(errorMessage);
    } finally {
      setIsBackfilling(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Sync from Encounters
        </CardTitle>
        <CardDescription>
          Import modules from your previously uploaded encounter data
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {lastSyncTimestamp && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <span>Last synced: {new Date(lastSyncTimestamp).toLocaleString()}</span>
          </div>
        )}

        <Button
          onClick={handleBackfill}
          disabled={isBackfilling}
          variant="outline"
          className="w-full"
        >
          {isBackfilling ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Syncing modules...
            </>
          ) : (
            <>
              <RefreshCw className="mr-2 h-4 w-4" />
              Sync Modules from Encounters
            </>
          )}
        </Button>

        {backfillResult && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-1">
                <p className="font-medium">{backfillResult.message}</p>
                <div className="text-sm">
                  <span className="text-green-600">+{backfillResult.summary.added} new</span>
                  {backfillResult.summary.updated > 0 && (
                    <span className="ml-2 text-blue-600">
                      ↻{backfillResult.summary.updated} updated
                    </span>
                  )}
                  {backfillResult.summary.errors > 0 && (
                    <span className="ml-2 text-red-600">
                      ✗{backfillResult.summary.errors} errors
                    </span>
                  )}
                </div>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <p className="text-xs text-muted-foreground">
          This will extract module data from your most recent encounter upload and add any new
          modules to your collection. Existing modules will be updated if they&apos;ve changed.
        </p>
      </CardContent>
    </Card>
  );
}

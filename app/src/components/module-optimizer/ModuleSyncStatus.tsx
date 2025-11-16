/**
 * Module Sync Status Component
 *
 * Shows sync status and allows users to backfill modules from stored encounter data
 */

'use client';

import { useState } from 'react';
import { Loader2, RefreshCw, CheckCircle, AlertCircle, Upload } from 'lucide-react';
import { backfillModules } from '@/api/module-optimizer/import';
import type { BackfillResponse } from '@/api/module-optimizer/import';
import { useQueryClient } from '@tanstack/react-query';
import { GlassCard } from '@/components/landing/GlassCard';

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
    <GlassCard className="p-6">
      <div className="mb-6">
        <h3 className="flex items-center gap-2 text-lg font-semibold text-white mb-1">
          <Upload className="h-5 w-5" />
          Sync from Encounters
        </h3>
        <p className="text-sm text-gray-400">
          Import modules from your previously uploaded encounter data
        </p>
      </div>
      <div className="space-y-4">
        {lastSyncTimestamp && (
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <CheckCircle className="h-4 w-4 text-green-400" />
            <span>Last synced: {new Date(lastSyncTimestamp).toLocaleString()}</span>
          </div>
        )}

        <button
          onClick={handleBackfill}
          disabled={isBackfilling}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-[rgba(5,7,16,0.6)] text-gray-300 hover:text-white border border-purple-500/30 hover:border-purple-400/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isBackfilling ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Syncing modules...
            </>
          ) : (
            <>
              <RefreshCw className="h-4 w-4" />
              Sync Modules from Encounters
            </>
          )}
        </button>

        {backfillResult && (
          <div className="rounded-lg bg-green-500/10 border border-green-500/30 p-4">
            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-green-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-medium text-green-200">{backfillResult.message}</p>
                <div className="text-sm text-green-300">
                  <span>+{backfillResult.summary.added} new</span>
                  {backfillResult.summary.updated > 0 && (
                    <span className="ml-2">
                      ↻{backfillResult.summary.updated} updated
                    </span>
                  )}
                  {backfillResult.summary.errors > 0 && (
                    <span className="ml-2 text-red-300">
                      ✗{backfillResult.summary.errors} errors
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="rounded-lg bg-red-500/10 border border-red-500/30 p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
              <div className="text-sm text-red-200">{error}</div>
            </div>
          </div>
        )}

        <p className="text-xs text-gray-400">
          This will extract module data from your most recent encounter upload and add any new
          modules to your collection. Existing modules will be updated if they&apos;ve changed.
        </p>
      </div>
    </GlassCard>
  );
}

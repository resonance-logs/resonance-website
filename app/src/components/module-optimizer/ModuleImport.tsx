/**
 * ModuleImport Component
 *
 * Provides UI for importing modules from JSON files with drag-and-drop support
 */

'use client';

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, FileJson, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { parseImportFile, importModules } from '@/api/module-optimizer/import';
import type { ModuleImportRequest, ImportSummaryResponse } from '@/types/moduleOptimizer';

interface ModuleImportProps {
  onImportComplete?: (summary: ImportSummaryResponse) => void;
}

export function ModuleImport({ onImportComplete }: ModuleImportProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<ImportSummaryResponse | null>(null);

  const handleFile = useCallback(async (file: File) => {
    setError(null);
    setSummary(null);
    setIsUploading(true);

    try {
      // Read file content
      const content = await file.text();

      // Parse and validate
      const importData: ModuleImportRequest = parseImportFile(content);

      // Import modules
      const result = await importModules(importData);
      setSummary(result);

      // Notify parent
      if (onImportComplete) {
        onImportComplete(result);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import modules');
    } finally {
      setIsUploading(false);
    }
  }, [onImportComplete]);

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleFile(file);
    }
  }, [handleFile]);

  const handleDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);

    const file = event.dataTransfer.files[0];
    if (file && file.type === 'application/json') {
      handleFile(file);
    } else {
      setError('Please upload a valid JSON file');
    }
  }, [handleFile]);

  const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Import Modules</CardTitle>
        <CardDescription>
          Upload a JSON file containing module data to import into your collection
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Drag and Drop Area */}
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={`
            border-2 border-dashed rounded-lg p-8 text-center transition-colors
            ${isDragging ? 'border-primary bg-primary/10' : 'border-muted-foreground/25'}
            ${isUploading ? 'opacity-50 pointer-events-none' : 'cursor-pointer hover:border-primary'}
          `}
        >
          <div className="flex flex-col items-center gap-4">
            <div className="rounded-full bg-primary/10 p-4">
              {isUploading ? (
                <Upload className="h-8 w-8 text-primary animate-pulse" />
              ) : (
                <FileJson className="h-8 w-8 text-primary" />
              )}
            </div>

            <div>
              <p className="text-lg font-semibold mb-1">
                {isUploading ? 'Uploading...' : 'Drop JSON file here'}
              </p>
              <p className="text-sm text-muted-foreground">
                or click to browse
              </p>
            </div>

            <input
              type="file"
              accept=".json,application/json"
              onChange={handleFileSelect}
              disabled={isUploading}
              className="hidden"
              id="file-upload"
            />
            <label htmlFor="file-upload">
              <Button
                variant="outline"
                disabled={isUploading}
                asChild
              >
                <span>
                  <Upload className="h-4 w-4 mr-2" />
                  Select File
                </span>
              </Button>
            </label>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Import Summary */}
        {summary && (
          <div className="space-y-3">
            <Alert
              variant={summary.summary.errors > 0 ? 'default' : 'default'}
              className={summary.summary.errors > 0 ? 'border-amber-500' : 'border-green-500'}
            >
              <CheckCircle className={`h-4 w-4 ${summary.summary.errors > 0 ? 'text-amber-500' : 'text-green-500'}`} />
              <AlertDescription>
                <div className="font-semibold mb-2">Import Complete</div>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Added: </span>
                    <span className="font-semibold text-green-600">{summary.summary.added}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Updated: </span>
                    <span className="font-semibold text-blue-600">{summary.summary.updated}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Errors: </span>
                    <span className="font-semibold text-red-600">{summary.summary.errors}</span>
                  </div>
                </div>
              </AlertDescription>
            </Alert>

            {/* Error Details */}
            {summary.errors && summary.errors.length > 0 && (
              <div className="border rounded-lg p-4 max-h-48 overflow-y-auto">
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  <h4 className="font-semibold text-sm">Import Errors</h4>
                </div>
                <div className="space-y-2">
                  {summary.errors.map((err, index) => (
                    <div key={index} className="text-sm p-2 bg-muted rounded">
                      <div className="flex items-start gap-2">
                        <span className="font-mono text-xs text-muted-foreground">
                          #{err.index}
                        </span>
                        <div className="flex-1">
                          <div className="font-medium">{err.uuid || 'Unknown'}</div>
                          <div className="text-muted-foreground">{err.error}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Instructions */}
        <div className="text-sm text-muted-foreground space-y-2">
          <p className="font-semibold">Import Format:</p>
          <pre className="bg-muted p-3 rounded text-xs overflow-x-auto">
{`{
  "version": "1.0",
  "modules": [
    {
      "uuid": "unique-module-id",
      "name": "Module Name",
      "config_id": 5500101,
      "quality": 5,
      "category": "ATTACK",
      "parts": [
        {
          "part_id": 1110,
          "name": "Attack Power",
          "value": 150,
          "type": "basic"
        }
      ]
    }
  ]
}`}
          </pre>
        </div>
      </CardContent>
    </Card>
  );
}

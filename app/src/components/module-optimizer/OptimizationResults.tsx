/**
 * OptimizationResults Component
 *
 * Displays ranked optimization results with expand/collapse functionality
 * for detailed attribute breakdowns.
 */

'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp, Award, Zap } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { ModuleCombination, OptimizationMetadata } from '@/types/moduleOptimizer';
import { ATTRIBUTE_THRESHOLDS } from '@/types/moduleOptimizer';

interface OptimizationResultsProps {
  solutions: ModuleCombination[];
  metadata: OptimizationMetadata;
}

// Helper function to calculate attribute level from value
function calculateAttributeLevel(value: number): number {
  for (let i = ATTRIBUTE_THRESHOLDS.length - 1; i >= 0; i--) {
    if (value >= ATTRIBUTE_THRESHOLDS[i]) {
      return i + 1;
    }
  }
  return 0;
}

export function OptimizationResults({ solutions, metadata }: OptimizationResultsProps) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(0);

  const toggleExpand = (index: number) => {
    setExpandedIndex(expandedIndex === index ? null : index);
  };

  if (solutions.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <p className="text-muted-foreground">
              No optimal combinations found for the given parameters.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Metadata Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Solutions Found</p>
              <p className="text-2xl font-bold">{solutions.length}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Total Modules</p>
              <p className="text-2xl font-bold">{metadata.total_modules}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Processing Time</p>
              <p className="text-2xl font-bold">{metadata.processing_time_ms}ms</p>
            </div>
            <div>
              <p className="text-muted-foreground">Cache</p>
              <p className="text-2xl font-bold">
                {metadata.cache_hit ? (
                  <span className="text-green-600">Hit</span>
                ) : (
                  <span className="text-amber-600">Miss</span>
                )}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results List */}
      {solutions.map((solution, index) => (
        <Card key={index} className={index === 0 ? 'border-primary' : ''}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {index === 0 && <Award className="h-5 w-5 text-primary" />}
                <CardTitle className="text-lg">
                  Rank #{solution.rank}
                </CardTitle>
                {solution.priority_level > 0 && (
                  <Badge variant="secondary">
                    Priority Lv. {solution.priority_level}
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Combat Power</p>
                  <p className="text-2xl font-bold flex items-center gap-1">
                    <Zap className="h-4 w-4 text-amber-500" />
                    {solution.score.toFixed(2)}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleExpand(index)}
                >
                  {expandedIndex === index ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </CardHeader>

          {expandedIndex === index && (
            <CardContent className="space-y-4">
              {/* Modules List */}
              <div>
                <h4 className="text-sm font-semibold mb-3">Modules</h4>
                <div className="grid gap-2">
                  {solution.modules.map((module, modIndex) => (
                    <div
                      key={modIndex}
                      className="flex items-center justify-between p-3 bg-muted rounded-lg"
                    >
                      <div>
                        <p className="font-medium">{module.name}</p>
                        <p className="text-xs text-muted-foreground">
                          UUID: {module.uuid.slice(0, 8)}...
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {Array.from({ length: module.quality }).map((_, i) => (
                          <span key={i} className="text-amber-500">★</span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Attribute Breakdown */}
              <div>
                <h4 className="text-sm font-semibold mb-3">Attribute Breakdown</h4>
                <div className="grid gap-2">
                  {Object.entries(solution.attr_breakdown).map(([attr, value]) => {
                    const level = calculateAttributeLevel(value);
                    return (
                      <div
                        key={attr}
                        className="flex items-center justify-between p-2 hover:bg-muted rounded"
                      >
                        <div className="flex items-center gap-2 flex-1">
                          <span className="text-sm">{attr}</span>
                          <Badge variant="outline" className="text-xs">
                            Lv. {level}
                          </Badge>
                        </div>
                        <span className="font-mono font-semibold">{value}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Total Attribute Value */}
              <div className="pt-3 border-t">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold">Total Attribute Value</span>
                  <span className="text-lg font-bold">{solution.total_attr_value}</span>
                </div>
              </div>
            </CardContent>
          )}
        </Card>
      ))}
    </div>
  );
}

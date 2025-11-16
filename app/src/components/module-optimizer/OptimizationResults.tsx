/**
 * OptimizationResults Component
 *
 * Displays ranked optimization results with expand/collapse functionality
 * for detailed attribute breakdowns.
 */

'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, Award, Zap } from 'lucide-react';
import type { ModuleCombination, OptimizationMetadata } from '@/types/moduleOptimizer';
import { ATTRIBUTE_THRESHOLDS } from '@/types/moduleOptimizer';
import { GlassCard } from '@/components/landing/GlassCard';

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
      <GlassCard className="p-6">
        <div className="text-center py-8">
          <p className="text-gray-400">
            No optimal combinations found for the given parameters.
          </p>
        </div>
      </GlassCard>
    );
  }

  return (
    <div className="space-y-4">
      {/* Metadata Card */}
      <GlassCard className="p-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-gray-400">Solutions Found</p>
            <p className="text-2xl font-bold text-white">{solutions.length}</p>
          </div>
          <div>
            <p className="text-gray-400">Total Modules</p>
            <p className="text-2xl font-bold text-white">{metadata.total_modules}</p>
          </div>
          <div>
            <p className="text-gray-400">Processing Time</p>
            <p className="text-2xl font-bold text-white">{metadata.processing_time_ms}ms</p>
          </div>
          <div>
            <p className="text-gray-400">Cache</p>
            <p className="text-2xl font-bold text-white">
              {metadata.cache_hit ? (
                <span className="text-green-400">Hit</span>
              ) : (
                <span className="text-amber-400">Miss</span>
              )}
            </p>
          </div>
        </div>
      </GlassCard>

      {/* Results List */}
      {solutions.map((solution, index) => (
        <GlassCard key={index} className={`p-0 ${index === 0 ? 'border-purple-400/40' : ''}`}>
          <div className="p-6 pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {index === 0 && <Award className="h-5 w-5 text-purple-400" />}
                <h3 className="text-lg font-semibold text-white">
                  Rank #{solution.rank}
                </h3>
                {solution.priority_level > 0 && (
                  <span className="px-2 py-1 text-xs font-medium rounded-md bg-purple-500/20 text-purple-300 border border-purple-500/30">
                    Priority Lv. {solution.priority_level}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-xs text-gray-400">Combat Power</p>
                  <p className="text-2xl font-bold text-white flex items-center gap-1">
                    <Zap className="h-4 w-4 text-amber-400" />
                    {solution.score.toFixed(2)}
                  </p>
                </div>
                <button
                  onClick={() => toggleExpand(index)}
                  className="p-2 rounded-md hover:bg-white/5 text-gray-400 hover:text-white transition-colors"
                >
                  {expandedIndex === index ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
          </div>

          {expandedIndex === index && (
            <div className="px-6 pb-6 space-y-4 border-t border-purple-500/10">
              {/* Modules List */}
              <div className="pt-4">
                <h4 className="text-sm font-semibold text-white mb-3">Modules</h4>
                <div className="grid gap-2">
                  {solution.modules.map((module, modIndex) => (
                    <div
                      key={modIndex}
                      className="rounded-lg bg-white/5 border border-purple-500/10 p-3"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-4">
                        <div>
                          <p className="font-medium text-white">{module.name}</p>
                          <p className="text-xs text-gray-400">
                            UUID: {module.uuid.slice(0, 8)}...
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          {Array.from({ length: module.quality }).map((_, i) => (
                            <span key={i} className="text-amber-400">★</span>
                          ))}
                        </div>
                      </div>
                      {module.attributes && module.attributes.length > 0 ? (
                        <div className="mt-3 grid gap-1 sm:grid-cols-2">
                          {module.attributes.map(attr => (
                            <div
                              key={`${attr.id}-${attr.part_id}-${attr.name}`}
                              className="flex items-center justify-between rounded border border-purple-500/20 bg-black/20 px-2 py-1 text-xs"
                            >
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-gray-200">{attr.name}</span>
                                <span className="px-1.5 py-0.5 text-[10px] font-medium uppercase rounded border border-purple-500/30 text-purple-300">
                                  {attr.type}
                                </span>
                              </div>
                              <span className="font-mono font-semibold text-white">{attr.value}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="mt-3 text-xs text-gray-400">
                          No attribute data available
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Attribute Breakdown */}
              <div>
                <h4 className="text-sm font-semibold text-white mb-3">Attribute Breakdown</h4>
                <div className="grid gap-2">
                  {Object.entries(solution.attr_breakdown).map(([attr, value]) => {
                    const level = calculateAttributeLevel(value);
                    return (
                      <div
                        key={attr}
                        className="flex items-center justify-between p-2 hover:bg-white/5 rounded transition-colors"
                      >
                        <div className="flex items-center gap-2 flex-1">
                          <span className="text-sm text-gray-200">{attr}</span>
                          <span className="px-2 py-0.5 text-xs font-medium rounded border border-purple-500/30 text-purple-300">
                            Lv. {level}
                          </span>
                        </div>
                        <span className="font-mono font-semibold text-white">{value}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Total Attribute Value */}
              <div className="pt-3 border-t border-purple-500/10">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-white">Total Attribute Value</span>
                  <span className="text-lg font-bold text-white">{solution.total_attr_value}</span>
                </div>
              </div>
            </div>
          )}
        </GlassCard>
      ))}
    </div>
  );
}

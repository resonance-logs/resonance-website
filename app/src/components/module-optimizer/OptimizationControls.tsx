/**
 * OptimizationControls Component
 *
 * Provides UI controls for configuring optimization parameters including
 * category selection, max solutions, and sort mode.
 */

'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { X, Plus, ChevronDown, ChevronUp } from 'lucide-react';
import type { OptimizationRequest, ModuleCategory, OptimizationPreferences } from '@/types/moduleOptimizer';

interface OptimizationControlsProps {
  category: ModuleCategory;
  onCategoryChange: (category: ModuleCategory) => void;
  onOptimize: (request: OptimizationRequest) => void;
  disabled?: boolean;
}

export function OptimizationControls({
  category,
  onCategoryChange,
  onOptimize,
  disabled = false,
}: OptimizationControlsProps) {
  const [maxSolutions, setMaxSolutions] = useState(10);
  const [sortMode, setSortMode] = useState<'ByScore' | 'ByTotalAttr'>('ByScore');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [priorityAttributes, setPriorityAttributes] = useState<Array<{ name: string; level: number }>>([]);
  const [excludedAttributes, setExcludedAttributes] = useState<string[]>([]);

  const handleOptimize = () => {
    const preferences: OptimizationPreferences | undefined =
      priorityAttributes.length > 0 || excludedAttributes.length > 0
        ? {
            priority_attributes: priorityAttributes.map(p => p.name),
            desired_levels: priorityAttributes.reduce((acc, p) => {
              if (p.level > 0) {
                acc[p.name] = p.level;
              }
              return acc;
            }, {} as Record<string, number>),
            excluded_attributes: excludedAttributes.length > 0 ? excludedAttributes : undefined,
          }
        : undefined;

    const request: OptimizationRequest = {
      category,
      preferences,
      constraints: {
        max_solutions: maxSolutions,
        sort_mode: sortMode,
      },
    };

    onOptimize(request);
  };

  const handleAddPriorityAttribute = () => {
    setPriorityAttributes([...priorityAttributes, { name: '', level: 0 }]);
  };

  const handleRemovePriorityAttribute = (index: number) => {
    setPriorityAttributes(priorityAttributes.filter((_, i) => i !== index));
  };

  const handleUpdatePriorityAttribute = (index: number, field: 'name' | 'level', value: string | number) => {
    const updated = [...priorityAttributes];
    if (field === 'name') {
      updated[index].name = value as string;
    } else {
      updated[index].level = value as number;
    }
    setPriorityAttributes(updated);
  };

  const handleAddExcludedAttribute = (attrName: string) => {
    if (attrName && !excludedAttributes.includes(attrName)) {
      setExcludedAttributes([...excludedAttributes, attrName]);
    }
  };

  const handleRemoveExcludedAttribute = (attrName: string) => {
    setExcludedAttributes(excludedAttributes.filter(a => a !== attrName));
  };

  return (
    <div className="space-y-6">
      {/* Category Selection */}
      <div className="space-y-2">
        <Label htmlFor="category">Module Category</Label>
        <Select
          value={category}
          onValueChange={(value: string) => onCategoryChange(value as ModuleCategory)}
          disabled={disabled}
        >
          <SelectTrigger id="category">
            <SelectValue placeholder="Select category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ATTACK">Attack</SelectItem>
            <SelectItem value="DEFENSE">Defense</SelectItem>
            <SelectItem value="SUPPORT">Support</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          Choose which module category to optimize
        </p>
      </div>

      {/* Max Solutions */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label htmlFor="max-solutions">Maximum Solutions</Label>
          <span className="text-sm font-medium">{maxSolutions}</span>
        </div>
        <Slider
          id="max-solutions"
          min={1}
          max={50}
          step={1}
          value={[maxSolutions]}
          onValueChange={(value: number[]) => setMaxSolutions(value[0])}
          disabled={disabled}
          className="w-full"
        />
        <p className="text-xs text-muted-foreground">
          Number of top combinations to return
        </p>
      </div>

      {/* Sort Mode */}
      <div className="space-y-2">
        <Label htmlFor="sort-mode">Sort By</Label>
        <Select
          value={sortMode}
          onValueChange={(value: string) => setSortMode(value as 'ByScore' | 'ByTotalAttr')}
          disabled={disabled}
        >
          <SelectTrigger id="sort-mode">
            <SelectValue placeholder="Select sort mode" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ByScore">Combat Power (Score)</SelectItem>
            <SelectItem value="ByTotalAttr">Total Attributes</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          {sortMode === 'ByScore'
            ? 'Rank by combat power calculation'
            : 'Rank by sum of attribute values'}
        </p>
      </div>

      {/* Advanced Settings Toggle */}
      <div className="border-t pt-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowAdvanced(!showAdvanced)}
          disabled={disabled}
          className="w-full justify-between"
        >
          <span>Advanced Settings</span>
          {showAdvanced ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </Button>
      </div>

      {/* Advanced Settings Section */}
      {showAdvanced && (
        <div className="space-y-4 border-t pt-4">
          {/* Priority Attributes */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Priority Attributes</Label>
              <Button
                variant="outline"
                size="sm"
                onClick={handleAddPriorityAttribute}
                disabled={disabled}
              >
                <Plus className="h-3 w-3 mr-1" />
                Add
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Specify attributes to prioritize and their desired levels (1-6)
            </p>
            {priorityAttributes.map((attr, index) => (
              <div key={index} className="flex gap-2 items-start">
                <div className="flex-1">
                  <Input
                    placeholder="Attribute name (e.g., Attack Power)"
                    value={attr.name}
                    onChange={(e) => handleUpdatePriorityAttribute(index, 'name', e.target.value)}
                    disabled={disabled}
                  />
                </div>
                <div className="w-24">
                  <Select
                    value={attr.level.toString()}
                    onValueChange={(value: string) => handleUpdatePriorityAttribute(index, 'level', parseInt(value))}
                    disabled={disabled}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">Any</SelectItem>
                      <SelectItem value="1">Level 1</SelectItem>
                      <SelectItem value="2">Level 2</SelectItem>
                      <SelectItem value="3">Level 3</SelectItem>
                      <SelectItem value="4">Level 4</SelectItem>
                      <SelectItem value="5">Level 5</SelectItem>
                      <SelectItem value="6">Level 6</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleRemovePriorityAttribute(index)}
                  disabled={disabled}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>

          {/* Excluded Attributes */}
          <div className="space-y-3">
            <Label>Excluded Attributes</Label>
            <p className="text-xs text-muted-foreground">
              Attributes to exclude from optimization
            </p>
            <div className="flex gap-2">
              <Input
                placeholder="Attribute name to exclude"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const target = e.target as HTMLInputElement;
                    handleAddExcludedAttribute(target.value);
                    target.value = '';
                  }
                }}
                disabled={disabled}
              />
            </div>
            {excludedAttributes.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {excludedAttributes.map((attr) => (
                  <div
                    key={attr}
                    className="flex items-center gap-1 bg-secondary text-secondary-foreground px-2 py-1 rounded-md text-sm"
                  >
                    <span>{attr}</span>
                    <button
                      onClick={() => handleRemoveExcludedAttribute(attr)}
                      disabled={disabled}
                      className="hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Optimize Button */}
      <Button
        onClick={handleOptimize}
        disabled={disabled}
        className="w-full"
        size="lg"
      >
        {disabled ? 'Optimizing...' : 'Optimize'}
      </Button>
    </div>
  );
}

/**
 * ModuleList Component
 *
 * Displays user's module collection with table view, filters, and pagination.
 */

'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader2, Search, Trash2, Edit } from 'lucide-react';
import { useModules, useDeleteModule } from '@/hooks/useModuleOptimizer';
import { ModuleSourceBadge } from './ModuleSourceBadge';
import type { ModuleCategory } from '@/types/moduleOptimizer';

interface ModuleListProps {
  onEdit?: (moduleId: number) => void;
  onDelete?: (moduleId: number) => void;
}

export function ModuleList({ onEdit, onDelete }: ModuleListProps) {
  const [categoryFilter, setCategoryFilter] = useState<ModuleCategory | 'ALL'>('ALL');
  const [qualityFilter, setQualityFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const { data, isLoading, error } = useModules(
    categoryFilter !== 'ALL' ? { category: categoryFilter } : undefined
  );

  const deleteModuleMutation = useDeleteModule({
    onSuccess: () => {
      // Reset to first page if current page becomes empty
      if (data && data.modules.length === 1 && currentPage > 1) {
        setCurrentPage(currentPage - 1);
      }
    },
  });

  // Filter modules based on search and quality
  const filteredModules = data?.modules.filter((module) => {
    const matchesSearch = module.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         module.uuid.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesQuality = qualityFilter === 'ALL' || module.quality === parseInt(qualityFilter);
    return matchesSearch && matchesQuality;
  }) || [];

  // Pagination
  const totalPages = Math.ceil(filteredModules.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedModules = filteredModules.slice(startIndex, startIndex + itemsPerPage);

  const handleDelete = (moduleId: number) => {
    if (window.confirm('Are you sure you want to delete this module?')) {
      deleteModuleMutation.mutate(moduleId);
      if (onDelete) onDelete(moduleId);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-destructive text-center py-8">
            Error loading modules: {error.error?.message}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Module Collection</h3>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or UUID..."
                value={searchQuery}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            <Select
              value={categoryFilter}
              onValueChange={(value: string) => setCategoryFilter(value as ModuleCategory | 'ALL')}
            >
              <SelectTrigger>
                <SelectValue placeholder="Filter by category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Categories</SelectItem>
                <SelectItem value="ATTACK">Attack</SelectItem>
                <SelectItem value="DEFENSE">Defense</SelectItem>
                <SelectItem value="SUPPORT">Support</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={qualityFilter}
              onValueChange={setQualityFilter}
            >
              <SelectTrigger>
                <SelectValue placeholder="Filter by quality" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Qualities</SelectItem>
                <SelectItem value="5">5 Stars</SelectItem>
                <SelectItem value="4">4 Stars</SelectItem>
                <SelectItem value="3">3 Stars</SelectItem>
                <SelectItem value="2">2 Stars</SelectItem>
                <SelectItem value="1">1 Star</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Module Table */}
      <Card>
        <CardContent className="pt-6">
          {paginatedModules.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No modules found matching your filters.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {paginatedModules.map((module) => (
                <div
                  key={module.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-4 flex-1">
                    <div>
                      <p className="font-medium">{module.name}</p>
                      <p className="text-xs text-muted-foreground">
                        UUID: {module.uuid.slice(0, 16)}...
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <Badge variant="outline">{module.category}</Badge>

                    <ModuleSourceBadge source={module.source} />

                    <div className="flex items-center gap-1">
                      {Array.from({ length: module.quality }).map((_, i) => (
                        <span key={i} className="text-amber-500 text-sm">★</span>
                      ))}
                    </div>

                    <div className="flex items-center gap-2">
                      {onEdit && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onEdit(module.id)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(module.id)}
                        disabled={deleteModuleMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-6">
              <p className="text-sm text-muted-foreground">
                Showing {startIndex + 1}-{Math.min(startIndex + itemsPerPage, filteredModules.length)} of {filteredModules.length}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <span className="text-sm">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

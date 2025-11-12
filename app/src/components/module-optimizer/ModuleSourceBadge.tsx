/**
 * Module Source Badge Component
 *
 * Shows a small badge indicating how a module was added to the collection
 */

import { Badge } from '@/components/ui/badge';
import { Upload, FileJson, PenTool } from 'lucide-react';

interface ModuleSourceBadgeProps {
  source?: 'manual' | 'import' | 'backfill';
  className?: string;
}

export function ModuleSourceBadge({ source, className }: ModuleSourceBadgeProps) {
  if (!source) return null;

  const config = {
    manual: {
      label: 'Manual',
      icon: PenTool,
      variant: 'secondary' as const,
    },
    import: {
      label: 'Imported',
      icon: FileJson,
      variant: 'default' as const,
    },
    backfill: {
      label: 'Synced',
      icon: Upload,
      variant: 'outline' as const,
    },
  };

  const { label, icon: Icon, variant } = config[source];

  return (
    <Badge variant={variant} className={className}>
      <Icon className="mr-1 h-3 w-3" />
      {label}
    </Badge>
  );
}

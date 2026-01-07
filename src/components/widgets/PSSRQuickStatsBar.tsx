import React from 'react';
import { FileCheck, CheckCircle, Clock, FileEdit, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PSSRQuickStatsBarProps {
  stats: {
    total: number;
    approved: number;
    underReview: number;
    draft: number;
    openActions: number;
    completed: number;
  };
  activeFilter: 'all' | 'approved' | 'under-review' | 'draft' | 'open-actions' | 'completed';
  onFilterClick: (filter: 'all' | 'approved' | 'under-review' | 'draft' | 'open-actions' | 'completed') => void;
}

const statConfigs = [
  { key: 'all' as const, label: 'Total', icon: FileCheck, activeClass: 'bg-primary text-primary-foreground border-primary', inactiveClass: 'text-primary border-primary/30 hover:border-primary/60' },
  { key: 'approved' as const, label: 'Approved', icon: CheckCircle, activeClass: 'bg-emerald-500 text-white border-emerald-500', inactiveClass: 'text-emerald-600 dark:text-emerald-400 border-emerald-300 dark:border-emerald-700 hover:border-emerald-500' },
  { key: 'under-review' as const, label: 'Under Review', icon: Clock, activeClass: 'bg-amber-500 text-white border-amber-500', inactiveClass: 'text-amber-600 dark:text-amber-400 border-amber-300 dark:border-amber-700 hover:border-amber-500' },
  { key: 'draft' as const, label: 'Draft', icon: FileEdit, activeClass: 'bg-muted-foreground text-white border-muted-foreground', inactiveClass: 'text-muted-foreground border-muted-foreground/30 hover:border-muted-foreground/60' },
  { key: 'open-actions' as const, label: 'Open Actions', icon: AlertTriangle, activeClass: 'bg-destructive text-destructive-foreground border-destructive', inactiveClass: 'text-destructive border-destructive/30 hover:border-destructive/60' },
  { key: 'completed' as const, label: 'Completed', icon: CheckCircle2, activeClass: 'bg-emerald-600 text-white border-emerald-600', inactiveClass: 'text-emerald-600 dark:text-emerald-400 border-emerald-300 dark:border-emerald-700 hover:border-emerald-600' },
];

export const PSSRQuickStatsBar: React.FC<PSSRQuickStatsBarProps> = ({
  stats,
  activeFilter,
  onFilterClick,
}) => {
  const getStatValue = (key: string): number => {
    switch (key) {
      case 'all': return stats.total;
      case 'approved': return stats.approved;
      case 'under-review': return stats.underReview;
      case 'draft': return stats.draft;
      case 'open-actions': return stats.openActions;
      case 'completed': return stats.completed;
      default: return 0;
    }
  };

  return (
    <div className="flex flex-wrap gap-2 items-center">
      {statConfigs.map((stat) => {
        const Icon = stat.icon;
        const isActive = activeFilter === stat.key;
        const value = getStatValue(stat.key);

        return (
          <button
            key={stat.key}
            onClick={() => onFilterClick(stat.key)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200",
              "border bg-background hover:shadow-sm",
              isActive ? stat.activeClass : stat.inactiveClass,
              isActive && "shadow-md"
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            <span className="font-bold tabular-nums">{value}</span>
            <span className="hidden sm:inline">{stat.label}</span>
          </button>
        );
      })}
    </div>
  );
};

export default PSSRQuickStatsBar;

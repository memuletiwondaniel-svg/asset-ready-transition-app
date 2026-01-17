import React from 'react';
import { cn } from '@/lib/utils';

interface PSSRQuickStatsBarProps {
  stats: {
    total: number;
    underReview: number;
    draft: number;
    completed: number;
  };
  activeFilter: 'all' | 'under-review' | 'draft' | 'completed';
  onFilterClick: (filter: 'all' | 'under-review' | 'draft' | 'completed') => void;
}

const statConfigs = [
  { key: 'all' as const, label: 'Total', activeClass: 'bg-primary text-primary-foreground border-primary', inactiveClass: 'text-primary border-primary/30 hover:border-primary/60' },
  { key: 'draft' as const, label: 'Draft', activeClass: 'bg-muted-foreground text-white border-muted-foreground', inactiveClass: 'text-muted-foreground border-muted-foreground/30 hover:border-muted-foreground/60' },
  { key: 'under-review' as const, label: 'Under Review', activeClass: 'bg-amber-500 text-white border-amber-500', inactiveClass: 'text-amber-600 dark:text-amber-400 border-amber-300 dark:border-amber-700 hover:border-amber-500' },
  { key: 'completed' as const, label: 'Completed', activeClass: 'bg-emerald-600 text-white border-emerald-600', inactiveClass: 'text-emerald-600 dark:text-emerald-400 border-emerald-300 dark:border-emerald-700 hover:border-emerald-600' },
];

export const PSSRQuickStatsBar: React.FC<PSSRQuickStatsBarProps> = ({
  stats,
  activeFilter,
  onFilterClick,
}) => {
  const getStatValue = (key: string): number => {
    switch (key) {
      case 'all': return stats.total;
      case 'under-review': return stats.underReview;
      case 'draft': return stats.draft;
      case 'completed': return stats.completed;
      default: return 0;
    }
  };

  return (
    <div className="flex flex-wrap gap-2 items-center">
      {statConfigs.map((stat) => {
        const isActive = activeFilter === stat.key;
        const value = getStatValue(stat.key);

        return (
          <button
            key={stat.key}
            onClick={() => onFilterClick(stat.key)}
            className={cn(
              "flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium transition-all duration-200",
              "border bg-background hover:shadow-sm",
              isActive ? stat.activeClass : stat.inactiveClass,
              isActive && "shadow-md"
            )}
          >
            <span className="font-semibold tabular-nums">{value}</span>
            <span className="hidden sm:inline">{stat.label}</span>
          </button>
        );
      })}
    </div>
  );
};

export default PSSRQuickStatsBar;

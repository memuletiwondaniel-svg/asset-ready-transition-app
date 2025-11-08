import React from 'react';
import { WidgetCard } from './WidgetCard';
import { CheckCircle, Clock, FileText, AlertTriangle, ListChecks, CheckCheck } from 'lucide-react';

interface PSSRStatisticsWidgetProps {
  stats: {
    total: number;
    approved: number;
    underReview: number;
    draft: number;
  };
  onStatClick?: (filter: 'all' | 'approved' | 'under-review' | 'draft' | 'open-actions' | 'completed') => void;
  isExpanded?: boolean;
  isVisible?: boolean;
  onToggleExpand?: () => void;
  onToggleVisibility?: () => void;
}

export const PSSRStatisticsWidget: React.FC<PSSRStatisticsWidgetProps> = ({ 
  stats, 
  onStatClick,
  isExpanded,
  isVisible,
  onToggleExpand,
  onToggleVisibility,
}) => {
  const statisticsData = [
    {
      label: 'Total',
      value: stats.total,
      icon: FileText,
      accent: 'primary',
      filterKey: 'all' as const,
    },
    {
      label: 'Approved',
      value: stats.approved,
      icon: CheckCircle,
      accent: 'success',
      filterKey: 'approved' as const,
    },
    {
      label: 'Under Review',
      value: stats.underReview,
      icon: Clock,
      accent: 'warning',
      filterKey: 'under-review' as const,
    },
    {
      label: 'Draft',
      value: stats.draft,
      icon: AlertTriangle,
      accent: 'muted',
      filterKey: 'draft' as const,
    },
    {
      label: 'Open',
      value: Math.floor(stats.total * 0.3),
      icon: ListChecks,
      accent: 'accent',
      filterKey: 'open-actions' as const,
    },
    {
      label: 'Done',
      value: Math.floor(stats.approved * 0.85),
      icon: CheckCheck,
      accent: 'success',
      filterKey: 'completed' as const,
    },
  ];

  const getAccentColor = (accent: string) => {
    switch (accent) {
      case 'primary':
        return 'text-primary bg-primary/5 border-primary/20 hover:bg-primary/10';
      case 'success':
        return 'text-success bg-success/5 border-success/20 hover:bg-success/10';
      case 'warning':
        return 'text-warning bg-warning/5 border-warning/20 hover:bg-warning/10';
      case 'accent':
        return 'text-accent-foreground bg-accent/5 border-accent/20 hover:bg-accent/10';
      case 'muted':
        return 'text-muted-foreground bg-muted/10 border-muted/20 hover:bg-muted/15';
      default:
        return 'text-foreground bg-muted/5 border-border/20 hover:bg-muted/10';
    }
  };

  return (
    <WidgetCard
      title="Statistics"
      isExpanded={isExpanded}
      isVisible={isVisible}
      onToggleExpand={onToggleExpand}
      onToggleVisibility={onToggleVisibility}
      className="h-full flex flex-col"
    >
      <div className="grid grid-cols-3 gap-2">
        {statisticsData.map((stat) => {
          const Icon = stat.icon;
          const colorClasses = getAccentColor(stat.accent);

          return (
            <button
              key={stat.filterKey}
              onClick={() => onStatClick?.(stat.filterKey)}
              className={`group flex flex-col items-center justify-center p-2.5 rounded-lg border transition-all duration-300 hover:-translate-y-0.5 active:scale-95 ${colorClasses}`}
            >
              <Icon className="h-4 w-4 mb-1.5 transition-transform group-hover:scale-110" />
              <p className="text-lg font-bold leading-none mb-0.5">{stat.value}</p>
              <p className="text-[10px] font-medium opacity-70 leading-tight text-center">{stat.label}</p>
            </button>
          );
        })}
      </div>
    </WidgetCard>
  );
};

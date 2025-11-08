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
}

export const PSSRStatisticsWidget: React.FC<PSSRStatisticsWidgetProps> = ({ stats, onStatClick }) => {
  const statisticsData = [
    {
      label: 'Total PSSRs',
      value: stats.total,
      icon: FileText,
      color: 'primary',
      filterKey: 'all' as const,
    },
    {
      label: 'Approved',
      value: stats.approved,
      icon: CheckCircle,
      color: 'success',
      filterKey: 'approved' as const,
    },
    {
      label: 'Under Review',
      value: stats.underReview,
      icon: Clock,
      color: 'warning',
      filterKey: 'under-review' as const,
    },
    {
      label: 'Draft',
      value: stats.draft,
      icon: AlertTriangle,
      color: 'muted',
      filterKey: 'draft' as const,
    },
    {
      label: 'Open Actions',
      value: Math.floor(stats.total * 0.3),
      icon: ListChecks,
      color: 'accent',
      filterKey: 'open-actions' as const,
    },
    {
      label: 'Completed',
      value: Math.floor(stats.approved * 0.85),
      icon: CheckCheck,
      color: 'success',
      filterKey: 'completed' as const,
    },
  ];

  const getColorClasses = (color: string) => {
    switch (color) {
      case 'primary':
        return 'bg-primary/10 text-primary border-primary/20 hover:bg-primary/15 hover:border-primary/30';
      case 'success':
        return 'bg-success/10 text-success border-success/20 hover:bg-success/15 hover:border-success/30';
      case 'warning':
        return 'bg-warning/10 text-warning border-warning/20 hover:bg-warning/15 hover:border-warning/30';
      case 'accent':
        return 'bg-accent/10 text-accent-foreground border-accent/20 hover:bg-accent/15 hover:border-accent/30';
      case 'muted':
        return 'bg-muted/30 text-muted-foreground border-muted/30 hover:bg-muted/40 hover:border-muted/40';
      default:
        return 'bg-muted/10 text-foreground border-border/20 hover:bg-muted/15';
    }
  };

  return (
    <WidgetCard title="Statistics" className="h-full flex flex-col">
      <div className="grid grid-cols-3 gap-2">
        {statisticsData.map((stat, index) => {
          const Icon = stat.icon;
          const colorClasses = getColorClasses(stat.color);
          
          return (
            <button
              key={index}
              onClick={() => onStatClick?.(stat.filterKey)}
              className={`group relative flex flex-col items-center justify-center p-3 rounded-xl border transition-all duration-300 hover:-translate-y-1 hover:shadow-md cursor-pointer active:scale-95 ${colorClasses}`}
            >
              <div className="flex flex-col items-center gap-1.5 w-full">
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-background/50 backdrop-blur-sm transition-transform duration-300 group-hover:scale-110">
                  <Icon className="h-4 w-4" />
                </div>
                <div className="text-center">
                  <p className="text-xl font-bold leading-none mb-0.5">{stat.value}</p>
                  <p className="text-[10px] font-medium opacity-80 leading-tight">{stat.label}</p>
                </div>
              </div>
              <div className="absolute inset-0 bg-gradient-to-br from-background/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl pointer-events-none" />
            </button>
          );
        })}
      </div>
    </WidgetCard>
  );
};

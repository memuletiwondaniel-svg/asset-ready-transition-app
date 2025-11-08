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
      borderColor: 'border-l-primary',
      iconColor: 'text-primary',
      filterKey: 'all' as const,
    },
    {
      label: 'Approved',
      value: stats.approved,
      icon: CheckCircle,
      borderColor: 'border-l-success',
      iconColor: 'text-success',
      filterKey: 'approved' as const,
    },
    {
      label: 'Under Review',
      value: stats.underReview,
      icon: Clock,
      borderColor: 'border-l-warning',
      iconColor: 'text-warning',
      filterKey: 'under-review' as const,
    },
    {
      label: 'Draft',
      value: stats.draft,
      icon: AlertTriangle,
      borderColor: 'border-l-muted-foreground',
      iconColor: 'text-muted-foreground',
      filterKey: 'draft' as const,
    },
    {
      label: 'Open Actions',
      value: Math.floor(stats.total * 0.3),
      icon: ListChecks,
      borderColor: 'border-l-accent-foreground',
      iconColor: 'text-accent-foreground',
      filterKey: 'open-actions' as const,
    },
    {
      label: 'Completed',
      value: Math.floor(stats.approved * 0.85),
      icon: CheckCheck,
      borderColor: 'border-l-success',
      iconColor: 'text-success',
      filterKey: 'completed' as const,
    },
  ];

  return (
    <WidgetCard title="Statistics" className="h-full flex flex-col">
      <div className="grid grid-cols-2 gap-2.5">
        {statisticsData.map((stat, index) => {
          const Icon = stat.icon;
          
          return (
            <button
              key={index}
              onClick={() => onStatClick?.(stat.filterKey)}
              className={`group relative flex items-center gap-3 p-3 rounded-lg border border-border/40 bg-card/50 backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-sm hover:border-border/60 hover:bg-card cursor-pointer active:scale-[0.98] border-l-4 ${stat.borderColor}`}
            >
              <div className={`flex items-center justify-center w-9 h-9 rounded-full border ${stat.borderColor.replace('border-l-', 'border-')} flex-shrink-0 transition-all duration-300 group-hover:scale-110`}>
                <Icon className={`h-4 w-4 ${stat.iconColor}`} />
              </div>
              <div className="flex-1 text-left min-w-0">
                <p className="text-2xl font-bold text-foreground leading-none mb-0.5">{stat.value}</p>
                <p className="text-xs text-muted-foreground font-medium truncate leading-tight">{stat.label}</p>
              </div>
            </button>
          );
        })}
      </div>
    </WidgetCard>
  );
};

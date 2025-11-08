import React from 'react';
import { WidgetCard } from './WidgetCard';
import { TrendingUp, AlertCircle, CheckCircle, Clock, FileCheck } from 'lucide-react';

interface PSSRStatisticsWidgetProps {
  stats: {
    total: number;
    approved: number;
    underReview: number;
    draft: number;
    openActions: number;
    completed: number;
  };
  onStatClick: (filter: 'all' | 'approved' | 'under-review' | 'draft' | 'open-actions' | 'completed') => void;
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
  onToggleVisibility
}) => {
  const statisticsData = [
    {
      label: 'Total',
      value: stats.total,
      icon: FileCheck,
      filter: 'all' as const,
      borderColor: 'border-l-primary',
      iconColor: 'text-primary',
      bgColor: 'bg-primary/5'
    },
    {
      label: 'Approved',
      value: stats.approved,
      icon: CheckCircle,
      filter: 'approved' as const,
      borderColor: 'border-l-success',
      iconColor: 'text-success',
      bgColor: 'bg-success/5'
    },
    {
      label: 'Under Review',
      value: stats.underReview,
      icon: Clock,
      filter: 'under-review' as const,
      borderColor: 'border-l-warning',
      iconColor: 'text-warning',
      bgColor: 'bg-warning/5'
    },
    {
      label: 'Draft',
      value: stats.draft,
      icon: AlertCircle,
      filter: 'draft' as const,
      borderColor: 'border-l-muted-foreground',
      iconColor: 'text-muted-foreground',
      bgColor: 'bg-muted/30'
    },
    {
      label: 'Open Actions',
      value: stats.openActions,
      icon: TrendingUp,
      filter: 'open-actions' as const,
      borderColor: 'border-l-destructive',
      iconColor: 'text-destructive',
      bgColor: 'bg-destructive/5'
    },
    {
      label: 'Completed',
      value: stats.completed,
      icon: CheckCircle,
      filter: 'completed' as const,
      borderColor: 'border-l-success',
      iconColor: 'text-success',
      bgColor: 'bg-success/5'
    }
  ];

  return (
    <WidgetCard 
      title="Statistics" 
      className="h-full"
      isExpanded={isExpanded}
      isVisible={isVisible}
      onToggleExpand={onToggleExpand}
      onToggleVisibility={onToggleVisibility}
    >
      <div className="grid grid-cols-3 gap-2">
        {statisticsData.map((stat, index) => {
          const Icon = stat.icon;
          
          return (
            <button
              key={index}
              onClick={() => onStatClick(stat.filter)}
              className={`group relative flex flex-col items-center justify-center p-3 rounded-lg border-l-4 ${stat.borderColor} ${stat.bgColor} border border-border/40 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-sm hover:border-border/60`}
            >
              <div className={`w-8 h-8 rounded-full ${stat.bgColor} flex items-center justify-center mb-1.5 transition-transform duration-300 group-hover:scale-110`}>
                <Icon className={`w-4 h-4 ${stat.iconColor}`} />
              </div>
              <div className="text-xl font-bold text-foreground mb-0.5">{stat.value}</div>
              <div className="text-xs text-muted-foreground text-center leading-tight">{stat.label}</div>
            </button>
          );
        })}
      </div>
    </WidgetCard>
  );
};

import React from 'react';
import { WidgetCard } from './WidgetCard';
import { TrendingUp, AlertCircle, CheckCircle, Clock, FileCheck, ArrowUpRight } from 'lucide-react';

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
  dragAttributes?: any;
  dragListeners?: any;
}

export const PSSRStatisticsWidget: React.FC<PSSRStatisticsWidgetProps> = ({
  stats,
  onStatClick,
  isExpanded,
  isVisible,
  onToggleExpand,
  onToggleVisibility,
  dragAttributes,
  dragListeners
}) => {
  const statisticsData = [
    {
      label: 'Total PSSRs',
      value: stats.total,
      icon: FileCheck,
      filter: 'all' as const,
      gradient: 'from-primary/20 via-primary/10 to-transparent',
      iconBg: 'bg-gradient-to-br from-primary/20 to-primary/10',
      iconColor: 'text-primary',
      ringColor: 'hover:ring-primary/20'
    },
    {
      label: 'Approved',
      value: stats.approved,
      icon: CheckCircle,
      filter: 'approved' as const,
      gradient: 'from-success/20 via-success/10 to-transparent',
      iconBg: 'bg-gradient-to-br from-success/20 to-success/10',
      iconColor: 'text-success',
      ringColor: 'hover:ring-success/20'
    },
    {
      label: 'Under Review',
      value: stats.underReview,
      icon: Clock,
      filter: 'under-review' as const,
      gradient: 'from-warning/20 via-warning/10 to-transparent',
      iconBg: 'bg-gradient-to-br from-warning/20 to-warning/10',
      iconColor: 'text-warning',
      ringColor: 'hover:ring-warning/20'
    },
    {
      label: 'Draft',
      value: stats.draft,
      icon: AlertCircle,
      filter: 'draft' as const,
      gradient: 'from-muted-foreground/20 via-muted-foreground/10 to-transparent',
      iconBg: 'bg-gradient-to-br from-muted/30 to-muted/10',
      iconColor: 'text-muted-foreground',
      ringColor: 'hover:ring-muted-foreground/20'
    },
    {
      label: 'Open Actions',
      value: stats.openActions,
      icon: TrendingUp,
      filter: 'open-actions' as const,
      gradient: 'from-destructive/20 via-destructive/10 to-transparent',
      iconBg: 'bg-gradient-to-br from-destructive/20 to-destructive/10',
      iconColor: 'text-destructive',
      ringColor: 'hover:ring-destructive/20'
    },
    {
      label: 'Completed',
      value: stats.completed,
      icon: CheckCircle,
      filter: 'completed' as const,
      gradient: 'from-success/20 via-success/10 to-transparent',
      iconBg: 'bg-gradient-to-br from-success/20 to-success/10',
      iconColor: 'text-success',
      ringColor: 'hover:ring-success/20'
    }
  ];

  return (
    <WidgetCard 
      title="Statistics Overview" 
      className="h-full flex flex-col"
      isExpanded={isExpanded}
      isVisible={isVisible}
      onToggleExpand={onToggleExpand}
      onToggleVisibility={onToggleVisibility}
      dragAttributes={dragAttributes}
      dragListeners={dragListeners}
    >
      <div className="grid grid-cols-3 gap-3 flex-1 content-start">
        {statisticsData.map((stat, index) => {
          const Icon = stat.icon;
          
          return (
            <button
              key={index}
              onClick={() => onStatClick(stat.filter)}
              className={`group relative overflow-hidden flex flex-col items-start p-4 rounded-xl bg-card border border-border/50 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:border-border/80 hover:ring-2 ${stat.ringColor}`}
            >
              {/* Gradient overlay */}
              <div className={`absolute inset-0 bg-gradient-to-br ${stat.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
              
              {/* Content */}
              <div className="relative z-10 w-full">
                <div className="flex items-center justify-between mb-3">
                  <div className={`w-11 h-11 rounded-xl ${stat.iconBg} flex items-center justify-center transition-all duration-300 group-hover:scale-110 group-hover:rotate-3`}>
                    <Icon className={`w-5 h-5 ${stat.iconColor}`} />
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-muted-foreground/40 opacity-0 group-hover:opacity-100 transition-all duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                </div>
                
                <div className="text-2xl font-bold text-foreground mb-1 group-hover:scale-105 transition-transform duration-300">
                  {stat.value}
                </div>
                
                <div className="text-xs font-medium text-muted-foreground">
                  {stat.label}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </WidgetCard>
  );
};

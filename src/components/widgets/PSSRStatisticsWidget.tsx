import React from 'react';
import { WidgetCard } from './WidgetCard';
import { CheckCircle, Clock, FileText, AlertTriangle } from 'lucide-react';

interface PSSRStatisticsWidgetProps {
  stats: {
    total: number;
    approved: number;
    underReview: number;
    draft: number;
  };
}

export const PSSRStatisticsWidget: React.FC<PSSRStatisticsWidgetProps> = ({ stats }) => {
  const statisticsData = [
    {
      label: 'Total PSSRs',
      value: stats.total,
      icon: FileText,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      label: 'Approved',
      value: stats.approved,
      icon: CheckCircle,
      color: 'text-success',
      bgColor: 'bg-success/10',
    },
    {
      label: 'Under Review',
      value: stats.underReview,
      icon: Clock,
      color: 'text-warning',
      bgColor: 'bg-warning/10',
    },
    {
      label: 'Draft',
      value: stats.draft,
      icon: AlertTriangle,
      color: 'text-muted-foreground',
      bgColor: 'bg-muted/10',
    },
  ];

  return (
    <WidgetCard title="PSSR Statistics" className="h-full">
      <div className="grid grid-cols-2 gap-3">
        {statisticsData.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div
              key={index}
              className="flex items-center gap-2 p-2 rounded-lg border border-border/50 bg-card"
            >
              <div className={`flex items-center justify-center w-8 h-8 rounded-lg ${stat.bgColor} flex-shrink-0`}>
                <Icon className={`h-4 w-4 ${stat.color}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-lg font-bold text-foreground">{stat.value}</p>
                <p className="text-xs text-muted-foreground truncate">{stat.label}</p>
              </div>
            </div>
          );
        })}
      </div>
    </WidgetCard>
  );
};

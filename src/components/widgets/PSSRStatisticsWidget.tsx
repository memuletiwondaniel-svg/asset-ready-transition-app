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
      <div className="grid grid-cols-2 gap-4">
        {statisticsData.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div
              key={index}
              className="flex flex-col gap-3 p-4 rounded-lg border border-border/50 bg-card hover:shadow-sm transition-shadow"
            >
              <div className="flex items-center gap-3">
                <div className={`flex items-center justify-center w-10 h-10 rounded-lg ${stat.bgColor}`}>
                  <Icon className={`h-5 w-5 ${stat.color}`} />
                </div>
                <div className="flex-1">
                  <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </WidgetCard>
  );
};

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
}

export const PSSRStatisticsWidget: React.FC<PSSRStatisticsWidgetProps> = ({ stats }) => {
  const statisticsData = [
    {
      label: 'Total',
      value: stats.total,
      icon: FileText,
      gradient: 'from-primary/20 to-primary/5',
      iconColor: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      label: 'Approved',
      value: stats.approved,
      icon: CheckCircle,
      gradient: 'from-success/20 to-success/5',
      iconColor: 'text-success',
      bgColor: 'bg-success/10',
    },
    {
      label: 'Under Review',
      value: stats.underReview,
      icon: Clock,
      gradient: 'from-warning/20 to-warning/5',
      iconColor: 'text-warning',
      bgColor: 'bg-warning/10',
    },
    {
      label: 'Draft',
      value: stats.draft,
      icon: AlertTriangle,
      gradient: 'from-muted/30 to-muted/5',
      iconColor: 'text-muted-foreground',
      bgColor: 'bg-muted/10',
    },
    {
      label: 'Open Actions',
      value: Math.floor(stats.total * 0.3), // Mock data
      icon: ListChecks,
      gradient: 'from-accent/20 to-accent/5',
      iconColor: 'text-accent-foreground',
      bgColor: 'bg-accent/10',
    },
    {
      label: 'Completed',
      value: Math.floor(stats.approved * 0.85), // Mock data
      icon: CheckCheck,
      gradient: 'from-success/20 to-success/5',
      iconColor: 'text-success',
      bgColor: 'bg-success/10',
    },
  ];

  return (
    <WidgetCard title="PSSR Statistics" className="h-full flex flex-col">
      <div className="grid grid-cols-2 gap-2.5">
        {statisticsData.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div
              key={index}
              className={`group relative overflow-hidden rounded-xl border border-border/40 bg-gradient-to-br ${stat.gradient} p-3 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md hover:border-border/60`}
            >
              <div className="flex items-start gap-2.5">
                <div className={`flex items-center justify-center w-9 h-9 rounded-lg ${stat.bgColor} flex-shrink-0 transition-transform duration-300 group-hover:scale-110`}>
                  <Icon className={`h-4 w-4 ${stat.iconColor}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-2xl font-bold text-foreground leading-none mb-1">{stat.value}</p>
                  <p className="text-xs text-muted-foreground font-medium truncate leading-tight">{stat.label}</p>
                </div>
              </div>
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-background/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 pointer-events-none" />
            </div>
          );
        })}
      </div>
    </WidgetCard>
  );
};

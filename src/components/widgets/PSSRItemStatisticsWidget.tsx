import React from 'react';
import { WidgetCard } from './WidgetCard';
import { FileText, Clock, Eye, CheckCircle2 } from 'lucide-react';
import { useWidgetSize } from '@/contexts/WidgetSizeContext';

interface PSSRItemStatisticsWidgetProps {
  totalItems: number;
  draftItems: number;
  underReviewItems: number;
  approvedItems: number;
  dragAttributes?: any;
  dragListeners?: any;
}

export const PSSRItemStatisticsWidget: React.FC<PSSRItemStatisticsWidgetProps> = ({
  totalItems,
  draftItems,
  underReviewItems,
  approvedItems,
  dragAttributes,
  dragListeners,
}) => {
  const { widgetSize } = useWidgetSize();
  const widgetId = 'pssr-statistics';
  const stats = [
    {
      label: 'Total Items',
      value: totalItems,
      icon: FileText,
      bgColor: 'bg-blue-500/10',
      iconColor: 'text-blue-600',
      borderColor: 'border-l-blue-500'
    },
    {
      label: 'In Draft',
      value: draftItems,
      icon: Clock,
      bgColor: 'bg-gray-500/10',
      iconColor: 'text-gray-600',
      borderColor: 'border-l-gray-500'
    },
    {
      label: 'Under Review',
      value: underReviewItems,
      icon: Eye,
      bgColor: 'bg-yellow-500/10',
      iconColor: 'text-yellow-600',
      borderColor: 'border-l-yellow-500'
    },
    {
      label: 'Approved',
      value: approvedItems,
      icon: CheckCircle2,
      bgColor: 'bg-green-500/10',
      iconColor: 'text-green-600',
      borderColor: 'border-l-green-500'
    }
  ];

  return (
    <WidgetCard 
      title="PSSR Statistics"
      className={`min-h-[280px] md:min-h-[300px] lg:min-h-[320px] ${
        widgetSize === 'compact' ? 'h-[280px] md:h-[300px] lg:h-[320px]' :
        widgetSize === 'standard' ? 'h-[350px] md:h-[380px] lg:h-[400px]' :
        'h-[450px] md:h-[500px] lg:h-[520px]'
      }`}
      widgetId={widgetId}
      dragAttributes={dragAttributes}
      dragListeners={dragListeners}
    >
      <div className="h-full overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
        <div className="grid grid-cols-2 gap-3">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div
              key={index}
              className={`p-4 rounded-lg border border-border/40 ${stat.borderColor} border-l-4 bg-card hover:shadow-md transition-shadow`}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                    {stat.label}
                  </p>
                  <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                </div>
                <div className={`w-10 h-10 rounded-lg ${stat.bgColor} flex items-center justify-center`}>
                  <Icon className={`h-5 w-5 ${stat.iconColor}`} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
      </div>
    </WidgetCard>
  );
};

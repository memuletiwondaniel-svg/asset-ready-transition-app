import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ClipboardList, CheckCircle, Clock } from 'lucide-react';

export const OverviewStatsWidget: React.FC = () => {
  const stats = [
    {
      id: 'active',
      label: 'Active PSSRs',
      value: 12,
      icon: ClipboardList,
      gradient: 'from-blue-500 to-blue-600',
      bgGradient: 'from-blue-500/10 to-blue-600/5',
      border: 'border-blue-500/20'
    },
    {
      id: 'completed',
      label: 'Completed',
      value: 28,
      icon: CheckCircle,
      gradient: 'from-green-500 to-green-600',
      bgGradient: 'from-green-500/10 to-green-600/5',
      border: 'border-green-500/20'
    },
    {
      id: 'pending',
      label: 'Pending',
      value: 5,
      icon: Clock,
      gradient: 'from-orange-500 to-orange-600',
      bgGradient: 'from-orange-500/10 to-orange-600/5',
      border: 'border-orange-500/20'
    }
  ];

  return (
    <Card className="glass-card glass-card-hover overflow-hidden">
      <CardHeader className="border-b border-border/40 py-3">
        <CardTitle className="text-lg font-bold">Overview</CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        <div className="space-y-3">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <div
                key={stat.id}
                className={`flex items-center justify-between p-3 rounded-lg bg-gradient-to-r ${stat.bgGradient} border ${stat.border}`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${stat.gradient} flex items-center justify-center`}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{stat.label}</p>
                    <p className="text-lg font-bold">{stat.value}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

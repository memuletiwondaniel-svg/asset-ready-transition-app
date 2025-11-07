import React from 'react';
import { CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { useUserTasks } from '@/hooks/useUserTasks';

interface QuickStatsWidgetProps {
  settings: Record<string, any>;
}

export const QuickStatsWidget: React.FC<QuickStatsWidgetProps> = ({ settings }) => {
  const { tasks } = useUserTasks();

  const stats = [
    {
      label: 'Total Tasks',
      value: tasks.length,
      icon: CheckCircle,
      color: 'text-primary'
    },
    {
      label: 'High Priority',
      value: tasks.filter(t => t.priority === 'High').length,
      icon: AlertCircle,
      color: 'text-destructive'
    },
    {
      label: 'Due Soon',
      value: tasks.filter(t => {
        if (!t.due_date) return false;
        const dueDate = new Date(t.due_date);
        const now = new Date();
        const diffDays = (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
        return diffDays <= 3 && diffDays >= 0;
      }).length,
      icon: Clock,
      color: 'text-warning'
    }
  ];

  return (
    <>
      <CardHeader className="border-b border-border/40 bg-gradient-to-r from-primary/5 to-accent/5">
        <CardTitle className="text-lg font-bold flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-primary" />
          Quick Stats
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 space-y-3">
        {stats.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="flex items-center justify-between p-3 rounded-lg border border-border/40 bg-gradient-to-br from-card/50 to-card/30 animate-smooth-in"
              style={{ animationDelay: `${idx * 100}ms` }}
            >
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center`}>
                  <Icon className={`w-5 h-5 ${stat.color}`} />
                </div>
                <span className="text-sm font-medium text-muted-foreground">{stat.label}</span>
              </div>
              <span className="text-2xl font-bold">{stat.value}</span>
            </div>
          );
        })}
      </CardContent>
    </>
  );
};

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { format, isPast } from 'date-fns';

export const ORMOverdueTasksWidget: React.FC = () => {
  const navigate = useNavigate();

  const { data: overdueTasks, isLoading } = useQuery({
    queryKey: ['orm-overdue-tasks'],
    queryFn: async () => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return [];

      const { data, error } = await supabase
        .from('orm_tasks')
        .select(`
          *,
          deliverable:orm_deliverables(
            deliverable_type,
            orm_plan:orm_plans(
              project:projects(project_title)
            )
          )
        `)
        .eq('assigned_to', user.user.id)
        .neq('status', 'COMPLETED')
        .not('due_date', 'is', null)
        .order('due_date', { ascending: true });

      if (error) throw error;

      // Filter to only overdue tasks
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      return data.filter(task => {
        if (!task.due_date) return false;
        const dueDate = new Date(task.due_date);
        dueDate.setHours(0, 0, 0, 0);
        return dueDate < today;
      });
    }
  });

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'HIGH': return 'destructive';
      case 'MEDIUM': return 'default';
      default: return 'secondary';
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Overdue Tasks</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-16" />)}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate('/or-maintenance')}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base font-medium">ORM Overdue Tasks</CardTitle>
        <AlertTriangle className="h-4 w-4 text-red-500" />
      </CardHeader>
      <CardContent>
        {overdueTasks && overdueTasks.length > 0 ? (
          <div className="space-y-3">
            <div className="text-2xl font-bold text-red-600">{overdueTasks.length}</div>
            <div className="space-y-2">
              {overdueTasks.slice(0, 3).map((task: any) => (
                <div key={task.id} className="flex items-center justify-between p-2 bg-red-50 dark:bg-red-900/10 rounded-lg border border-red-200 dark:border-red-800">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{task.title}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {task.deliverable?.orm_plan?.project?.project_title || 'Unknown Project'}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1 ml-2">
                    <Badge variant={getPriorityColor(task.priority)} className="text-xs">
                      {task.priority}
                    </Badge>
                    <span className="text-xs text-red-600">
                      {task.due_date && format(new Date(task.due_date), 'MMM d')}
                    </span>
                  </div>
                </div>
              ))}
              {overdueTasks.length > 3 && (
                <p className="text-xs text-muted-foreground text-center">
                  +{overdueTasks.length - 3} more overdue
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <CheckCircle2 className="h-8 w-8 text-green-500 mb-2" />
            <p className="text-sm text-muted-foreground">No overdue tasks</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

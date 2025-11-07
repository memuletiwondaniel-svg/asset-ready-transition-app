import React from 'react';
import { CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ListTodo, Clock } from 'lucide-react';
import { useUserTasks } from '@/hooks/useUserTasks';
import { formatDistanceToNow } from 'date-fns';

interface TasksWidgetProps {
  settings: Record<string, any>;
}

export const TasksWidget: React.FC<TasksWidgetProps> = ({ settings }) => {
  const { tasks, loading } = useUserTasks();
  const displayTasks = tasks.slice(0, 3);

  return (
    <>
      <CardHeader className="border-b border-border/40 bg-gradient-to-r from-primary/5 to-accent/5">
        <CardTitle className="text-lg font-bold flex items-center gap-2">
          <ListTodo className="w-5 h-5 text-accent" />
          Recent Tasks
        </CardTitle>
        <CardDescription className="text-xs">Your latest action items</CardDescription>
      </CardHeader>
      <CardContent className="p-4 space-y-3">
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-muted/20 rounded animate-pulse" />
            ))}
          </div>
        ) : displayTasks.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <ListTodo className="w-12 h-12 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No tasks</p>
          </div>
        ) : (
          displayTasks.map(task => (
            <div
              key={task.id}
              className="p-3 rounded-lg border border-border/40 hover:border-primary/30 transition-all bg-gradient-to-br from-card/50 to-card/30"
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <h4 className="font-medium text-sm flex-1 line-clamp-1">{task.title}</h4>
                <Badge
                  variant={task.priority === 'High' ? 'destructive' : task.priority === 'Medium' ? 'default' : 'secondary'}
                  className="text-xs"
                >
                  {task.priority}
                </Badge>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Clock className="w-3 h-3" />
                <span>
                  {task.due_date ? formatDistanceToNow(new Date(task.due_date), { addSuffix: true }) : 'No deadline'}
                </span>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </>
  );
};

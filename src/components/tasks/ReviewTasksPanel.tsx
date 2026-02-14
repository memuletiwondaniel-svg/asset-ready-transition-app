import React, { useEffect } from 'react';
import { FileCheck, CheckCircle, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MyTasksPanelCard } from './MyTasksPanelCard';
import { useUserTasks } from '@/hooks/useUserTasks';
import { useUserLastLogin } from '@/hooks/useUserLastLogin';
import { cn } from '@/lib/utils';

interface ReviewTasksPanelProps {
  searchQuery?: string;
  isExpanded: boolean;
  onToggleExpand: () => void;
  isFullHeight?: boolean;
  isRelocated?: boolean;
  isDimmed?: boolean;
  onTaskCountUpdate?: (count: number) => void;
}

export const ReviewTasksPanel: React.FC<ReviewTasksPanelProps> = ({
  searchQuery = '',
  isExpanded,
  onToggleExpand,
  isFullHeight = false,
  isRelocated = false,
  isDimmed = false,
  onTaskCountUpdate,
}) => {
  const { tasks, loading, updateTaskStatus } = useUserTasks();
  const { isNewSinceLastLogin } = useUserLastLogin();

  const filteredTasks = tasks.filter(t => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      t.title.toLowerCase().includes(query) ||
      t.description?.toLowerCase().includes(query)
    );
  });

  const newCount = filteredTasks.filter(t => isNewSinceLastLogin(t.created_at)).length;

  useEffect(() => {
    if (!loading) {
      onTaskCountUpdate?.(tasks.length);
    }
  }, [tasks.length, loading, onTaskCountUpdate]);

  const getDaysPendingColor = (days: number) => {
    if (days >= 7) return 'bg-destructive/10 text-destructive border-destructive/20';
    if (days >= 3) return 'bg-amber-500/10 text-amber-600 border-amber-500/20';
    return 'bg-muted text-muted-foreground';
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'High':
        return <Badge variant="outline" className="text-[10px] bg-destructive/10 text-destructive border-destructive/20">{priority}</Badge>;
      case 'Medium':
        return <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-600 border-amber-500/20">{priority}</Badge>;
      default:
        return <Badge variant="outline" className="text-[10px]">{priority}</Badge>;
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'review':
        return <Badge variant="secondary" className="text-[10px] bg-blue-500/10 text-blue-600">Review</Badge>;
      case 'approval':
        return <Badge variant="secondary" className="text-[10px] bg-purple-500/10 text-purple-600">Approval</Badge>;
      default:
        return <Badge variant="secondary" className="text-[10px]">{type}</Badge>;
    }
  };

  return (
    <MyTasksPanelCard
      title="Reviews & Approvals"
      icon={<FileCheck className="h-5 w-5 text-white" />}
      iconColorClass="from-violet-500 to-purple-600"
      primaryStat={filteredTasks.length}
      primaryLabel="pending"
      newCount={newCount}
      isExpanded={isExpanded}
      onToggleExpand={onToggleExpand}
      isFullHeight={isFullHeight}
      isRelocated={isRelocated}
      isDimmed={isDimmed}
      isLoading={loading}
      isEmpty={filteredTasks.length === 0}
      emptyMessage="No pending reviews or approvals"
    >
      {filteredTasks.map((task, index) => {
        const isNew = isNewSinceLastLogin(task.created_at);
        const daysPending = Math.floor(
          (Date.now() - new Date(task.created_at).getTime()) / (1000 * 60 * 60 * 24)
        );

        return (
          <div
            key={task.id}
            className={cn(
              "p-3 rounded-lg border transition-all group/item",
              "hover:shadow-sm hover:border-primary/20",
              "bg-card/50",
              isNew && "border-l-2 border-l-primary",
              "animate-fade-in"
            )}
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  {getTypeBadge(task.type)}
                  <span className="text-sm font-medium truncate">{task.title}</span>
                  {isNew && (
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-primary/10 text-primary shrink-0">
                      NEW
                    </Badge>
                  )}
                </div>
                {task.description && (
                  <p className="text-xs text-muted-foreground truncate">{task.description}</p>
                )}
              </div>

              <div className="flex flex-col items-end gap-1.5 shrink-0">
                <div className="flex items-center gap-1.5">
                  {getPriorityBadge(task.priority)}
                  <Badge variant="outline" className={cn("text-[10px]", getDaysPendingColor(daysPending))}>
                    {daysPending === 0 ? 'Today' : daysPending === 1 ? '1 day' : `${daysPending} days`}
                  </Badge>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover/item:opacity-100 transition-opacity">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 text-xs px-2 text-green-600 hover:text-green-700 hover:bg-green-50"
                    onClick={(e) => {
                      e.stopPropagation();
                      updateTaskStatus(task.id, 'completed');
                    }}
                  >
                    <CheckCircle className="h-3.5 w-3.5 mr-1" />
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 text-xs px-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={(e) => {
                      e.stopPropagation();
                      updateTaskStatus(task.id, 'cancelled');
                    }}
                  >
                    <X className="h-3.5 w-3.5 mr-1" />
                    Reject
                  </Button>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </MyTasksPanelCard>
  );
};

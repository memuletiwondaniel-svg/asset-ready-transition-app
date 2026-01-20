import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ListTodo, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MyTasksPanelCard } from './MyTasksPanelCard';
import { useUserOWLItems, OWLStatus } from '@/hooks/useUserOWLItems';
import { useUserLastLogin } from '@/hooks/useUserLastLogin';
import { cn } from '@/lib/utils';
import { format, isPast, isToday } from 'date-fns';

export const OWLPanel: React.FC = () => {
  const navigate = useNavigate();
  const { items, stats, isLoading, updateStatus, isUpdatingStatus } = useUserOWLItems();
  const { isNewSinceLastLogin } = useUserLastLogin();

  const newCount = items?.filter(i => isNewSinceLastLogin(i.created_at)).length || 0;
  // Items already filtered to OPEN and IN_PROGRESS in the hook
  const openItems = items || [];

  const getSourceColor = (source: string) => {
    switch (source) {
      case 'PUNCHLIST':
        return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
      case 'PSSR':
        return 'bg-amber-500/10 text-amber-600 border-amber-500/20';
      case 'PAC':
        return 'bg-teal-500/10 text-teal-600 border-teal-500/20';
      case 'FAC':
        return 'bg-purple-500/10 text-purple-600 border-purple-500/20';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getPriorityColor = (priority?: number | null) => {
    switch (priority) {
      case 1:
        return 'bg-destructive/10 text-destructive border-destructive/20';
      case 2:
        return 'bg-amber-500/10 text-amber-600 border-amber-500/20';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getDueStatus = (dueDate?: string | null) => {
    if (!dueDate) return null;
    const date = new Date(dueDate);
    if (isPast(date) && !isToday(date)) {
      return { label: 'Overdue', className: 'text-destructive' };
    }
    if (isToday(date)) {
      return { label: 'Due today', className: 'text-amber-600' };
    }
    return { label: format(date, 'MMM d'), className: 'text-muted-foreground' };
  };

  const handleStatusUpdate = (id: string, status: OWLStatus) => {
    updateStatus({ id, status });
  };

  return (
    <MyTasksPanelCard
      title="(OWL) Outstanding Work List"
      icon={<ListTodo className="h-5 w-5 text-white" />}
      iconColorClass="from-amber-500 to-amber-600"
      primaryStat={stats.open + stats.inProgress}
      primaryLabel="open"
      secondaryStat={stats.overdue}
      secondaryLabel="overdue"
      newCount={newCount}
      isLoading={isLoading}
      isEmpty={openItems.length === 0}
      emptyMessage="No outstanding work items"
    >
      {openItems.slice(0, 5).map((item) => {
        const isNew = isNewSinceLastLogin(item.created_at);
        const dueStatus = getDueStatus(item.due_date);

        return (
          <div
            key={item.id}
            className={cn(
              "p-3 rounded-lg border bg-background/50 hover:bg-background/80 transition-all",
              isNew && "border-l-2 border-l-primary"
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <Badge 
                    variant="outline" 
                    className={cn("text-[10px]", getSourceColor(item.source))}
                  >
                    {item.source}
                  </Badge>
                  {item.priority && (
                    <Badge 
                      variant="outline" 
                      className={cn("text-[10px]", getPriorityColor(item.priority))}
                    >
                      P{item.priority}
                    </Badge>
                  )}
                  {isNew && (
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-primary/10 text-primary">
                      NEW
                    </Badge>
                  )}
                </div>
                <p className="font-medium text-sm mt-1 truncate">
                  {item.title || `Item #${item.item_number}`}
                </p>
                <p className="text-xs text-muted-foreground truncate mt-0.5">
                  {item.project?.name || 'Unknown Project'}
                </p>
                {dueStatus && (
                  <div className="flex items-center gap-1 mt-1">
                    {dueStatus.label === 'Overdue' && (
                      <AlertCircle className="h-3 w-3 text-destructive" />
                    )}
                    <span className={cn("text-xs", dueStatus.className)}>
                      {dueStatus.label}
                    </span>
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-1">
                {item.status === 'OPEN' && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-6 text-xs px-2"
                    disabled={isUpdatingStatus}
                    onClick={() => handleStatusUpdate(item.id, 'IN_PROGRESS')}
                  >
                    Start
                  </Button>
                )}
                {item.status === 'IN_PROGRESS' && (
                  <Button
                    size="sm"
                    variant="default"
                    className="h-6 text-xs px-2"
                    disabled={isUpdatingStatus}
                    onClick={() => handleStatusUpdate(item.id, 'CLOSED')}
                  >
                    Complete
                  </Button>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </MyTasksPanelCard>
  );
};

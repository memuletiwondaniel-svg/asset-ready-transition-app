import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { MyTasksPanelCard } from './MyTasksPanelCard';
import { TaskDetailSheet } from './TaskDetailSheet';
import { useUserORPActivities } from '@/hooks/useUserORPActivities';
import { useUserTasks, type UserTask } from '@/hooks/useUserTasks';
import { useUserLastLogin } from '@/hooks/useUserLastLogin';

import { cn } from '@/lib/utils';

interface ORPActivitiesPanelProps {
  searchQuery?: string;
  isExpanded: boolean;
  onToggleExpand: () => void;
  isFullHeight?: boolean;
  isRelocated?: boolean;
  isDimmed?: boolean;
  onTaskCountUpdate?: (count: number) => void;
}

export const ORPActivitiesPanel: React.FC<ORPActivitiesPanelProps> = ({ 
  searchQuery = '',
  isExpanded,
  onToggleExpand,
  isFullHeight = false,
  isRelocated = false,
  isDimmed = false,
  onTaskCountUpdate,
}) => {
  const navigate = useNavigate();
  const { activities: realActivities, stats, isLoading: orpLoading } = useUserORPActivities();
  const { tasks: userTasks, loading: tasksLoading, updateTaskStatus } = useUserTasks();
  const { isNewSinceLastLogin } = useUserLastLogin();
  const [selectedTask, setSelectedTask] = useState<UserTask | null>(null);

  const isLoading = orpLoading || tasksLoading;

  // ORA workflow tasks from user_tasks table
  const oraWorkflowTasks = userTasks.filter(t => {
    const meta = t.metadata as Record<string, any> | null;
    return meta?.source === 'ora_workflow';
  });

  const filteredOraWorkflowTasks = oraWorkflowTasks.filter(t => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      t.title.toLowerCase().includes(query) ||
      t.description?.toLowerCase().includes(query)
    );
  });

  // Use only real data from the database
  const rawActivities = realActivities || [];

  const activities = rawActivities.filter(a => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      a.project_name?.toLowerCase().includes(query) ||
      a.plan_name?.toLowerCase().includes(query) ||
      a.role?.toLowerCase().includes(query)
    );
  });

  const newActivityCount = activities.filter(a => isNewSinceLastLogin(a.created_at)).length;
  const newTaskCount = filteredOraWorkflowTasks.filter(t => isNewSinceLastLogin(t.created_at)).length;
  const newCount = newActivityCount + newTaskCount;

  // Report task count to parent (both ORP activities and ORA workflow tasks)
  useEffect(() => {
    if (!isLoading) {
      const rawTotal = rawActivities.length + oraWorkflowTasks.length;
      onTaskCountUpdate?.(rawTotal);
    }
  }, [rawActivities.length, oraWorkflowTasks.length, isLoading, onTaskCountUpdate]);

  // Group activities by plan to avoid duplicates
  const uniquePlans = activities.reduce((acc, activity) => {
    if (!acc.find(a => a.plan_id === activity.plan_id)) {
      acc.push(activity);
    }
    return acc;
  }, [] as typeof activities);

  // Calculate stats from actual data being displayed
  const displayStats = {
    totalPlans: uniquePlans.length,
    totalDeliverables: activities.reduce((sum, a) => sum + (a.deliverable_count || 0), 0),
    completedDeliverables: activities.reduce((sum, a) => sum + (a.completed_deliverables || 0), 0),
  };

  const totalCount = uniquePlans.length + filteredOraWorkflowTasks.length;

  const getPhaseColor = (phase?: string) => {
    switch (phase) {
      case 'ORP_PHASE_1':
        return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
      case 'ORP_PHASE_2':
        return 'bg-amber-500/10 text-amber-600 border-amber-500/20';
      case 'ORP_PHASE_3':
        return 'bg-green-500/10 text-green-600 border-green-500/20';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const formatPhase = (phase?: string) => {
    if (!phase) return 'Unknown';
    return phase.replace('ORP_', '').replace('_', ' ');
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

  return (
    <>
    <MyTasksPanelCard
      title="ORA Activities"
      icon={<Activity className="h-5 w-5 text-white" />}
      iconColorClass="from-purple-500 to-purple-600"
      primaryStat={totalCount}
      primaryLabel={totalCount === 1 ? "item" : "items"}
      secondaryStat={displayStats.totalDeliverables - displayStats.completedDeliverables}
      secondaryLabel="deliverables pending"
      newCount={newCount}
      isExpanded={isExpanded}
      onToggleExpand={onToggleExpand}
      isFullHeight={isFullHeight}
      isRelocated={isRelocated}
      isDimmed={isDimmed}
      isLoading={isLoading}
      isEmpty={totalCount === 0}
      emptyMessage="No ORA activities assigned"
      onViewAll={() => navigate('/operation-readiness')}
    >
      {/* ORA Workflow Action Items (from user_tasks) */}
      {filteredOraWorkflowTasks.map((task, index) => {
        const isNew = isNewSinceLastLogin(task.created_at);
        const daysPending = Math.floor(
          (Date.now() - new Date(task.created_at).getTime()) / (1000 * 60 * 60 * 24)
        );
        const meta = task.metadata as Record<string, any> | null;

        return (
          <div
            key={task.id}
            className={cn(
              "p-3 rounded-lg border transition-all cursor-pointer group/item",
              "hover:shadow-sm hover:border-primary/20",
              "bg-card/50",
              isNew && "border-l-2 border-l-primary",
              "animate-fade-in"
            )}
            style={{ animationDelay: `${index * 50}ms` }}
            onClick={() => setSelectedTask(task)}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="secondary" className="text-[10px] bg-purple-500/10 text-purple-600">Action</Badge>
                  <span className="font-medium text-sm truncate">{task.title}</span>
                  {isNew && (
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-primary/10 text-primary shrink-0">
                      NEW
                    </Badge>
                  )}
                </div>
                {task.description && (
                  <p className="text-xs text-muted-foreground truncate mt-0.5">{task.description}</p>
                )}
                {meta?.project_name && (
                  <p className="text-xs text-muted-foreground truncate mt-0.5">
                    Project: {meta.project_name}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                {getPriorityBadge(task.priority)}
              </div>
            </div>
          </div>
        );
      })}

      {/* ORP Plan Activities (from orp_resources) */}
      {uniquePlans.map((activity, index) => {
        const isNew = isNewSinceLastLogin(activity.created_at);
        const progress = activity.deliverable_count > 0
          ? Math.round((activity.completed_deliverables / activity.deliverable_count) * 100)
          : 0;

        return (
          <div
            key={activity.id}
            className={cn(
              "p-3 rounded-lg border bg-background/50 hover:bg-background/80 transition-all cursor-pointer group/item",
              "hover:shadow-sm hover:border-primary/20",
              isNew && "border-l-2 border-l-primary",
              "animate-fade-in"
            )}
            style={{ animationDelay: `${(filteredOraWorkflowTasks.length + index) * 50}ms` }}
            onClick={() => navigate(`/operation-readiness/${activity.plan_id}`)}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm truncate">
                    {activity.project_name || activity.plan_name}
                  </span>
                  {isNew && (
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-primary/10 text-primary">
                      NEW
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground truncate mt-0.5">
                  Role: {activity.role} • {activity.allocation_percentage}% allocation
                </p>
                <div className="mt-2">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-muted-foreground">
                      {activity.completed_deliverables}/{activity.deliverable_count} deliverables
                    </span>
                    <span className="font-medium">{progress}%</span>
                  </div>
                  <Progress value={progress} className="h-1.5" />
                </div>
              </div>
              <div className="flex flex-col items-end gap-1">
                <Badge 
                  variant="outline" 
                  className={cn("text-[10px]", getPhaseColor(activity.phase))}
                >
                  {formatPhase(activity.phase)}
                </Badge>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 text-xs px-2 opacity-0 group-hover/item:opacity-100 transition-opacity"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/operation-readiness/${activity.plan_id}`);
                  }}
                >
                  View
                </Button>
              </div>
            </div>
          </div>
        );
      })}
    </MyTasksPanelCard>

    <TaskDetailSheet
      task={selectedTask}
      open={!!selectedTask}
      onOpenChange={(open) => { if (!open) setSelectedTask(null); }}
      onApprove={async (taskId, comment) => {
        updateTaskStatus(taskId, 'completed');
      }}
      onReject={async (taskId, comment) => {
        updateTaskStatus(taskId, 'cancelled');
      }}
    />
    </>
  );
};

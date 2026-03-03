import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { TaskDetailSheet } from './TaskDetailSheet';
import {
  ClipboardCheck,
  RefreshCw,
  Activity,
  ListTodo,
  ClipboardList,
  Calendar,
  AlertTriangle,
  ChevronRight,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, isPast, isToday } from 'date-fns';
import { usePSSRsAwaitingReview } from '@/hooks/usePSSRItemApprovals';
import { useUserP2AApprovals } from '@/hooks/useUserP2AApprovals';
import { useUserORPActivities } from '@/hooks/useUserORPActivities';
import { useUserOWLItems } from '@/hooks/useUserOWLItems';
import { useUserVCRBundleTasks } from '@/hooks/useUserVCRBundleTasks';
import { useUserTasks, type UserTask } from '@/hooks/useUserTasks';
import { useUserLastLogin } from '@/hooks/useUserLastLogin';
import { useAuth } from '@/components/enhanced-auth/AuthProvider';

type CategoryFilter = 'all' | 'pssr' | 'ora' | 'owl' | 'vcr' | 'p2a' | 'action';

interface UnifiedTask {
  id: string;
  category: CategoryFilter;
  categoryLabel: string;
  categoryColor: string;
  icon: React.ElementType;
  title: string;
  subtitle?: string;
  project?: string;
  status: string;
  dueDate?: string;
  createdAt: string;
  priority: 'high' | 'medium' | 'low';
  navigateTo?: string;
  isNew: boolean;
  // Bundle fields
  progressPercentage?: number;
  completedItems?: number;
  totalItems?: number;
  isWaiting?: boolean;
  // For opening task detail sheet
  userTask?: UserTask;
}

const FILTER_OPTIONS: { value: CategoryFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'action', label: 'Actions' },
  { value: 'pssr', label: 'PSSR' },
  { value: 'ora', label: 'ORA' },
  { value: 'owl', label: 'OWL' },
  { value: 'vcr', label: 'VCR' },
  { value: 'p2a', label: 'P2A' },
];

interface UnifiedTaskListProps {
  searchQuery: string;
  userId: string;
  onTotalCountUpdate?: (count: number) => void;
}

export const UnifiedTaskList: React.FC<UnifiedTaskListProps> = ({
  searchQuery,
  userId,
  onTotalCountUpdate,
}) => {
  const navigate = useNavigate();
  const { isNewSinceLastLogin } = useUserLastLogin();
  const [activeFilter, setActiveFilter] = useState<CategoryFilter>('all');
  const [selectedTask, setSelectedTask] = useState<UserTask | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  // Data sources
  const { data: pssrs, isLoading: pssrLoading } = usePSSRsAwaitingReview(userId);
  const { approvals, isLoading: handoverLoading } = useUserP2AApprovals();
  const { activities, isLoading: oraLoading } = useUserORPActivities();
  const { items: owlItems, isLoading: owlLoading } = useUserOWLItems();
  const { bundleTasks, isLoading: bundleLoading } = useUserVCRBundleTasks();
  const { tasks: userTasks, loading: tasksLoading, updateTaskStatus } = useUserTasks();

  const isLoading = pssrLoading || handoverLoading || oraLoading || owlLoading || bundleLoading || tasksLoading;

  // Build unified task list
  const allTasks = useMemo<UnifiedTask[]>(() => {
    const tasks: UnifiedTask[] = [];

    // user_tasks-based tasks (ORA workflow, VCR delivery plan, etc.)
    (userTasks || []).forEach(t => {
      const meta = t.metadata as Record<string, any> | null;
      const source = meta?.source;
      const action = meta?.action;

      let category: CategoryFilter = 'action';
      let categoryLabel = 'Task';
      let categoryColor = 'bg-muted text-muted-foreground';
      let icon: React.ElementType = ClipboardCheck;

      if (source === 'ora_workflow' || t.type === 'ora_plan_creation' || action === 'create_ora_plan') {
        category = 'ora';
        categoryLabel = action === 'create_ora_plan' ? 'ORA Plan' : t.type === 'ora_plan_review' ? 'ORA Review' : 'ORA Activity';
        categoryColor = 'bg-purple-500/10 text-purple-600 border-purple-500/20';
        icon = Activity;
      } else if (t.type === 'ora_plan_review') {
        category = 'ora';
        categoryLabel = 'ORA Review';
        categoryColor = 'bg-amber-500/10 text-amber-600 border-amber-500/20';
        icon = Activity;
      } else if (action === 'create_vcr_delivery_plan' || t.type === 'vcr_delivery_plan') {
        category = 'vcr';
        categoryLabel = 'VCR Plan';
        categoryColor = 'bg-teal-500/10 text-teal-600 border-teal-500/20';
        icon = ClipboardList;
      } else if (source === 'pssr_workflow' || meta?.pssr_id) {
        category = 'pssr';
        categoryLabel = 'PSSR Review';
        categoryColor = 'bg-blue-500/10 text-blue-600 border-blue-500/20';
        icon = ClipboardCheck;
      } else if (source === 'p2a_handover') {
        category = 'p2a';
        categoryLabel = 'P2A Approval';
        categoryColor = 'bg-teal-500/10 text-teal-600 border-teal-500/20';
        icon = RefreshCw;
      } else {
        category = 'action';
        categoryLabel = 'Task';
        categoryColor = 'bg-muted text-muted-foreground';
        icon = ClipboardCheck;
      }

      tasks.push({
        id: `ut-${t.id}`,
        category,
        categoryLabel,
        categoryColor,
        icon,
        title: t.title,
        subtitle: t.description || undefined,
        project: meta?.project_name || meta?.project_code || undefined,
        status: t.status,
        dueDate: t.due_date || undefined,
        createdAt: t.created_at,
        priority: t.priority === 'High' || t.priority === 'high' ? 'high' : t.priority === 'Medium' || t.priority === 'medium' ? 'medium' : 'low',
        isNew: isNewSinceLastLogin(t.created_at),
        userTask: t,
      });
    });

    // PSSR reviews (not already in user_tasks)
    (pssrs || []).forEach(item => {
      const pssrId = item.pssr?.id;
      if (!pssrId) return;
      // Skip if already covered by user_tasks
      if (tasks.some(t => t.userTask?.metadata?.pssr_id === pssrId)) return;

      tasks.push({
        id: `pssr-${pssrId}`,
        category: 'pssr',
        categoryLabel: 'PSSR Review',
        categoryColor: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
        icon: ClipboardCheck,
        title: item.pssr?.pssr_id || 'PSSR Review',
        subtitle: item.pssr?.title || undefined,
        project: item.pssr?.project_name || undefined,
        status: 'Pending Review',
        createdAt: item.pendingSince,
        priority: 'high',
        navigateTo: `/pssr/${pssrId}/review`,
        isNew: isNewSinceLastLogin(item.pendingSince),
      });
    });

    // P2A approvals
    (approvals || []).forEach(item => {
      if (tasks.some(t => t.userTask?.metadata?.plan_id === item.handover_id)) return;

      tasks.push({
        id: `p2a-${item.id}`,
        category: 'p2a',
        categoryLabel: 'P2A Approval',
        categoryColor: 'bg-teal-500/10 text-teal-600 border-teal-500/20',
        icon: RefreshCw,
        title: item.handover_name || 'Handover Approval',
        project: item.project_number || undefined,
        status: item.stage,
        createdAt: item.created_at,
        priority: 'medium',
        navigateTo: `/p2a-handover/${item.handover_id}`,
        isNew: isNewSinceLastLogin(item.created_at),
      });
    });

    // OWL items
    const openOWL = (owlItems || []).filter(i => i.status === 'OPEN' || i.status === 'IN_PROGRESS');
    openOWL.forEach(item => {
      const projectName = typeof item.project === 'object' && item.project !== null
        ? (item.project as any).project_title || (item.project as any).name || undefined
        : undefined;

      tasks.push({
        id: `owl-${item.id}`,
        category: 'owl',
        categoryLabel: 'OWL',
        categoryColor: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
        icon: ListTodo,
        title: item.title,
        project: projectName,
        status: item.status === 'IN_PROGRESS' ? 'In Progress' : 'Open',
        dueDate: item.due_date || undefined,
        createdAt: item.created_at,
        priority: item.due_date && isPast(new Date(item.due_date)) ? 'high' : 'medium',
        navigateTo: '/outstanding-work-list',
        isNew: isNewSinceLastLogin(item.created_at),
      });
    });

    // VCR/PSSR bundle tasks
    (bundleTasks || []).forEach(task => {
      const isPSSR = task.type === 'pssr_checklist_bundle' || task.type === 'pssr_approval_bundle';
      const isApproval = task.type === 'vcr_approval_bundle' || task.type === 'pssr_approval_bundle';

      tasks.push({
        id: `bundle-${task.id}`,
        category: isPSSR ? 'pssr' : 'vcr',
        categoryLabel: isPSSR
          ? (isApproval ? 'PSSR Review' : 'PSSR Checklist')
          : (isApproval ? 'VCR Review' : 'VCR Checklist'),
        categoryColor: isPSSR
          ? 'bg-blue-500/10 text-blue-600 border-blue-500/20'
          : 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
        icon: isApproval ? ClipboardCheck : ClipboardList,
        title: task.title,
        project: isPSSR ? task.metadata?.project_name : task.metadata?.project_code,
        status: `${task.sub_items.filter(i => i.completed).length}/${task.sub_items.length}`,
        createdAt: task.created_at,
        priority: task.status === 'waiting' ? 'low' : 'medium',
        isNew: isNewSinceLastLogin(task.created_at),
        progressPercentage: task.progress_percentage,
        completedItems: task.sub_items.filter(i => i.completed).length,
        totalItems: task.sub_items.length,
        isWaiting: task.status === 'waiting',
        navigateTo: isPSSR
          ? (task.metadata?.pssr_id ? `/pssr/${task.metadata.pssr_id}/review` : '/my-tasks')
          : (task.metadata?.vcr_id ? `/p2a-handover?vcr=${task.metadata.vcr_id}` : '/p2a-handover'),
      });
    });

    // Sort: high priority first, then by date
    return tasks.sort((a, b) => {
      // Waiting tasks go to the bottom
      if (a.isWaiting && !b.isWaiting) return 1;
      if (!a.isWaiting && b.isWaiting) return -1;
      // Priority order
      const prio = { high: 0, medium: 1, low: 2 };
      if (prio[a.priority] !== prio[b.priority]) return prio[a.priority] - prio[b.priority];
      // Then by date (newest first)
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [pssrs, approvals, activities, owlItems, bundleTasks, userTasks, isNewSinceLastLogin]);

  // Report total count
  React.useEffect(() => {
    onTotalCountUpdate?.(allTasks.length);
  }, [allTasks.length, onTotalCountUpdate]);

  // Filter
  const filteredTasks = useMemo(() => {
    let result = allTasks;

    if (activeFilter !== 'all') {
      result = result.filter(t => t.category === activeFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(t =>
        t.title.toLowerCase().includes(q) ||
        t.subtitle?.toLowerCase().includes(q) ||
        t.project?.toLowerCase().includes(q) ||
        t.categoryLabel.toLowerCase().includes(q)
      );
    }

    return result;
  }, [allTasks, activeFilter, searchQuery]);

  // Count per category for chips
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: allTasks.length };
    allTasks.forEach(t => {
      counts[t.category] = (counts[t.category] || 0) + 1;
    });
    return counts;
  }, [allTasks]);

  const handleTaskClick = (task: UnifiedTask) => {
    if (task.isWaiting) return;
    if (task.userTask) {
      setSelectedTask(task.userTask);
      setDetailOpen(true);
    } else if (task.navigateTo) {
      navigate(task.navigateTo);
    }
  };

  const handleApprove = (taskId: string, comment: string) => {
    updateTaskStatus(taskId, 'completed');
  };

  const handleReject = (taskId: string, comment: string) => {
    updateTaskStatus(taskId, 'cancelled');
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <Skeleton key={i} className="h-20 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <>
      {/* Filter chips */}
      <div className="flex items-center gap-2 flex-wrap mb-5">
        {FILTER_OPTIONS.map(opt => {
          const count = categoryCounts[opt.value] || 0;
          if (opt.value !== 'all' && count === 0) return null;
          return (
            <button
              key={opt.value}
              onClick={() => setActiveFilter(opt.value)}
              className={cn(
                "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all",
                activeFilter === opt.value
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              {opt.label}
              <span className={cn(
                "text-xs rounded-full px-1.5 py-0.5 min-w-[20px] text-center",
                activeFilter === opt.value
                  ? "bg-primary-foreground/20 text-primary-foreground"
                  : "bg-background/80 text-muted-foreground"
              )}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Task list */}
      {filteredTasks.length === 0 ? (
        <div className="flex items-center justify-center py-16">
          <div className="text-center max-w-md">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-muted/50 mb-4">
              <CheckCircle2 className="h-7 w-7 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground">
              {searchQuery ? 'No tasks match your search.' : activeFilter !== 'all' ? 'No tasks in this category.' : "You're all caught up!"}
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredTasks.map(task => {
            const Icon = task.icon;
            const isOverdue = task.dueDate && isPast(new Date(task.dueDate)) && !isToday(new Date(task.dueDate));

            return (
              <Card
                key={task.id}
                onClick={() => handleTaskClick(task)}
                className={cn(
                  "group relative flex items-center gap-4 p-4 cursor-pointer transition-all border",
                  "hover:shadow-md hover:border-primary/20",
                  task.isWaiting && "opacity-50 cursor-default",
                  task.isNew && "border-primary/30 bg-primary/[0.02]"
                )}
              >
                {/* Priority indicator */}
                <div className={cn(
                  "w-1 self-stretch rounded-full shrink-0",
                  task.priority === 'high' ? 'bg-destructive' : task.priority === 'medium' ? 'bg-amber-500' : 'bg-muted-foreground/30'
                )} />

                {/* Icon */}
                <div className={cn(
                  "w-9 h-9 rounded-lg flex items-center justify-center shrink-0",
                  task.categoryColor
                )}>
                  <Icon className="h-4 w-4" />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-medium text-sm text-foreground truncate">{task.title}</span>
                    {task.isNew && (
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-primary/10 text-primary shrink-0">
                        NEW
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 font-normal", task.categoryColor)}>
                      {task.categoryLabel}
                    </Badge>
                    {task.project && (
                      <span className="truncate">{task.project}</span>
                    )}
                  </div>
                </div>

                {/* Right side: progress or date */}
                <div className="flex items-center gap-3 shrink-0">
                  {task.totalItems != null && task.totalItems > 0 ? (
                    <div className="flex items-center gap-2">
                      <Progress
                        value={task.progressPercentage || 0}
                        className="h-2 w-16"
                        indicatorClassName={cn(
                          (task.progressPercentage || 0) >= 75 && 'bg-green-500',
                          (task.progressPercentage || 0) >= 25 && (task.progressPercentage || 0) < 75 && 'bg-amber-500',
                          (task.progressPercentage || 0) < 25 && 'bg-red-500'
                        )}
                      />
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {task.completedItems}/{task.totalItems}
                      </span>
                    </div>
                  ) : task.isWaiting ? (
                    <Badge variant="outline" className="text-[10px] text-muted-foreground border-muted-foreground/20">
                      <Clock className="h-3 w-3 mr-1" />
                      Waiting
                    </Badge>
                  ) : task.dueDate ? (
                    <span className={cn(
                      "text-xs whitespace-nowrap",
                      isOverdue ? "text-destructive font-medium" : "text-muted-foreground"
                    )}>
                      {isOverdue && <AlertTriangle className="h-3 w-3 inline mr-1" />}
                      {format(new Date(task.dueDate), 'MMM d')}
                    </span>
                  ) : null}

                  <ChevronRight className="h-4 w-4 text-muted-foreground/50 group-hover:text-foreground transition-colors" />
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Task detail sheet */}
      <TaskDetailSheet
        task={selectedTask}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onApprove={handleApprove}
        onReject={handleReject}
      />
    </>
  );
};

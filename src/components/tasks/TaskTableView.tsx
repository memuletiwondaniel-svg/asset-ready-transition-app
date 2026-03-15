import React, { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { TaskDetailSheet } from './TaskDetailSheet';
import { ORAActivityTaskSheet } from './ORAActivityTaskSheet';
import { P2APlanCreationWizard } from '@/components/widgets/p2a-wizard/P2APlanCreationWizard';
import { P2AWorkspaceOverlay } from '@/components/widgets/P2AWorkspaceOverlay';
import { useQueryClient } from '@tanstack/react-query';
import { ProjectIdBadge } from '@/components/ui/project-id-badge';
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Columns3,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, isPast, isToday, differenceInDays } from 'date-fns';
import type { UserTask } from '@/hooks/useUserTasks';
import { useUnifiedTasks, FILTER_OPTIONS, type CategoryFilter, type UnifiedTask } from './useUnifiedTasks';

type SortField = 'title' | 'project' | 'category' | 'dueDate' | 'created';
type SortDirection = 'asc' | 'desc';

interface ColumnConfig {
  id: string;
  label: string;
  visible: boolean;
  sortField?: SortField;
}

const DEFAULT_COLUMNS: ColumnConfig[] = [
  { id: 'task', label: 'Task', visible: true, sortField: 'title' },
  { id: 'project', label: 'Project', visible: true, sortField: 'project' },
  { id: 'category', label: 'Type', visible: true, sortField: 'category' },
  { id: 'due', label: 'Due', visible: true, sortField: 'dueDate' },
  { id: 'progress', label: 'Progress', visible: true },
  { id: 'created', label: 'Created', visible: false, sortField: 'created' },
];

interface TaskTableViewProps {
  searchQuery: string;
  userId: string;
  groupBy?: 'none' | 'project' | 'category';
}

export const TaskTableView: React.FC<TaskTableViewProps> = ({ searchQuery, userId }) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { allTasks, isLoading, categoryCounts, updateTaskStatus } = useUnifiedTasks(userId);

  const [activeFilter, setActiveFilter] = useState<CategoryFilter>('all');
  const [columns, setColumns] = useState<ColumnConfig[]>(DEFAULT_COLUMNS);
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDir, setSortDir] = useState<SortDirection>('asc');

  const [selectedTask, setSelectedTask] = useState<UserTask | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [oraActivityTask, setOraActivityTask] = useState<UserTask | null>(null);
  const [oraActivityOpen, setOraActivityOpen] = useState(false);
  const [p2aWizardOpen, setP2aWizardOpen] = useState(false);
  const [p2aWorkspaceOpen, setP2aWorkspaceOpen] = useState(false);
  const [p2aTarget, setP2aTarget] = useState({ projectId: '', projectCode: '' });

  const handleOpenP2AWizard = useCallback((projectId: string, projectCode: string, openWorkspace?: boolean) => {
    setP2aTarget({ projectId, projectCode });
    if (openWorkspace) setP2aWorkspaceOpen(true);
    else setP2aWizardOpen(true);
  }, []);

  const toggleCol = (id: string) => {
    setColumns(prev => prev.map(c => c.id === id ? { ...c, visible: !c.visible } : c));
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  };

  const tasks = useMemo(() => {
    let result = allTasks;
    if (activeFilter !== 'all') result = result.filter(t => t.category === activeFilter);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(t =>
        t.title.toLowerCase().includes(q) ||
        t.subtitle?.toLowerCase().includes(q) ||
        t.project?.toLowerCase().includes(q) ||
        t.categoryLabel.toLowerCase().includes(q)
      );
    }
    if (sortField) {
      const dir = sortDir === 'asc' ? 1 : -1;
      result = [...result].sort((a, b) => {
        switch (sortField) {
          case 'title': return a.title.localeCompare(b.title) * dir;
          case 'project': return (a.project || '').localeCompare(b.project || '') * dir;
          case 'category': return a.categoryLabel.localeCompare(b.categoryLabel) * dir;
          case 'dueDate': return ((a.dueDate || a.endDate || '') .localeCompare(b.dueDate || b.endDate || '')) * dir;
          case 'created': return a.createdAt.localeCompare(b.createdAt) * dir;
          default: return 0;
        }
      });
    }
    return result;
  }, [allTasks, activeFilter, searchQuery, sortField, sortDir]);

  const handleTaskClick = (task: UnifiedTask) => {
    if (task.isWaiting) return;
    if (task.userTask) {
      const meta = task.userTask.metadata as Record<string, any> | undefined;
      const isReviewTask = meta?.source === 'task_review';
      const isOra = !isReviewTask && (task.userTask.type === 'ora_activity' || meta?.action === 'complete_ora_activity' || meta?.action === 'create_p2a_plan' || meta?.ora_plan_activity_id);
      // Review tasks always open TaskDetailSheet
      if (isReviewTask) { setSelectedTask(task.userTask); setDetailOpen(true); return; }
      if (isOra && !task.navigateTo) { setOraActivityTask(task.userTask); setOraActivityOpen(true); return; }
      setSelectedTask(task.userTask);
      setDetailOpen(true);
    } else if (task.navigateTo) {
      navigate(task.navigateTo);
    }
  };

  const visible = columns.filter(c => c.visible);

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-12 w-full rounded-lg" />)}
      </div>
    );
  }

  return (
    <>
      {/* Top bar: filters + columns toggle */}
      <div className="flex items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-1.5 flex-wrap">
          {FILTER_OPTIONS.map(opt => {
            const count = categoryCounts[opt.value] || 0;
            if (opt.value !== 'all' && count === 0) return null;
            return (
              <button
                key={opt.value}
                onClick={() => setActiveFilter(opt.value)}
                className={cn(
                  "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all",
                  activeFilter === opt.value
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                {opt.label}
                <span className={cn(
                  "text-[10px] rounded-full px-1.5 min-w-[18px] text-center font-semibold",
                  activeFilter === opt.value ? "bg-primary-foreground/20 text-primary-foreground" : "bg-background/80 text-muted-foreground"
                )}>{count}</span>
              </button>
            );
          })}
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1.5 text-xs h-8">
              <Columns3 className="h-3.5 w-3.5" /> Columns
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuLabel className="text-xs">Show / Hide</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {columns.map(col => (
              <DropdownMenuCheckboxItem key={col.id} checked={col.visible} onCheckedChange={() => toggleCol(col.id)} className="text-xs">
                {col.label}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Empty state */}
      {tasks.length === 0 ? (
        <div className="flex items-center justify-center py-16">
          <div className="text-center">
            <CheckCircle2 className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              {searchQuery ? 'No tasks match your search.' : activeFilter !== 'all' ? 'No tasks in this category.' : "You're all caught up!"}
            </p>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-border/50 bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                {visible.map(col => (
                  <TableHead
                    key={col.id}
                    className={cn(
                      "h-9 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground",
                      col.sortField && "cursor-pointer select-none hover:text-foreground transition-colors"
                    )}
                    onClick={() => col.sortField && handleSort(col.sortField)}
                  >
                    <span className="inline-flex items-center gap-0.5">
                      {col.label}
                      {col.sortField && (
                        sortField === col.sortField
                          ? (sortDir === 'asc' ? <ArrowUp className="h-3 w-3 text-primary" /> : <ArrowDown className="h-3 w-3 text-primary" />)
                          : <ArrowUpDown className="h-3 w-3 opacity-30" />
                      )}
                    </span>
                  </TableHead>
                ))}
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {tasks.map(task => (
                <SimpleRow key={task.id} task={task} visible={visible} onClick={() => handleTaskClick(task)} />
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Sheets */}
      <TaskDetailSheet task={selectedTask} open={detailOpen} onOpenChange={setDetailOpen}
        onApprove={(id) => updateTaskStatus(id, 'completed')} onReject={(id) => updateTaskStatus(id, 'cancelled')} />
      <ORAActivityTaskSheet task={oraActivityTask} open={oraActivityOpen}
        onOpenChange={(open) => { setOraActivityOpen(open); if (!open) setOraActivityTask(null); }}
        onOpenP2AWizard={handleOpenP2AWizard} />
      <P2APlanCreationWizard open={p2aWizardOpen} onOpenChange={setP2aWizardOpen}
        projectId={p2aTarget.projectId} projectCode={p2aTarget.projectCode}
        onSuccess={() => { setP2aWizardOpen(false); queryClient.invalidateQueries({ queryKey: ['orp-plan'] }); queryClient.invalidateQueries({ queryKey: ['user-tasks'] }); }}
        onOpenWorkspace={() => { setP2aWizardOpen(false); setP2aWorkspaceOpen(true); }} />
      <P2AWorkspaceOverlay open={p2aWorkspaceOpen} onOpenChange={setP2aWorkspaceOpen}
        projectId={p2aTarget.projectId} projectNumber={p2aTarget.projectCode}
        onReturnToWizard={() => { setP2aWorkspaceOpen(false); setP2aWizardOpen(true); }} />
    </>
  );
};

// ─── Simple Row ───

const SimpleRow: React.FC<{
  task: UnifiedTask;
  visible: ColumnConfig[];
  onClick: () => void;
}> = ({ task, visible, onClick }) => {
  const Icon = task.icon;
  const dueDate = task.dueDate || task.endDate;
  const isOverdue = dueDate && isPast(new Date(dueDate)) && !isToday(new Date(dueDate));
  const isDueToday = dueDate && isToday(new Date(dueDate));

  const renderCell = (col: ColumnConfig) => {
    switch (col.id) {
      case 'task':
        return (
          <div className="flex items-center gap-2.5 min-w-0">
            <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center shrink-0", task.categoryColor)}>
              <Icon className="h-3.5 w-3.5" />
            </div>
            <div className="min-w-0">
              <span className="font-medium text-sm text-foreground truncate block">
                {task.title}
              </span>
              {task.subtitle && (
                <span className="text-[11px] text-muted-foreground truncate block">{task.subtitle}</span>
              )}
            </div>
            {task.isNew && (
              <Badge variant="secondary" className="text-[9px] px-1 py-0 bg-primary/10 text-primary shrink-0">NEW</Badge>
            )}
          </div>
        );

      case 'project':
        return task.project
          ? <ProjectIdBadge size="sm" projectId={task.project}>{task.project}</ProjectIdBadge>
          : <span className="text-muted-foreground/40 text-xs">—</span>;

      case 'category':
        return (
          <span className="text-xs text-muted-foreground">{task.categoryLabel}</span>
        );

      case 'due':
        if (!dueDate) return <span className="text-muted-foreground/40 text-xs">—</span>;
        return (
          <span className={cn(
            "text-xs",
            isOverdue && "text-destructive",
            isDueToday && "text-amber-600",
            !isOverdue && !isDueToday && "text-muted-foreground"
          )}>
            {format(new Date(dueDate), 'MMM d')}
          </span>
        );

      case 'progress':
        if (task.totalItems != null && task.totalItems > 0) {
          const pct = task.totalItems > 0 ? Math.round((task.completedItems || 0) / task.totalItems * 100) : 0;
          return <span className="text-xs text-muted-foreground">{pct}%</span>;
        }
        if (task.progressPercentage != null && task.progressPercentage > 0) {
          return <span className="text-xs text-muted-foreground">{task.progressPercentage}%</span>;
        }
        return <span className="text-muted-foreground/40 text-xs">—</span>;

      case 'created':
        return <span className="text-xs text-muted-foreground">{format(new Date(task.createdAt), 'MMM d')}</span>;

      default:
        return null;
    }
  };

  return (
    <TableRow
      onClick={onClick}
      className={cn(
        "group cursor-pointer transition-colors",
        "hover:bg-accent/40",
        task.isWaiting && "opacity-50 cursor-default",
        task.isNew && "bg-primary/[0.02]",
      )}
    >
      {visible.map(col => (
        <TableCell key={col.id} className="py-2.5 px-4">
          {renderCell(col)}
        </TableCell>
      ))}
      <TableCell className="py-2.5 px-2 w-10">
        <ChevronRight className="h-4 w-4 text-muted-foreground/30 group-hover:text-muted-foreground transition-colors" />
      </TableCell>
    </TableRow>
  );
};

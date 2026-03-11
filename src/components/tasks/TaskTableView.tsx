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
import { Checkbox } from '@/components/ui/checkbox';
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ProjectIdBadge } from '@/components/ui/project-id-badge';
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Columns3,
  CheckCircle2,
  Calendar,
  Clock,
  AlertTriangle,
  Zap,
  ChevronRight,
  SlidersHorizontal,
  ExternalLink,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, isPast, isToday, differenceInDays } from 'date-fns';
import type { UserTask } from '@/hooks/useUserTasks';
import { useUnifiedTasks, FILTER_OPTIONS, type CategoryFilter, type UnifiedTask } from './useUnifiedTasks';

type SortField = 'priority' | 'title' | 'project' | 'category' | 'status' | 'dueDate' | 'progress' | 'created';
type SortDirection = 'asc' | 'desc';

interface ColumnDef {
  id: string;
  label: string;
  visible: boolean;
  sortable: boolean;
  sortField?: SortField;
  minWidth?: string;
}

const DEFAULT_COLUMNS: ColumnDef[] = [
  { id: 'priority', label: 'Priority', visible: true, sortable: true, sortField: 'priority', minWidth: 'w-[90px]' },
  { id: 'title', label: 'Task', visible: true, sortable: true, sortField: 'title', minWidth: 'min-w-[240px]' },
  { id: 'project', label: 'Project', visible: true, sortable: true, sortField: 'project', minWidth: 'w-[120px]' },
  { id: 'category', label: 'Category', visible: true, sortable: true, sortField: 'category', minWidth: 'w-[130px]' },
  { id: 'status', label: 'Status', visible: true, sortable: true, sortField: 'status', minWidth: 'w-[140px]' },
  { id: 'dueDate', label: 'Due Date', visible: true, sortable: true, sortField: 'dueDate', minWidth: 'w-[120px]' },
  { id: 'progress', label: 'Progress', visible: true, sortable: true, sortField: 'progress', minWidth: 'w-[140px]' },
  { id: 'created', label: 'Created', visible: false, sortable: true, sortField: 'created', minWidth: 'w-[110px]' },
  { id: 'actions', label: '', visible: true, sortable: false, minWidth: 'w-[60px]' },
];

interface TaskTableViewProps {
  searchQuery: string;
  userId: string;
  groupBy?: 'none' | 'project' | 'category';
}

export const TaskTableView: React.FC<TaskTableViewProps> = ({ searchQuery, userId, groupBy = 'none' }) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { allTasks, isLoading, categoryCounts, updateTaskStatus } = useUnifiedTasks(userId);

  const [activeFilter, setActiveFilter] = useState<CategoryFilter>('all');
  const [columns, setColumns] = useState<ColumnDef[]>(DEFAULT_COLUMNS);
  const [sortField, setSortField] = useState<SortField>('priority');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // Detail sheets
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

  const toggleColumnVisibility = (columnId: string) => {
    setColumns(prev => prev.map(col =>
      col.id === columnId ? { ...col, visible: !col.visible } : col
    ));
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  // Filter & sort
  const processedTasks = useMemo(() => {
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
    // Sort
    const sorted = [...result].sort((a, b) => {
      const dir = sortDirection === 'asc' ? 1 : -1;
      switch (sortField) {
        case 'priority': return (b.smartPriority.score - a.smartPriority.score) * dir;
        case 'title': return a.title.localeCompare(b.title) * dir;
        case 'project': return (a.project || '').localeCompare(b.project || '') * dir;
        case 'category': return a.categoryLabel.localeCompare(b.categoryLabel) * dir;
        case 'status': return a.status.localeCompare(b.status) * dir;
        case 'dueDate': {
          const aD = a.dueDate || a.endDate || '';
          const bD = b.dueDate || b.endDate || '';
          return aD.localeCompare(bD) * dir;
        }
        case 'progress': return ((a.progressPercentage || 0) - (b.progressPercentage || 0)) * dir;
        case 'created': return a.createdAt.localeCompare(b.createdAt) * dir;
        default: return 0;
      }
    });
    return sorted;
  }, [allTasks, activeFilter, searchQuery, sortField, sortDirection]);

  const handleTaskClick = (task: UnifiedTask) => {
    if (task.isWaiting) return;
    if (task.userTask) {
      const meta = task.userTask.metadata as Record<string, any> | undefined;
      const isOraActivity = task.userTask.type === 'ora_activity' || meta?.action === 'complete_ora_activity' || meta?.action === 'create_p2a_plan' || meta?.ora_plan_activity_id;
      if (isOraActivity && !task.navigateTo) {
        setOraActivityTask(task.userTask);
        setOraActivityOpen(true);
        return;
      }
      setSelectedTask(task.userTask);
      setDetailOpen(true);
    } else if (task.navigateTo) {
      navigate(task.navigateTo);
    }
  };

  const visibleColumns = columns.filter(c => c.visible);
  const toggleableColumns = columns.filter(c => c.id !== 'actions');

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="h-3 w-3 ml-1 opacity-40" />;
    return sortDirection === 'asc'
      ? <ArrowUp className="h-3 w-3 ml-1 text-primary" />
      : <ArrowDown className="h-3 w-3 ml-1 text-primary" />;
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-10 w-full rounded-lg" />
        {[1, 2, 3, 4, 5].map(i => (
          <Skeleton key={i} className="h-14 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <>
      {/* Filter bar + Column toggle */}
      <div className="flex items-center justify-between gap-3 mb-4">
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
                  "text-[10px] rounded-full px-1.5 py-0.5 min-w-[18px] text-center font-semibold",
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

        <div className="flex items-center gap-1.5">
          {/* Column visibility */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5 text-xs h-8">
                <Columns3 className="h-3.5 w-3.5" />
                Columns
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel className="text-xs">Toggle columns</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {toggleableColumns.map(col => (
                <DropdownMenuCheckboxItem
                  key={col.id}
                  checked={col.visible}
                  onCheckedChange={() => toggleColumnVisibility(col.id)}
                  className="text-xs"
                >
                  {col.label}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Results count */}
      <p className="text-xs text-muted-foreground mb-3">
        {processedTasks.length} task{processedTasks.length !== 1 ? 's' : ''}
      </p>

      {/* Table */}
      {processedTasks.length === 0 ? (
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
        <div className="rounded-xl border border-border/60 bg-card/50 backdrop-blur-sm overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30 hover:bg-muted/30 border-b border-border/50">
                  {visibleColumns.map(col => (
                    <TableHead
                      key={col.id}
                      className={cn(
                        "h-10 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70",
                        col.minWidth,
                        col.sortable && "cursor-pointer select-none hover:text-foreground transition-colors"
                      )}
                      onClick={() => col.sortable && col.sortField && handleSort(col.sortField)}
                    >
                      <div className="flex items-center">
                        {col.label}
                        {col.sortable && col.sortField && <SortIcon field={col.sortField} />}
                      </div>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {processedTasks.map((task, idx) => (
                  <TaskTableRow
                    key={task.id}
                    task={task}
                    visibleColumns={visibleColumns}
                    onClick={() => handleTaskClick(task)}
                    isLast={idx === processedTasks.length - 1}
                  />
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Detail Sheets */}
      <TaskDetailSheet
        task={selectedTask}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onApprove={(id) => updateTaskStatus(id, 'completed')}
        onReject={(id) => updateTaskStatus(id, 'cancelled')}
      />
      <ORAActivityTaskSheet
        task={oraActivityTask}
        open={oraActivityOpen}
        onOpenChange={(open) => { setOraActivityOpen(open); if (!open) setOraActivityTask(null); }}
        onOpenP2AWizard={handleOpenP2AWizard}
      />
      <P2APlanCreationWizard
        open={p2aWizardOpen}
        onOpenChange={setP2aWizardOpen}
        projectId={p2aTarget.projectId}
        projectCode={p2aTarget.projectCode}
        onSuccess={() => {
          setP2aWizardOpen(false);
          queryClient.invalidateQueries({ queryKey: ['orp-plan'] });
          queryClient.invalidateQueries({ queryKey: ['user-tasks'] });
        }}
        onOpenWorkspace={() => { setP2aWizardOpen(false); setP2aWorkspaceOpen(true); }}
      />
      <P2AWorkspaceOverlay
        open={p2aWorkspaceOpen}
        onOpenChange={setP2aWorkspaceOpen}
        projectId={p2aTarget.projectId}
        projectNumber={p2aTarget.projectCode}
        onReturnToWizard={() => { setP2aWorkspaceOpen(false); setP2aWizardOpen(true); }}
      />
    </>
  );
};

// ─── Row Component ───

const TaskTableRow: React.FC<{
  task: UnifiedTask;
  visibleColumns: ColumnDef[];
  onClick: () => void;
  isLast: boolean;
}> = ({ task, visibleColumns, onClick, isLast }) => {
  const Icon = task.icon;
  const sp = task.smartPriority;
  const dueDate = task.dueDate || task.endDate;
  const isOverdue = dueDate && isPast(new Date(dueDate)) && !isToday(new Date(dueDate));
  const isDueToday = dueDate && isToday(new Date(dueDate));

  const priorityConfig = {
    critical: { label: 'Critical', className: 'bg-destructive/10 text-destructive border-destructive/20' },
    high: { label: 'High', className: 'bg-destructive/10 text-destructive border-destructive/20' },
    medium: { label: 'Medium', className: 'bg-amber-500/10 text-amber-600 border-amber-500/20' },
    low: { label: 'Low', className: 'bg-muted text-muted-foreground border-border/50' },
  };
  const pConfig = priorityConfig[sp.level] || priorityConfig.low;

  const renderCell = (col: ColumnDef) => {
    switch (col.id) {
      case 'priority':
        return (
          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="outline" className={cn("text-[10px] font-semibold px-2 py-0.5", pConfig.className)}>
                  {pConfig.label}
                </Badge>
              </TooltipTrigger>
              <TooltipContent side="right" className="max-w-[200px]">
                <div className="text-xs space-y-1">
                  <p className="font-semibold capitalize">{sp.level} Priority</p>
                  {sp.reasons.length > 0 && <p className="text-muted-foreground">{sp.reasons.join(' · ')}</p>}
                  <p className="text-muted-foreground/70">Score: {sp.score}/100</p>
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );

      case 'title':
        return (
          <div className="flex items-center gap-2.5 min-w-0">
            <div className={cn("w-7 h-7 rounded-md flex items-center justify-center shrink-0", task.categoryColor)}>
              <Icon className="h-3.5 w-3.5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="font-medium text-sm text-foreground truncate">
                  {task.project ? task.title.replace(new RegExp(`\\s*[–\\-]\\s*${task.project.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`), '') : task.title}
                </span>
                {task.isNew && (
                  <Badge variant="secondary" className="text-[9px] px-1 py-0 bg-primary/10 text-primary shrink-0">NEW</Badge>
                )}
                {sp.isStartingSoon && (
                  <Badge variant="outline" className="text-[9px] px-1 py-0 border-amber-500/30 bg-amber-500/10 text-amber-600 shrink-0 gap-0.5">
                    <Zap className="h-2.5 w-2.5" />Soon
                  </Badge>
                )}
              </div>
              {task.subtitle && (
                <p className="text-[11px] text-muted-foreground/60 truncate mt-0.5">{task.subtitle}</p>
              )}
            </div>
          </div>
        );

      case 'project':
        return task.project ? (
          <ProjectIdBadge size="sm" projectId={task.project}>{task.project}</ProjectIdBadge>
        ) : (
          <span className="text-xs text-muted-foreground/50">—</span>
        );

      case 'category':
        return (
          <Badge variant="outline" className={cn("text-[10px] font-medium gap-1", task.categoryColor)}>
            <Icon className="h-2.5 w-2.5" />
            {task.categoryLabel}
          </Badge>
        );

      case 'status':
        if (task.isWaiting) {
          return (
            <Badge variant="outline" className="text-[10px] text-muted-foreground border-muted-foreground/20 gap-1">
              <Clock className="h-2.5 w-2.5" />Waiting
            </Badge>
          );
        }
        return <span className="text-xs text-foreground capitalize">{task.status.replace(/_/g, ' ')}</span>;

      case 'dueDate':
        if (!dueDate && !task.startDate) return <span className="text-xs text-muted-foreground/40">—</span>;
        return (
          <div className="flex flex-col gap-0.5">
            {task.startDate && dueDate ? (
              <div className="flex items-center gap-1 text-[11px]">
                <Calendar className="h-3 w-3 text-muted-foreground/50" />
                <span className="text-muted-foreground">{format(new Date(task.startDate), 'MMM d')}</span>
                <span className="text-muted-foreground/40">→</span>
                <span className={cn(isOverdue && 'text-destructive font-medium', isDueToday && 'text-amber-600 font-medium')}>
                  {format(new Date(dueDate), 'MMM d')}
                </span>
              </div>
            ) : dueDate ? (
              <span className={cn(
                "text-xs",
                isOverdue && "text-destructive font-medium",
                isDueToday && "text-amber-600 font-medium",
                !isOverdue && !isDueToday && "text-muted-foreground"
              )}>
                {isOverdue && <AlertTriangle className="h-3 w-3 inline mr-1" />}
                {format(new Date(dueDate), 'MMM d')}
              </span>
            ) : null}
            {isOverdue && dueDate && (
              <span className="text-[10px] text-destructive">{differenceInDays(new Date(), new Date(dueDate))}d overdue</span>
            )}
            {isDueToday && <span className="text-[10px] text-amber-600">Due today</span>}
          </div>
        );

      case 'progress':
        if (task.totalItems != null && task.totalItems > 0) {
          return (
            <div className="flex items-center gap-2">
              <Progress value={task.progressPercentage || 0} className="h-1.5 w-16 bg-muted/50" />
              <span className="text-[11px] text-muted-foreground whitespace-nowrap">{task.completedItems}/{task.totalItems}</span>
            </div>
          );
        }
        if (task.progressPercentage != null && task.progressPercentage > 0) {
          return (
            <div className="flex items-center gap-2">
              <Progress value={task.progressPercentage} className="h-1.5 w-16 bg-muted/50" />
              <span className="text-[11px] text-muted-foreground">{task.progressPercentage}%</span>
            </div>
          );
        }
        return <span className="text-xs text-muted-foreground/40">—</span>;

      case 'created':
        return <span className="text-xs text-muted-foreground">{format(new Date(task.createdAt), 'MMM d')}</span>;

      case 'actions':
        return (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => { e.stopPropagation(); }}
          >
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </Button>
        );

      default:
        return null;
    }
  };

  return (
    <TableRow
      onClick={onClick}
      className={cn(
        "group cursor-pointer transition-colors border-border/30",
        "hover:bg-accent/50",
        task.isWaiting && "opacity-50 cursor-default",
        task.isNew && "bg-primary/[0.02]",
        sp.isOverdue && "bg-destructive/[0.02]",
        isLast && "border-b-0"
      )}
    >
      {visibleColumns.map(col => (
        <TableCell key={col.id} className={cn("py-3 px-4", col.minWidth)}>
          {renderCell(col)}
        </TableCell>
      ))}
    </TableRow>
  );
};

import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { 
  ClipboardCheck, 
  RefreshCw, 
  Activity, 
  ListTodo,
  ExternalLink,
  ClipboardList
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePSSRsAwaitingReview } from '@/hooks/usePSSRItemApprovals';
import { useUserP2AApprovals } from '@/hooks/useUserP2AApprovals';
import { useUserORPActivities } from '@/hooks/useUserORPActivities';
import { useUserOWLItems } from '@/hooks/useUserOWLItems';
import { useUserLastLogin } from '@/hooks/useUserLastLogin';
import { useUserVCRBundleTasks } from '@/hooks/useUserVCRBundleTasks';
import { format } from 'date-fns';

interface AllTasksTableProps {
  searchQuery: string;
  userId: string;
}

interface UnifiedTask {
  id: string;
  category: 'pssr' | 'handover' | 'ora' | 'owl' | 'vcr_bundle' | 'vcr_approval' | 'pssr_bundle';
  title: string;
  project: string;
  status: string;
  dueDate?: string;
  createdAt: string;
  navigateTo: string;
  isNew: boolean;
  // Bundle-specific fields
  progressPercentage?: number;
  completedItems?: number;
  totalItems?: number;
  isWaiting?: boolean;
  itemsReadyForReview?: number;
}

const CATEGORY_CONFIG = {
  pssr: { 
    label: 'PSSR Review', 
    icon: ClipboardCheck, 
    color: 'bg-blue-500/10 text-blue-600 border-blue-500/20' 
  },
  handover: { 
    label: 'P2A Plan', 
    icon: RefreshCw, 
    color: 'bg-teal-500/10 text-teal-600 border-teal-500/20' 
  },
  ora: { 
    label: 'ORA Activity', 
    icon: Activity, 
    color: 'bg-purple-500/10 text-purple-600 border-purple-500/20' 
  },
  owl: { 
    label: 'OWL', 
    icon: ListTodo, 
    color: 'bg-amber-500/10 text-amber-600 border-amber-500/20' 
  },
  vcr_bundle: { 
    label: 'VCR Checklist', 
    icon: ClipboardList, 
    color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' 
  },
  vcr_approval: { 
    label: 'VCR Review', 
    icon: ClipboardCheck, 
    color: 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20' 
  },
  pssr_bundle: { 
    label: 'PSSR Checklist', 
    icon: ClipboardList, 
    color: 'bg-orange-500/10 text-orange-600 border-orange-500/20' 
  },
};

export const AllTasksTable: React.FC<AllTasksTableProps> = ({ searchQuery, userId }) => {
  const navigate = useNavigate();
  const { isNewSinceLastLogin } = useUserLastLogin();
  
  // Fetch data from all sources
  const { data: pssrs, isLoading: pssrLoading } = usePSSRsAwaitingReview(userId);
  const { approvals, isLoading: handoverLoading } = useUserP2AApprovals();
  const { activities, isLoading: oraLoading } = useUserORPActivities();
  const { items: owlItems, isLoading: owlLoading } = useUserOWLItems();
  const { bundleTasks, isLoading: bundleLoading } = useUserVCRBundleTasks();

  const isLoading = pssrLoading || handoverLoading || oraLoading || owlLoading || bundleLoading;

  // Unify all tasks into a single array
  const allTasks = useMemo<UnifiedTask[]>(() => {
    const tasks: UnifiedTask[] = [];

    // PSSR Reviews
    (pssrs || []).forEach(item => {
      tasks.push({
        id: `pssr-${item.pssr?.id}`,
        category: 'pssr',
        title: item.pssr?.pssr_id || 'Unknown PSSR',
        project: item.pssr?.project_name || 'Unknown Project',
        status: 'Pending Review',
        createdAt: item.pendingSince,
        navigateTo: `/pssr/${item.pssr?.id}/review`,
        isNew: isNewSinceLastLogin(item.pendingSince),
      });
    });

    // Handover Reviews
    (approvals || []).forEach(item => {
      tasks.push({
        id: `handover-${item.id}`,
        category: 'handover',
        title: item.handover_name || 'Unknown Handover',
        project: item.project_number || 'Unknown Project',
        status: item.stage,
        createdAt: item.created_at,
        navigateTo: `/p2a-handover/${item.handover_id}`,
        isNew: isNewSinceLastLogin(item.created_at),
      });
    });

    // ORA Activities
    const uniquePlans = (activities || []).reduce((acc, activity) => {
      if (!acc.find(a => a.plan_id === activity.plan_id)) {
        acc.push(activity);
      }
      return acc;
    }, [] as typeof activities);

    uniquePlans.forEach(item => {
      tasks.push({
        id: `ora-${item.id}`,
        category: 'ora',
        title: item.project_name || item.plan_name || 'Unknown Plan',
        project: item.project_name || 'Unknown Project',
        status: item.phase?.replace('ORP_', '').replace('_', ' ') || 'Active',
        createdAt: item.created_at,
        navigateTo: `/operation-readiness/${item.plan_id}`,
        isNew: isNewSinceLastLogin(item.created_at),
      });
    });

    // OWL Items
    const openOWL = (owlItems || []).filter(
      item => item.status === 'OPEN' || item.status === 'IN_PROGRESS'
    );
    openOWL.forEach(item => {
      const projectTitle = typeof item.project === 'object' && item.project !== null
        ? (item.project as any).project_title || (item.project as any).name || 'Unknown Project'
        : 'Unknown Project';
      
      tasks.push({
        id: `owl-${item.id}`,
        category: 'owl',
        title: item.title,
        project: projectTitle,
        status: item.status === 'IN_PROGRESS' ? 'In Progress' : 'Open',
        dueDate: item.due_date || undefined,
        createdAt: item.created_at,
        navigateTo: '/outstanding-work-list',
        isNew: isNewSinceLastLogin(item.created_at),
      });
    });

    // VCR & PSSR Bundle Tasks (delivering + approving)
    (bundleTasks || []).forEach(task => {
      const isApproval = task.type === 'vcr_approval_bundle';
      const isPSSRBundle = task.type === 'pssr_checklist_bundle';
      
      let category: UnifiedTask['category'];
      if (isPSSRBundle) {
        category = 'pssr_bundle';
      } else if (isApproval) {
        category = 'vcr_approval';
      } else {
        category = 'vcr_bundle';
      }

      const projectLabel = isPSSRBundle 
        ? (task.metadata?.project_name || 'Unknown Project')
        : (task.metadata?.project_code || 'Unknown Project');

      const navigatePath = isPSSRBundle
        ? (task.metadata?.pssr_id ? `/pssr/${task.metadata.pssr_id}/review` : '/my-tasks')
        : (task.metadata?.vcr_id ? `/p2a-handover?vcr=${task.metadata.vcr_id}` : '/p2a-handover');

      tasks.push({
        id: `${task.type}-${task.id}`,
        category,
        title: task.title,
        project: projectLabel,
        status: `${task.sub_items.filter(i => i.completed).length}/${task.sub_items.length} items`,
        createdAt: task.created_at,
        navigateTo: navigatePath,
        isNew: isNewSinceLastLogin(task.created_at),
        progressPercentage: task.progress_percentage,
        completedItems: task.sub_items.filter(i => i.completed).length,
        totalItems: task.sub_items.length,
        isWaiting: task.status === 'waiting',
        itemsReadyForReview: (task.metadata as any)?.items_ready_for_review ?? 0,
      });
    });

    // Sort by creation date (newest first)
    return tasks.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [pssrs, approvals, activities, owlItems, bundleTasks, isNewSinceLastLogin]);

  // Filter tasks based on search query
  const filteredTasks = useMemo(() => {
    if (!searchQuery.trim()) return allTasks;
    
    const query = searchQuery.toLowerCase();
    return allTasks.filter(task => 
      task.title.toLowerCase().includes(query) ||
      task.project.toLowerCase().includes(query) ||
      CATEGORY_CONFIG[task.category].label.toLowerCase().includes(query)
    );
  }, [allTasks, searchQuery]);

  if (isLoading) {
    return (
      <Card className="p-8">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
        </div>
      </Card>
    );
  }

  if (filteredTasks.length === 0) {
    return (
      <Card className="p-8">
        <div className="text-center text-muted-foreground">
          {searchQuery ? 'No tasks match your search' : 'No pending tasks'}
        </div>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="w-[140px]">Category</TableHead>
            <TableHead>Task</TableHead>
            <TableHead>Project</TableHead>
            <TableHead className="w-[120px]">Status</TableHead>
            <TableHead className="w-[120px]">Due Date</TableHead>
            <TableHead className="w-[100px] text-right">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredTasks.map(task => {
            const config = CATEGORY_CONFIG[task.category];
            const Icon = config.icon;
            
            return (
              <TableRow 
                key={task.id}
                className={cn(
                  "cursor-pointer hover:bg-muted/50 transition-colors",
                  task.isNew && "bg-primary/5",
                  task.isWaiting && "opacity-50"
                )}
                onClick={() => !task.isWaiting && navigate(task.navigateTo)}
              >
                <TableCell>
                  <Badge variant="outline" className={cn("gap-1.5", config.color)}>
                    <Icon className="h-3 w-3" />
                    {config.label}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{task.title}</span>
                    {task.isNew && (
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-primary/10 text-primary">
                        NEW
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {task.project}
                </TableCell>
                <TableCell>
                  {task.isWaiting ? (
                    <div className="flex flex-col gap-0.5">
                      <span className="text-xs text-muted-foreground italic">Waiting for deliverables</span>
                      {task.itemsReadyForReview != null && task.totalItems != null && (
                        <span className="text-[10px] text-muted-foreground">
                          {task.itemsReadyForReview}/{task.totalItems} items ready
                        </span>
                      )}
                    </div>
                  ) : (task.category === 'vcr_bundle' || task.category === 'vcr_approval') && task.totalItems ? (
                    <div className="flex items-center gap-2">
                      <Progress
                        value={task.progressPercentage || 0}
                        className="h-2 w-20"
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
                  ) : (
                    <span className="text-sm">{task.status}</span>
                  )}
                </TableCell>
                <TableCell>
                  {task.dueDate ? (
                    <span className="text-sm">
                      {format(new Date(task.dueDate), 'MMM d, yyyy')}
                    </span>
                  ) : (
                    <span className="text-muted-foreground text-sm">-</span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 gap-1"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(task.navigateTo);
                    }}
                  >
                    View
                    <ExternalLink className="h-3 w-3" />
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </Card>
  );
};

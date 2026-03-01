import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { ClipboardCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ProjectIdBadge } from '@/components/ui/project-id-badge';
import { MyTasksPanelCard } from './MyTasksPanelCard';
import { TaskDetailSheet } from './TaskDetailSheet';
import { usePSSRsAwaitingReview } from '@/hooks/usePSSRItemApprovals';
import { useUserTasks, type UserTask } from '@/hooks/useUserTasks';
import { useUserLastLogin } from '@/hooks/useUserLastLogin';
import { getUrgencyBackground, getUrgencyGlow } from '@/utils/assetColors';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

interface PSSRReviewsPanelProps {
  userId: string;
  searchQuery?: string;
  isExpanded: boolean;
  onToggleExpand: () => void;
  isFullHeight?: boolean;
  isRelocated?: boolean;
  isDimmed?: boolean;
  onTaskCountUpdate?: (count: number) => void;
}

// Extract project code from project name or PSSR ID (e.g., "DP-300" from "PSSR-DP300-001")
function extractProjectCode(pssrId?: string, projectName?: string): string | null {
  if (pssrId) {
    const match = pssrId.match(/PSSR-([A-Z]+)(\d+)/i);
    if (match) {
      return `${match[1].toUpperCase()}-${match[2]}`;
    }
  }
  return null;
}

export const PSSRReviewsPanel: React.FC<PSSRReviewsPanelProps> = ({ 
  userId, 
  searchQuery = '',
  isExpanded,
  onToggleExpand,
  isFullHeight = false,
  isRelocated = false,
  isDimmed = false,
  onTaskCountUpdate,
}) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: realPssrs, isLoading: pssrLoading } = usePSSRsAwaitingReview(userId);
  const { tasks: userTasks, loading: tasksLoading, updateTaskStatus } = useUserTasks();
  const { isNewSinceLastLogin } = useUserLastLogin();
  const [selectedTask, setSelectedTask] = useState<UserTask | null>(null);
  const selfHealRan = useRef(false);

  const isLoading = pssrLoading || tasksLoading;

  // Self-healing: ensure review tasks exist for PSSRs in PENDING_LEAD_REVIEW where user is lead
  useEffect(() => {
    if (tasksLoading || !userId || selfHealRan.current) return;
    selfHealRan.current = true;
    const ensureReviewTasks = async () => {
      try {
        const { data: pendingPssrs } = await supabase
          .from('pssrs')
          .select('id, pssr_id, title')
          .eq('pssr_lead_id', userId)
          .eq('status', 'PENDING_LEAD_REVIEW');

        if (!pendingPssrs?.length) return;

        let created = false;
        for (const pssr of pendingPssrs) {
          const { data: existing } = await supabase
            .from('user_tasks')
            .select('id')
            .eq('user_id', userId)
            .eq('type', 'review')
            .eq('status', 'pending')
            .filter('metadata->>pssr_id', 'eq', pssr.id)
            .maybeSingle();

          if (!existing) {
            const { error } = await supabase.from('user_tasks').insert({
              user_id: userId,
              title: `Review Draft PSSR: ${pssr.title || pssr.pssr_id}`,
              description: 'A PSSR has been submitted for your review. Please review the PSSR items, approvers, and scope, then approve, edit, or reject the draft.',
              priority: 'High',
              type: 'review',
              status: 'pending',
              metadata: {
                source: 'pssr_workflow',
                pssr_id: pssr.id,
                pssr_code: pssr.pssr_id,
                action: 'review_draft_pssr',
              },
            });
            if (!error) created = true;
            else console.error('Self-heal insert error:', error);
          }
        }
        if (created) {
          queryClient.invalidateQueries({ queryKey: ['user-tasks'] });
        }
      } catch (err) {
        console.error('Self-heal review tasks:', err);
      }
    };
    ensureReviewTasks();
  }, [userId, tasksLoading, queryClient]);

  // PSSR items
  const pssrs = realPssrs || [];
  const pendingPssrs = pssrs.filter(p => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      p.pssr?.pssr_id?.toLowerCase().includes(query) ||
      p.pssr?.project_name?.toLowerCase().includes(query)
    );
  });

  // User tasks - only show PSSR and P2A handover related tasks in this panel
  const relevantUserTasks = userTasks.filter(t => {
    const meta = t.metadata as Record<string, any> | null;
    const source = meta?.source;
    const action = meta?.action;
    // Only include tasks from pssr_workflow or p2a_handover sources
    return source === 'pssr_workflow' || source === 'p2a_handover' || 
           action === 'review_draft_pssr';
  });

  const filteredUserTasks = relevantUserTasks.filter(t => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      t.title.toLowerCase().includes(query) ||
      t.description?.toLowerCase().includes(query)
    );
  });

  const totalCount = pendingPssrs.length + filteredUserTasks.length;
  const rawTotalCount = pssrs.length + relevantUserTasks.length;
  const newPssrCount = pendingPssrs.filter(p => isNewSinceLastLogin(p.pendingSince)).length;
  const newTaskCount = filteredUserTasks.filter(t => isNewSinceLastLogin(t.created_at)).length;
  const newCount = newPssrCount + newTaskCount;

  // Report task count to parent
  useEffect(() => {
    if (!isLoading) {
      onTaskCountUpdate?.(rawTotalCount);
    }
  }, [rawTotalCount, isLoading, onTaskCountUpdate]);

  const getDaysPendingColor = (days: number) => {
    if (days >= 7) return 'bg-destructive/10 text-destructive border-destructive/20';
    if (days >= 3) return 'bg-amber-500/10 text-amber-600 border-amber-500/20';
    return 'bg-muted text-muted-foreground';
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
      title="P2A Plan"
      icon={<ClipboardCheck className="h-5 w-5 text-white" />}
      iconColorClass="from-blue-500 to-blue-600"
      primaryStat={totalCount}
      primaryLabel="pending"
      newCount={newCount}
      isExpanded={isExpanded}
      onToggleExpand={onToggleExpand}
      isFullHeight={isFullHeight}
      isRelocated={isRelocated}
      isDimmed={isDimmed}
      isLoading={isLoading}
      isEmpty={totalCount === 0}
      emptyMessage="No P2A handover tasks pending"
      onViewAll={() => navigate('/pssr-reviews')}
    >
      {/* User tasks (reviews & approvals) */}
      {filteredUserTasks.map((task, index) => {
        const isNew = isNewSinceLastLogin(task.created_at);
        const daysPending = Math.floor(
          (Date.now() - new Date(task.created_at).getTime()) / (1000 * 60 * 60 * 24)
        );

        return (
          <div
            key={task.id}
            className={cn(
              "p-3 rounded-lg border transition-all cursor-pointer",
              "hover:shadow-sm hover:border-primary/20",
              "bg-card/50",
              isNew && "border-l-2 border-l-primary",
              "animate-fade-in"
            )}
            style={{ animationDelay: `${index * 50}ms` }}
            onClick={() => setSelectedTask(task)}
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

              <div className="flex items-center gap-1.5 shrink-0">
                {getPriorityBadge(task.priority)}
                <Badge variant="outline" className={cn("text-[10px]", getDaysPendingColor(daysPending))}>
                  {daysPending === 0 ? 'Today' : daysPending === 1 ? '1 day' : `${daysPending} days`}
                </Badge>
              </div>
            </div>
          </div>
        );
      })}

      {/* PSSR / VCR review items */}
      {pendingPssrs.map((item, index) => {
        const isNew = isNewSinceLastLogin(item.pendingSince);
        const daysPending = Math.floor(
          (Date.now() - new Date(item.pendingSince).getTime()) / (1000 * 60 * 60 * 24)
        );
        const pssr = item.pssr;
        const urgencyBg = getUrgencyBackground(daysPending);
        const urgencyGlow = getUrgencyGlow(daysPending);
        const projectCode = extractProjectCode(pssr?.pssr_id);
        const totalItems = item.itemCount || 0;
        const reviewedItems = (item as any).reviewedCount ?? Math.floor(totalItems * 0.3);
        const remainingItems = totalItems - reviewedItems;

        return (
          <div
            key={pssr?.id || item.pendingSince}
            className={cn(
              "p-3 rounded-lg border transition-all cursor-pointer group/item",
              "hover:shadow-sm hover:border-primary/20",
              urgencyBg,
              urgencyGlow,
              isNew && "border-l-2 border-l-primary",
              "animate-fade-in"
            )}
            style={{ animationDelay: `${(filteredUserTasks.length + index) * 50}ms` }}
            onClick={() => navigate(`/pssr/${pssr?.id}/review`)}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center gap-2">
                  {projectCode ? (
                    <ProjectIdBadge size="sm">{projectCode}</ProjectIdBadge>
                  ) : (
                    <span className="text-xs text-muted-foreground font-mono">
                      {pssr?.pssr_id || 'Unknown'}
                    </span>
                  )}
                  <span className="text-sm font-medium truncate">
                    {pssr?.project_name || 'Unknown Project'}
                  </span>
                  {isNew && (
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-primary/10 text-primary shrink-0">
                      NEW
                    </Badge>
                  )}
                </div>
                {pssr?.asset && (
                  <p className="text-xs text-muted-foreground truncate">
                    {pssr.asset}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  {remainingItems} of {totalItems} items need your sign-off
                </p>
              </div>
              
              <div className="flex flex-col items-end gap-1.5 shrink-0">
                <Badge 
                  variant="outline" 
                  className={cn("text-[10px]", getDaysPendingColor(daysPending))}
                >
                  {daysPending === 0 ? 'Today' : daysPending === 1 ? '1 day' : `${daysPending} days`}
                </Badge>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 text-xs px-2 opacity-0 group-hover/item:opacity-100 transition-opacity"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/pssr/${pssr?.id}/review`);
                  }}
                >
                  Review
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
          // All PSSR workflow logic (status transition, key activities, schedule tasks)
          // is now handled centrally by runPostCompletionSync in useUserTasks
          updateTaskStatus(taskId, 'completed');
        }}
        onReject={async (taskId, comment) => {
          // PSSR revert-to-DRAFT is now handled centrally by runPostCompletionSync
          updateTaskStatus(taskId, 'cancelled');
        }}
      />
    </>
  );
};

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { CalendarCheck, CheckCircle, X, Loader2, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ORPGanttChart } from '@/components/orp/ORPGanttChart';
import { useORPPlanDetails } from '@/hooks/useORPPlans';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';

interface ORAActivityPlanReviewOverlayProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  planId: string;
  taskId?: string;
  onApproved?: () => void;
}

export const ORAActivityPlanReviewOverlay: React.FC<ORAActivityPlanReviewOverlayProps> = ({
  open,
  onOpenChange,
  planId,
  taskId,
  onApproved,
}) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [comment, setComment] = useState('');
  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);

  const { data: planDetails, isLoading } = useORPPlanDetails(open ? planId : '');

  const deliverables = planDetails?.deliverables || [];
  const totalCount = deliverables.length;
  const completedCount = deliverables.filter((d: any) => d.status === 'COMPLETED').length;
  const overallProgress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const handleApprove = async () => {
    try {
      setIsApproving(true);

      // Update plan status to APPROVED
      const { error: planError } = await supabase
        .from('orp_plans')
        .update({ status: 'APPROVED' as any })
        .eq('id', planId);

      if (planError) throw planError;

      // Complete the review task
      if (taskId) {
        await supabase
          .from('user_tasks')
          .update({ status: 'completed' })
          .eq('id', taskId);
      }

      // Get the plan's ORA engineer to create individual activity tasks
      const { data: plan } = await supabase
        .from('orp_plans')
        .select('ora_engineer_id, project_id')
        .eq('id', planId)
        .single();

      if (plan && deliverables.length > 0) {
        // Create individual tasks for each deliverable, ordered by start date
        const sortedDeliverables = [...deliverables].sort((a: any, b: any) => {
          if (!a.start_date && !b.start_date) return 0;
          if (!a.start_date) return 1;
          if (!b.start_date) return -1;
          return a.start_date.localeCompare(b.start_date);
        });

        const activityTasks = sortedDeliverables.map((d: any, index: number) => ({
          user_id: plan.ora_engineer_id,
          title: d.deliverable_name || d.activity_name || `ORA Activity ${index + 1}`,
          description: `Complete activity: ${d.deliverable_name || d.activity_name || 'ORA Activity'}`,
          type: 'ora_activity',
          status: 'pending',
          priority: index === 0 ? 'high' : 'medium',
          display_order: index + 1,
          due_date: d.end_date || null,
          metadata: {
            source: 'ora_workflow',
            project_id: plan.project_id,
            plan_id: planId,
            deliverable_id: d.id,
            action: 'complete_ora_activity',
          }
        }));

        if (activityTasks.length > 0) {
          const { error: tasksError } = await supabase
            .from('user_tasks')
            .insert(activityTasks);

          if (tasksError) {
            console.warn('Some activity tasks could not be created:', tasksError.message);
          }
        }
      }

      // Invalidate caches
      queryClient.invalidateQueries({ queryKey: ['user-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['orp-plans'] });
      queryClient.invalidateQueries({ queryKey: ['project-orp-plans'] });

      toast({ title: 'Approved', description: 'ORA Plan has been approved. Activity tasks have been created.' });
      onOpenChange(false);
      onApproved?.();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setIsApproving(false);
    }
  };

  const handleReject = async () => {
    try {
      setIsRejecting(true);

      // Revert plan status to DRAFT
      const { error: planError } = await supabase
        .from('orp_plans')
        .update({ status: 'DRAFT' as any })
        .eq('id', planId);

      if (planError) throw planError;

      // Complete the review task
      if (taskId) {
        await supabase
          .from('user_tasks')
          .update({ status: 'completed' })
          .eq('id', taskId);
      }

      queryClient.invalidateQueries({ queryKey: ['user-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['orp-plans'] });

      toast({ title: 'Rejected', description: 'ORA Plan has been sent back for revision.' });
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setIsRejecting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl w-[95vw] max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-5 pt-5 pb-3 border-b border-border/40">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-purple-500 to-violet-500 flex items-center justify-center">
                <CalendarCheck className="h-4 w-4 text-white" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold">
                  Review ORA Plan
                </DialogTitle>
                <DialogDescription className="text-xs mt-0.5">
                  Review the plan and approve or request changes
                </DialogDescription>
              </div>
            </div>
            <Badge variant="outline" className="text-xs bg-amber-500/10 text-amber-600 border-amber-500/20">
              Pending Approval
            </Badge>
          </div>

          {/* Progress Summary */}
          <div className="mt-4 p-3 bg-muted/30 rounded-lg">
            <div className="flex items-center justify-between text-sm mb-1.5">
              <span className="text-muted-foreground">Activities</span>
              <span className="font-semibold">{totalCount} total</span>
            </div>
            <Progress value={overallProgress} className="h-2" />
          </div>
        </DialogHeader>

        {/* Gantt Chart */}
        <div className="flex-1 overflow-auto px-5 py-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">Loading plan...</span>
            </div>
          ) : deliverables.length > 0 ? (
            <ORPGanttChart
              planId={planId}
              deliverables={deliverables}
              hideToolbar
            />
          ) : (
            <div className="text-center py-16 text-muted-foreground">
              <CalendarCheck className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No activities in this plan</p>
            </div>
          )}
        </div>

        {/* Action footer */}
        <div className="px-5 py-4 border-t border-border/40 space-y-3">
          <div>
            <label className="text-sm font-medium mb-1.5 block">Comments (optional)</label>
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Add comments about your decision..."
              className="min-h-[60px] resize-none"
            />
          </div>
          <div className="flex items-center justify-end gap-3">
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={isApproving || isRejecting}
              className="gap-2"
            >
              {isRejecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
              Request Changes
            </Button>
            <Button
              onClick={handleApprove}
              disabled={isApproving || isRejecting}
              className="gap-2 bg-green-600 hover:bg-green-700 text-white"
            >
              {isApproving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
              Approve Plan
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

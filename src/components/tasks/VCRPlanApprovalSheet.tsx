import React, { useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useVCRPlanRollup, vcrPlanPillLabel } from '@/hooks/useVCRPlanApprovalTasks';
import { cn } from '@/lib/utils';

interface VCRPlanApprovalPayload {
  approverRowId: string;
  handoverPointId: string;
  vcrCode: string;
  vcrName: string;
  projectCode?: string;
  projectId?: string;
  roleKey: string;
  roleLabel: string;
  phase: number | null;
}

interface Props {
  payload: VCRPlanApprovalPayload | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const toneClass: Record<string, string> = {
  muted: 'bg-muted text-muted-foreground',
  amber: 'bg-amber-500/10 text-amber-600',
  red: 'bg-red-500/10 text-red-600',
  green: 'bg-emerald-500/10 text-emerald-600',
  destructive: 'bg-red-600 text-white',
};

export const VCRPlanApprovalSheet: React.FC<Props> = ({ payload, open, onOpenChange }) => {
  const queryClient = useQueryClient();
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [mode, setMode] = useState<'idle' | 'reject'>('idle');

  const { data: rollup, isLoading } = useVCRPlanRollup(payload?.handoverPointId);
  const pill = rollup ? vcrPlanPillLabel(rollup) : null;
  const canDecide = !!rollup?.my_actionable_row_id && rollup.my_actionable_row_id === payload?.approverRowId;

  React.useEffect(() => {
    if (!open) {
      setComment('');
      setMode('idle');
      setSubmitting(false);
    }
  }, [open]);

  const submit = async (decision: 'APPROVED' | 'REJECTED') => {
    if (!payload) return;
    if (decision === 'REJECTED' && !comment.trim()) {
      toast.error('Please add a comment explaining the change request.');
      return;
    }
    setSubmitting(true);
    const { error } = await (supabase as any).rpc('decide_vcr_plan_approval', {
      p_approver_row_id: payload.approverRowId,
      p_decision: decision,
      p_comment: comment.trim() || null,
    });
    setSubmitting(false);
    if (error) {
      toast.error(error.message || 'Decision failed');
      return;
    }

    // Phase 1 → fully approved fan-out lives in VCRDetailOverlay; the RPC + view
    // handle phase progression. Just invalidate relevant queries so the My Tasks
    // card and the rollup pill update immediately.
    if (decision === 'APPROVED' && payload.projectId) {
      try {
        const { generateBuildingBlockActivities } = await import('@/hooks/useORAActivityPlanSync');
        await generateBuildingBlockActivities(payload.handoverPointId, payload.projectId, payload.projectCode || '');
      } catch (e) {
        console.error('[VCR Plan Approval] Fan-out failed:', e);
      }
    }

    toast.success(decision === 'APPROVED' ? 'Plan approved' : 'Changes requested');
    queryClient.invalidateQueries({ queryKey: ['vcr-plan-approval-tasks'] });
    queryClient.invalidateQueries({ queryKey: ['vcr-plan-rollup', payload.handoverPointId] });
    queryClient.invalidateQueries({ queryKey: ['project-vcrs'] });
    queryClient.invalidateQueries({ queryKey: ['user-tasks'] });
    queryClient.invalidateQueries({ queryKey: ['ora-plan-activities'] });
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg flex flex-col p-0">
        <SheetHeader className="px-6 pt-6 pb-4 border-b">
          <div className="flex items-center gap-2 flex-wrap mb-2">
            {payload?.projectCode && (
              <span className="text-[10px] font-medium font-mono text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded">
                {payload.projectCode}
              </span>
            )}
            {payload?.vcrCode && (
              <span className="text-[10px] font-medium font-mono text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded">
                {payload.vcrCode}
              </span>
            )}
          </div>
          <SheetTitle className="text-lg">Approve VCR Plan: {payload?.vcrName}</SheetTitle>
          <SheetDescription>
            Your role: <span className="font-medium text-foreground">{payload?.roleLabel}</span>
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="flex-1">
          <div className="px-6 py-5 space-y-5">
            {/* Plan state */}
            <div className="space-y-2">
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Plan status
              </div>
              {isLoading || !pill ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading…
                </div>
              ) : (
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge className={cn(toneClass[pill.tone], 'border-0')}>{pill.label}</Badge>
                  {rollup && rollup.total_count > 0 && (
                    <span className="text-xs text-muted-foreground">
                      Phase {rollup.phase ?? '—'} · {rollup.approved_count} of {rollup.total_count} approved
                    </span>
                  )}
                </div>
              )}
            </div>

            <Separator />

            {/* Decision area */}
            {canDecide ? (
              <div className="space-y-3">
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Your decision
                </div>
                <Textarea
                  placeholder={mode === 'reject'
                    ? 'Required: explain what needs to change…'
                    : 'Optional comment for the record'}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  className="min-h-[96px] text-sm"
                  maxLength={1000}
                />
                <div className="flex gap-2">
                  <Button
                    className="flex-1"
                    onClick={() => submit('APPROVED')}
                    disabled={submitting}
                  >
                    {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                    Approve
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      setMode('reject');
                      submit('REJECTED');
                    }}
                    disabled={submitting}
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Request Changes
                  </Button>
                </div>
              </div>
            ) : (
              <div className="rounded-md border bg-muted/30 px-3 py-3 text-sm text-muted-foreground">
                {rollup?.phase === 1
                  ? 'Awaiting ORA Lead review — Phase 2 approvers cannot decide yet.'
                  : 'No action available on this plan for you right now.'}
              </div>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
};

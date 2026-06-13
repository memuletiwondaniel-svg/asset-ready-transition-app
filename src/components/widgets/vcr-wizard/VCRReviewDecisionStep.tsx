import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Loader2, CheckCircle2, XCircle, AlertTriangle, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useVCRPlanRollup, vcrPlanPillLabel } from '@/hooks/useVCRPlanApprovalTasks';
import { useAuth } from '@/components/enhanced-auth/AuthProvider';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import type { VCRReviewPayload } from './wizardModeContext';

const toneClass: Record<string, string> = {
  muted: 'bg-muted text-muted-foreground',
  amber: 'bg-amber-500/10 text-amber-600',
  red: 'bg-red-500/10 text-red-600',
  green: 'bg-emerald-500/10 text-emerald-600',
  destructive: 'bg-red-600 text-white',
};

interface Props {
  payload: VCRReviewPayload;
  onDecided?: () => void;
}

export const VCRReviewDecisionStep: React.FC<Props> = ({ payload, onDecided }) => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState<null | 'APPROVED' | 'REJECTED'>(null);

  const { data: rollup, isLoading: rollupLoading } = useVCRPlanRollup(payload.handoverPointId);
  const pill = rollup ? vcrPlanPillLabel(rollup) : null;

  // Fetch my approver row (decision + comment + decided_at + status) — drives
  // the "already decided" read-only chip.
  const { data: myRow, isLoading: myRowLoading } = useQuery({
    queryKey: ['vcr-plan-approver-row', payload.approverRowId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('vcr_plan_approvers')
        .select('id, status, decision, decided_at, comments, role_label, user_id, approver_order')
        .eq('id', payload.approverRowId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    refetchOnMount: 'always',
  });

  // All approvers — for the roster panel.
  const { data: roster } = useQuery({
    queryKey: ['vcr-plan-approver-roster', payload.handoverPointId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('vcr_plan_approvers')
        .select('id, role_label, status, decision, decided_at, approver_order, user_id')
        .eq('handover_point_id', payload.handoverPointId)
        .order('approver_order', { ascending: true });
      if (error) throw error;
      return (data || []) as any[];
    },
  });

  const isMine = myRow?.user_id === user?.id;
  const alreadyDecided = !!myRow && myRow.status !== 'PENDING' && !!myRow.decision;
  const canDecide =
    !!rollup?.my_actionable_row_id &&
    rollup.my_actionable_row_id === payload.approverRowId &&
    !alreadyDecided;

  const submit = async (decision: 'APPROVED' | 'REJECTED') => {
    if (decision === 'REJECTED' && !comment.trim()) {
      toast.error('Please add a comment explaining the change request.');
      return;
    }
    setSubmitting(decision);
    const { error } = await (supabase as any).rpc('decide_vcr_plan_approval', {
      p_approver_row_id: payload.approverRowId,
      p_decision: decision,
      p_comment: comment.trim() || null,
    });
    setSubmitting(null);
    if (error) {
      toast.error(error.message || 'Decision failed');
      return;
    }

    // Phase-1 ORA Lead approval triggers building-block fan-out (mirrors prior sheet).
    if (decision === 'APPROVED' && payload.projectId) {
      try {
        const { generateBuildingBlockActivities } = await import('@/hooks/useORAActivityPlanSync');
        await generateBuildingBlockActivities(payload.handoverPointId, payload.projectId, payload.projectCode || '');
      } catch (e) {
        console.error('[VCR Plan Review] Fan-out failed:', e);
      }
    }

    toast.success(decision === 'APPROVED' ? 'Plan approved' : 'Changes requested');
    queryClient.invalidateQueries({ queryKey: ['vcr-plan-approval-tasks'] });
    queryClient.invalidateQueries({ queryKey: ['vcr-plan-rollup', payload.handoverPointId] });
    queryClient.invalidateQueries({ queryKey: ['vcr-plan-approver-row', payload.approverRowId] });
    queryClient.invalidateQueries({ queryKey: ['vcr-plan-approver-roster', payload.handoverPointId] });
    queryClient.invalidateQueries({ queryKey: ['project-vcrs'] });
    queryClient.invalidateQueries({ queryKey: ['user-tasks'] });
    queryClient.invalidateQueries({ queryKey: ['ora-plan-activities'] });
    onDecided?.();
  };

  const decisionChip = (d: string | null) => {
    if (d === 'APPROVED')
      return <Badge className="bg-emerald-500/10 text-emerald-600 border-0">Approved</Badge>;
    if (d === 'REJECTED')
      return <Badge className="bg-red-500/10 text-red-600 border-0">Changes requested</Badge>;
    return <Badge variant="outline" className="text-muted-foreground">Pending</Badge>;
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 p-1">
      {/* ─── Plan status header ──────────────────────────────────── */}
      <section className="space-y-2">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Plan status
        </div>
        {rollupLoading || !pill ? (
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
      </section>

      <Separator />

      {/* ─── Approver roster ─────────────────────────────────────── */}
      <section className="space-y-3">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Approvers
        </div>
        <div className="rounded-lg border divide-y">
          {(roster || []).map((r) => {
            const isMineRow = r.id === payload.approverRowId;
            return (
              <div
                key={r.id}
                className={cn(
                  'flex items-center justify-between gap-3 px-3 py-2.5 text-sm',
                  isMineRow && 'bg-primary/5',
                )}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-[10px] font-mono text-muted-foreground w-4 text-center">
                    {r.approver_order ?? '—'}
                  </span>
                  <span className="font-medium truncate">{r.role_label}</span>
                  {isMineRow && (
                    <Badge variant="outline" className="text-[9px] h-4 px-1.5">You</Badge>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {decisionChip(r.decision)}
                  {r.decided_at && (
                    <span className="text-[10px] text-muted-foreground">
                      {format(new Date(r.decided_at), 'd MMM, HH:mm')}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
          {(roster || []).length === 0 && (
            <div className="px-3 py-4 text-sm text-muted-foreground">No approvers configured.</div>
          )}
        </div>
      </section>

      <Separator />

      {/* ─── Decision surface ────────────────────────────────────── */}
      <section className="space-y-3">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Your decision
        </div>

        {myRowLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading your role…
          </div>
        ) : !isMine ? (
          <div className="rounded-md border bg-muted/30 px-3 py-3 text-sm text-muted-foreground flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
            <span>You are not an approver for this VCR plan. Read-only review only.</span>
          </div>
        ) : alreadyDecided ? (
          <div
            className={cn(
              'rounded-lg border p-4 space-y-2',
              myRow!.decision === 'APPROVED'
                ? 'border-emerald-500/30 bg-emerald-500/5'
                : 'border-red-500/30 bg-red-500/5',
            )}
            data-testid="vcr-review-already-decided"
          >
            <div className="flex items-center gap-2">
              {myRow!.decision === 'APPROVED' ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              ) : (
                <XCircle className="h-4 w-4 text-red-600" />
              )}
              <span className="font-medium text-sm">
                You {myRow!.decision === 'APPROVED' ? 'approved' : 'requested changes on'} this plan
              </span>
              {myRow!.decided_at && (
                <span className="text-xs text-muted-foreground ml-auto">
                  {format(new Date(myRow!.decided_at), "d MMM yyyy 'at' HH:mm")}
                </span>
              )}
            </div>
            {myRow!.comments && (
              <div className="text-sm text-muted-foreground border-l-2 border-border pl-3 italic">
                "{myRow!.comments}"
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              Your decision is recorded and cannot be changed here. Re-opening: read-only.
            </p>
          </div>
        ) : !canDecide ? (
          <div
            className="rounded-md border bg-muted/30 px-3 py-3 text-sm text-muted-foreground flex items-start gap-2"
            data-testid="vcr-review-awaiting-phase1"
          >
            <Clock className="h-4 w-4 mt-0.5 shrink-0" />
            <span>
              {rollup?.phase === 1
                ? 'Awaiting ORA Lead review — Phase-2 approvers cannot decide yet.'
                : 'No action available on this plan for you right now.'}
            </span>
          </div>
        ) : (
          <div className="space-y-3" data-testid="vcr-review-decision-active">
            <Textarea
              placeholder="Optional comment (required when requesting changes)…"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="min-h-[96px] text-sm"
              maxLength={1000}
              data-rm-safe
            />
            <div className="flex gap-2">
              <Button
                className="flex-1"
                onClick={() => submit('APPROVED')}
                disabled={!!submitting}
                data-rm-safe
              >
                {submitting === 'APPROVED' ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                )}
                Approve
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => submit('REJECTED')}
                disabled={!!submitting}
                data-rm-safe
              >
                {submitting === 'REJECTED' ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <XCircle className="h-4 w-4 mr-2" />
                )}
                Request Changes
              </Button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
};

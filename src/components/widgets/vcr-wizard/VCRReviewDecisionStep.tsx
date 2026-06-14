import React, { createContext, useContext, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Loader2, CheckCircle2, XCircle, AlertTriangle, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useVCRPlanRollup, vcrPlanPillLabel } from '@/hooks/useVCRPlanApprovalTasks';
import { useAuth } from '@/components/enhanced-auth/AuthProvider';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import type { VCRReviewPayload } from './wizardModeContext';
import { useVCRWizardSubMode } from './wizardModeContext';
import { VCRPlanDiffSummary } from './VCRPlanDiffSummary';
import { VCRApprovalHistoryPanel } from './VCRApprovalHistoryPanel';





type Decision = 'APPROVED' | 'REJECTED';

interface DecisionController {
  payload: VCRReviewPayload;
  rollup: any;
  myRow: any;
  roster: any[] | undefined;
  isMine: boolean;
  alreadyDecided: boolean;
  canDecide: boolean;
  comment: string;
  setComment: (s: string) => void;
  submitting: Decision | null;
  pendingDecision: Decision | null;
  requestDecision: (d: Decision) => void;
  cancelConfirm: () => void;
  confirmDecision: () => void;
  rollupLoading: boolean;
  myRowLoading: boolean;
  decisionError: string | null;
}

const DecisionCtx = createContext<DecisionController | null>(null);
const useDecision = () => {
  const v = useContext(DecisionCtx);
  if (!v) throw new Error('VCRReviewDecisionProvider missing');
  return v;
};

export const VCRReviewDecisionProvider: React.FC<{
  payload: VCRReviewPayload;
  onDecided?: () => void;
  /**
   * Optional pre-approve hook (Step 3c — approve-before-baseline).
   * Wired by the wizard in `ora_edit` sub-mode to persist any unsaved roster
   * edits via `submit_vcr_plan` BEFORE `decide_vcr_plan_approval` runs (which
   * captures the baseline snapshot). Idempotent. Return `false` to abort.
   */
  preApprovePersist?: () => Promise<boolean | void>;
  children: React.ReactNode;
}> = ({ payload, onDecided, preApprovePersist, children }) => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState<Decision | null>(null);
  const [pendingDecision, setPendingDecision] = useState<Decision | null>(null);
  const [decisionError, setDecisionError] = useState<string | null>(null);

  const { data: rollup, isLoading: rollupLoading } = useVCRPlanRollup(payload.handoverPointId);

  const { data: myRow, isLoading: myRowLoading } = useQuery({
    queryKey: ['vcr-plan-approver-row', payload.approverRowId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('vcr_plan_approvers')
        .select('id, status, decided_at, comments, role_label, user_id, approver_order')
        .eq('id', payload.approverRowId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    refetchOnMount: 'always',
  });

  const { data: roster } = useQuery({
    queryKey: ['vcr-plan-approver-roster', payload.handoverPointId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('vcr_plan_approvers')
        .select('id, role_label, status, decided_at, approver_order, user_id')
        .eq('handover_point_id', payload.handoverPointId)
        .order('approver_order', { ascending: true });
      if (error) throw error;
      return (data || []) as any[];
    },
  });

  const isMine = myRow?.user_id === user?.id;
  const alreadyDecided = !!myRow && myRow.status !== 'PENDING';
  const canDecide =
    !!rollup?.my_actionable_row_id &&
    rollup.my_actionable_row_id === payload.approverRowId &&
    !alreadyDecided;

  const submit = async (decision: Decision) => {
    setDecisionError(null);
    setSubmitting(decision);
    // Step 3c — Approve-before-baseline. Persist any unsaved roster/content
    // via the same submit_vcr_plan path BEFORE decide_vcr_plan_approval runs,
    // so the baseline freezes exactly what the ORA sees on screen. Idempotent.
    // The pre-hook itself short-circuits when the roster wasn't edited.
    if (decision === 'APPROVED' && preApprovePersist) {
      try {
        const ok = await preApprovePersist();
        if (ok === false) {
          setSubmitting(null);
          setDecisionError('Could not save pending changes. Please review and try again.');
          return;
        }
      } catch (e: any) {
        console.error('[VCR Plan Review] preApprovePersist failed:', e);
        setSubmitting(null);
        setDecisionError(`Could not save pending changes: ${e?.message || e}`);
        return;
      }
    }
    const { data, error } = await (supabase as any).rpc('decide_vcr_plan_approval', {
      p_approver_row_id: payload.approverRowId,
      p_decision: decision,
      p_comment: comment.trim() || null,
    });
    setSubmitting(null);
    if (error) {
      // Keep confirm modal open and surface the error inline (B1 fix).
      setDecisionError(error.message || 'Decision failed');
      return;
    }

    const invalidateAll = () => {
      queryClient.invalidateQueries({ queryKey: ['vcr-plan-approval-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['vcr-plan-rollup', payload.handoverPointId] });
      queryClient.invalidateQueries({ queryKey: ['vcr-plan-approver-row', payload.approverRowId] });
      queryClient.invalidateQueries({ queryKey: ['vcr-plan-approver-roster', payload.handoverPointId] });
      queryClient.invalidateQueries({ queryKey: ['vcr-plan-approver-roster-extended', payload.handoverPointId] });
      queryClient.invalidateQueries({ queryKey: ['project-vcrs'] });
      queryClient.invalidateQueries({ queryKey: ['user-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['ora-plan-activities'] });
    };

    // Step 3 FIX — scope-change self-heal path. RPC committed a void + reset
    // and returned without recording a decision. No success toast, no fan-out.
    if (data && (data as any).scope_changed === true) {
      setPendingDecision(null);
      toast.info(
        (data as any).message ||
          'Plan scope changed — approvals were reset; the ORA Lead must re-review.',
      );
      invalidateAll();
      onDecided?.();
      return;
    }

    if (decision === 'APPROVED' && payload.projectId) {
      try {
        const { generateBuildingBlockActivities } = await import('@/hooks/useORAActivityPlanSync');
        await generateBuildingBlockActivities(payload.handoverPointId, payload.projectId, payload.projectCode || '');
      } catch (e) {
        console.error('[VCR Plan Review] Fan-out failed:', e);
      }
    }
    setPendingDecision(null);
    toast.success(decision === 'APPROVED' ? 'Plan approved' : 'Changes requested');
    invalidateAll();
    onDecided?.();
  };

  const requestDecision = (d: Decision) => {
    if (d === 'REJECTED' && !comment.trim()) {
      toast.error('Please add a comment explaining the change request.');
      return;
    }
    setDecisionError(null);
    setPendingDecision(d);
  };
  const cancelConfirm = () => {
    setPendingDecision(null);
    setDecisionError(null);
  };
  const confirmDecision = () => {
    if (pendingDecision) submit(pendingDecision);
  };

  const value = useMemo<DecisionController>(
    () => ({
      payload,
      rollup,
      myRow,
      roster,
      isMine,
      alreadyDecided,
      canDecide,
      comment,
      setComment,
      submitting,
      pendingDecision,
      requestDecision,
      cancelConfirm,
      confirmDecision,
      rollupLoading,
      myRowLoading,
      decisionError,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [payload, rollup, myRow, roster, isMine, alreadyDecided, canDecide, comment, submitting, pendingDecision, rollupLoading, myRowLoading, decisionError],
  );

  return (
    <DecisionCtx.Provider value={value}>
      {children}
      <DecisionConfirmModal />
    </DecisionCtx.Provider>
  );
};

const decisionChip = (d: string | null) => {
  if (d === 'APPROVED')
    return <Badge className="bg-emerald-500/10 text-emerald-600 border-0">Approved</Badge>;
  if (d === 'REJECTED')
    return <Badge className="bg-red-500/10 text-red-600 border-0">Changes requested</Badge>;
  return <Badge variant="outline" className="text-muted-foreground">Pending</Badge>;
};

/* ─── Body content (rendered as wizard Step 10) ───────────────── */
export const VCRReviewDecisionStep: React.FC<{
  payload: VCRReviewPayload;
  onDecided?: () => void;
}> = () => {
  const {
    rollup,
    roster,
    isMine,
    alreadyDecided,
    canDecide,
    comment,
    setComment,
    myRow,
    myRowLoading,
    payload,
  } = useDecision();

  const subMode = useVCRWizardSubMode();
  const showDiff = subMode === 'ora_edit';

  const approvedCount = rollup?.approved_count ?? 0;

  const totalCount = rollup?.total_count ?? 0;

  return (
    <div className="max-w-3xl mx-auto space-y-6 p-1">
      {/* ─── Approver roster (header includes count) ───────────── */}
      <section className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Approvers
            {totalCount > 0 && (
              <span className="ml-2 normal-case text-muted-foreground/80 font-medium">
                · Phase {rollup?.phase ?? '—'} · {approvedCount} of {totalCount} approved
              </span>
            )}
          </div>
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
                  {decisionChip(r.status)}
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

      {showDiff && (
        <>
          <Separator />
          <VCRPlanDiffSummary handoverPointId={payload.handoverPointId} mode="live" />
        </>
      )}

      <Separator />



      {/* ─── Decision surface (state + comment textarea only) ──── */}
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
              myRow!.status === 'APPROVED'
                ? 'border-emerald-500/30 bg-emerald-500/5'
                : 'border-red-500/30 bg-red-500/5',
            )}
            data-testid="vcr-review-already-decided"
          >
            <div className="flex items-center gap-2">
              {myRow!.status === 'APPROVED' ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              ) : (
                <XCircle className="h-4 w-4 text-red-600" />
              )}
              <span className="font-medium text-sm">
                You {myRow!.status === 'APPROVED' ? 'approved' : 'requested changes on'} this plan
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
              Your decision is recorded and cannot be changed here.
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
          <div className="space-y-2" data-testid="vcr-review-decision-active">
            <label className="text-xs font-medium text-muted-foreground">
              Comment{' '}
              <span className="text-muted-foreground/70">
                (required for Request Changes)
              </span>
            </label>
            <Textarea
              placeholder="Add a comment explaining your decision…"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="min-h-[120px] text-sm"
              maxLength={1000}
              data-rm-safe
            />
            <p className="text-[11px] text-muted-foreground">
              Use the Approve / Request Changes buttons in the footer to submit your decision.
            </p>
          </div>
        )}
      </section>

      <Separator />

      <VCRApprovalHistoryPanel handoverPointId={payload.handoverPointId} />
    </div>

  );
};

/* ─── Footer buttons (rendered into wizard's fixed footer) ────── */
export const VCRReviewDecisionFooterButtons: React.FC = () => {
  const { canDecide, submitting, requestDecision } = useDecision();
  if (!canDecide) return null;
  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => requestDecision('REJECTED')}
        disabled={!!submitting}
        data-rm-safe
        data-rm-nav
      >
        <XCircle className="h-4 w-4 mr-1.5" />
        Request Changes
      </Button>
      <Button
        size="sm"
        onClick={() => requestDecision('APPROVED')}
        disabled={!!submitting}
        data-rm-safe
        data-rm-nav
      >
        <CheckCircle2 className="h-4 w-4 mr-1.5" />
        Approve
      </Button>
    </>
  );
};

/* ─── Confirmation modal with role/phase/decision-aware impact ── */
const DecisionConfirmModal: React.FC = () => {
  const {
    pendingDecision,
    cancelConfirm,
    confirmDecision,
    submitting,
    comment,
    setComment,
    rollup,
    payload,
  } = useDecision();

  const open = !!pendingDecision;
  const isApprove = pendingDecision === 'APPROVED';
  const phase = rollup?.phase ?? payload.phase ?? null;
  const isOraLead = phase === 1; // Phase-1 actionable approver = ORA Lead

  const title = isApprove ? 'Approve VCR Plan?' : 'Request Changes to VCR Plan?';

  const impact = (() => {
    if (isOraLead && isApprove) {
      return (
        <>
          You are <strong>approving the plan as ORA Lead</strong>. This will:
          <ul className="list-disc pl-5 space-y-1 mt-2">
            <li>Lock in your version as the <strong>baseline</strong> for Phase&nbsp;2.</li>
            <li>Send the plan to the <strong>4 Phase-2 approvers</strong> for parallel review.</li>
            <li>Notify the submitter that ORA review is complete.</li>
          </ul>
        </>
      );
    }
    if (isOraLead && !isApprove) {
      return (
        <>
          You are <strong>requesting changes as ORA Lead</strong>. This will:
          <ul className="list-disc pl-5 space-y-1 mt-2">
            <li>Return the plan to the submitter with your comments.</li>
            <li>The other 4 approvers are <strong>not involved</strong> until the plan is resubmitted.</li>
          </ul>
        </>
      );
    }
    if (!isOraLead && isApprove) {
      return (
        <>
          You are <strong>recording your approval</strong>. This will:
          <ul className="list-disc pl-5 space-y-1 mt-2">
            <li>Mark your line on the approver roster as Approved.</li>
            <li>The plan is <strong>fully approved only once all approvers have signed</strong>.</li>
          </ul>
        </>
      );
    }
    return (
      <>
        You are <strong>requesting changes</strong>. This will:
        <ul className="list-disc pl-5 space-y-1 mt-2">
          <li>Return the plan to the submitter with your comments.</li>
          <li>Approvals already given by other reviewers are <strong>preserved</strong>.</li>
          <li>Your decision blocks the plan until it is resubmitted.</li>
        </ul>
      </>
    );
  })();

  const commentRequired = !isApprove;
  const commentMissing = commentRequired && !comment.trim();

  return (
    <Dialog open={open} onOpenChange={(o) => !o && cancelConfirm()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isApprove ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            ) : (
              <AlertTriangle className="h-5 w-5 text-amber-600" />
            )}
            {title}
          </DialogTitle>
          <DialogDescription asChild>
            <div className="text-sm text-muted-foreground pt-1">{impact}</div>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground">
            Comment {commentRequired ? <span className="text-red-600">*</span> : <span className="text-muted-foreground/70">(optional)</span>}
          </label>
          <Textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder={
              commentRequired
                ? 'Explain what needs to change…'
                : 'Optional note for the audit trail…'
            }
            className="min-h-[96px] text-sm"
            maxLength={1000}
            data-rm-safe
            autoFocus
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={cancelConfirm} disabled={!!submitting} data-rm-safe>
            Cancel
          </Button>
          <Button
            variant={isApprove ? 'default' : 'destructive'}
            onClick={confirmDecision}
            disabled={!!submitting || commentMissing}
            data-rm-safe
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
            ) : isApprove ? (
              <CheckCircle2 className="h-4 w-4 mr-1.5" />
            ) : (
              <XCircle className="h-4 w-4 mr-1.5" />
            )}
            {isApprove ? 'Confirm Approval' : 'Confirm Request Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

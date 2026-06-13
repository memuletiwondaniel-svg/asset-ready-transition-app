import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { ApproversStep, type VCRApprover } from './steps/ApproversStep';
import { useVCRWizardSubMode } from './wizardModeContext';

interface ApproverRow {
  id: string;
  role_label: string;
  status: string | null;
  decided_at: string | null;
  approver_order: number | null;
  user_id: string | null;
  comments: string | null;
}

const useRoster = (handoverPointId: string) =>
  useQuery({
    queryKey: ['vcr-plan-approver-roster-extended', handoverPointId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('vcr_plan_approvers')
        .select('id, role_label, status, decided_at, approver_order, user_id, comments')
        .eq('handover_point_id', handoverPointId)
        .order('approver_order', { ascending: true });
      if (error) throw error;
      return (data || []) as ApproverRow[];
    },
    refetchOnMount: 'always',
  });

const statusChip = (s: string | null) => {
  if (s === 'APPROVED')
    return <Badge className="bg-emerald-500/10 text-emerald-600 border-0">Approved</Badge>;
  if (s === 'REJECTED')
    return <Badge className="bg-red-500/10 text-red-600 border-0">Changes requested</Badge>;
  return (
    <Badge variant="outline" className="text-muted-foreground">
      Pending
    </Badge>
  );
};

/** Compact "Decisions so far" list shown beneath the editable roster in ora_edit. */
const DecisionsSoFarPanel: React.FC<{ handoverPointId: string }> = ({ handoverPointId }) => {
  const { data: roster, isLoading } = useRoster(handoverPointId);
  return (
    <div className="space-y-3 p-4 pt-0">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        Decisions so far
      </div>
      <div className="rounded-lg border divide-y">
        {isLoading && <div className="px-3 py-3"><Skeleton className="h-4 w-40" /></div>}
        {!isLoading && (roster || []).length === 0 && (
          <div className="px-3 py-3 text-sm text-muted-foreground">
            No approver decisions recorded yet.
          </div>
        )}
        {(roster || []).map((r) => (
          <div key={r.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-[10px] font-mono text-muted-foreground w-4 text-center">
                {r.approver_order ?? '—'}
              </span>
              <span className="font-medium truncate">{r.role_label}</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {statusChip(r.status)}
              {r.decided_at && (
                <span className="text-[10px] text-muted-foreground">
                  {format(new Date(r.decided_at), 'd MMM, HH:mm')}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

/** Full read-only approval-status board for review_only mode (replaces ApproversStep). */
const ApprovalStatusBoard: React.FC<{ handoverPointId: string }> = ({ handoverPointId }) => {
  const { data: roster, isLoading } = useRoster(handoverPointId);
  return (
    <div className="space-y-4 p-4">
      <div>
        <h3 className="text-sm font-medium">Approval status</h3>
        <p className="text-xs text-muted-foreground">
          Decisions recorded by other approvers so far.
        </p>
      </div>
      <div className="rounded-lg border divide-y">
        {isLoading && (
          <div className="p-4 space-y-2">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        )}
        {!isLoading && (roster || []).length === 0 && (
          <div className="px-3 py-4 text-sm text-muted-foreground">
            No approvers configured yet.
          </div>
        )}
        {(roster || []).map((r) => (
          <div key={r.id} className="px-3 py-3 text-sm">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-[10px] font-mono text-muted-foreground w-4 text-center">
                  {r.approver_order ?? '—'}
                </span>
                <span className="font-medium truncate">{r.role_label}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {statusChip(r.status)}
                {r.decided_at && (
                  <span className="text-[10px] text-muted-foreground">
                    {format(new Date(r.decided_at), "d MMM yyyy 'at' HH:mm")}
                  </span>
                )}
              </div>
            </div>
            {r.comments && (
              <div
                className={cn(
                  'mt-2 text-[12px] text-muted-foreground border-l-2 pl-3 italic',
                  r.status === 'APPROVED' ? 'border-emerald-500/40' : 'border-red-500/40',
                )}
              >
                "{r.comments}"
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

/**
 * Renders Step 8 (Approvers) with mode-aware content:
 *  - create / no subMode  → editable ApproversStep (unchanged)
 *  - ora_edit             → editable ApproversStep + "Decisions so far" panel
 *  - review_only          → read-only ApprovalStatusBoard (no editor)
 */
export const Step8ReviewModeWrapper: React.FC<{
  vcrId: string;
  onApproversChange?: (approvers: VCRApprover[]) => void;
}> = ({ vcrId, onApproversChange }) => {
  const subMode = useVCRWizardSubMode();

  if (subMode === 'review_only') {
    return <ApprovalStatusBoard handoverPointId={vcrId} />;
  }
  if (subMode === 'ora_edit') {
    return (
      <div className="space-y-2">
        <ApproversStep vcrId={vcrId} onApproversChange={onApproversChange} />
        <DecisionsSoFarPanel handoverPointId={vcrId} />
      </div>
    );
  }
  return <ApproversStep vcrId={vcrId} onApproversChange={onApproversChange} />;
};

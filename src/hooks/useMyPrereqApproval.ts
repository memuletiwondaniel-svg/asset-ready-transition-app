import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/enhanced-auth/AuthProvider';
import { useToast } from '@/hooks/use-toast';

/**
 * E-1c approver action surface.
 *
 * Reads the CURRENT user's row on vcr_prerequisite_approvals for a given
 * prerequisite (seeded by create_vcr_approval_fanout / R23) and exposes the
 * three terminal actions: Accept, Reject, Raise Qualification.
 *
 * RLS (Mig E-1c) restricts UPDATE to rows where approver_user_id =
 * auth.uid(), so this hook can only ever write the caller's own ledger row.
 * The all-must-approve roll-up runs inside the
 * recompute_vcr_prerequisite_from_approvals trigger; we do NOT touch the
 * parent prereq.status from the client.
 */
export type LedgerStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'QUALIFIED';

export interface MyLedgerRow {
  id: string;
  prerequisite_id: string;
  approver_role_id: string;
  approver_user_id: string;
  status: LedgerStatus;
  decided_at: string | null;
  comment: string | null;
}

export function useMyPrereqApproval(prerequisiteId: string | undefined) {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();

  const ledgerQuery = useQuery({
    enabled: !!user?.id && !!prerequisiteId,
    queryKey: ['my-prereq-approval', prerequisiteId, user?.id],
    queryFn: async (): Promise<MyLedgerRow | null> => {
      const { data, error } = await (supabase as any)
        .from('vcr_prerequisite_approvals')
        .select('id,prerequisite_id,approver_role_id,approver_user_id,status,decided_at,comment')
        .eq('prerequisite_id', prerequisiteId!)
        .eq('approver_user_id', user!.id)
        .maybeSingle();
      if (error) throw error;
      return (data as MyLedgerRow | null) ?? null;
    },
  });

  const decide = useMutation({
    mutationFn: async ({ status, comment }: { status: Exclude<LedgerStatus, 'PENDING'>; comment?: string }) => {
      if (!ledgerQuery.data?.id) {
        throw new Error('No ledger row found for this user on this prerequisite.');
      }
      const { error } = await (supabase as any)
        .from('vcr_prerequisite_approvals')
        .update({
          status,
          comment: comment ?? null,
          decided_at: new Date().toISOString(),
        })
        .eq('id', ledgerQuery.data.id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['my-prereq-approval', prerequisiteId] });
      qc.invalidateQueries({ queryKey: ['vcr-prerequisites'] });
      qc.invalidateQueries({ queryKey: ['user-vcr-bundle-tasks'] });
      // E-1c BUG 1: refresh the per-item "N of M accepted" counter in
      // VCRApprovalBundleSheet, which reads vcr_prerequisite_approvals directly.
      qc.invalidateQueries({ queryKey: ['vcr-bundle-approval-counts'] });
      // E-1c BUG 2: My Tasks Kanban reads from ['user-tasks'] (useUserTasks).
      // The DB-side recompute trigger updates the bundle user_tasks row's
      // progress/status; without this invalidate the card stays at 0/N and
      // never leaves the To Do column until a hard refresh.
      qc.invalidateQueries({ queryKey: ['user-tasks'] });
      const label =
        vars.status === 'ACCEPTED' ? 'Accepted' :
        vars.status === 'REJECTED' ? 'Rejected' :
        'Qualification raised';
      toast({ title: label, description: 'Your decision was recorded.' });
    },
    onError: (e: Error) => {
      toast({ title: 'Decision failed', description: e.message, variant: 'destructive' });
    },
  });

  return {
    ledger: ledgerQuery.data ?? null,
    isLoading: ledgerQuery.isLoading,
    canDecide: !!ledgerQuery.data && ledgerQuery.data.status === 'PENDING',
    accept:    (comment?: string) => decide.mutate({ status: 'ACCEPTED',  comment }),
    reject:    (comment?: string) => decide.mutate({ status: 'REJECTED',  comment }),
    qualify:   (comment?: string) => decide.mutate({ status: 'QUALIFIED', comment }),
    isDeciding: decide.isPending,
  };
}

import { useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const RECALL_BLOCKED_MESSAGE =
  "Can't recall — an approver has already acted. To change the plan, request changes (reject) and resubmit, or change the scope (which voids approvals).";

interface RecallOptions {
  /** Called after a successful recall (e.g. to close the wizard). */
  onSuccess?: () => void;
  /** Called when the RPC reports the plan is blocked by an existing approval. */
  onBlocked?: (message: string) => void;
}

export function useRecallVcrPlan() {
  const queryClient = useQueryClient();
  const [isRecalling, setIsRecalling] = useState(false);

  const recall = useCallback(
    async (handoverPointId: string, options: RecallOptions = {}): Promise<boolean> => {
      if (!handoverPointId) return false;
      setIsRecalling(true);
      try {
        const { error } = await (supabase as any).rpc('recall_vcr_plan', {
          p_handover_point_id: handoverPointId,
        });
        if (error) throw error;

        toast.success('Plan recalled — back to draft for editing');
        // Invalidate task feeds and VCR plan queries so both boards refresh.
        queryClient.invalidateQueries({ queryKey: ['user-tasks'] });
        queryClient.invalidateQueries({ queryKey: ['vcr-plan-approval-tasks'] });
        queryClient.invalidateQueries({ queryKey: ['vcr-plan-rollup', handoverPointId] });
        queryClient.invalidateQueries({ queryKey: ['vcr-plan-approver-roster', handoverPointId] });
        queryClient.invalidateQueries({ queryKey: ['vcr-plan-approver-roster-extended', handoverPointId] });
        queryClient.invalidateQueries({ queryKey: ['vcr-review-readiness', handoverPointId] });
        queryClient.invalidateQueries({ queryKey: ['project-vcrs'] });
        queryClient.invalidateQueries({ queryKey: ['p2a-plan-by-project'] });
        queryClient.invalidateQueries({ queryKey: ['ora-plan-activities'] });

        options.onSuccess?.();
        return true;
      } catch (err: any) {
        const msg: string = err?.message || String(err);
        if (/Cannot recall/i.test(msg)) {
          options.onBlocked?.(RECALL_BLOCKED_MESSAGE);
          toast.error(RECALL_BLOCKED_MESSAGE);
        } else {
          toast.error(msg);
        }
        return false;
      } finally {
        setIsRecalling(false);
      }
    },
    [queryClient],
  );

  return { recall, isRecalling };
}

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * Server-truth Rev counter for a VCR.
 *
 * Rev N = count of distinct SUBMITTED events on `vcr_plan_approval_events`
 * for this handover point. A never-submitted VCR returns 0 → caller renders
 * `Rev —` (or omits the chip). Rejection cycles are NOT counted here — each
 * resubmission produces a new SUBMITTED event, which is the semantics Daniel
 * confirmed for the header chip.
 *
 * Replaces the client-side heuristic `revCounter` that previously guessed
 * "Rev 2" for any REJECTED row. That heuristic MUST NOT reappear.
 */
export function useVCRRev(handoverPointId: string | null | undefined) {
  return useQuery({
    queryKey: ['vcr-rev', handoverPointId],
    enabled: !!handoverPointId,
    queryFn: async (): Promise<number> => {
      if (!handoverPointId) return 0;
      const { count, error } = await (supabase as any)
        .from('vcr_plan_approval_events')
        .select('id', { count: 'exact', head: true })
        .eq('handover_point_id', handoverPointId)
        .eq('event_type', 'SUBMITTED');
      if (error) throw error;
      return count ?? 0;
    },
    staleTime: 30_000,
  });
}

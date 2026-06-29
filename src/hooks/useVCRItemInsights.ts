import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { VCRInsights } from '@/components/widgets/VCRItemDetailSheet';

/**
 * AI-1 Readiness Insights hook — cache-then-compute, with a hard timeout
 * so a hung cache read can never leave the UI stuck on "pending".
 *
 * Engine is advisory only — it never mutates prereqs, approvers, or submit paths.
 */
function withTimeout<T>(p: PromiseLike<T>, ms: number, fallback: T): Promise<T> {
  return new Promise((resolve) => {
    let done = false;
    const t = setTimeout(() => {
      if (!done) {
        done = true;
        resolve(fallback);
      }
    }, ms);
    Promise.resolve(p).then(
      (v) => {
        if (!done) {
          done = true;
          clearTimeout(t);
          resolve(v);
        }
      },
      () => {
        if (!done) {
          done = true;
          clearTimeout(t);
          resolve(fallback);
        }
      },
    );
  });
}

export function useVCRItemInsights(vcrId: string | undefined, vcrItemId: string | undefined) {
  const qc = useQueryClient();
  const queryKey = ['vcr-item-insights', vcrId, vcrItemId];

  const query = useQuery({
    queryKey,
    queryFn: async (): Promise<VCRInsights> => {
      if (!vcrId || !vcrItemId) return { state: 'unavailable' };

      // Cache read with an 8s ceiling — if RLS/policy stalls the GET,
      // we fall back to 'unavailable' rather than spinning forever.
      const result = await withTimeout(
        supabase
          .from('vcr_item_insights')
          .select('payload')
          .eq('vcr_id', vcrId)
          .eq('vcr_item_id', vcrItemId)
          .maybeSingle(),
        8000,
        { data: null as any, error: { message: 'timeout' } as any },
      );

      const data = (result as any)?.data;
      if (!data) {
        // No cache yet (or timeout) — kick compute, return pending.
        // Compute itself is bounded so we don't leak invokes.
        withTimeout(
          supabase.functions.invoke('compute-vcr-insights', {
            body: { vcr_id: vcrId, vcr_item_id: vcrItemId },
          }),
          15000,
          null,
        ).then(() => qc.invalidateQueries({ queryKey }));
        return { state: 'pending' };
      }
      return (data.payload as unknown as VCRInsights) ?? { state: 'unavailable' };
    },
    enabled: !!vcrId && !!vcrItemId,
    staleTime: 60_000,
  });

  const recompute = useMutation({
    mutationFn: async () => {
      if (!vcrId || !vcrItemId) return null;
      const { data, error } = await supabase.functions.invoke('compute-vcr-insights', {
        body: { vcr_id: vcrId, vcr_item_id: vcrItemId, force: true },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey }),
  });

  return { insights: query.data, isLoading: query.isLoading, recompute };
}

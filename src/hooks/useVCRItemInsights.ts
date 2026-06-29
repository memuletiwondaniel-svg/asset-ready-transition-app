import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { VCRInsights } from '@/components/widgets/VCRItemDetailSheet';

/**
 * AI-1 Readiness Insights hook — cache-then-compute.
 *
 * `useQuery` reads the cached `vcr_item_insights` row immediately so the UI
 * paints fast. The `recompute` mutation calls the `compute-vcr-insights` edge
 * function to refresh on demand (e.g. user clicks "Recompute").
 * Engine is advisory only — it never mutates prereqs, approvers, or submit
 * paths.
 */
export function useVCRItemInsights(vcrId: string | undefined, vcrItemId: string | undefined) {
  const qc = useQueryClient();
  const queryKey = ['vcr-item-insights', vcrId, vcrItemId];

  const query = useQuery({
    queryKey,
    queryFn: async (): Promise<VCRInsights> => {
      if (!vcrId || !vcrItemId) return { state: 'unavailable' };
      const { data } = await supabase
        .from('vcr_item_insights')
        .select('payload')
        .eq('vcr_id', vcrId)
        .eq('vcr_item_id', vcrItemId)
        .maybeSingle();
      if (!data) {
        // No cache yet — trigger compute and return pending
        supabase.functions.invoke('compute-vcr-insights', {
          body: { vcr_id: vcrId, vcr_item_id: vcrItemId },
        }).then(() => qc.invalidateQueries({ queryKey }));
        return { state: 'pending' };
      }
      return (data.payload as VCRInsights) ?? { state: 'unavailable' };
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

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface PSSRUpdateData {
  title?: string;
  asset?: string;
  reason?: string;
  scope?: string;
  pssr_lead_id?: string;
  plant_id?: string;
  field_id?: string;
  station_id?: string;
  scope_image_url?: string | null;
}

export const usePSSRDetails = (pssrId: string) => {
  const queryClient = useQueryClient();

  const isUuid = (value: string) =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

  const query = useQuery({
    queryKey: ['pssr-details', pssrId],
    queryFn: async () => {
      const select = `
          *,
          pssr_lead:profiles!pssrs_pssr_lead_id_fkey(user_id, full_name, position, avatar_url)
        `;

      // IMPORTANT: Only query by UUID id if pssrId is actually a UUID.
      // Otherwise Postgres throws 22P02 before we can fall back.
      if (isUuid(pssrId)) {
        let { data, error } = await supabase
          .from('pssrs')
          .select(select)
          .eq('id', pssrId)
          .maybeSingle();

        // Compatibility fallback
        if (!data && !error) {
          const result = await supabase
            .from('pssrs')
            .select(select)
            .eq('pssr_id', pssrId)
            .maybeSingle();
          data = result.data;
          error = result.error;
        }

        if (error) throw error;
        return data;
      }

      // Non-UUID route param (e.g. "PSSR-DP300-001")
      const { data, error } = await supabase
        .from('pssrs')
        .select(select)
        .eq('pssr_id', pssrId)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!pssrId,
  });

  const updateMutation = useMutation({
    mutationFn: async (updates: PSSRUpdateData) => {
      const result = isUuid(pssrId)
        ? await supabase.from('pssrs').update(updates).eq('id', pssrId).select('id')
        : await supabase.from('pssrs').update(updates).eq('pssr_id', pssrId).select('id');

      const { data, error } = result;
      if (error) throw error;
      if (!data || data.length === 0) {
        throw new Error('PSSR not found (no rows updated)');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pssr-details', pssrId] });
    },
  });

  return {
    pssr: query.data,
    isLoading: query.isLoading,
    error: query.error,
    updatePSSR: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
  };
};

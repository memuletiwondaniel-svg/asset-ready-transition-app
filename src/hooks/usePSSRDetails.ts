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
}

export const usePSSRDetails = (pssrId: string) => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['pssr-details', pssrId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pssrs')
        .select(`
          *,
          pssr_lead:profiles!pssrs_pssr_lead_id_fkey(user_id, full_name, position, avatar_url)
        `)
        .eq('id', pssrId)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!pssrId,
  });

  const updateMutation = useMutation({
    mutationFn: async (updates: PSSRUpdateData) => {
      const { error } = await supabase
        .from('pssrs')
        .update(updates)
        .eq('id', pssrId);
      
      if (error) throw error;
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

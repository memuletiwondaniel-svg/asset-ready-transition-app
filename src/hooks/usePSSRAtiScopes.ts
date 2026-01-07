import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface PSSRTieInScope {
  id: string;
  code: string;
  description: string;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PSSRSelectedAtiScope {
  id: string;
  pssr_id: string;
  ati_scope_id: string;
  created_at: string;
}

// Fetch all active ATI scopes
export const usePSSRTieInScopes = () => {
  return useQuery({
    queryKey: ['pssr-tie-in-scopes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pssr_tie_in_scopes')
        .select('*')
        .eq('is_active', true)
        .order('display_order');
      
      if (error) throw error;
      return data as PSSRTieInScope[];
    },
  });
};

// Fetch selected ATI scopes for a specific PSSR
export const usePSSRSelectedAtiScopes = (pssrId: string | null) => {
  return useQuery({
    queryKey: ['pssr-selected-ati-scopes', pssrId],
    queryFn: async () => {
      if (!pssrId) return [];
      
      const { data, error } = await supabase
        .from('pssr_selected_ati_scopes')
        .select(`
          *,
          ati_scope:pssr_tie_in_scopes(*)
        `)
        .eq('pssr_id', pssrId);
      
      if (error) throw error;
      return data;
    },
    enabled: !!pssrId,
  });
};

// Insert selected ATI scopes for a PSSR
export const useInsertPSSRSelectedAtiScopes = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ pssrId, atiScopeIds }: { pssrId: string; atiScopeIds: string[] }) => {
      if (atiScopeIds.length === 0) return [];
      
      const records = atiScopeIds.map(scopeId => ({
        pssr_id: pssrId,
        ati_scope_id: scopeId,
      }));
      
      const { data, error } = await supabase
        .from('pssr_selected_ati_scopes')
        .insert(records)
        .select();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['pssr-selected-ati-scopes', variables.pssrId] });
    },
  });
};

// Delete all selected ATI scopes for a PSSR
export const useDeletePSSRSelectedAtiScopes = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (pssrId: string) => {
      const { error } = await supabase
        .from('pssr_selected_ati_scopes')
        .delete()
        .eq('pssr_id', pssrId);
      
      if (error) throw error;
    },
    onSuccess: (_, pssrId) => {
      queryClient.invalidateQueries({ queryKey: ['pssr-selected-ati-scopes', pssrId] });
    },
  });
};

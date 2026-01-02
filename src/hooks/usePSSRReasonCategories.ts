import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface PSSRReasonCategory {
  id: string;
  code: string;
  name: string;
  description: string | null;
  display_order: number;
  is_active: boolean;
  requires_delivery_party: boolean;
  allows_free_text: boolean;
  icon: string | null;
  created_at: string;
  updated_at: string;
}

export interface PSSRDeliveryParty {
  id: string;
  code: string;
  name: string;
  description: string | null;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PSSRReasonATIScope {
  id: string;
  reason_id: string;
  ati_scope_id: string;
  is_active: boolean;
  created_at: string;
}

// Fetch all reason categories
export const usePSSRReasonCategories = () => {
  return useQuery({
    queryKey: ['pssr-reason-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pssr_reason_categories')
        .select('*')
        .order('display_order');
      
      if (error) throw error;
      return data as PSSRReasonCategory[];
    },
  });
};

// Fetch active reason categories only
export const useActivePSSRReasonCategories = () => {
  return useQuery({
    queryKey: ['pssr-reason-categories', 'active'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pssr_reason_categories')
        .select('*')
        .eq('is_active', true)
        .order('display_order');
      
      if (error) throw error;
      return data as PSSRReasonCategory[];
    },
  });
};

// Fetch all delivery parties
export const usePSSRDeliveryParties = () => {
  return useQuery({
    queryKey: ['pssr-delivery-parties'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pssr_delivery_parties')
        .select('*')
        .order('display_order');
      
      if (error) throw error;
      return data as PSSRDeliveryParty[];
    },
  });
};

// Fetch active delivery parties only
export const useActivePSSRDeliveryParties = () => {
  return useQuery({
    queryKey: ['pssr-delivery-parties', 'active'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pssr_delivery_parties')
        .select('*')
        .eq('is_active', true)
        .order('display_order');
      
      if (error) throw error;
      return data as PSSRDeliveryParty[];
    },
  });
};

// Fetch reasons by category
export const usePSSRReasonsByCategory = (categoryId: string | null, deliveryPartyId?: string | null) => {
  return useQuery({
    queryKey: ['pssr-reasons-by-category', categoryId, deliveryPartyId],
    queryFn: async () => {
      if (!categoryId) return [];
      
      let query = supabase
        .from('pssr_reasons')
        .select('*')
        .eq('category_id', categoryId)
        .eq('is_active', true)
        .order('display_order');
      
      if (deliveryPartyId) {
        query = query.eq('delivery_party_id', deliveryPartyId);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data;
    },
    enabled: !!categoryId,
  });
};

// Fetch ATI scopes for a reason
export const usePSSRReasonATIScopes = (reasonId: string | null) => {
  return useQuery({
    queryKey: ['pssr-reason-ati-scopes', reasonId],
    queryFn: async () => {
      if (!reasonId) return [];
      
      const { data, error } = await supabase
        .from('pssr_reason_ati_scopes')
        .select(`
          *,
          ati_scope:pssr_tie_in_scopes(*)
        `)
        .eq('reason_id', reasonId)
        .eq('is_active', true);
      
      if (error) throw error;
      return data;
    },
    enabled: !!reasonId,
  });
};

// Create a new category
export const useCreatePSSRReasonCategory = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (category: Omit<PSSRReasonCategory, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('pssr_reason_categories')
        .insert(category)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pssr-reason-categories'] });
      toast.success('Category created successfully');
    },
    onError: (error) => {
      toast.error(`Failed to create category: ${error.message}`);
    },
  });
};

// Update a category
export const useUpdatePSSRReasonCategory = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<PSSRReasonCategory> & { id: string }) => {
      const { data, error } = await supabase
        .from('pssr_reason_categories')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pssr-reason-categories'] });
      toast.success('Category updated successfully');
    },
    onError: (error) => {
      toast.error(`Failed to update category: ${error.message}`);
    },
  });
};

// Delete a category
export const useDeletePSSRReasonCategory = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('pssr_reason_categories')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pssr-reason-categories'] });
      toast.success('Category deleted successfully');
    },
    onError: (error) => {
      toast.error(`Failed to delete category: ${error.message}`);
    },
  });
};

// Create a delivery party
export const useCreatePSSRDeliveryParty = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (party: Omit<PSSRDeliveryParty, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('pssr_delivery_parties')
        .insert(party)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pssr-delivery-parties'] });
      toast.success('Delivery party created successfully');
    },
    onError: (error) => {
      toast.error(`Failed to create delivery party: ${error.message}`);
    },
  });
};

// Update a delivery party
export const useUpdatePSSRDeliveryParty = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<PSSRDeliveryParty> & { id: string }) => {
      const { data, error } = await supabase
        .from('pssr_delivery_parties')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pssr-delivery-parties'] });
      toast.success('Delivery party updated successfully');
    },
    onError: (error) => {
      toast.error(`Failed to update delivery party: ${error.message}`);
    },
  });
};

// Create/update ATI scopes for a reason
export const useUpdatePSSRReasonATIScopes = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ reasonId, atiScopeIds }: { reasonId: string; atiScopeIds: string[] }) => {
      // First, delete existing scopes
      await supabase
        .from('pssr_reason_ati_scopes')
        .delete()
        .eq('reason_id', reasonId);
      
      // Then insert new scopes
      if (atiScopeIds.length > 0) {
        const { error } = await supabase
          .from('pssr_reason_ati_scopes')
          .insert(atiScopeIds.map(scopeId => ({
            reason_id: reasonId,
            ati_scope_id: scopeId,
          })));
        
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pssr-reason-ati-scopes'] });
      toast.success('ATI scopes updated successfully');
    },
    onError: (error) => {
      toast.error(`Failed to update ATI scopes: ${error.message}`);
    },
  });
};

// Create a sub-reason
export const useCreatePSSRSubReason = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (reason: {
      name: string;
      category_id: string;
      delivery_party_id?: string | null;
      requires_ati_scopes?: boolean;
      display_order: number;
      ati_scope_ids?: string[];
    }) => {
      const { ati_scope_ids, ...reasonData } = reason;
      
      const { data, error } = await supabase
        .from('pssr_reasons')
        .insert({
          ...reasonData,
          status: 'approved',
          is_active: true,
        })
        .select()
        .single();
      
      if (error) throw error;
      
      // If ATI scopes are provided, insert them
      if (ati_scope_ids && ati_scope_ids.length > 0) {
        const { error: scopeError } = await supabase
          .from('pssr_reason_ati_scopes')
          .insert(ati_scope_ids.map(scopeId => ({
            reason_id: data.id,
            ati_scope_id: scopeId,
          })));
        
        if (scopeError) throw scopeError;
      }
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pssr-reasons'] });
      queryClient.invalidateQueries({ queryKey: ['pssr-reasons-by-category'] });
      toast.success('Sub-reason created successfully');
    },
    onError: (error) => {
      toast.error(`Failed to create sub-reason: ${error.message}`);
    },
  });
};

// Update a sub-reason
export const useUpdatePSSRSubReason = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ati_scope_ids, ...updates }: {
      id: string;
      name?: string;
      display_order?: number;
      is_active?: boolean;
      requires_ati_scopes?: boolean;
      ati_scope_ids?: string[];
    }) => {
      const { data, error } = await supabase
        .from('pssr_reasons')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      
      // Update ATI scopes if provided
      if (ati_scope_ids !== undefined) {
        await supabase
          .from('pssr_reason_ati_scopes')
          .delete()
          .eq('reason_id', id);
        
        if (ati_scope_ids.length > 0) {
          const { error: scopeError } = await supabase
            .from('pssr_reason_ati_scopes')
            .insert(ati_scope_ids.map(scopeId => ({
              reason_id: id,
              ati_scope_id: scopeId,
            })));
          
          if (scopeError) throw scopeError;
        }
      }
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pssr-reasons'] });
      queryClient.invalidateQueries({ queryKey: ['pssr-reasons-by-category'] });
      queryClient.invalidateQueries({ queryKey: ['pssr-reason-ati-scopes'] });
      toast.success('Sub-reason updated successfully');
    },
    onError: (error) => {
      toast.error(`Failed to update sub-reason: ${error.message}`);
    },
  });
};

// Delete a sub-reason
export const useDeletePSSRSubReason = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('pssr_reasons')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pssr-reasons'] });
      queryClient.invalidateQueries({ queryKey: ['pssr-reasons-by-category'] });
      toast.success('Sub-reason deleted successfully');
    },
    onError: (error) => {
      toast.error(`Failed to delete sub-reason: ${error.message}`);
    },
  });
};

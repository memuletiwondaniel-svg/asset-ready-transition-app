import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type PSSRReasonStatus = 'draft' | 'active' | 'inactive';

export interface PSSRReason {
  id: string;
  name: string;
  display_order: number;
  is_active: boolean;
  category: string | null;
  sub_category: string | null;
  status: PSSRReasonStatus;
  reason_approver_role_ids: string[];
  created_at: string;
  updated_at: string;
}

export interface PSSRReasonSubOption {
  id: string;
  parent_reason_id: string;
  name: string;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PSSRTieInScope {
  id: string;
  code: string;
  description: string;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PSSRMOCScope {
  id: string;
  name: string;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const usePSSRReasons = () => {
  return useQuery({
    queryKey: ['pssr-reasons'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pssr_reasons')
        .select('*')
        .eq('is_active', true)
        .order('display_order');
      
      if (error) throw error;
      return data as PSSRReason[];
    },
  });
};

export const usePSSRReasonSubOptions = (parentReasonId: string | null) => {
  return useQuery({
    queryKey: ['pssr-reason-sub-options', parentReasonId],
    queryFn: async () => {
      if (!parentReasonId) return [];
      
      const { data, error } = await supabase
        .from('pssr_reason_sub_options')
        .select('*')
        .eq('parent_reason_id', parentReasonId)
        .eq('is_active', true)
        .order('display_order');
      
      if (error) throw error;
      return data as PSSRReasonSubOption[];
    },
    enabled: !!parentReasonId,
  });
};

// Re-export from dedicated hook file for backwards compatibility
export { usePSSRTieInScopes } from './usePSSRAtiScopes';

export const usePSSRMOCScopes = () => {
  return useQuery({
    queryKey: ['pssr-moc-scopes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pssr_moc_scopes')
        .select('*')
        .eq('is_active', true)
        .order('display_order');
      
      if (error) throw error;
      return data as PSSRMOCScope[];
    },
  });
};

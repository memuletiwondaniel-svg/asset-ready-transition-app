import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface P2AAuditTrailEntry {
  id: string;
  handover_id: string;
  user_id: string;
  action_type: string;
  entity_type: string;
  entity_id?: string;
  old_values?: any;
  new_values?: any;
  description?: string;
  metadata?: any;
  created_at: string;
}

export const useP2AAuditTrail = (handoverId: string) => {
  const { data: auditTrail, isLoading } = useQuery({
    queryKey: ['p2a-audit-trail', handoverId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('p2a_audit_trail')
        .select('*')
        .eq('handover_id', handoverId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as P2AAuditTrailEntry[];
    },
    enabled: !!handoverId
  });

  return {
    auditTrail,
    isLoading,
  };
};

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface P2APlanSummary {
  id: string;
  name: string;
  status: 'DRAFT' | 'ACTIVE' | 'COMPLETED' | 'ARCHIVED';
  created_at: string;
  updated_at: string;
  project_id: string;
}

/**
 * Fetches the P2A Plan for a project by project_id.
 * Returns the plan summary regardless of whether VCRs exist.
 */
export function useP2APlanByProject(projectId: string) {
  return useQuery({
    queryKey: ['p2a-plan-by-project', projectId],
    queryFn: async (): Promise<P2APlanSummary | null> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const client = supabase as any;

      const { data, error } = await client
        .from('p2a_handover_plans')
        .select('id, name, status, created_at, updated_at, project_id')
        .eq('project_id', projectId)
        .maybeSingle();

      if (error) throw error;
      return data as P2APlanSummary | null;
    },
    enabled: !!projectId,
  });
}

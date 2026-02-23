import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ProjectPSSR {
  id: string;
  pssr_id: string;
  scope: string | null;
  status: string;
  created_at: string;
  asset: string;
  reason: string;
  progress?: number;
}

export function useProjectPSSRs(projectId: string) {
  return useQuery({
    queryKey: ['project-pssrs', projectId],
    queryFn: async () => {
      const { data: pssrs, error } = await supabase
        .from('pssrs')
        .select('id, pssr_id, scope, status, created_at, asset, reason, progress_percentage')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (pssrs || []).map((pssr) => ({
        ...pssr,
        progress: pssr.progress_percentage ?? 0,
      })) as ProjectPSSR[];
    },
    enabled: !!projectId,
  });
}

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
      // Fetch PSSRs linked to this project (by UUID project_id)
      const { data: pssrs, error } = await supabase
        .from('pssrs')
        .select('id, pssr_id, scope, status, created_at, asset, reason')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // For each PSSR, calculate progress from checklist responses
      const pssrsWithProgress = await Promise.all(
        (pssrs || []).map(async (pssr) => {
          const { data: responses } = await supabase
            .from('pssr_checklist_responses')
            .select('id, status, response')
            .eq('pssr_id', pssr.id);

          const total = responses?.length || 0;
          const completed = responses?.filter(
            (r) => r.status === 'approved' || r.response === 'YES' || r.response === 'NA'
          ).length || 0;

          return {
            ...pssr,
            progress: total > 0 ? Math.round((completed / total) * 100) : 0,
          };
        })
      );

      return pssrsWithProgress as ProjectPSSR[];
    },
    enabled: !!projectId,
  });
}

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ProjectVCR {
  id: string;
  vcr_code: string;
  name: string;
  description: string | null;
  status: string;
  target_date: string | null;
  created_at: string;
  progress: number;
  systems_count: number;
}

export function useProjectVCRs(projectId: string) {
  return useQuery({
    queryKey: ['project-vcrs', projectId],
    queryFn: async (): Promise<ProjectVCR[]> => {
      // Use any to avoid deep type inference issues with Supabase client
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const client = supabase as any;

      // First get the handover plan for this project
      const planResult = await client
        .from('p2a_handover_plans')
        .select('id')
        .eq('project_id', projectId)
        .maybeSingle();

      if (planResult.error) throw planResult.error;
      if (!planResult.data) return [];

      const plan = planResult.data;

      // Fetch VCRs (handover points) for this plan
      const vcrsResult = await client
        .from('p2a_handover_points')
        .select('id, vcr_code, name, description, status, target_date, created_at')
        .eq('handover_plan_id', plan.id)
        .order('vcr_code', { ascending: true });

      if (vcrsResult.error) throw vcrsResult.error;
      if (!vcrsResult.data) return [];

      const vcrs = vcrsResult.data;

      // For each VCR, calculate progress from prerequisites and get system counts
      const vcrsWithProgress = await Promise.all(
        vcrs.map(async (vcr: any) => {
          // Get prerequisites count
          const prereqsResult = await client
            .from('p2a_vcr_prerequisites')
            .select('id, status')
            .eq('handover_point_id', vcr.id);

          const prereqs = prereqsResult.data || [];

          // Get systems count
          const systemsResult = await client
            .from('p2a_handover_point_systems')
            .select('id', { count: 'exact', head: true })
            .eq('handover_point_id', vcr.id);

          const systemsCount = systemsResult.count || 0;

          const total = prereqs.length;
          const completed = prereqs.filter(
            (p: any) => p.status === 'ACCEPTED' || p.status === 'READY_FOR_REVIEW'
          ).length;

          return {
            id: vcr.id,
            vcr_code: vcr.vcr_code,
            name: vcr.name,
            description: vcr.description,
            status: vcr.status,
            target_date: vcr.target_date,
            created_at: vcr.created_at,
            progress: total > 0 ? Math.round((completed / total) * 100) : 0,
            systems_count: systemsCount,
          } as ProjectVCR;
        })
      );

      return vcrsWithProgress;
    },
    enabled: !!projectId,
  });
}

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ProjectVCRProgress {
  id: string;
  vcr_code: string;
  progress: number;
}

export interface ProjectP2AProgress {
  vcrs: ProjectVCRProgress[];
  avg: number;
}

export type ProjectsP2AProgressMap = Record<string, ProjectP2AProgress>;

/**
 * Batch-fetch P2A progress for many projects in 3 queries (plans, points, prereqs).
 * Returns a map keyed by project_id.
 */
export function useProjectsP2AProgress(projectIds: string[]) {
  const ids = [...projectIds].sort();

  return useQuery({
    queryKey: ['projects-p2a-progress', ids],
    enabled: ids.length > 0,
    staleTime: 30_000,
    queryFn: async (): Promise<ProjectsP2AProgressMap> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const client = supabase as any;

      const { data: plans, error: plansErr } = await client
        .from('p2a_handover_plans')
        .select('id, project_id')
        .in('project_id', ids);
      if (plansErr) throw plansErr;
      if (!plans?.length) return {};

      const planIds = plans.map((p: any) => p.id);
      const planToProject = new Map<string, string>(plans.map((p: any) => [p.id, p.project_id]));

      const { data: points, error: pointsErr } = await client
        .from('p2a_handover_points')
        .select('id, vcr_code, handover_plan_id')
        .in('handover_plan_id', planIds);
      if (pointsErr) throw pointsErr;

      const pointIds = (points || []).map((p: any) => p.id);
      let prereqs: any[] = [];
      if (pointIds.length) {
        const { data, error } = await client
          .from('p2a_vcr_prerequisites')
          .select('handover_point_id, status')
          .in('handover_point_id', pointIds);
        if (error) throw error;
        prereqs = data || [];
      }

      // Aggregate prereqs per point
      const prereqByPoint = new Map<string, { total: number; completed: number }>();
      prereqs.forEach((pr) => {
        const bucket = prereqByPoint.get(pr.handover_point_id) ?? { total: 0, completed: 0 };
        bucket.total += 1;
        if (pr.status === 'ACCEPTED' || pr.status === 'READY_FOR_REVIEW') bucket.completed += 1;
        prereqByPoint.set(pr.handover_point_id, bucket);
      });

      const result: ProjectsP2AProgressMap = {};
      (points || []).forEach((pt: any) => {
        const projectId = planToProject.get(pt.handover_plan_id);
        if (!projectId) return;
        const stat = prereqByPoint.get(pt.id) ?? { total: 0, completed: 0 };
        const progress = stat.total > 0 ? Math.round((stat.completed / stat.total) * 100) : 0;
        const entry = result[projectId] ?? { vcrs: [], avg: 0 };
        entry.vcrs.push({ id: pt.id, vcr_code: pt.vcr_code, progress });
        result[projectId] = entry;
      });

      Object.values(result).forEach((entry) => {
        entry.vcrs.sort((a, b) => a.vcr_code.localeCompare(b.vcr_code));
        entry.avg = entry.vcrs.length
          ? Math.round(entry.vcrs.reduce((sum, v) => sum + v.progress, 0) / entry.vcrs.length)
          : 0;
      });

      return result;
    },
  });
}

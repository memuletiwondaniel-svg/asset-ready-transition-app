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
  completed: number;
  total: number;
  qualificationCount: number;
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
          .select('id, handover_point_id, status')
          .in('handover_point_id', pointIds);
        if (error) throw error;
        prereqs = data || [];
      }

      // Batch-fetch qualifications and group by project via prereq -> point -> plan -> project
      const prereqIds = prereqs.map((p: any) => p.id);
      let quals: any[] = [];
      if (prereqIds.length) {
        const { data, error } = await client
          .from('p2a_vcr_qualifications')
          .select('vcr_prerequisite_id')
          .in('vcr_prerequisite_id', prereqIds);
        if (error) throw error;
        quals = data || [];
      }
      const prereqToPoint = new Map<string, string>(prereqs.map((p: any) => [p.id, p.handover_point_id]));
      const pointToPlan = new Map<string, string>((points || []).map((p: any) => [p.id, p.handover_plan_id]));
      const qualCountByProject = new Map<string, number>();
      quals.forEach((q: any) => {
        const pointId = prereqToPoint.get(q.vcr_prerequisite_id);
        const planId = pointId ? pointToPlan.get(pointId) : undefined;
        const projectId = planId ? planToProject.get(planId) : undefined;
        if (!projectId) return;
        qualCountByProject.set(projectId, (qualCountByProject.get(projectId) || 0) + 1);
      });

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
        const entry = result[projectId] ?? { vcrs: [], avg: 0, completed: 0, total: 0, qualificationCount: 0 };
        entry.vcrs.push({ id: pt.id, vcr_code: pt.vcr_code, progress });
        entry.completed += stat.completed;
        entry.total += stat.total;
        result[projectId] = entry;
      });

      // Make sure projects with zero VCRs still get an entry if they have qualifications.
      qualCountByProject.forEach((count, projectId) => {
        result[projectId] = result[projectId] ?? { vcrs: [], avg: 0, completed: 0, total: 0, qualificationCount: 0 };
        result[projectId].qualificationCount = count;
      });

      Object.values(result).forEach((entry) => {
        entry.vcrs.sort((a, b) => a.vcr_code.localeCompare(b.vcr_code));
        entry.avg = entry.total > 0
          ? Math.round((entry.completed / entry.total) * 100)
          : 0;
      });

      return result;
    },
  });
}

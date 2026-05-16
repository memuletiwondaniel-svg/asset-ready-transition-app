import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ProjectQualification {
  id: string;
  vcr_prerequisite_id: string;
  reason: string;
  mitigation: string;
  follow_up_action?: string;
  target_date: string;
  action_owner_id?: string;
  action_owner_name?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  reviewer_comments?: string;
  submitted_by?: string;
  reviewed_by?: string;
  submitted_at: string;
  reviewed_at?: string;
  created_at: string;
  updated_at: string;
  prerequisite?: { id: string; summary: string; handover_point_id: string };
  handover_point?: { id: string; name: string; vcr_code: string };
}

/**
 * Lazy fetch of every qualification for a single project, joined with its
 * prerequisite + handover point. Keyed by project UUID.
 */
export function useProjectQualificationsById(projectId: string | null) {
  return useQuery({
    queryKey: ['project-qualifications-by-id', projectId],
    enabled: !!projectId,
    staleTime: 30_000,
    queryFn: async (): Promise<ProjectQualification[]> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const client = supabase as any;

      const { data: plans } = await client
        .from('p2a_handover_plans')
        .select('id')
        .eq('project_id', projectId);
      const planIds = (plans || []).map((p: any) => p.id);
      if (!planIds.length) return [];

      const { data: points } = await client
        .from('p2a_handover_points')
        .select('id, name, vcr_code')
        .in('handover_plan_id', planIds);
      const pointIds = (points || []).map((p: any) => p.id);
      if (!pointIds.length) return [];

      const { data: prereqs } = await client
        .from('p2a_vcr_prerequisites')
        .select('id, summary, handover_point_id')
        .in('handover_point_id', pointIds);
      const prereqIds = (prereqs || []).map((p: any) => p.id);
      if (!prereqIds.length) return [];

      const { data: quals, error } = await client
        .from('p2a_vcr_qualifications')
        .select('*')
        .in('vcr_prerequisite_id', prereqIds)
        .order('submitted_at', { ascending: false });
      if (error) throw error;

      const prereqMap = new Map<string, any>((prereqs || []).map((p: any) => [p.id, p]));
      const pointMap = new Map<string, any>((points || []).map((p: any) => [p.id, p]));

      return (quals || []).map((q: any) => {
        const prereq = prereqMap.get(q.vcr_prerequisite_id);
        const point = prereq ? pointMap.get(prereq.handover_point_id) : null;
        return { ...q, prerequisite: prereq, handover_point: point };
      });
    },
  });
}

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ProjectORPPlan {
  id: string;
  project_id: string;
  phase: 'ASSESS_SELECT' | 'DEFINE' | 'EXECUTE';
  status: 'DRAFT' | 'IN_PROGRESS' | 'PENDING_APPROVAL' | 'APPROVED' | 'COMPLETED';
  created_at: string;
  updated_at: string;
  overall_progress: number;
  deliverable_count: number;
  completed_count: number;
}

const PHASE_LABELS: Record<string, string> = {
  'ASSESS_SELECT': 'Assess & Select',
  'DEFINE': 'Define',
  'EXECUTE': 'Execute',
};

export const useProjectORPPlans = (projectId: string) => {
  return useQuery({
    queryKey: ['project-orp-plans', projectId],
    queryFn: async () => {
      if (!projectId) return [];

      const { data, error } = await supabase
        .from('orp_plans')
        .select(`
          id,
          project_id,
          phase,
          status,
          created_at,
          updated_at,
          deliverables:orp_plan_deliverables(
            id,
            completion_percentage,
            status
          )
        `)
        .eq('project_id', projectId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Transform data to include calculated progress
      const plansWithProgress: ProjectORPPlan[] = (data || []).map((plan) => {
        const deliverables = plan.deliverables || [];
        const deliverableCount = deliverables.length;
        const completedCount = deliverables.filter((d: any) => d.status === 'COMPLETED').length;
        const overallProgress = deliverableCount > 0
          ? Math.round(deliverables.reduce((sum: number, d: any) => sum + (d.completion_percentage || 0), 0) / deliverableCount)
          : 0;

        return {
          id: plan.id,
          project_id: plan.project_id,
          phase: plan.phase,
          status: plan.status,
          created_at: plan.created_at,
          updated_at: plan.updated_at,
          overall_progress: overallProgress,
          deliverable_count: deliverableCount,
          completed_count: completedCount,
        };
      });

      return plansWithProgress;
    },
    enabled: !!projectId,
    staleTime: 60000, // Cache for 1 minute
  });
};

export { PHASE_LABELS };

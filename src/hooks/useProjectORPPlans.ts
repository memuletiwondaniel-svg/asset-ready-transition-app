import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ProjectORPDeliverable {
  id: string;
  name: string;
  status: string;
  start_date: string | null;
  end_date: string | null;
  completion_percentage: number;
  phase: string;
}

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
  upcoming_activities: ProjectORPDeliverable[];
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
            status,
            start_date,
            end_date,
            deliverable:orp_deliverables_catalog(
              id,
              name,
              phase
            )
          )
        `)
        .eq('project_id', projectId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Transform data to include calculated progress and upcoming activities
      const plansWithProgress: ProjectORPPlan[] = (data || []).map((plan) => {
        const deliverables = plan.deliverables || [];
        const deliverableCount = deliverables.length;
        const completedCount = deliverables.filter((d: any) => d.status === 'COMPLETED').length;
        const overallProgress = deliverableCount > 0
          ? Math.round(deliverables.reduce((sum: number, d: any) => sum + (d.completion_percentage || 0), 0) / deliverableCount)
          : 0;

        // Extract upcoming activities (not completed, sorted by start date)
        const upcomingActivities: ProjectORPDeliverable[] = deliverables
          .filter((d: any) => d.status !== 'COMPLETED')
          .map((d: any) => ({
            id: d.id,
            name: d.deliverable?.name || 'Unnamed Activity',
            status: d.status,
            start_date: d.start_date,
            end_date: d.end_date,
            completion_percentage: d.completion_percentage || 0,
            phase: d.deliverable?.phase || plan.phase,
          }))
          .sort((a: ProjectORPDeliverable, b: ProjectORPDeliverable) => {
            // Sort by start_date, nulls last
            if (!a.start_date && !b.start_date) return 0;
            if (!a.start_date) return 1;
            if (!b.start_date) return -1;
            return new Date(a.start_date).getTime() - new Date(b.start_date).getTime();
          })
          .slice(0, 5); // Limit to 5 upcoming activities for widget display

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
          upcoming_activities: upcomingActivities,
        };
      });

      return plansWithProgress;
    },
    enabled: !!projectId,
    staleTime: 60000, // Cache for 1 minute
  });
};

export { PHASE_LABELS };

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ProjectORPActivity {
  id: string;
  name: string;
  status: string;
  start_date: string | null;
  end_date: string | null;
  completion_percentage: number;
  activity_code: string;
  parent_id: string | null;
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
  upcoming_activities: ProjectORPActivity[];
  plan_start_date: string | null;
  plan_end_date: string | null;
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

      // Fetch plans
      const { data: plans, error } = await (supabase as any)
        .from('orp_plans')
        .select('id, project_id, phase, status, created_at, updated_at, wizard_state')
        .eq('project_id', projectId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (!plans || plans.length === 0) return [];

      // For each plan, fetch ora_plan_activities
      const plansWithProgress: ProjectORPPlan[] = await Promise.all(
        (plans as any[]).map(async (plan) => {
          const { data: activities } = await (supabase as any)
            .from('ora_plan_activities')
            .select('id, name, status, start_date, end_date, completion_percentage, activity_code, parent_id')
            .eq('orp_plan_id', plan.id)
            .order('activity_code');

          const hasActivities = activities && activities.length > 0;

          if (hasActivities) {
            // Use materialized activities
            const leafActivities = activities.filter((a: any) => {
              // Leaf = no other activity has this as parent
              return !activities.some((other: any) => other.parent_id === a.id);
            });

            const totalCount = leafActivities.length;
            const completedCount = leafActivities.filter((a: any) => a.status === 'COMPLETED').length;
            const overallProgress = totalCount > 0
              ? Math.round(leafActivities.reduce((sum: number, a: any) => sum + (a.completion_percentage || 0), 0) / totalCount)
              : 0;

            // Get date range
            const allDates = activities
              .filter((a: any) => a.start_date || a.end_date)
              .flatMap((a: any) => [a.start_date, a.end_date].filter(Boolean));
            const planStartDate = allDates.length > 0 ? allDates.sort()[0] : null;
            const planEndDate = allDates.length > 0 ? allDates.sort().reverse()[0] : null;

            // Upcoming: not completed, sorted by start_date
            const upcoming: ProjectORPActivity[] = activities
              .filter((a: any) => a.status !== 'COMPLETED')
              .sort((a: any, b: any) => {
                if (!a.start_date && !b.start_date) return 0;
                if (!a.start_date) return 1;
                if (!b.start_date) return -1;
                return new Date(a.start_date).getTime() - new Date(b.start_date).getTime();
              })
              .slice(0, 10);

            return {
              id: plan.id,
              project_id: plan.project_id,
              phase: plan.phase,
              status: plan.status,
              created_at: plan.created_at,
              updated_at: plan.updated_at,
              overall_progress: overallProgress,
              deliverable_count: totalCount,
              completed_count: completedCount,
              upcoming_activities: upcoming,
              plan_start_date: planStartDate,
              plan_end_date: planEndDate,
            };
          }

          // Fallback: use wizard_state for counts
          const ws = plan.wizard_state as any;
          const wsActivities = ws?.activities || [];
          const selectedCount = wsActivities.filter((a: any) => a.selected).length;

          // Extract dates from wizard_state activities
          const wsDates = wsActivities
            .filter((a: any) => a.selected && (a.startDate || a.endDate))
            .flatMap((a: any) => [a.startDate, a.endDate].filter(Boolean));
          const planStartDate = wsDates.length > 0 ? wsDates.sort()[0] : null;
          const planEndDate = wsDates.length > 0 ? wsDates.sort().reverse()[0] : null;

          // Convert wizard_state activities to upcoming list
          const wsUpcoming: ProjectORPActivity[] = wsActivities
            .filter((a: any) => a.selected)
            .map((a: any) => ({
              id: a.id,
              name: a.activity || a.name || 'Unnamed',
              status: 'NOT_STARTED',
              start_date: a.startDate || null,
              end_date: a.endDate || null,
              completion_percentage: 0,
              activity_code: a.activityCode || '',
              parent_id: a.parentActivityId || null,
            }))
            .sort((a: ProjectORPActivity, b: ProjectORPActivity) => {
              if (!a.start_date && !b.start_date) return 0;
              if (!a.start_date) return 1;
              if (!b.start_date) return -1;
              return new Date(a.start_date).getTime() - new Date(b.start_date).getTime();
            })
            .slice(0, 10);

          return {
            id: plan.id,
            project_id: plan.project_id,
            phase: plan.phase,
            status: plan.status,
            created_at: plan.created_at,
            updated_at: plan.updated_at,
            overall_progress: 0,
            deliverable_count: selectedCount,
            completed_count: 0,
            upcoming_activities: wsUpcoming,
            plan_start_date: planStartDate,
            plan_end_date: planEndDate,
          };
        })
      );

      return plansWithProgress;
    },
    enabled: !!projectId,
    staleTime: 60000,
  });
};

export { PHASE_LABELS };

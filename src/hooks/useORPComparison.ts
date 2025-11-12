import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useORPComparison = (planIds: string[]) => {
  const { data: comparisonData, isLoading } = useQuery({
    queryKey: ['orp-comparison', planIds],
    queryFn: async () => {
      if (planIds.length === 0) return [];

      const { data: plans, error } = await supabase
        .from('orp_plans')
        .select(`
          *,
          project:projects(project_title, project_id_prefix, project_id_number),
          ora_engineer:profiles!orp_plans_ora_engineer_id_fkey(full_name),
          deliverables:orp_plan_deliverables(
            *,
            deliverable:orp_deliverables_catalog(name, description)
          ),
          resources:orp_resources(*),
          approvals:orp_approvals(*)
        `)
        .in('id', planIds);

      if (error) throw error;

      return plans.map((plan: any) => ({
        id: plan.id,
        project_name: plan.project?.project_title,
        project_code: `${plan.project?.project_id_prefix}-${plan.project?.project_id_number}`,
        phase: plan.phase,
        status: plan.status,
        ora_engineer: plan.ora_engineer?.full_name,
        deliverables_count: plan.deliverables?.length || 0,
        total_manhours: plan.deliverables?.reduce((sum: number, d: any) => 
          sum + (parseFloat(d.estimated_manhours) || 0), 0
        ),
        completed_deliverables: plan.deliverables?.filter((d: any) => 
          d.status === 'COMPLETED'
        ).length || 0,
        resources_count: plan.resources?.length || 0,
        approvals_pending: plan.approvals?.filter((a: any) => 
          a.status === 'PENDING'
        ).length || 0,
        deliverables: plan.deliverables || [],
        resources: plan.resources || [],
        created_at: plan.created_at,
        updated_at: plan.updated_at
      }));
    },
    enabled: planIds.length > 0
  });

  return {
    comparisonData,
    isLoading
  };
};

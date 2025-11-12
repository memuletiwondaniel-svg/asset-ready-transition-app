import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const useORMPlans = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: plans, isLoading } = useQuery({
    queryKey: ['orm-plans'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orm_plans')
        .select(`
          *,
          project:projects(project_title, project_id_prefix, project_id_number),
          orm_lead:profiles!orm_plans_orm_lead_id_fkey(full_name),
          deliverables:orm_deliverables(
            *,
            assigned_resource:profiles!orm_deliverables_assigned_resource_id_fkey(full_name)
          )
        `)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    }
  });

  const createPlan = useMutation({
    mutationFn: async (data: {
      project_id: string;
      orm_lead_id: string;
      scope_description?: string;
      estimated_completion_date?: string;
      deliverables: Array<{
        deliverable_type: 'ASSET_REGISTER' | 'PREVENTIVE_MAINTENANCE' | 'BOM_DEVELOPMENT' | 'OPERATING_SPARES' | 'IMS_UPDATE' | 'PM_ACTIVATION';
        assigned_resource_id?: string;
      }>;
    }) => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Not authenticated');

      // Create plan
      const { data: plan, error: planError } = await supabase
        .from('orm_plans')
        .insert({
          project_id: data.project_id,
          orm_lead_id: data.orm_lead_id,
          scope_description: data.scope_description,
          estimated_completion_date: data.estimated_completion_date,
          created_by: user.user.id
        })
        .select()
        .single();

      if (planError) throw planError;

      // Create deliverables
      if (data.deliverables.length > 0) {
        const { error: delError } = await supabase
          .from('orm_deliverables')
          .insert(
            data.deliverables.map(d => ({
              orm_plan_id: plan.id,
              deliverable_type: d.deliverable_type,
              assigned_resource_id: d.assigned_resource_id
            }))
          );

        if (delError) throw delError;
      }

      return plan;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orm-plans'] });
      toast({
        title: 'Success',
        description: 'ORM plan created successfully'
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  return {
    plans,
    isLoading,
    createPlan: createPlan.mutate,
    isCreating: createPlan.isPending
  };
};

export const useORMPlanDetails = (planId: string) => {
  return useQuery({
    queryKey: ['orm-plan', planId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orm_plans')
        .select(`
          *,
          project:projects(*),
          orm_lead:profiles!orm_plans_orm_lead_id_fkey(*),
          deliverables:orm_deliverables(
            *,
            assigned_resource:profiles!orm_deliverables_assigned_resource_id_fkey(*),
            qaqc_reviewer:profiles!orm_deliverables_qaqc_reviewer_id_fkey(*),
            tasks:orm_tasks(*),
            reports:orm_daily_reports(
              *,
              user:profiles!orm_daily_reports_submitted_by_fkey(full_name)
            )
          )
        `)
        .eq('id', planId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!planId
  });
};

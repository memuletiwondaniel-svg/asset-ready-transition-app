import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface ORPPlan {
  id: string;
  project_id: string;
  phase: 'ASSESS_SELECT' | 'DEFINE' | 'EXECUTE';
  ora_engineer_id: string;
  status: 'DRAFT' | 'IN_PROGRESS' | 'PENDING_APPROVAL' | 'APPROVED' | 'COMPLETED';
  created_by: string;
  created_at: string;
  updated_at: string;
  is_active: boolean;
  project?: {
    project_title: string;
    project_id_prefix: string;
    project_id_number: string;
  };
  ora_engineer?: {
    full_name: string;
    position: string;
  };
}

export interface ORPDeliverable {
  id: string;
  name: string;
  phase: 'ASSESS_SELECT' | 'DEFINE' | 'EXECUTE';
  description?: string;
  display_order: number;
  has_sub_options: boolean;
}

export interface ORPPlanDeliverable {
  id: string;
  orp_plan_id: string;
  deliverable_id: string;
  estimated_manhours?: number;
  start_date?: string;
  end_date?: string;
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'ON_HOLD';
  completion_percentage: number;
  comments?: string;
  deliverable?: ORPDeliverable;
}

export const useORPPlans = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: plans, isLoading } = useQuery({
    queryKey: ['orp-plans'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orp_plans')
        .select(`
          *,
          project:projects(project_title, project_id_prefix, project_id_number)
        `)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch ora engineer details separately
      const plansWithEngineers = await Promise.all(
        (data || []).map(async (plan) => {
          const { data: engineer } = await supabase
            .from('profiles')
            .select('full_name, position')
            .eq('user_id', plan.ora_engineer_id)
            .single();

          return {
            ...plan,
            ora_engineer: engineer || undefined
          };
        })
      );

      return plansWithEngineers as ORPPlan[];
    }
  });

  const createPlan = useMutation({
    mutationFn: async (planData: {
      project_id: string;
      phase: 'ASSESS_SELECT' | 'DEFINE' | 'EXECUTE';
      ora_engineer_id: string;
      deliverables: Array<{
        deliverable_id: string;
        estimated_manhours?: number;
        start_date?: string;
        end_date?: string;
        sub_selections?: string[];
      }>;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Create ORP plan
      const { data: plan, error: planError } = await supabase
        .from('orp_plans')
        .insert({
          project_id: planData.project_id,
          phase: planData.phase,
          ora_engineer_id: planData.ora_engineer_id,
          created_by: user.id,
          status: 'DRAFT'
        })
        .select()
        .single();

      if (planError) throw planError;

      // Create plan deliverables
      const deliverables = planData.deliverables.map(d => ({
        orp_plan_id: plan.id,
        deliverable_id: d.deliverable_id,
        estimated_manhours: d.estimated_manhours,
        start_date: d.start_date,
        end_date: d.end_date,
        status: 'NOT_STARTED' as const
      }));

      const { error: deliverablesError } = await supabase
        .from('orp_plan_deliverables')
        .insert(deliverables);

      if (deliverablesError) throw deliverablesError;

      // Create approvals
      const { error: approvalsError } = await supabase
        .from('orp_approvals')
        .insert([
          { orp_plan_id: plan.id, approver_role: 'Project Manager' },
          { orp_plan_id: plan.id, approver_role: 'Plant Director' }
        ]);

      if (approvalsError) throw approvalsError;

      return plan;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orp-plans'] });
      toast({
        title: 'Success',
        description: 'ORP created successfully'
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
    createPlan: createPlan.mutate
  };
};

export const useORPDeliverables = (phase?: 'ASSESS_SELECT' | 'DEFINE' | 'EXECUTE') => {
  return useQuery({
    queryKey: ['orp-deliverables', phase],
    queryFn: async () => {
      let query = supabase
        .from('orp_deliverables_catalog')
        .select('*')
        .eq('is_active', true)
        .order('display_order');

      if (phase) {
        query = query.eq('phase', phase);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as ORPDeliverable[];
    },
    enabled: !!phase
  });
};

export const useORPPlanDetails = (planId: string) => {
  return useQuery({
    queryKey: ['orp-plan', planId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orp_plans')
        .select(`
          *,
          project:projects(*),
          ora_engineer:profiles!orp_plans_ora_engineer_id_fkey(full_name, position, avatar_url),
          deliverables:orp_plan_deliverables(
            *,
            deliverable:orp_deliverables_catalog(*)
          ),
          resources:orp_resources(*),
          approvals:orp_approvals(*)
        `)
        .eq('id', planId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!planId
  });
};

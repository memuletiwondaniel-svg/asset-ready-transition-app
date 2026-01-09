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
        description: 'ORA Plan created successfully'
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

  const updateApproval = useMutation({
    mutationFn: async (data: { approvalId: string; status: 'APPROVED' | 'REJECTED' | 'PENDING'; comments?: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('orp_approvals')
        .update({
          status: data.status,
          comments: data.comments,
          approver_user_id: user.id,
          approved_at: new Date().toISOString()
        })
        .eq('id', data.approvalId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orp-plan'] });
      toast({ title: 'Success', description: 'Approval status updated' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  });

  const addResource = useMutation({
    mutationFn: async (data: { planId: string; name: string; position: string; userId?: string; allocation?: number; role?: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('orp_resources')
        .insert({
          orp_plan_id: data.planId,
          name: data.name,
          position: data.position,
          user_id: data.userId,
          allocation_percentage: data.allocation,
          role_description: data.role
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orp-plan'] });
      toast({ title: 'Success', description: 'Resource added successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  });

  const deleteResource = useMutation({
    mutationFn: async (resourceId: string) => {
      const { error } = await supabase
        .from('orp_resources')
        .delete()
        .eq('id', resourceId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orp-plan'] });
      toast({ title: 'Success', description: 'Resource removed' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  });

  const updateDeliverable = useMutation({
    mutationFn: async (data: { 
      deliverableId: string; 
      status?: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'ON_HOLD'; 
      progress?: number; 
      comments?: string;
      id?: string;
    }) => {
      const updateData: any = {};
      if (data.status) updateData.status = data.status;
      if (data.progress !== undefined) updateData.completion_percentage = data.progress;
      if (data.comments) updateData.comments = data.comments;

      const { error } = await supabase
        .from('orp_plan_deliverables')
        .update(updateData)
        .eq('id', data.deliverableId || data.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orp-plan'] });
      toast({ title: 'Success', description: 'Deliverable updated' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  });

  const addCollaborator = useMutation({
    mutationFn: async (data: { deliverableId: string; userId: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('orp_collaborators')
        .insert({
          plan_deliverable_id: data.deliverableId,
          user_id: data.userId,
          added_by: user.id
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orp-plan'] });
      toast({ title: 'Success', description: 'Collaborator added' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  });

  const removeCollaborator = useMutation({
    mutationFn: async (collaboratorId: string) => {
      const { error } = await supabase
        .from('orp_collaborators')
        .delete()
        .eq('id', collaboratorId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orp-plan'] });
      toast({ title: 'Success', description: 'Collaborator removed' });
    }
  });

  const addDependency = useMutation({
    mutationFn: async (data: { deliverableId: string; predecessorId: string }) => {
      const { error } = await supabase
        .from('orp_deliverable_dependencies')
        .insert({
          deliverable_id: data.deliverableId,
          predecessor_id: data.predecessorId
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orp-plan'] });
      toast({ title: 'Success', description: 'Dependency added' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  });

  const removeDependency = useMutation({
    mutationFn: async (dependencyId: string) => {
      const { error } = await supabase
        .from('orp_deliverable_dependencies')
        .delete()
        .eq('id', dependencyId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orp-plan'] });
      toast({ title: 'Success', description: 'Dependency removed' });
    }
  });

  return {
    plans,
    isLoading,
    createPlan: createPlan.mutate,
    updateApproval: updateApproval.mutate,
    addResource: addResource.mutate,
    deleteResource: deleteResource.mutate,
    updateDeliverable: updateDeliverable.mutate,
    addCollaborator: addCollaborator.mutate,
    removeCollaborator: removeCollaborator.mutate,
    addDependency: addDependency.mutate,
    removeDependency: removeDependency.mutate
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
          deliverables:orp_plan_deliverables(
            *,
            deliverable:orp_deliverables_catalog(*),
            collaborators:orp_collaborators(*),
            dependencies:orp_deliverable_dependencies(*)
          ),
          resources:orp_resources(*),
          approvals:orp_approvals(*)
        `)
        .eq('id', planId)
        .single();

      if (error) throw error;

      // Fetch ora_engineer separately since there's no FK
      let ora_engineer = null;
      if (data?.ora_engineer_id) {
        const { data: engineer } = await supabase
          .from('profiles')
          .select('full_name, position, avatar_url')
          .eq('user_id', data.ora_engineer_id)
          .single();
        ora_engineer = engineer;
      }

      return { ...data, ora_engineer };
    },
    enabled: !!planId
  });
};

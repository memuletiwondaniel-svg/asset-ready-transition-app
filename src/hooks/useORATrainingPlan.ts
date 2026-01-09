import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface ORATrainingPlan {
  id: string;
  ora_plan_id: string;
  title: string;
  description?: string;
  status: 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'IN_EXECUTION' | 'COMPLETED' | 'CANCELLED';
  overall_progress: number;
  total_estimated_cost: number;
  created_by: string;
  created_at: string;
  updated_at: string;
  submitted_at?: string;
  approved_at?: string;
  items?: ORATrainingItem[];
  approvals?: ORATrainingApproval[];
}

export interface ORATrainingItem {
  id: string;
  training_plan_id: string;
  title: string;
  overview?: string;
  detailed_description?: string;
  justification?: string;
  target_audience: string[];
  training_provider?: string;
  duration_hours?: number;
  tentative_date?: string;
  scheduled_date?: string;
  scheduled_end_date?: string;
  estimated_cost: number;
  actual_cost?: number;
  execution_stage: 'NOT_STARTED' | 'MATERIALS_REQUESTED' | 'MATERIALS_UNDER_REVIEW' | 'MATERIALS_APPROVED' | 'PO_ISSUED' | 'TRAINEES_IDENTIFIED' | 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED';
  ta_reviewer_id?: string;
  ta_approval_date?: string;
  po_number?: string;
  po_issued_date?: string;
  po_status?: 'PENDING' | 'ISSUED';
  trainees: string[];
  completion_date?: string;
  notes?: string;
  display_order: number;
  created_at: string;
  materials?: ORATrainingMaterial[];
}

export interface ORATrainingApproval {
  id: string;
  training_plan_id: string;
  approver_role: string;
  approver_user_id?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  comments?: string;
  sequence_order: number;
  approved_at?: string;
  created_at: string;
}

export interface ORATrainingMaterial {
  id: string;
  training_item_id: string;
  file_name: string;
  file_path: string;
  file_type?: string;
  file_size?: number;
  material_type: string;
  uploaded_by: string;
  is_approved: boolean;
  approved_by?: string;
  approved_at?: string;
  created_at: string;
}

export interface ORATrainingItemInput {
  title: string;
  overview?: string;
  detailed_description?: string;
  justification?: string;
  target_audience: string[];
  training_provider?: string;
  duration_hours?: number;
  tentative_date?: string;
  estimated_cost?: number;
}

export const useORATrainingPlans = (oraPlanId?: string) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: trainingPlans, isLoading } = useQuery({
    queryKey: ['ora-training-plans', oraPlanId],
    queryFn: async () => {
      let query = supabase
        .from('ora_training_plans')
        .select(`
          *,
          items:ora_training_items(*),
          approvals:ora_training_approvals(*)
        `)
        .order('created_at', { ascending: false });

      if (oraPlanId) {
        query = query.eq('ora_plan_id', oraPlanId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as ORATrainingPlan[];
    },
    enabled: !!oraPlanId
  });

  const createTrainingPlan = useMutation({
    mutationFn: async (input: { 
      ora_plan_id: string; 
      title: string; 
      description?: string;
      items: ORATrainingItemInput[];
    }) => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Not authenticated');

      // Create training plan
      const { data: plan, error: planError } = await supabase
        .from('ora_training_plans')
        .insert({
          ora_plan_id: input.ora_plan_id,
          title: input.title,
          description: input.description,
          created_by: user.user.id,
          total_estimated_cost: input.items.reduce((sum, i) => sum + (i.estimated_cost || 0), 0)
        })
        .select()
        .single();

      if (planError) throw planError;

      // Create training items
      if (input.items.length > 0) {
        const items = input.items.map((item, idx) => ({
          training_plan_id: plan.id,
          ...item,
          display_order: idx
        }));

        const { error: itemsError } = await supabase
          .from('ora_training_items')
          .insert(items);

        if (itemsError) throw itemsError;
      }

      // Create approval workflow
      const approvalRoles = [
        { role: 'PROJECT_HUB_LEAD', order: 1 },
        { role: 'DEPUTY_PLANT_DIRECTOR', order: 2 },
        { role: 'PLANT_DIRECTOR', order: 3 },
        { role: 'ORA_LEAD', order: 4 }
      ];

      const { error: approvalsError } = await supabase
        .from('ora_training_approvals')
        .insert(approvalRoles.map(a => ({
          training_plan_id: plan.id,
          approver_role: a.role,
          sequence_order: a.order
        })));

      if (approvalsError) throw approvalsError;

      return plan;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ora-training-plans'] });
      toast({ title: 'Success', description: 'Training plan created successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  });

  const submitForApproval = useMutation({
    mutationFn: async (planId: string) => {
      const { error } = await supabase
        .from('ora_training_plans')
        .update({ 
          status: 'PENDING_APPROVAL',
          submitted_at: new Date().toISOString()
        })
        .eq('id', planId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ora-training-plans'] });
      toast({ title: 'Success', description: 'Training plan submitted for approval' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  });

  const updateApproval = useMutation({
    mutationFn: async (data: { 
      approvalId: string; 
      status: 'APPROVED' | 'REJECTED'; 
      comments?: string;
      planId: string;
    }) => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('ora_training_approvals')
        .update({
          status: data.status,
          comments: data.comments,
          approver_user_id: user.user.id,
          approved_at: new Date().toISOString()
        })
        .eq('id', data.approvalId);

      if (error) throw error;

      // Check if all approvals are done
      const { data: approvals } = await supabase
        .from('ora_training_approvals')
        .select('status')
        .eq('training_plan_id', data.planId);

      const allApproved = approvals?.every(a => a.status === 'APPROVED');
      const anyRejected = approvals?.some(a => a.status === 'REJECTED');

      if (allApproved) {
        await supabase
          .from('ora_training_plans')
          .update({ status: 'APPROVED', approved_at: new Date().toISOString() })
          .eq('id', data.planId);
      } else if (anyRejected) {
        await supabase
          .from('ora_training_plans')
          .update({ status: 'DRAFT' })
          .eq('id', data.planId);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ora-training-plans'] });
      toast({ title: 'Success', description: 'Approval updated' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  });

  const updateTrainingItem = useMutation({
    mutationFn: async (data: { itemId: string; updates: Partial<ORATrainingItem> }) => {
      const { error } = await supabase
        .from('ora_training_items')
        .update(data.updates)
        .eq('id', data.itemId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ora-training-plans'] });
      toast({ title: 'Success', description: 'Training item updated' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  });

  const addTrainingItem = useMutation({
    mutationFn: async (data: { planId: string; item: ORATrainingItemInput }) => {
      const { data: existingItems } = await supabase
        .from('ora_training_items')
        .select('display_order')
        .eq('training_plan_id', data.planId)
        .order('display_order', { ascending: false })
        .limit(1);

      const nextOrder = (existingItems?.[0]?.display_order || 0) + 1;

      const { error } = await supabase
        .from('ora_training_items')
        .insert({
          training_plan_id: data.planId,
          ...data.item,
          display_order: nextOrder
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ora-training-plans'] });
      toast({ title: 'Success', description: 'Training item added' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  });

  const deleteTrainingItem = useMutation({
    mutationFn: async (itemId: string) => {
      const { error } = await supabase
        .from('ora_training_items')
        .delete()
        .eq('id', itemId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ora-training-plans'] });
      toast({ title: 'Success', description: 'Training item deleted' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  });

  return {
    trainingPlans,
    isLoading,
    createTrainingPlan: createTrainingPlan.mutate,
    submitForApproval: submitForApproval.mutate,
    updateApproval: updateApproval.mutate,
    updateTrainingItem: updateTrainingItem.mutate,
    addTrainingItem: addTrainingItem.mutate,
    deleteTrainingItem: deleteTrainingItem.mutate,
    isCreating: createTrainingPlan.isPending
  };
};

// Hook for maintenance readiness
export const useORAMaintenanceReadiness = (oraPlanId?: string) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: items, isLoading } = useQuery({
    queryKey: ['ora-maintenance-readiness', oraPlanId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ora_maintenance_readiness')
        .select('*')
        .eq('ora_plan_id', oraPlanId)
        .order('display_order');

      if (error) throw error;
      return data;
    },
    enabled: !!oraPlanId
  });

  const addItem = useMutation({
    mutationFn: async (input: {
      ora_plan_id: string;
      category: string;
      item_name: string;
      description?: string;
      responsible_person?: string;
      target_date?: string;
    }) => {
      const { error } = await supabase
        .from('ora_maintenance_readiness')
        .insert(input);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ora-maintenance-readiness'] });
      toast({ title: 'Success', description: 'Item added' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  });

  const updateItem = useMutation({
    mutationFn: async (data: { id: string; updates: Record<string, any> }) => {
      const { error } = await supabase
        .from('ora_maintenance_readiness')
        .update(data.updates)
        .eq('id', data.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ora-maintenance-readiness'] });
      toast({ title: 'Success', description: 'Item updated' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  });

  const deleteItem = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('ora_maintenance_readiness')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ora-maintenance-readiness'] });
      toast({ title: 'Success', description: 'Item deleted' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  });

  return {
    items,
    isLoading,
    addItem: addItem.mutate,
    updateItem: updateItem.mutate,
    deleteItem: deleteItem.mutate
  };
};

// Hook for maintenance batches (read-only)
export interface ORAMaintenanceBatch {
  id: string;
  ora_plan_id: string;
  component_type: 'ARB' | 'PMS' | 'BOM' | 'IMS' | '2Y_SPARES';
  batch_number: number;
  batch_name: string;
  description: string;
  progress_percent: number;
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'ON_HOLD';
  target_date: string | null;
  completion_date: string | null;
  responsible_person: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export const useORAMaintenanceBatches = (oraPlanId?: string) => {
  const { data: batches, isLoading } = useQuery({
    queryKey: ['ora-maintenance-batches', oraPlanId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ora_maintenance_batches')
        .select('*')
        .eq('ora_plan_id', oraPlanId)
        .order('component_type')
        .order('batch_number');

      if (error) throw error;
      return data as ORAMaintenanceBatch[];
    },
    enabled: !!oraPlanId
  });

  // Group batches by component type
  const batchesByComponent = batches?.reduce((acc, batch) => {
    if (!acc[batch.component_type]) acc[batch.component_type] = [];
    acc[batch.component_type].push(batch);
    return acc;
  }, {} as Record<string, ORAMaintenanceBatch[]>) || {};

  // Calculate component summaries
  const componentSummaries = Object.entries(batchesByComponent).reduce((acc, [key, componentBatches]) => {
    const avgProgress = componentBatches.length > 0
      ? Math.round(componentBatches.reduce((sum, b) => sum + b.progress_percent, 0) / componentBatches.length)
      : 0;
    
    const latestTargetDate = componentBatches
      .filter(b => b.target_date)
      .sort((a, b) => new Date(b.target_date!).getTime() - new Date(a.target_date!).getTime())[0]?.target_date;

    acc[key] = {
      progress: avgProgress,
      targetDate: latestTargetDate,
      batchCount: componentBatches.length,
      completedBatches: componentBatches.filter(b => b.status === 'COMPLETED').length
    };
    return acc;
  }, {} as Record<string, { progress: number; targetDate: string | null; batchCount: number; completedBatches: number }>);

  return {
    batches,
    batchesByComponent,
    componentSummaries,
    isLoading
  };
};

// Hook for handover items
export const useORAHandoverItems = (oraPlanId?: string) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: items, isLoading } = useQuery({
    queryKey: ['ora-handover-items', oraPlanId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ora_handover_items')
        .select('*')
        .eq('ora_plan_id', oraPlanId)
        .order('display_order');

      if (error) throw error;
      return data;
    },
    enabled: !!oraPlanId
  });

  const addItem = useMutation({
    mutationFn: async (input: {
      ora_plan_id: string;
      category: string;
      item_name: string;
      description?: string;
      from_party?: string;
      to_party?: string;
    }) => {
      const { error } = await supabase
        .from('ora_handover_items')
        .insert(input);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ora-handover-items'] });
      toast({ title: 'Success', description: 'Handover item added' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  });

  const updateItem = useMutation({
    mutationFn: async (data: { id: string; updates: Record<string, any> }) => {
      const { error } = await supabase
        .from('ora_handover_items')
        .update(data.updates)
        .eq('id', data.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ora-handover-items'] });
      toast({ title: 'Success', description: 'Item updated' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  });

  const deleteItem = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('ora_handover_items')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ora-handover-items'] });
      toast({ title: 'Success', description: 'Item deleted' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  });

  return {
    items,
    isLoading,
    addItem: addItem.mutate,
    updateItem: updateItem.mutate,
    deleteItem: deleteItem.mutate
  };
};

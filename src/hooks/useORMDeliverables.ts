import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const useORMDeliverables = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const updateDeliverable = useMutation({
    mutationFn: async (data: {
      deliverableId: string;
      updates: {
        workflow_stage?: 'IN_PROGRESS' | 'QAQC_REVIEW' | 'LEAD_REVIEW' | 'CENTRAL_TEAM_REVIEW' | 'APPROVED' | 'REJECTED';
        progress_percentage?: number;
        assigned_resource_id?: string;
        qaqc_reviewer_id?: string;
      };
      from_stage?: string;
      deliverable_type?: string;
      project_name?: string;
    }) => {
      const { error } = await supabase
        .from('orm_deliverables')
        .update(data.updates)
        .eq('id', data.deliverableId);

      if (error) throw error;

      // If workflow stage changed, send notification
      if (data.updates.workflow_stage && data.from_stage && data.from_stage !== data.updates.workflow_stage) {
        const { data: user } = await supabase.auth.getUser();
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('user_id', user.user?.id)
          .single();

        // Get deliverable details for reviewer notification
        const { data: deliverable } = await supabase
          .from('orm_deliverables')
          .select('deliverable_type, qaqc_reviewer_id, orm_plan_id')
          .eq('id', data.deliverableId)
          .single();

        await supabase.functions.invoke('send-orm-workflow-notification', {
          body: {
            deliverable_id: data.deliverableId,
            from_stage: data.from_stage,
            to_stage: data.updates.workflow_stage,
            deliverable_type: data.deliverable_type,
            project_name: data.project_name,
            submitted_by_name: profile?.full_name || 'Unknown'
          }
        });

        // Create in-app notification for reviewer
        if (deliverable?.qaqc_reviewer_id) {
          await supabase.functions.invoke('create-orm-notification', {
            body: {
              userId: deliverable.qaqc_reviewer_id,
              type: 'WORKFLOW_CHANGE',
              title: 'Deliverable Ready for Review',
              message: `${deliverable.deliverable_type} deliverable moved to ${data.updates.workflow_stage}`,
              entityType: 'deliverable',
              entityId: data.deliverableId,
              metadata: { 
                planId: deliverable.orm_plan_id,
                oldStage: data.from_stage,
                newStage: data.updates.workflow_stage
              }
            }
          });
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orm-plans'] });
      queryClient.invalidateQueries({ queryKey: ['orm-plan'] });
      toast({
        title: 'Success',
        description: 'Deliverable updated successfully'
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

  const submitForReview = useMutation({
    mutationFn: async (data: { 
      deliverableId: string; 
      deliverable_type: string; 
      project_name: string;
    }) => {
      const { data: user } = await supabase.auth.getUser();
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('user_id', user.user?.id)
        .single();

      const { error } = await supabase
        .from('orm_deliverables')
        .update({
          workflow_stage: 'QAQC_REVIEW',
          progress_percentage: 100
        })
        .eq('id', data.deliverableId);

      if (error) throw error;

      // Send notification
      await supabase.functions.invoke('send-orm-workflow-notification', {
        body: {
          deliverable_id: data.deliverableId,
          from_stage: 'IN_PROGRESS',
          to_stage: 'QAQC_REVIEW',
          deliverable_type: data.deliverable_type,
          project_name: data.project_name,
          submitted_by_name: profile?.full_name || 'Unknown'
        }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orm-plans'] });
      queryClient.invalidateQueries({ queryKey: ['orm-plan'] });
      toast({
        title: 'Success',
        description: 'Submitted for QA/QC review'
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
    updateDeliverable: updateDeliverable.mutate,
    submitForReview: submitForReview.mutate,
    isUpdating: updateDeliverable.isPending
  };
};

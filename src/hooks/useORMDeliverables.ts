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
    }) => {
      const { error } = await supabase
        .from('orm_deliverables')
        .update(data.updates)
        .eq('id', data.deliverableId);

      if (error) throw error;
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
    mutationFn: async (deliverableId: string) => {
      const { error } = await supabase
        .from('orm_deliverables')
        .update({
          workflow_stage: 'QAQC_REVIEW',
          progress_percentage: 100
        })
        .eq('id', deliverableId);

      if (error) throw error;
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

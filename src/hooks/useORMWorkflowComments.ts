import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const useORMWorkflowComments = (deliverableId?: string) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: comments, isLoading } = useQuery({
    queryKey: ['orm-workflow-comments', deliverableId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orm_workflow_comments')
        .select(`
          *,
          user:profiles!orm_workflow_comments_user_id_fkey(full_name, avatar_url)
        `)
        .eq('deliverable_id', deliverableId!)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!deliverableId
  });

  const addComment = useMutation({
    mutationFn: async (data: {
      deliverable_id: string;
      comment: string;
      workflow_stage: 'IN_PROGRESS' | 'QAQC_REVIEW' | 'LEAD_REVIEW' | 'CENTRAL_TEAM_REVIEW' | 'APPROVED' | 'REJECTED';
    }) => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('orm_workflow_comments')
        .insert({
          deliverable_id: data.deliverable_id,
          user_id: user.user.id,
          comment: data.comment,
          workflow_stage: data.workflow_stage
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orm-workflow-comments'] });
      toast({
        title: 'Success',
        description: 'Comment added successfully'
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
    comments,
    isLoading,
    addComment: addComment.mutate,
    isAdding: addComment.isPending
  };
};

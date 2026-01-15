import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export const useDisciplineComments = (pssrId: string) => {
  const queryClient = useQueryClient();

  const updateDisciplineComment = useMutation({
    mutationFn: async ({ 
      reviewId, 
      comment 
    }: { 
      reviewId: string; 
      comment: string;
    }) => {
      const { data, error } = await supabase
        .from('pssr_discipline_reviews')
        .update({
          discipline_comment: comment,
          updated_at: new Date().toISOString(),
        })
        .eq('id', reviewId)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pssr-discipline-reviews', pssrId] });
      queryClient.invalidateQueries({ queryKey: ['pssr-interdisciplinary', pssrId] });
      toast({
        title: 'Comment Updated',
        description: 'Your discipline comment has been saved successfully.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Update Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  return {
    updateDisciplineComment,
  };
};

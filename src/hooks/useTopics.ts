import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// Hook to get unique topics from checklist items
export const useTopics = () => {
  return useQuery({
    queryKey: ['topics'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('checklist_items')
        .select('topic')
        .not('topic', 'is', null)
        .not('topic', 'eq', '')
        .eq('is_active', true);
      
      if (error) throw error;
      
      // Get unique topics
      const uniqueTopics = [...new Set(data.map(item => item.topic).filter(Boolean))];
      return uniqueTopics.sort();
    },
  });
};

// Hook to add a new topic (we'll store it by creating a temporary checklist item)
export const useAddTopic = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (topic: string) => {
      // For now, we'll just invalidate the query since topics come from existing items
      // In a real app, you might want to store custom topics in a separate table
      return topic;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['topics'] });
    },
  });
};
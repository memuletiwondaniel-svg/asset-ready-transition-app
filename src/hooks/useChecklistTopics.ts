import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ChecklistTopic {
  id: string;
  name: string;
  description?: string;
  display_order?: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateChecklistTopicData {
  name: string;
  description?: string;
  display_order?: number;
}

// Fetch all checklist topics
export const useChecklistTopics = () => {
  return useQuery({
    queryKey: ['checklist-topics'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('checklist_topics')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (error) throw error;
      return data as ChecklistTopic[];
    },
  });
};

// Create a new checklist topic
export const useCreateChecklistTopic = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (topicData: CreateChecklistTopicData) => {
      const { data, error } = await supabase
        .from('checklist_topics')
        .insert([topicData])
        .select()
        .single();

      if (error) throw error;
      return data as ChecklistTopic;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checklist-topics'] });
    },
  });
};

// Update a checklist topic
export const useUpdateChecklistTopic = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updateData }: Partial<ChecklistTopic> & { id: string }) => {
      const { data, error } = await supabase
        .from('checklist_topics')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as ChecklistTopic;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checklist-topics'] });
    },
  });
};

// Delete (deactivate) a checklist topic
export const useDeleteChecklistTopic = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('checklist_topics')
        .update({ is_active: false })
        .eq('id', id);

      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checklist-topics'] });
    },
  });
};
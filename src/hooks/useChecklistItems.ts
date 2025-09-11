import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// Define the ChecklistItem type to match the actual database structure
export interface ChecklistItem {
  unique_id: string;
  description: string;
  category: string;
  topic?: string;
  required_evidence?: string;
  responsible?: string;
  Approver?: string;
  is_active: boolean;
  version: number;
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
  category_ref_id?: string;
  sequence_number?: number;
}

export const useChecklistItems = () => {
  return useQuery({
    queryKey: ['checklist-items'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('checklist_items')
        .select('*')
        .eq('is_active', true)
        .order('category', { ascending: true })
        .order('sequence_number', { ascending: true });

      if (error) throw error;
      return data as ChecklistItem[];
    },
  });
};

export const useChecklistCategories = () => {
  return useQuery({
    queryKey: ['checklist-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('checklist_items')
        .select('category')
        .eq('is_active', true);

      if (error) throw error;
      
      const categories = [...new Set(data.map(item => item.category))];
      return categories.sort();
    },
  });
};

export const useChecklistTopics = () => {
  return useQuery({
    queryKey: ['checklist-topics'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('checklist_items')
        .select('topic')
        .eq('is_active', true);

      if (error) throw error;
      
      const uniqueTopics = [...new Set(data?.map(item => item.topic).filter(Boolean))];
      return uniqueTopics.sort();
    },
  });
};

export interface UpdateChecklistItemData {
  description?: string;
  category?: string;
  topic?: string;
  required_evidence?: string;
  responsible?: string;
  Approver?: string;
  is_active?: boolean;
}

export const useUpdateChecklistItem = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ itemId, updateData }: { itemId: string; updateData: UpdateChecklistItemData }) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('checklist_items')
        .update({
          ...updateData,
          updated_by: session.user.id,
          updated_at: new Date().toISOString(),
        })
        .eq('unique_id', itemId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (updatedItem) => {
      console.log('Update successful, updating cache and invalidating queries...', updatedItem);
      queryClient.setQueryData<ChecklistItem[] | undefined>(['checklist-items'], (prev) => {
        if (!prev) return prev;
        return prev.map((item) => (item.unique_id === updatedItem.unique_id ? (updatedItem as ChecklistItem) : item));
      });
      queryClient.invalidateQueries({ queryKey: ['checklist-items'] });
      queryClient.invalidateQueries({ queryKey: ['checklist-categories'] });
    },
  });
};

export interface CreateChecklistItemData {
  description: string;
  category: string;
  topic?: string;
  required_evidence?: string;
  responsible?: string;
  Approver?: string;
}

export const useCreateChecklistItem = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (itemData: CreateChecklistItemData) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('checklist_items')
        .insert({
          ...itemData,
          created_by: session.user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checklist-items'] });
      queryClient.invalidateQueries({ queryKey: ['checklist-categories'] });
    },
  });
};

export const useDeleteChecklistItem = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (itemId: string) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('checklist_items')
        .update({ 
          is_active: false,
          updated_by: session.user.id,
          updated_at: new Date().toISOString(),
        })
        .eq('unique_id', itemId);

      if (error) throw error;
      return itemId;
    },
    onMutate: async (itemId: string) => {
      await queryClient.cancelQueries({ queryKey: ['checklist-items'] });
      const previousItems = queryClient.getQueryData<ChecklistItem[]>(['checklist-items']);
      if (previousItems) {
        queryClient.setQueryData<ChecklistItem[]>(['checklist-items'], previousItems.filter(i => i.unique_id !== itemId));
      }
      return { previousItems };
    },
    onError: (_err, _itemId, context) => {
      if (context?.previousItems) {
        queryClient.setQueryData(['checklist-items'], context.previousItems);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['checklist-items'] });
      queryClient.invalidateQueries({ queryKey: ['checklist-categories'] });
    },
  });
};
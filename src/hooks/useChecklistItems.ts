import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';

export type ChecklistItem = Tables<'checklist_items'>;

export const useChecklistItems = () => {
  return useQuery({
    queryKey: ['checklist-items'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('checklist_items')
        .select('*')
        .eq('is_active', true)
        .order('category', { ascending: true })
        .order('id', { ascending: true });

      if (error) throw error;
      return data;
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

export interface UpdateChecklistItemData {
  description?: string;
  category?: string;
  topic?: string;
  supporting_evidence?: string;
  responsible_party?: string;
  approving_authority?: string;
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
        .eq('id', itemId)
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

export interface CreateChecklistItemData {
  id: string;
  description: string;
  category: string;
  topic?: string;
  supporting_evidence?: string;
  responsible_party?: string;
  approving_authority?: string;
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
        .eq('id', itemId);

      if (error) throw error;
      return itemId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checklist-items'] });
      queryClient.invalidateQueries({ queryKey: ['checklist-categories'] });
    },
  });
};

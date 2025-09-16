import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ChecklistCategory {
  id: string;
  name: string;
  description?: string;
  display_order?: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateChecklistCategoryData {
  name: string;
  description?: string;
  display_order?: number;
}

// Fetch all checklist categories
export const useChecklistCategories = () => {
  return useQuery({
    queryKey: ['checklist-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('checklist_categories')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (error) throw error;
      return data as ChecklistCategory[];
    },
  });
};

// Create a new checklist category
export const useCreateChecklistCategory = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (categoryData: CreateChecklistCategoryData) => {
      const { data, error } = await supabase
        .from('checklist_categories')
        .insert([categoryData])
        .select()
        .single();

      if (error) throw error;
      return data as ChecklistCategory;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checklist-categories'] });
    },
  });
};

// Update a checklist category
export const useUpdateChecklistCategory = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updateData }: Partial<ChecklistCategory> & { id: string }) => {
      const { data, error } = await supabase
        .from('checklist_categories')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as ChecklistCategory;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checklist-categories'] });
    },
  });
};

// Delete (deactivate) a checklist category
export const useDeleteChecklistCategory = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('checklist_categories')
        .update({ is_active: false })
        .eq('id', id);

      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checklist-categories'] });
    },
  });
};
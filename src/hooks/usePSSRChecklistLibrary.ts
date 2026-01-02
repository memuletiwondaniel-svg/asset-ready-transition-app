import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ChecklistCategory {
  id: string;
  name: string;
  ref_id: string;
  description: string | null;
  display_order: number;
  is_active: boolean;
}

export interface ChecklistItem {
  id: string;
  unique_id: string;
  category_id: string;
  topic: string | null;
  description: string;
  supporting_evidence: string | null;
  approving_authority: string | null;
  responsible_party: string | null;
  sequence_number: number;
  is_active: boolean;
  version: number;
  created_at: string;
  updated_at: string;
  category?: ChecklistCategory;
}

export const usePSSRChecklistCategories = () => {
  return useQuery({
    queryKey: ['pssr-checklist-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pssr_checklist_categories')
        .select('*')
        .order('display_order', { ascending: true });

      if (error) throw error;
      return data as ChecklistCategory[];
    },
  });
};

export const usePSSRChecklistItems = () => {
  return useQuery({
    queryKey: ['pssr-checklist-items'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pssr_checklist_items')
        .select(`
          *,
          category:pssr_checklist_categories(*)
        `)
        .order('category_id', { ascending: true })
        .order('sequence_number', { ascending: true });

      if (error) throw error;
      return data as ChecklistItem[];
    },
  });
};

export const useCreateChecklistItem = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (item: Omit<ChecklistItem, 'id' | 'created_at' | 'updated_at' | 'category' | 'topic'>) => {
      const { data, error } = await supabase
        .from('pssr_checklist_items')
        .insert(item)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pssr-checklist-items'] });
      toast.success('Checklist item created successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create checklist item');
    },
  });
};

export const useUpdateChecklistItem = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ChecklistItem> & { id: string }) => {
      const { data, error } = await supabase
        .from('pssr_checklist_items')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pssr-checklist-items'] });
      toast.success('Checklist item updated successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update checklist item');
    },
  });
};

export const useDeleteChecklistItem = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('pssr_checklist_items')
        .update({ is_active: false })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pssr-checklist-items'] });
      toast.success('Checklist item deleted successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete checklist item');
    },
  });
};

export const useCreateChecklistCategory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (category: { name: string; ref_id: string; description?: string }) => {
      const { data: existing } = await supabase
        .from('pssr_checklist_categories')
        .select('display_order')
        .order('display_order', { ascending: false })
        .limit(1);

      const nextOrder = (existing?.[0]?.display_order || 0) + 1;

      const { data, error } = await supabase
        .from('pssr_checklist_categories')
        .insert({ ...category, display_order: nextOrder })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pssr-checklist-categories'] });
      toast.success('Category created successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create category');
    },
  });
};

export const useUpdateChecklistCategory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ChecklistCategory> & { id: string }) => {
      const { data, error } = await supabase
        .from('pssr_checklist_categories')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pssr-checklist-categories'] });
      toast.success('Category updated successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update category');
    },
  });
};

export const useDeleteChecklistCategory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('pssr_checklist_categories')
        .update({ is_active: false })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pssr-checklist-categories'] });
      toast.success('Category deleted successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete category');
    },
  });
};


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
  category: string;
  topic: string | null;
  description: string;
  supporting_evidence: string | null;
  approvers: string | null;
  responsible: string | null;
  sequence_number: number;
  is_active: boolean;
  version: number;
  created_at: string;
  updated_at: string;
  categoryData?: ChecklistCategory;
}

export interface ChecklistRole {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
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
          categoryData:pssr_checklist_categories(*)
        `)
        .eq('is_active', true)
        .order('category', { ascending: true })
        .order('sequence_number', { ascending: true });

      if (error) throw error;
      return data as ChecklistItem[];
    },
  });
};

export const usePSSRChecklistRoles = () => {
  return useQuery({
    queryKey: ['pssr-checklist-roles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('roles')
        .select('id, name, description, is_active')
        .eq('is_active', true)
        .order('name', { ascending: true });

      if (error) throw error;
      return data as ChecklistRole[];
    },
  });
};

export const useCreateChecklistItem = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (item: Omit<ChecklistItem, 'id' | 'created_at' | 'updated_at' | 'categoryData'>) => {
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
    mutationFn: async ({ 
      id, 
      oldCategory, 
      ...updates 
    }: Partial<ChecklistItem> & { id: string; oldCategory?: string }) => {
      const categoryChanged = oldCategory && updates.category && oldCategory !== updates.category;

      if (categoryChanged) {
        // Get the next sequence number for the new category
        const { data: newCategoryItems } = await supabase
          .from('pssr_checklist_items')
          .select('sequence_number')
          .eq('category', updates.category)
          .eq('is_active', true)
          .order('sequence_number', { ascending: false })
          .limit(1);

        const newSequenceNumber = (newCategoryItems?.[0]?.sequence_number || 0) + 1;
        updates.sequence_number = newSequenceNumber;
      }

      // Update the item
      const { data, error } = await supabase
        .from('pssr_checklist_items')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // If category changed, resequence the old category to close the gap
      if (categoryChanged && oldCategory) {
        const { data: oldCategoryItems } = await supabase
          .from('pssr_checklist_items')
          .select('id, sequence_number')
          .eq('category', oldCategory)
          .eq('is_active', true)
          .order('sequence_number', { ascending: true });

        if (oldCategoryItems) {
          // Resequence items starting from 1
          for (let i = 0; i < oldCategoryItems.length; i++) {
            if (oldCategoryItems[i].sequence_number !== i + 1) {
              await supabase
                .from('pssr_checklist_items')
                .update({ sequence_number: i + 1 })
                .eq('id', oldCategoryItems[i].id);
            }
          }
        }
      }

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
    mutationFn: async ({ id, categoryId }: { id: string; categoryId: string }) => {
      // Mark item as inactive
      const { error } = await supabase
        .from('pssr_checklist_items')
        .update({ is_active: false })
        .eq('id', id);

      if (error) throw error;

      // Resequence the category to close the gap
      const { data: categoryItems } = await supabase
        .from('pssr_checklist_items')
        .select('id, sequence_number')
        .eq('category', categoryId)
        .eq('is_active', true)
        .order('sequence_number', { ascending: true });

      if (categoryItems) {
        for (let i = 0; i < categoryItems.length; i++) {
          if (categoryItems[i].sequence_number !== i + 1) {
            await supabase
              .from('pssr_checklist_items')
              .update({ sequence_number: i + 1 })
              .eq('id', categoryItems[i].id);
          }
        }
      }
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


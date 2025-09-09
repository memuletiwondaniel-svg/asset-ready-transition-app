import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';

export type ChecklistItem = Tables<'checklist_items'>;

export interface ChecklistUploadResult {
  processed: number;
  added: number;
  updated: number;
  failed: number;
  errors: string[];
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

export const useUploadChecklist = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (file: File): Promise<ChecklistUploadResult> => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('User not authenticated');
      }

      const formData = new FormData();
      formData.append('file', file);

      const response = await supabase.functions.invoke('process-checklist-excel', {
        body: formData,
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      return response.data;
    },
    onSuccess: () => {
      // Invalidate and refetch checklist data
      queryClient.invalidateQueries({ queryKey: ['checklist-items'] });
      queryClient.invalidateQueries({ queryKey: ['checklist-categories'] });
    },
  });
};

export const useChecklistUploads = () => {
  return useQuery({
    queryKey: ['checklist-uploads'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('checklist_uploads')
        .select('*')
        .order('uploaded_at', { ascending: false });

      if (error) throw error;
      return data;
    },
  });
};
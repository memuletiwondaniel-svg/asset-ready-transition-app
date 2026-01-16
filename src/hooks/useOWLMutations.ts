import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from './use-toast';
import type { OWLSource, OWLStatus, OutstandingWorkItem } from './useOutstandingWorkList';

/**
 * Lightweight hook that only provides mutations for OWL items.
 * Use this instead of useOutstandingWorkItems when you only need CRUD operations
 * and don't want to fetch all items.
 */
export function useOWLMutations() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: async (item: {
      project_id?: string | null;
      source: OWLSource;
      source_id?: string | null;
      title: string;
      description?: string | null;
      priority?: number | null;
      status: OWLStatus;
      action_party_role_id?: string | null;
      assigned_to?: string | null;
      due_date?: string | null;
      completed_date?: string | null;
      comments?: string | null;
      created_by?: string | null;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const insertData = {
        ...item,
        created_by: user?.id || item.created_by,
      };
      
      const { data, error } = await supabase
        .from('outstanding_work_items')
        .insert(insertData as any)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['owl-items'] });
      queryClient.invalidateQueries({ queryKey: ['owl-stats'] });
      queryClient.invalidateQueries({ queryKey: ['user-owl-items'] });
      toast({ title: 'Success', description: 'Work item created successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Partial<OutstandingWorkItem>) => {
      const { data, error } = await supabase
        .from('outstanding_work_items')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['owl-items'] });
      queryClient.invalidateQueries({ queryKey: ['owl-stats'] });
      queryClient.invalidateQueries({ queryKey: ['user-owl-items'] });
      toast({ title: 'Success', description: 'Work item updated successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('outstanding_work_items')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['owl-items'] });
      queryClient.invalidateQueries({ queryKey: ['owl-stats'] });
      queryClient.invalidateQueries({ queryKey: ['user-owl-items'] });
      toast({ title: 'Success', description: 'Work item deleted successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  return {
    createItem: createMutation.mutate,
    updateItem: updateMutation.mutate,
    deleteItem: deleteMutation.mutate,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}

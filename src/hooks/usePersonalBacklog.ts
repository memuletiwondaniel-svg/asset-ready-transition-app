import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';

export type BacklogStatus = 'pending' | 'in_progress' | 'done';

export interface BacklogItem {
  id: string;
  user_id: string;
  description: string;
  priority: 'low' | 'normal' | 'high';
  status: BacklogStatus;
  sort_order: number;
  group_id: string | null;
  created_at: string;
  completed_at: string | null;
  updated_at: string;
}

export const usePersonalBacklog = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const query = useQuery({
    queryKey: ['personal-backlog'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('personal_backlog')
        .select('*')
        .eq('user_id', user.id)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as BacklogItem[];
    },
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['personal-backlog'] });

  const addItem = useMutation({
    mutationFn: async ({ description, priority = 'normal', group_id, status = 'pending' }: { description: string; priority?: string; group_id?: string | null; status?: BacklogStatus }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase.from('personal_backlog').insert({
        user_id: user.id,
        description,
        priority,
        group_id: group_id || null,
        status,
      });
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError: (e) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: BacklogStatus }) => {
      const { error } = await supabase.from('personal_backlog').update({
        status,
        completed_at: status === 'done' ? new Date().toISOString() : null,
      }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const updateDescription = useMutation({
    mutationFn: async ({ id, description }: { id: string; description: string }) => {
      const { error } = await supabase.from('personal_backlog').update({ description }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const updatePriority = useMutation({
    mutationFn: async ({ id, priority }: { id: string; priority: string }) => {
      const { error } = await supabase.from('personal_backlog').update({ priority }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const deleteItem = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('personal_backlog').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const moveToGroup = useMutation({
    mutationFn: async ({ id, group_id }: { id: string; group_id: string | null }) => {
      const { error } = await supabase.from('personal_backlog').update({ group_id }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  return {
    items: query.data ?? [],
    isLoading: query.isLoading,
    addItem,
    updateStatus,
    updateDescription,
    updatePriority,
    deleteItem,
    moveToGroup,
  };
};

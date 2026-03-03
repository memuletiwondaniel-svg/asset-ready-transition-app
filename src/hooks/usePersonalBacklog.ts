import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';

export interface BacklogItem {
  id: string;
  user_id: string;
  description: string;
  priority: 'low' | 'normal' | 'high';
  status: 'pending' | 'done';
  sort_order: number;
  group_id: string | null;
  created_at: string;
  completed_at: string | null;
  updated_at: string;
}

export const usePersonalBacklog = (filter: 'all' | 'pending' | 'done' = 'all', groupId?: string | null) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const query = useQuery({
    queryKey: ['personal-backlog', filter, groupId],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      let q = supabase
        .from('personal_backlog')
        .select('*')
        .eq('user_id', user.id)
        .order('status', { ascending: true })
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: false });

      if (filter !== 'all') {
        q = q.eq('status', filter);
      }

      const { data, error } = await q;
      if (error) throw error;
      return data as BacklogItem[];
    },
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['personal-backlog'] });

  const addItem = useMutation({
    mutationFn: async ({ description, priority = 'normal', group_id }: { description: string; priority?: string; group_id?: string | null }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase.from('personal_backlog').insert({
        user_id: user.id,
        description,
        priority,
        group_id: group_id || null,
      });
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError: (e) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const toggleStatus = useMutation({
    mutationFn: async ({ id, currentStatus }: { id: string; currentStatus: string }) => {
      const newStatus = currentStatus === 'pending' ? 'done' : 'pending';
      const { error } = await supabase.from('personal_backlog').update({
        status: newStatus,
        completed_at: newStatus === 'done' ? new Date().toISOString() : null,
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
    toggleStatus,
    updateDescription,
    updatePriority,
    deleteItem,
    moveToGroup,
  };
};

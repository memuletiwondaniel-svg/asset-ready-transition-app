import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';

export interface BacklogGroup {
  id: string;
  user_id: string;
  name: string;
  sort_order: number;
  created_at: string;
}

export const useBacklogGroups = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['backlog-groups'] });

  const query = useQuery({
    queryKey: ['backlog-groups'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('backlog_groups')
        .select('*')
        .eq('user_id', user.id)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data as BacklogGroup[];
    },
  });

  const addGroup = useMutation({
    mutationFn: async (name: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase.from('backlog_groups').insert({
        user_id: user.id,
        name,
        sort_order: (query.data?.length ?? 0),
      });
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError: (e) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const renameGroup = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const { error } = await supabase.from('backlog_groups').update({ name }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const deleteGroup = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('backlog_groups').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      queryClient.invalidateQueries({ queryKey: ['personal-backlog'] });
    },
  });

  return {
    groups: query.data ?? [],
    isLoading: query.isLoading,
    addGroup,
    renameGroup,
    deleteGroup,
  };
};

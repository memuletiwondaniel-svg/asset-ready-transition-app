import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from './use-toast';
import { useAuth } from '@/components/enhanced-auth/AuthProvider';
import { useEffect } from 'react';

export type OWLSource = 'PUNCHLIST' | 'PSSR' | 'PAC' | 'FAC';
export type OWLStatus = 'OPEN' | 'IN_PROGRESS' | 'CLOSED' | 'CANCELLED';

export interface UserOWLItem {
  id: string;
  item_number: string;
  project_id: string | null;
  source: OWLSource;
  source_id: string | null;
  title: string;
  description: string | null;
  priority: number | null;
  status: OWLStatus;
  action_party_role_id: string | null;
  assigned_to: string | null;
  due_date: string | null;
  completed_date: string | null;
  comments: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  project?: { id: string; name: string; code: string };
  action_role?: { id: string; name: string };
}

export function useUserOWLItems() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const query = useQuery({
    queryKey: ['user-owl-items', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('outstanding_work_items')
        .select(`
          *,
          project:projects(id, project_title, project_id_prefix, project_id_number),
          action_role:roles!outstanding_work_items_action_party_role_id_fkey(id, name)
        `)
        .eq('assigned_to', user.id)
        .in('status', ['OPEN', 'IN_PROGRESS'])
        .order('priority', { ascending: true })
        .order('due_date', { ascending: true, nullsFirst: false })
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Transform the data
      return (data || []).map(item => {
        const projectData = item.project as { id: string; project_title: string; project_id_prefix: string; project_id_number: string } | null;
        const projectCode = projectData ? `${projectData.project_id_prefix}-${projectData.project_id_number}` : '';
        return {
          ...item,
          project: projectData ? { id: projectData.id, name: projectData.project_title, code: projectCode } : undefined,
          action_role: item.action_role as { id: string; name: string } | undefined,
        };
      }) as UserOWLItem[];
    },
    enabled: !!user?.id,
    staleTime: 2 * 60 * 1000, // 2 minutes cache
    refetchOnWindowFocus: false,
  });

  // Set up real-time subscription
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel('user-owl-items-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'outstanding_work_items',
          filter: `assigned_to=eq.${user.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['user-owl-items', user.id] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, queryClient]);

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: OWLStatus }) => {
      const updates: Record<string, unknown> = { status };
      if (status === 'CLOSED') {
        updates.completed_date = new Date().toISOString().split('T')[0];
      }

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
      queryClient.invalidateQueries({ queryKey: ['user-owl-items'] });
      queryClient.invalidateQueries({ queryKey: ['owl-items'] });
      queryClient.invalidateQueries({ queryKey: ['owl-stats'] });
      toast({ title: 'Success', description: 'Status updated successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  // Calculate stats
  const stats = {
    total: query.data?.length || 0,
    open: query.data?.filter(i => i.status === 'OPEN').length || 0,
    inProgress: query.data?.filter(i => i.status === 'IN_PROGRESS').length || 0,
    overdue: query.data?.filter(i => i.due_date && new Date(i.due_date) < new Date()).length || 0,
    priority1: query.data?.filter(i => i.priority === 1).length || 0,
  };

  return {
    ...query,
    items: query.data || [],
    stats,
    updateStatus: updateStatusMutation.mutate,
    isUpdatingStatus: updateStatusMutation.isPending,
  };
}

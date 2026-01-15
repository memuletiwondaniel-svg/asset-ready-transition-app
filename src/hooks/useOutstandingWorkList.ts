import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from './use-toast';

export type OWLSource = 'PUNCHLIST' | 'PSSR' | 'PAC' | 'FAC';
export type OWLStatus = 'OPEN' | 'IN_PROGRESS' | 'CLOSED' | 'CANCELLED';

export interface OutstandingWorkItem {
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
  assigned_user?: { full_name: string };
}

export interface OWLFilters {
  projectId?: string;
  source?: OWLSource;
  status?: OWLStatus;
  priority?: number;
  actionPartyRoleId?: string;
  dueDateFrom?: string;
  dueDateTo?: string;
  search?: string;
}

export function useOutstandingWorkItems(filters?: OWLFilters) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['owl-items', filters],
    queryFn: async () => {
      let query = supabase
        .from('outstanding_work_items')
        .select(`
          *,
          project:projects(id, project_name, code),
          action_role:roles!outstanding_work_items_action_party_role_id_fkey(id, name),
          assigned_user:profiles!outstanding_work_items_assigned_to_fkey(full_name)
        `)
        .order('created_at', { ascending: false });

      if (filters?.projectId) {
        query = query.eq('project_id', filters.projectId);
      }
      if (filters?.source) {
        query = query.eq('source', filters.source);
      }
      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      if (filters?.priority) {
        query = query.eq('priority', filters.priority);
      }
      if (filters?.actionPartyRoleId) {
        query = query.eq('action_party_role_id', filters.actionPartyRoleId);
      }
      if (filters?.dueDateFrom) {
        query = query.gte('due_date', filters.dueDateFrom);
      }
      if (filters?.dueDateTo) {
        query = query.lte('due_date', filters.dueDateTo);
      }
      if (filters?.search) {
        query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%,item_number.ilike.%${filters.search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      // Map project_name to name for compatibility
      return (data || []).map(item => ({
        ...item,
        project: item.project ? { ...item.project, name: (item.project as any).project_name } : undefined
      })) as OutstandingWorkItem[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (item: Omit<OutstandingWorkItem, 'id' | 'item_number' | 'created_at' | 'updated_at' | 'project' | 'action_role' | 'assigned_user'>) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('outstanding_work_items')
        .insert({ ...item, created_by: user?.id })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['owl-items'] });
      queryClient.invalidateQueries({ queryKey: ['owl-stats'] });
      toast({ title: 'Success', description: 'Work item created successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<OutstandingWorkItem> & { id: string }) => {
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
      toast({ title: 'Success', description: 'Work item deleted successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  return {
    ...query,
    items: query.data || [],
    createItem: createMutation.mutate,
    updateItem: updateMutation.mutate,
    deleteItem: deleteMutation.mutate,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}

export function useOWLStats() {
  return useQuery({
    queryKey: ['owl-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('outstanding_work_items')
        .select('status, priority');

      if (error) throw error;

      const stats = {
        total: data.length,
        open: data.filter(i => i.status === 'OPEN').length,
        inProgress: data.filter(i => i.status === 'IN_PROGRESS').length,
        closed: data.filter(i => i.status === 'CLOSED').length,
        cancelled: data.filter(i => i.status === 'CANCELLED').length,
        priority1: data.filter(i => i.priority === 1).length,
        priority2: data.filter(i => i.priority === 2).length,
      };

      return stats;
    },
  });
}

export function useProjectsForOWL() {
  return useQuery({
    queryKey: ['projects-for-owl'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('id, project_name, code')
        .eq('is_active', true)
        .order('project_name');

      if (error) throw error;
      return (data || []).map(p => ({ id: p.id, name: p.project_name, code: p.code }));
    },
  });
}

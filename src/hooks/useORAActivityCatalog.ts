import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface ORAActivity {
  id: string;
  activity_code: string;
  activity: string;
  description: string | null;
  phase_id: string | null;
  parent_activity_id: string | null;
  duration_high: number | null;
  duration_med: number | null;
  duration_low: number | null;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface ORAActivityInput {
  activity: string;
  description?: string;
  phase_id?: string;
  parent_activity_id?: string | null;
  duration_high?: number;
  duration_med?: number;
  duration_low?: number;
  display_order?: number;
  is_active?: boolean;
}

export interface ORPPhase {
  id: string;
  code: string;
  label: string;
  prefix: string;
  display_order: number;
  is_active: boolean;
  created_at: string;
}

interface UseORAActivityCatalogFilters {
  phase_id?: string;
  search?: string;
}

// Hook to fetch ORP phases
export const useORPPhases = () => {
  const { data: phases, isLoading } = useQuery({
    queryKey: ['orp-phases'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orp_phases')
        .select('*')
        .eq('is_active', true)
        .order('display_order');

      if (error) throw error;
      return data as ORPPhase[];
    }
  });

  return { phases: phases || [], isLoading };
};

export const useORAActivityCatalog = (filters?: UseORAActivityCatalogFilters) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: activities, isLoading } = useQuery({
    queryKey: ['ora-activity-catalog', filters],
    queryFn: async () => {
      let query = supabase
        .from('ora_activity_catalog')
        .select('*')
        .order('display_order');

      if (filters?.phase_id) {
        query = query.eq('phase_id', filters.phase_id);
      }
      if (filters?.search) {
        query = query.or(`activity.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as ORAActivity[];
    }
  });

  const createActivity = useMutation({
    mutationFn: async (input: ORAActivityInput) => {
      const { data: user } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('ora_activity_catalog')
        .insert({
          ...input,
          activity_code: '',
          created_by: user.user?.id
        })
        .select()
        .single();

      if (error) throw error;
      return data as ORAActivity;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ora-activity-catalog'] });
      toast({ title: 'Success', description: 'Activity created successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  });

  const updateActivity = useMutation({
    mutationFn: async ({ id, ...input }: ORAActivityInput & { id: string }) => {
      const { data, error } = await supabase
        .from('ora_activity_catalog')
        .update(input)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as ORAActivity;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ora-activity-catalog'] });
      toast({ title: 'Success', description: 'Activity updated successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  });

  const deleteActivity = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('ora_activity_catalog')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ora-activity-catalog'] });
      toast({ title: 'Success', description: 'Activity deleted successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  });

  return {
    activities: activities || [],
    isLoading,
    createActivity: createActivity.mutateAsync,
    updateActivity: updateActivity.mutateAsync,
    deleteActivity: deleteActivity.mutateAsync,
    isCreating: createActivity.isPending,
    isUpdating: updateActivity.isPending,
    isDeleting: deleteActivity.isPending
  };
};

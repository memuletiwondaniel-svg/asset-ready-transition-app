import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface ORAActivity {
  id: string;
  phase: 'IDENTIFY' | 'ASSESS' | 'SELECT' | 'DEFINE' | 'EXECUTE' | 'OPERATE';
  level: 'L1' | 'L2';
  area: 'ORM' | 'FEO' | 'CSU';
  activity_id: string;
  entry_type: 'activity' | 'critical_task' | 'control_point' | 'deliverable';
  requirement_level: 'mandatory' | 'optional' | 'scalable';
  name: string;
  description: string | null;
  discipline: string | null;
  applicable_business: string | null;
  estimated_manhours: number | null;
  outcome_evidence: string | null;
  rolled_up_in_document: string | null;
  dcaf_control_point: string | null;
  pmf_controls: string[] | null;
  ams_processes: string[] | null;
  display_order: number;
  is_active: boolean;
  or_toolbox_section: string | null;
  tools_templates: string | null;
  precursors: string[] | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface ORAActivityInput {
  phase: string;
  level?: string;
  area?: string;
  activity_id: string;
  entry_type?: string;
  requirement_level?: string;
  name: string;
  description?: string;
  discipline?: string;
  applicable_business?: string;
  estimated_manhours?: number;
  outcome_evidence?: string;
  rolled_up_in_document?: string;
  dcaf_control_point?: string;
  pmf_controls?: string[];
  ams_processes?: string[];
  display_order?: number;
  is_active?: boolean;
  or_toolbox_section?: string;
  tools_templates?: string;
  precursors?: string[];
}

interface UseORAActivityCatalogFilters {
  phase?: string;
  area?: string;
  entryType?: string;
  search?: string;
}

export const useORAActivityCatalog = (filters?: UseORAActivityCatalogFilters) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: activities, isLoading } = useQuery({
    queryKey: ['ora-activity-catalog', filters],
    queryFn: async () => {
      let query = supabase
        .from('ora_activity_catalog')
        .select('*')
        .order('phase')
        .order('display_order');

      if (filters?.phase && filters.phase !== 'all') {
        query = query.eq('phase', filters.phase);
      }
      if (filters?.area && filters.area !== 'all') {
        query = query.eq('area', filters.area);
      }
      if (filters?.entryType && filters.entryType !== 'all') {
        query = query.eq('entry_type', filters.entryType);
      }
      if (filters?.search) {
        query = query.or(`name.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
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
          created_by: user.user?.id
        })
        .select()
        .single();

      if (error) throw error;
      return data as ORAActivity;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ora-activity-catalog'] });
      toast({
        title: 'Success',
        description: 'ORA activity created successfully'
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
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
      toast({
        title: 'Success',
        description: 'ORA activity updated successfully'
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
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
      toast({
        title: 'Success',
        description: 'ORA activity deleted successfully'
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  // Group activities by phase
  const activitiesByPhase = activities?.reduce((acc, activity) => {
    if (!acc[activity.phase]) {
      acc[activity.phase] = [];
    }
    acc[activity.phase].push(activity);
    return acc;
  }, {} as Record<string, ORAActivity[]>) || {};

  return {
    activities: activities || [],
    activitiesByPhase,
    isLoading,
    createActivity: createActivity.mutateAsync,
    updateActivity: updateActivity.mutateAsync,
    deleteActivity: deleteActivity.mutateAsync,
    isCreating: createActivity.isPending,
    isUpdating: updateActivity.isPending,
    isDeleting: deleteActivity.isPending
  };
};

export const ORA_PHASES = [
  { value: 'IDENTIFY', label: 'Identify' },
  { value: 'ASSESS', label: 'Assess' },
  { value: 'SELECT', label: 'Select' },
  { value: 'DEFINE', label: 'Define' },
  { value: 'EXECUTE', label: 'Execute' },
  { value: 'OPERATE', label: 'Operate' }
] as const;

export const ORA_AREAS = [
  { value: 'ORM', label: 'Operations Readiness Management' },
  { value: 'FEO', label: 'Facility & Equipment Operations' },
  { value: 'CSU', label: 'Commissioning & Start-up' }
] as const;

export const ORA_ENTRY_TYPES = [
  { value: 'activity', label: 'Activity' },
  { value: 'critical_task', label: 'Critical Task' },
  { value: 'control_point', label: 'Control Point' },
  { value: 'deliverable', label: 'Deliverable' }
] as const;

export const ORA_REQUIREMENT_LEVELS = [
  { value: 'mandatory', label: 'Mandatory' },
  { value: 'optional', label: 'Optional' },
  { value: 'scalable', label: 'Scalable' }
] as const;

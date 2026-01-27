import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';

export interface P2ASystem {
  id: string;
  handover_plan_id: string;
  system_id: string;
  name: string;
  is_hydrocarbon: boolean;
  completion_status: 'NOT_STARTED' | 'IN_PROGRESS' | 'RFO' | 'RFSU';
  completion_percentage: number;
  target_rfo_date?: string;
  target_rfsu_date?: string;
  actual_rfo_date?: string;
  actual_rfsu_date?: string;
  source_type: 'MANUAL' | 'EXCEL_IMPORT' | 'API_GOCOMPLETIONS' | 'API_HUB2';
  external_id?: string;
  punchlist_a_count: number;
  punchlist_b_count: number;
  itr_a_count: number;
  itr_b_count: number;
  itr_total_count: number;
  metadata?: Record<string, any>;
  display_order?: number;
  created_at: string;
  updated_at: string;
  // Joined data - which VCR this system is assigned to
  assigned_handover_point_id?: string;
  assigned_vcr_code?: string;
}

export interface P2ASubsystem {
  id: string;
  system_id: string;
  subsystem_id: string;
  name: string;
  mc_status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';
  pcc_status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';
  comm_status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';
  punchlist_a_count: number;
  punchlist_b_count: number;
  itr_count: number;
  completion_percentage: number;
}

export const useP2ASystems = (handoverPlanId: string) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: systems, isLoading, error } = useQuery({
    queryKey: ['p2a-systems', handoverPlanId],
    queryFn: async () => {
      // First get all systems
      const { data: systemsData, error: systemsError } = await supabase
        .from('p2a_systems')
        .select('*')
        .eq('handover_plan_id', handoverPlanId)
        .order('display_order', { ascending: true, nullsFirst: false })
        .order('created_at', { ascending: true });

      if (systemsError) throw systemsError;

      // Get system assignments for handover points in this plan only
      const { data: handoverPointIds } = await supabase
        .from('p2a_handover_points')
        .select('id')
        .eq('handover_plan_id', handoverPlanId);

      const hpIds = handoverPointIds?.map(hp => hp.id) || [];

      let assignments: any[] = [];
      if (hpIds.length > 0) {
        const { data: assignmentsData, error: assignmentsError } = await supabase
          .from('p2a_handover_point_systems')
          .select(`
            system_id,
            handover_point_id,
            p2a_handover_points!inner (
              id,
              vcr_code
            )
          `)
          .in('handover_point_id', hpIds);

        if (assignmentsError) throw assignmentsError;
        assignments = assignmentsData || [];
      }

      // Create a map of system_id to assignment
      const assignmentMap = new Map<string, { handover_point_id: string; vcr_code: string }>();
      assignments?.forEach((a: any) => {
        assignmentMap.set(a.system_id, {
          handover_point_id: a.handover_point_id,
          vcr_code: a.p2a_handover_points.vcr_code,
        });
      });

      // Merge assignment data with systems
      return (systemsData || []).map((system: any) => {
        const assignment = assignmentMap.get(system.id);
        return {
          ...system,
          assigned_handover_point_id: assignment?.handover_point_id,
          assigned_vcr_code: assignment?.vcr_code,
        };
      }) as P2ASystem[];
    },
    enabled: !!handoverPlanId,
  });

  const addSystem = useMutation({
    mutationFn: async (systemData: Omit<P2ASystem, 'id' | 'created_at' | 'updated_at' | 'assigned_handover_point_id' | 'assigned_vcr_code'>) => {
      const { data, error } = await supabase
        .from('p2a_systems')
        .insert(systemData)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['p2a-systems', handoverPlanId] });
      toast({
        title: 'Success',
        description: 'System added successfully',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Failed to add system: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  const addSystemsBulk = useMutation({
    mutationFn: async (systemsData: Array<Omit<P2ASystem, 'id' | 'created_at' | 'updated_at' | 'assigned_handover_point_id' | 'assigned_vcr_code'>>) => {
      const { data, error } = await supabase
        .from('p2a_systems')
        .insert(systemsData)
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['p2a-systems', handoverPlanId] });
      toast({
        title: 'Success',
        description: `${data.length} systems imported successfully`,
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Failed to import systems: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  const updateSystem = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<P2ASystem> }) => {
      const { data, error } = await supabase
        .from('p2a_systems')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['p2a-systems', handoverPlanId] });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Failed to update system: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  const deleteSystem = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('p2a_systems')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['p2a-systems', handoverPlanId] });
      toast({
        title: 'Success',
        description: 'System deleted successfully',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Failed to delete system: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  // Get unassigned systems (not mapped to any VCR)
  const unassignedSystems = systems?.filter(s => !s.assigned_handover_point_id) || [];
  
  // Get assigned systems
  const assignedSystems = systems?.filter(s => !!s.assigned_handover_point_id) || [];

  return {
    systems: systems || [],
    unassignedSystems,
    assignedSystems,
    isLoading,
    error,
    addSystem: addSystem.mutate,
    addSystemsBulk: addSystemsBulk.mutate,
    updateSystem: updateSystem.mutate,
    deleteSystem: deleteSystem.mutate,
    isAdding: addSystem.isPending,
    isImporting: addSystemsBulk.isPending,
    isUpdating: updateSystem.isPending,
    isDeleting: deleteSystem.isPending,
  };
};

// Hook for subsystems
export const useP2ASubsystems = (systemId: string) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: subsystems, isLoading } = useQuery({
    queryKey: ['p2a-subsystems', systemId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('p2a_subsystems')
        .select('*')
        .eq('system_id', systemId)
        .order('display_order', { ascending: true });

      if (error) throw error;
      return data as P2ASubsystem[];
    },
    enabled: !!systemId,
  });

  return {
    subsystems: subsystems || [],
    isLoading,
  };
};

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
  // Subsystem-level assignment data
  assigned_subsystems?: P2AAssignedSubsystem[];
}

/** Represents a subsystem that is individually mapped to a VCR */
export interface P2AAssignedSubsystem {
  id: string;  // p2a_subsystems UUID
  subsystem_id: string;  // text ID like "C017-DP300-228-A"
  name: string;
  completion_percentage: number;
  assigned_handover_point_id: string;
  assigned_vcr_code: string;
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
            subsystem_id,
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

      // Fetch subsystem details for subsystem-level assignments
      const subsystemIds = assignments
        .filter((a: any) => a.subsystem_id)
        .map((a: any) => a.subsystem_id);

      let subsystemDetails: Record<string, any> = {};
      if (subsystemIds.length > 0) {
        const { data: subsData } = await supabase
          .from('p2a_subsystems')
          .select('id, subsystem_id, name, completion_percentage')
          .in('id', subsystemIds);

        if (subsData) {
          subsystemDetails = Object.fromEntries(subsData.map((s: any) => [s.id, s]));
        }
      }

      // Also fetch total subsystem counts per system (to detect "all mapped" case)
      const systemIdsWithSubAssignments = [...new Set(
        assignments.filter((a: any) => a.subsystem_id).map((a: any) => a.system_id)
      )];
      
      let totalSubsystemCounts: Record<string, number> = {};
      if (systemIdsWithSubAssignments.length > 0) {
        const { data: allSubsystems } = await supabase
          .from('p2a_subsystems')
          .select('system_id')
          .in('system_id', systemIdsWithSubAssignments);
        
        if (allSubsystems) {
          for (const sub of allSubsystems) {
            totalSubsystemCounts[sub.system_id] = (totalSubsystemCounts[sub.system_id] || 0) + 1;
          }
        }
      }

      // Create maps: system_id → assignment, and system_id → subsystem assignments
      const assignmentMap = new Map<string, { handover_point_id: string; vcr_code: string }>();
      const subsystemAssignmentMap = new Map<string, P2AAssignedSubsystem[]>();

      assignments?.forEach((a: any) => {
        if (a.subsystem_id) {
          // Subsystem-level assignment
          const subDetail = subsystemDetails[a.subsystem_id];
          if (subDetail) {
            const existing = subsystemAssignmentMap.get(a.system_id) || [];
            existing.push({
              id: a.subsystem_id,
              subsystem_id: subDetail.subsystem_id,
              name: subDetail.name,
              completion_percentage: subDetail.completion_percentage || 0,
              assigned_handover_point_id: a.handover_point_id,
              assigned_vcr_code: a.p2a_handover_points.vcr_code,
            });
            subsystemAssignmentMap.set(a.system_id, existing);
          }
          // Also set parent as assigned (to the first VCR found)
          if (!assignmentMap.has(a.system_id)) {
            assignmentMap.set(a.system_id, {
              handover_point_id: a.handover_point_id,
              vcr_code: a.p2a_handover_points.vcr_code,
            });
          }
        } else {
          // Full system assignment
          assignmentMap.set(a.system_id, {
            handover_point_id: a.handover_point_id,
            vcr_code: a.p2a_handover_points.vcr_code,
          });
        }
      });

      // Smart collapsing: if ALL subsystems of a system map to the SAME VCR,
      // treat as a full system assignment (don't show individual subsystem cards)
      for (const [systemId, subs] of subsystemAssignmentMap.entries()) {
        const totalCount = totalSubsystemCounts[systemId] || 0;
        const uniqueVCRs = new Set(subs.map(s => s.assigned_handover_point_id));
        
        if (uniqueVCRs.size === 1 && subs.length === totalCount) {
          // All subsystems map to same VCR → collapse to parent system card
          const vcrId = subs[0].assigned_handover_point_id;
          const vcrCode = subs[0].assigned_vcr_code;
          assignmentMap.set(systemId, { handover_point_id: vcrId, vcr_code: vcrCode });
          subsystemAssignmentMap.delete(systemId);
        }
      }

      // Merge assignment data with systems
      return (systemsData || []).map((system: any) => {
        const assignment = assignmentMap.get(system.id);
        const subsystemAssignments = subsystemAssignmentMap.get(system.id);
        return {
          ...system,
          assigned_handover_point_id: assignment?.handover_point_id,
          assigned_vcr_code: assignment?.vcr_code,
          assigned_subsystems: subsystemAssignments || undefined,
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

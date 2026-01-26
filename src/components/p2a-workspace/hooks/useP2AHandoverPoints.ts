import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/components/enhanced-auth/AuthProvider';

export interface P2AHandoverPoint {
  id: string;
  phase_id?: string | null; // Now optional - VCRs can exist without a phase
  handover_plan_id: string; // Direct link to plan
  vcr_code: string;
  name: string;
  description?: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'READY' | 'SIGNED';
  position_x: number;
  position_y: number;
  target_date?: string;
  completion_date?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
  // Computed/joined data
  systems_count?: number;
  prerequisites_count?: number;
  prerequisites_completed?: number;
}

export interface P2AHandoverPointSystem {
  id: string;
  handover_point_id: string;
  system_id: string;
  assigned_at: string;
  assigned_by?: string;
}

export const useP2AHandoverPoints = (handoverPlanId: string) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const { data: handoverPoints, isLoading } = useQuery({
    queryKey: ['p2a-handover-points', handoverPlanId],
    queryFn: async () => {
      // Get all handover points for this plan directly (now using handover_plan_id)
      const { data: points, error: pointsError } = await supabase
        .from('p2a_handover_points')
        .select('*')
        .eq('handover_plan_id', handoverPlanId)
        .order('position_y', { ascending: true });

      if (pointsError) throw pointsError;
      if (!points?.length) return [];

      // Get system counts for each handover point
      const { data: systemCounts, error: countsError } = await supabase
        .from('p2a_handover_point_systems')
        .select('handover_point_id')
        .in('handover_point_id', points.map(p => p.id));

      if (countsError) throw countsError;

      // Count systems per handover point
      const countMap = new Map<string, number>();
      systemCounts?.forEach((s: any) => {
        countMap.set(s.handover_point_id, (countMap.get(s.handover_point_id) || 0) + 1);
      });

      return points.map((point: any) => ({
        ...point,
        systems_count: countMap.get(point.id) || 0,
      })) as P2AHandoverPoint[];
    },
    enabled: !!handoverPlanId,
  });

  const createHandoverPoint = useMutation({
    mutationFn: async (data: {
      phase_id?: string; // Now optional
      name: string;
      description?: string;
      project_code: string;
      target_date?: string;
      handover_plan_id: string; // Required - direct link to plan
    }) => {
      // Generate VCR code
      const { data: vcrCode, error: vcrError } = await supabase.rpc('generate_vcr_code', {
        p_project_code: data.project_code,
      });

      if (vcrError) throw vcrError;

      // Get current max position_y for this plan (for unassigned) or phase
      let query = supabase
        .from('p2a_handover_points')
        .select('position_y')
        .eq('handover_plan_id', data.handover_plan_id);
      
      if (data.phase_id) {
        query = query.eq('phase_id', data.phase_id);
      } else {
        query = query.is('phase_id', null);
      }

      const { data: existing, error: existingError } = await query
        .order('position_y', { ascending: false })
        .limit(1);

      if (existingError) throw existingError;

      const nextY = existing?.length ? existing[0].position_y + 1 : 0;

      const { data: result, error } = await supabase
        .from('p2a_handover_points')
        .insert({
          phase_id: data.phase_id || null,
          handover_plan_id: data.handover_plan_id,
          vcr_code: vcrCode,
          name: data.name,
          description: data.description,
          target_date: data.target_date,
          position_x: 0,
          position_y: nextY,
          status: 'PENDING',
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['p2a-handover-points', handoverPlanId] });
      toast({ title: 'Success', description: 'Handover point created' });
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const updateHandoverPoint = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<P2AHandoverPoint> }) => {
      const { data, error } = await supabase
        .from('p2a_handover_points')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['p2a-handover-points', handoverPlanId] });
    },
  });

  const deleteHandoverPoint = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('p2a_handover_points')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['p2a-handover-points', handoverPlanId] });
      toast({ title: 'Success', description: 'Handover point deleted' });
    },
  });

  const assignSystemToPoint = useMutation({
    mutationFn: async ({ handoverPointId, systemId }: { handoverPointId: string; systemId: string }) => {
      // First, remove system from any existing assignment
      await supabase
        .from('p2a_handover_point_systems')
        .delete()
        .eq('system_id', systemId);

      // Then create new assignment
      const { data, error } = await supabase
        .from('p2a_handover_point_systems')
        .insert({
          handover_point_id: handoverPointId,
          system_id: systemId,
          assigned_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['p2a-handover-points', handoverPlanId] });
      queryClient.invalidateQueries({ queryKey: ['p2a-systems'] });
      toast({ title: 'Success', description: 'System assigned to handover point' });
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const unassignSystemFromPoint = useMutation({
    mutationFn: async ({ systemId }: { systemId: string }) => {
      const { error } = await supabase
        .from('p2a_handover_point_systems')
        .delete()
        .eq('system_id', systemId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['p2a-handover-points', handoverPlanId] });
      queryClient.invalidateQueries({ queryKey: ['p2a-systems'] });
    },
  });

  const moveHandoverPointToPhase = useMutation({
    mutationFn: async ({ handoverPointId, newPhaseId }: { handoverPointId: string; newPhaseId: string | null }) => {
      const { data, error } = await supabase
        .from('p2a_handover_points')
        .update({ phase_id: newPhaseId })
        .eq('id', handoverPointId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['p2a-handover-points', handoverPlanId] });
      toast({ title: 'Success', description: 'Handover point moved' });
    },
  });

  const reorderHandoverPoints = useMutation({
    mutationFn: async (reorderedPoints: { id: string; position_x?: number; position_y?: number }[]) => {
      const updates = reorderedPoints.map(({ id, position_x, position_y }) => {
        const updateData: { position_x?: number; position_y?: number } = {};
        if (position_x !== undefined) updateData.position_x = position_x;
        if (position_y !== undefined) updateData.position_y = position_y;
        
        return supabase
          .from('p2a_handover_points')
          .update(updateData)
          .eq('id', id);
      });

      const results = await Promise.all(updates);
      const errors = results.filter(r => r.error);
      if (errors.length > 0) throw errors[0].error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['p2a-handover-points', handoverPlanId] });
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to update VCR position', variant: 'destructive' });
    },
  });

  const updateVCRPosition = useMutation({
    mutationFn: async ({ id, position_x, position_y, phase_id }: { 
      id: string; 
      position_x: number; 
      position_y: number;
      phase_id?: string | null;
    }) => {
      const updateData: { position_x: number; position_y: number; phase_id?: string | null } = {
        position_x,
        position_y,
      };
      if (phase_id !== undefined) {
        updateData.phase_id = phase_id;
      }
      
      const { data, error } = await supabase
        .from('p2a_handover_points')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['p2a-handover-points', handoverPlanId] });
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to update VCR position', variant: 'destructive' });
    },
  });

  // Separate assigned and unassigned VCRs
  const assignedPoints = handoverPoints?.filter(p => p.phase_id) || [];
  const unassignedPoints = handoverPoints?.filter(p => !p.phase_id) || [];

  return {
    handoverPoints: handoverPoints || [],
    assignedPoints,
    unassignedPoints,
    isLoading,
    createHandoverPoint: createHandoverPoint.mutate,
    updateHandoverPoint: updateHandoverPoint.mutate,
    deleteHandoverPoint: deleteHandoverPoint.mutate,
    assignSystemToPoint: assignSystemToPoint.mutate,
    unassignSystemFromPoint: unassignSystemFromPoint.mutate,
    moveHandoverPointToPhase: moveHandoverPointToPhase.mutate,
    reorderHandoverPoints: reorderHandoverPoints.mutate,
    updateVCRPosition: updateVCRPosition.mutate,
    isCreating: createHandoverPoint.isPending,
  };
};

// Hook to get systems assigned to a specific handover point
export const useHandoverPointSystems = (handoverPointId: string) => {
  const { data: systemIds, isLoading } = useQuery({
    queryKey: ['p2a-handover-point-systems', handoverPointId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('p2a_handover_point_systems')
        .select(`
          *,
          p2a_systems (*)
        `)
        .eq('handover_point_id', handoverPointId);

      if (error) throw error;
      return data?.map((d: any) => d.p2a_systems) || [];
    },
    enabled: !!handoverPointId,
  });

  return {
    systems: systemIds || [],
    isLoading,
  };
};

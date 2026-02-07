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
      // Generate VCR code in wizard-compatible format: VCR-{projectCode}-{seq}
      const { generateVCRCode } = await import('../utils/generateVCRCode');
      const vcrCode = await generateVCRCode(data.handover_plan_id, data.project_code);

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
    onSuccess: async () => {
      // Invalidate both VCRs and systems - cascade delete removes assignments,
      // so systems need to refresh to show as unassigned
      await queryClient.invalidateQueries({ queryKey: ['p2a-handover-points', handoverPlanId] });
      await queryClient.invalidateQueries({ queryKey: ['p2a-systems', handoverPlanId] });
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
    onMutate: async ({ handoverPointId, systemId }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['p2a-systems', handoverPlanId] });

      // Snapshot the previous value
      const previousSystems = queryClient.getQueryData(['p2a-systems', handoverPlanId]);
      const previousHandoverPoints = queryClient.getQueryData(['p2a-handover-points', handoverPlanId]);

      // Get the target VCR's code
      const handoverPoints = previousHandoverPoints as P2AHandoverPoint[] | undefined;
      const targetVcr = handoverPoints?.find(hp => hp.id === handoverPointId);

      // Optimistically update the systems cache
      queryClient.setQueryData(['p2a-systems', handoverPlanId], (old: any[]) => {
        if (!old) return old;
        return old.map(system => {
          if (system.id === systemId) {
            return {
              ...system,
              assigned_handover_point_id: handoverPointId,
              assigned_vcr_code: targetVcr?.vcr_code,
            };
          }
          return system;
        });
      });

      return { previousSystems, previousHandoverPoints };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['p2a-handover-points', handoverPlanId] });
      queryClient.invalidateQueries({ queryKey: ['p2a-systems'] });
      toast({ title: 'Success', description: 'System assigned to handover point' });
    },
    onError: (error, _variables, context) => {
      // Rollback on error
      if (context?.previousSystems) {
        queryClient.setQueryData(['p2a-systems', handoverPlanId], context.previousSystems);
      }
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
    onMutate: async ({ systemId }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['p2a-systems', handoverPlanId] });

      // Snapshot the previous value
      const previousSystems = queryClient.getQueryData(['p2a-systems', handoverPlanId]);

      // Optimistically update the systems cache
      queryClient.setQueryData(['p2a-systems', handoverPlanId], (old: any[]) => {
        if (!old) return old;
        return old.map(system => {
          if (system.id === systemId) {
            return {
              ...system,
              assigned_handover_point_id: undefined,
              assigned_vcr_code: undefined,
            };
          }
          return system;
        });
      });

      return { previousSystems };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['p2a-handover-points', handoverPlanId] });
      queryClient.invalidateQueries({ queryKey: ['p2a-systems'] });
    },
    onError: (_error, _variables, context) => {
      // Rollback on error
      if (context?.previousSystems) {
        queryClient.setQueryData(['p2a-systems', handoverPlanId], context.previousSystems);
      }
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
    // Optimistic update to prevent snap-back effect
    onMutate: async ({ id, position_x, position_y, phase_id }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['p2a-handover-points', handoverPlanId] });
      
      // Snapshot the previous value
      const previousPoints = queryClient.getQueryData<P2AHandoverPoint[]>(['p2a-handover-points', handoverPlanId]);
      
      // Optimistically update to the new value
      queryClient.setQueryData<P2AHandoverPoint[]>(['p2a-handover-points', handoverPlanId], (old) => {
        if (!old) return old;
        return old.map(point => {
          if (point.id === id) {
            return {
              ...point,
              position_x,
              position_y,
              phase_id: phase_id !== undefined ? phase_id : point.phase_id,
            };
          }
          return point;
        });
      });
      
      return { previousPoints };
    },
    onError: (_error, _variables, context) => {
      // Rollback on error
      if (context?.previousPoints) {
        queryClient.setQueryData(['p2a-handover-points', handoverPlanId], context.previousPoints);
      }
      toast({ title: 'Error', description: 'Failed to update VCR position', variant: 'destructive' });
    },
    onSettled: () => {
      // Sync with server after mutation
      queryClient.invalidateQueries({ queryKey: ['p2a-handover-points', handoverPlanId] });
    },
  });

  // Combine two VCRs into a new one
  const combineVCRs = useMutation({
    mutationFn: async ({
      sourceVcrId,
      targetVcrId,
      newName,
      projectCode,
    }: {
      sourceVcrId: string;
      targetVcrId: string;
      newName: string;
      projectCode: string;
    }) => {
      // 1. Get source and target VCR data
      const { data: sourceVcr } = await supabase
        .from('p2a_handover_points')
        .select('*')
        .eq('id', sourceVcrId)
        .single();

      const { data: targetVcr } = await supabase
        .from('p2a_handover_points')
        .select('*')
        .eq('id', targetVcrId)
        .single();

      if (!sourceVcr || !targetVcr) throw new Error('VCRs not found');

      // 2. Generate new VCR code in wizard-compatible format
      const { generateVCRCode: genCode } = await import('../utils/generateVCRCode');
      const vcrCode = await genCode(handoverPlanId, projectCode);

      // 3. Create new combined VCR (use target's phase if available, else source's)
      const { data: newVcr, error: createError } = await supabase
        .from('p2a_handover_points')
        .insert({
          phase_id: targetVcr.phase_id || sourceVcr.phase_id,
          handover_plan_id: handoverPlanId,
          vcr_code: vcrCode,
          name: newName,
          description: `Combined from ${sourceVcr.vcr_code} and ${targetVcr.vcr_code}`,
          target_date: targetVcr.target_date || sourceVcr.target_date,
          position_x: targetVcr.position_x,
          position_y: targetVcr.position_y,
          status: 'PENDING',
          created_by: user?.id,
        })
        .select()
        .single();

      if (createError) throw createError;

      // 4. Migrate systems from both VCRs
      const { data: sourceSystems } = await supabase
        .from('p2a_handover_point_systems')
        .select('system_id')
        .eq('handover_point_id', sourceVcrId);

      const { data: targetSystems } = await supabase
        .from('p2a_handover_point_systems')
        .select('system_id')
        .eq('handover_point_id', targetVcrId);

      const allSystemIds = new Set([
        ...(sourceSystems?.map((s) => s.system_id) || []),
        ...(targetSystems?.map((s) => s.system_id) || []),
      ]);

      if (allSystemIds.size > 0) {
        await supabase.from('p2a_handover_point_systems').insert(
          Array.from(allSystemIds).map((systemId) => ({
            handover_point_id: newVcr.id,
            system_id: systemId,
            assigned_by: user?.id,
          }))
        );
      }

      // 5. Migrate prerequisites
      const { data: sourcePrereqs } = await supabase
        .from('p2a_vcr_prerequisites')
        .select('*')
        .eq('handover_point_id', sourceVcrId);

      const { data: targetPrereqs } = await supabase
        .from('p2a_vcr_prerequisites')
        .select('*')
        .eq('handover_point_id', targetVcrId);

      const allPrereqs = [...(sourcePrereqs || []), ...(targetPrereqs || [])];
      if (allPrereqs.length > 0) {
        // Deduplicate by pac_prerequisite_id
        const uniquePrereqs = new Map();
        allPrereqs.forEach((p) => {
          if (!uniquePrereqs.has(p.pac_prerequisite_id)) {
            uniquePrereqs.set(p.pac_prerequisite_id, p);
          }
        });

        await supabase.from('p2a_vcr_prerequisites').insert(
          Array.from(uniquePrereqs.values()).map((p, idx) => ({
            handover_point_id: newVcr.id,
            pac_prerequisite_id: p.pac_prerequisite_id,
            summary: p.summary,
            description: p.description,
            status: p.status,
            delivering_party_id: p.delivering_party_id,
            delivering_party_name: p.delivering_party_name,
            receiving_party_id: p.receiving_party_id,
            receiving_party_name: p.receiving_party_name,
            evidence_links: p.evidence_links,
            comments: p.comments,
            display_order: idx,
          }))
        );
      }

      // 6. Migrate training system mappings
      const { data: sourceTraining } = await supabase
        .from('ora_training_system_mappings')
        .select('*')
        .eq('handover_point_id', sourceVcrId);

      const { data: targetTraining } = await supabase
        .from('ora_training_system_mappings')
        .select('*')
        .eq('handover_point_id', targetVcrId);

      const allTraining = [...(sourceTraining || []), ...(targetTraining || [])];
      if (allTraining.length > 0) {
        // Get unique training items and systems
        const uniqueMappings = new Map();
        allTraining.forEach((t) => {
          const key = `${t.training_item_id}-${t.system_id}`;
          if (!uniqueMappings.has(key)) {
            uniqueMappings.set(key, t);
          }
        });

        await supabase.from('ora_training_system_mappings').insert(
          Array.from(uniqueMappings.values()).map((t) => ({
            handover_point_id: newVcr.id,
            training_item_id: t.training_item_id,
            system_id: t.system_id,
            created_by: user?.id,
          }))
        );
      }

      // 7. Delete original VCRs (cascades will clean up related data)
      await supabase.from('p2a_handover_points').delete().eq('id', sourceVcrId);
      await supabase.from('p2a_handover_points').delete().eq('id', targetVcrId);

      return newVcr;
    },
    onSuccess: async () => {
      // Force immediate refetch to ensure UI updates
      await queryClient.invalidateQueries({ queryKey: ['p2a-handover-points', handoverPlanId] });
      await queryClient.invalidateQueries({ queryKey: ['p2a-systems', handoverPlanId] });
      await queryClient.invalidateQueries({ queryKey: ['vcr-relationships', handoverPlanId] });
      toast({ title: 'Success', description: 'VCRs combined successfully' });
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
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
    combineVCRs: combineVCRs.mutate,
    isCreating: createHandoverPoint.isPending,
    isCombining: combineVCRs.isPending,
    isDeleting: deleteHandoverPoint.isPending,
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

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import type { PriorityLevel } from './usePSSRPriorityActions';

export type ObservationType = 'finding' | 'action_required' | 'note';

export interface WalkdownObservation {
  id: string;
  walkdown_event_id: string;
  pssr_id: string;
  observation_type: ObservationType;
  category: string | null;
  description: string;
  location_details: string | null;
  photo_urls: string[];
  priority: PriorityLevel | null;
  linked_priority_action_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export const OBSERVATION_CATEGORIES = [
  'Process',
  'Mechanical',
  'Electrical',
  'Instrumentation',
  'Civil/Structural',
  'HSE',
  'Documentation',
  'Operations',
  'Maintenance',
  'Other',
] as const;

export const useWalkdownObservations = (walkdownEventId: string | undefined, pssrId: string | undefined) => {
  const queryClient = useQueryClient();

  // Fetch all observations for this walkdown event
  const { data: observations, isLoading, error } = useQuery({
    queryKey: ['walkdown-observations', walkdownEventId],
    queryFn: async () => {
      if (!walkdownEventId) return [];
      
      const { data, error } = await supabase
        .from('pssr_walkdown_observations')
        .select('*')
        .eq('walkdown_event_id', walkdownEventId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return (data || []) as WalkdownObservation[];
    },
    enabled: !!walkdownEventId,
  });

  // Fetch all observations for a PSSR (across all walkdowns)
  const { data: allPssrObservations } = useQuery({
    queryKey: ['pssr-walkdown-observations', pssrId],
    queryFn: async () => {
      if (!pssrId) return [];
      
      const { data, error } = await supabase
        .from('pssr_walkdown_observations')
        .select('*')
        .eq('pssr_id', pssrId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return (data || []) as WalkdownObservation[];
    },
    enabled: !!pssrId,
  });

  // Create observation (optionally with priority action)
  const createObservation = useMutation({
    mutationFn: async ({
      observationType,
      category,
      description,
      locationDetails,
      photoUrls,
      priority,
      createPriorityAction,
      actionOwnerName,
      targetDate,
    }: {
      observationType: ObservationType;
      category?: string;
      description: string;
      locationDetails?: string;
      photoUrls?: string[];
      priority?: PriorityLevel;
      createPriorityAction?: boolean;
      actionOwnerName?: string;
      targetDate?: string;
    }) => {
      if (!walkdownEventId || !pssrId) throw new Error('Walkdown event ID and PSSR ID are required');
      
      const { data: user } = await supabase.auth.getUser();
      
      // First, create the observation
      const { data: observation, error: obsError } = await supabase
        .from('pssr_walkdown_observations')
        .insert({
          walkdown_event_id: walkdownEventId,
          pssr_id: pssrId,
          observation_type: observationType,
          category: category || null,
          description,
          location_details: locationDetails || null,
          photo_urls: photoUrls || [],
          priority: priority || null,
          created_by: user.user?.id,
        })
        .select()
        .single();
      
      if (obsError) throw obsError;

      // If this is an action_required with priority and user wants to create a priority action
      if (observationType === 'action_required' && priority && createPriorityAction) {
        // We need a placeholder item_approval_id - in production, this would link to actual checklist item
        // For walkdown observations, we'll use a special approach
        const { data: priorityAction, error: actionError } = await supabase
          .from('pssr_priority_actions')
          .insert({
            pssr_id: pssrId,
            item_approval_id: '00000000-0000-0000-0000-000000000000', // Placeholder for walkdown-sourced actions
            priority,
            description,
            action_owner_name: actionOwnerName || null,
            target_date: targetDate || null,
            source_type: 'walkdown',
            walkdown_observation_id: observation.id,
            created_by: user.user?.id,
          })
          .select()
          .single();

        if (actionError) {
          console.error('Failed to create priority action:', actionError);
          // Don't throw - observation was created successfully
        } else {
          // Update observation with linked priority action ID
          await supabase
            .from('pssr_walkdown_observations')
            .update({ linked_priority_action_id: priorityAction.id })
            .eq('id', observation.id);
        }
      }

      return observation;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['walkdown-observations', walkdownEventId] });
      queryClient.invalidateQueries({ queryKey: ['pssr-walkdown-observations', pssrId] });
      queryClient.invalidateQueries({ queryKey: ['pssr-priority-actions', pssrId] });
      toast({
        title: 'Observation Recorded',
        description: 'Walkdown observation has been saved.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Failed to Record Observation',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Update observation
  const updateObservation = useMutation({
    mutationFn: async ({
      observationId,
      observationType,
      category,
      description,
      locationDetails,
      photoUrls,
      priority,
    }: {
      observationId: string;
      observationType?: ObservationType;
      category?: string;
      description?: string;
      locationDetails?: string;
      photoUrls?: string[];
      priority?: PriorityLevel | null;
    }) => {
      const updateData: Record<string, unknown> = {};
      if (observationType !== undefined) updateData.observation_type = observationType;
      if (category !== undefined) updateData.category = category;
      if (description !== undefined) updateData.description = description;
      if (locationDetails !== undefined) updateData.location_details = locationDetails;
      if (photoUrls !== undefined) updateData.photo_urls = photoUrls;
      if (priority !== undefined) updateData.priority = priority;

      const { data, error } = await supabase
        .from('pssr_walkdown_observations')
        .update(updateData)
        .eq('id', observationId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['walkdown-observations', walkdownEventId] });
      queryClient.invalidateQueries({ queryKey: ['pssr-walkdown-observations', pssrId] });
      toast({
        title: 'Observation Updated',
        description: 'Walkdown observation has been updated.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Update Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Delete observation
  const deleteObservation = useMutation({
    mutationFn: async (observationId: string) => {
      const { error } = await supabase
        .from('pssr_walkdown_observations')
        .delete()
        .eq('id', observationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['walkdown-observations', walkdownEventId] });
      queryClient.invalidateQueries({ queryKey: ['pssr-walkdown-observations', pssrId] });
      toast({
        title: 'Observation Deleted',
        description: 'Walkdown observation has been removed.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Delete Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Calculate stats
  const stats = {
    total: observations?.length || 0,
    findings: observations?.filter(o => o.observation_type === 'finding').length || 0,
    actionsRequired: observations?.filter(o => o.observation_type === 'action_required').length || 0,
    notes: observations?.filter(o => o.observation_type === 'note').length || 0,
    priorityA: observations?.filter(o => o.priority === 'A').length || 0,
    priorityB: observations?.filter(o => o.priority === 'B').length || 0,
    withPhotos: observations?.filter(o => o.photo_urls && o.photo_urls.length > 0).length || 0,
    byCategory: OBSERVATION_CATEGORIES.reduce((acc, cat) => {
      acc[cat] = observations?.filter(o => o.category === cat).length || 0;
      return acc;
    }, {} as Record<string, number>),
  };

  return {
    observations,
    allPssrObservations,
    isLoading,
    error,
    createObservation,
    updateObservation,
    deleteObservation,
    stats,
  };
};

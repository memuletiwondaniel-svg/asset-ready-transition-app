import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export type WalkdownStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled';

export interface WalkdownAttendee {
  id: string;
  name: string;
  role?: string;
  email?: string;
}

export interface PSSRWalkdownEvent {
  id: string;
  pssr_id: string;
  scheduled_date: string;
  scheduled_time: string | null;
  location: string | null;
  description: string | null;
  status: WalkdownStatus;
  completed_at: string | null;
  attendees: WalkdownAttendee[];
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export const usePSSRWalkdowns = (pssrId: string | undefined) => {
  const queryClient = useQueryClient();

  // Fetch all walkdown events for this PSSR
  const { data: walkdowns, isLoading, error } = useQuery({
    queryKey: ['pssr-walkdowns', pssrId],
    queryFn: async () => {
      if (!pssrId) return [];
      
      const { data, error } = await supabase
        .from('pssr_walkdown_events')
        .select('*')
        .eq('pssr_id', pssrId)
        .order('scheduled_date', { ascending: false });
      
      if (error) throw error;
      return (data || []).map(event => ({
        ...event,
        attendees: (event.attendees as unknown as WalkdownAttendee[]) || [],
      })) as PSSRWalkdownEvent[];
    },
    enabled: !!pssrId,
  });

  // Schedule a new walkdown
  const scheduleWalkdown = useMutation({
    mutationFn: async ({
      scheduledDate,
      scheduledTime,
      location,
      description,
      attendees,
    }: {
      scheduledDate: string;
      scheduledTime?: string;
      location?: string;
      description?: string;
      attendees?: WalkdownAttendee[];
    }) => {
      if (!pssrId) throw new Error('PSSR ID is required');
      
      const { data: user } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('pssr_walkdown_events')
        .insert({
          pssr_id: pssrId,
          scheduled_date: scheduledDate,
          scheduled_time: scheduledTime || null,
          location: location || null,
          description: description || null,
          attendees: JSON.parse(JSON.stringify(attendees || [])),
          created_by: user.user?.id,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pssr-walkdowns', pssrId] });
      toast({
        title: 'Walkdown Scheduled',
        description: 'PSSR walkdown has been scheduled successfully.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Failed to Schedule Walkdown',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Start a walkdown (change status to in_progress)
  const startWalkdown = useMutation({
    mutationFn: async (walkdownId: string) => {
      const { data, error } = await supabase
        .from('pssr_walkdown_events')
        .update({ status: 'in_progress' })
        .eq('id', walkdownId)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pssr-walkdowns', pssrId] });
      toast({
        title: 'Walkdown Started',
        description: 'The walkdown session has been started.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Failed to Start Walkdown',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Complete a walkdown
  const completeWalkdown = useMutation({
    mutationFn: async (walkdownId: string) => {
      const { data, error } = await supabase
        .from('pssr_walkdown_events')
        .update({ 
          status: 'completed',
          completed_at: new Date().toISOString(),
        })
        .eq('id', walkdownId)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pssr-walkdowns', pssrId] });
      toast({
        title: 'Walkdown Completed',
        description: 'The walkdown session has been marked as complete.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Failed to Complete Walkdown',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Cancel a walkdown
  const cancelWalkdown = useMutation({
    mutationFn: async (walkdownId: string) => {
      const { data, error } = await supabase
        .from('pssr_walkdown_events')
        .update({ status: 'cancelled' })
        .eq('id', walkdownId)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pssr-walkdowns', pssrId] });
      toast({
        title: 'Walkdown Cancelled',
        description: 'The walkdown has been cancelled.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Failed to Cancel Walkdown',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Update walkdown details
  const updateWalkdown = useMutation({
    mutationFn: async ({
      walkdownId,
      scheduledDate,
      scheduledTime,
      location,
      description,
      attendees,
    }: {
      walkdownId: string;
      scheduledDate?: string;
      scheduledTime?: string;
      location?: string;
      description?: string;
      attendees?: WalkdownAttendee[];
    }) => {
      const updateData: Record<string, unknown> = {};
      if (scheduledDate !== undefined) updateData.scheduled_date = scheduledDate;
      if (scheduledTime !== undefined) updateData.scheduled_time = scheduledTime;
      if (location !== undefined) updateData.location = location;
      if (description !== undefined) updateData.description = description;
      if (attendees !== undefined) updateData.attendees = attendees;
      
      const { data, error } = await supabase
        .from('pssr_walkdown_events')
        .update(updateData)
        .eq('id', walkdownId)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pssr-walkdowns', pssrId] });
      toast({
        title: 'Walkdown Updated',
        description: 'Walkdown details have been updated.',
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

  // Get stats
  const stats = {
    total: walkdowns?.length || 0,
    scheduled: walkdowns?.filter(w => w.status === 'scheduled').length || 0,
    inProgress: walkdowns?.filter(w => w.status === 'in_progress').length || 0,
    completed: walkdowns?.filter(w => w.status === 'completed').length || 0,
    cancelled: walkdowns?.filter(w => w.status === 'cancelled').length || 0,
  };

  // Get the current/latest active walkdown
  const activeWalkdown = walkdowns?.find(w => w.status === 'in_progress') || 
    walkdowns?.find(w => w.status === 'scheduled');

  return {
    walkdowns,
    isLoading,
    error,
    scheduleWalkdown,
    startWalkdown,
    completeWalkdown,
    cancelWalkdown,
    updateWalkdown,
    stats,
    activeWalkdown,
  };
};

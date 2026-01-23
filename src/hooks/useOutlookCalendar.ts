import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface OutlookWalkdownAttendee {
  id: string;
  name: string;
  email: string;
  role?: string;
}

interface CreateEventParams {
  walkdownEventId: string;
  title: string;
  description?: string;
  location?: string;
  startDateTime: string;
  endDateTime: string;
  attendees: OutlookWalkdownAttendee[];
  pssrId: string;
}

interface UpdateEventParams {
  walkdownEventId: string;
  title?: string;
  description?: string;
  location?: string;
  startDateTime?: string;
  endDateTime?: string;
  attendees?: OutlookWalkdownAttendee[];
}

interface AttendeeWithRSVP {
  id: string;
  walkdown_event_id: string;
  user_id: string | null;
  name: string;
  email: string;
  role: string | null;
  rsvp_status: 'pending' | 'accepted' | 'declined' | 'tentative';
  response_time: string | null;
  source: 'checklist' | 'manual';
  created_at: string;
  updated_at: string;
}

export const useOutlookCalendar = (walkdownEventId?: string) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch attendees with RSVP status
  const { data: attendees, isLoading: isLoadingAttendees, refetch: refetchAttendees } = useQuery({
    queryKey: ['walkdown-attendees', walkdownEventId],
    queryFn: async (): Promise<AttendeeWithRSVP[]> => {
      if (!walkdownEventId) return [];

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return [];

      const response = await supabase.functions.invoke('outlook-calendar/get-attendees', {
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: { walkdownEventId },
      });

      if (response.error) {
        console.error('Failed to fetch attendees:', response.error);
        return [];
      }

      return response.data.attendees || [];
    },
    enabled: !!walkdownEventId,
    staleTime: 30000,
  });

  // Create Outlook event
  const createEventMutation = useMutation({
    mutationFn: async (params: CreateEventParams) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await supabase.functions.invoke('outlook-calendar/create-event', {
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: params,
      });

      if (response.error) {
        throw new Error(response.error.message || 'Failed to create Outlook event');
      }

      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['pssr-walkdowns'] });
      queryClient.invalidateQueries({ queryKey: ['walkdown-attendees'] });
      toast({
        title: 'Outlook Event Created',
        description: 'Calendar invitation sent to all attendees.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to Create Event',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Update Outlook event
  const updateEventMutation = useMutation({
    mutationFn: async (params: UpdateEventParams) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await supabase.functions.invoke('outlook-calendar/update-event', {
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: params,
      });

      if (response.error) {
        throw new Error(response.error.message || 'Failed to update Outlook event');
      }

      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pssr-walkdowns'] });
      toast({
        title: 'Event Updated',
        description: 'Outlook calendar event has been updated.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to Update Event',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Delete Outlook event
  const deleteEventMutation = useMutation({
    mutationFn: async (walkdownEventId: string) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await supabase.functions.invoke('outlook-calendar/delete-event', {
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: { walkdownEventId },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Failed to delete Outlook event');
      }

      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pssr-walkdowns'] });
      toast({
        title: 'Event Deleted',
        description: 'Outlook calendar event has been removed.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to Delete Event',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Sync RSVP status from Outlook
  const syncRsvpMutation = useMutation({
    mutationFn: async (walkdownEventId: string) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await supabase.functions.invoke('outlook-calendar/sync-rsvp', {
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: { walkdownEventId },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Failed to sync RSVP status');
      }

      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['walkdown-attendees', walkdownEventId] });
      toast({
        title: 'RSVP Synced',
        description: 'Attendee responses have been updated from Outlook.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Sync Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Computed RSVP stats
  const rsvpStats = attendees ? {
    total: attendees.length,
    accepted: attendees.filter(a => a.rsvp_status === 'accepted').length,
    declined: attendees.filter(a => a.rsvp_status === 'declined').length,
    tentative: attendees.filter(a => a.rsvp_status === 'tentative').length,
    pending: attendees.filter(a => a.rsvp_status === 'pending').length,
  } : null;

  return {
    // Data
    attendees: attendees || [],
    rsvpStats,
    isLoadingAttendees,
    
    // Mutations
    createEvent: createEventMutation.mutateAsync,
    isCreatingEvent: createEventMutation.isPending,
    
    updateEvent: updateEventMutation.mutateAsync,
    isUpdatingEvent: updateEventMutation.isPending,
    
    deleteEvent: deleteEventMutation.mutateAsync,
    isDeletingEvent: deleteEventMutation.isPending,
    
    syncRsvp: syncRsvpMutation.mutateAsync,
    isSyncingRsvp: syncRsvpMutation.isPending,
    
    refetchAttendees,
  };
};

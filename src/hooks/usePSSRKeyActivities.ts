import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface PSSRKeyActivity {
  id: string;
  pssr_id: string;
  activity_type: string;
  label: string;
  display_order: number;
  status: 'not_scheduled' | 'scheduled' | 'completed' | 'cancelled';
  scheduled_date: string | null;
  scheduled_end_date: string | null;
  location: string | null;
  notes: string | null;
  outlook_event_id: string | null;
  scheduled_by: string | null;
  completed_at: string | null;
  task_id: string | null;
  created_at: string;
  updated_at: string;
}

const DEFAULT_ACTIVITIES = [
  { activity_type: 'kickoff', label: 'PSSR Kick-off', display_order: 1 },
  { activity_type: 'walkdown', label: 'PSSR Walkdown', display_order: 2 },
  { activity_type: 'sof_meeting', label: 'SoF Meeting', display_order: 3 },
];

export function usePSSRKeyActivities(pssrId: string | undefined) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['pssr-key-activities', pssrId],
    queryFn: async () => {
      if (!pssrId) return [];
      const { data, error } = await supabase
        .from('pssr_key_activities')
        .select('*')
        .eq('pssr_id', pssrId)
        .order('display_order', { ascending: true });
      if (error) throw error;
      return (data || []) as PSSRKeyActivity[];
    },
    enabled: !!pssrId,
  });

  // Create default activities + tasks for PSSR Lead when PSSR transitions to UNDER_REVIEW
  const initializeActivities = useMutation({
    mutationFn: async ({ pssrId, pssrLeadId, pssrTitle }: { pssrId: string; pssrLeadId: string; pssrTitle: string }) => {
      // Check if activities already exist
      const { data: existing } = await supabase
        .from('pssr_key_activities')
        .select('id')
        .eq('pssr_id', pssrId)
        .limit(1);
      
      if (existing && existing.length > 0) return; // Already initialized

      // Create default activities
      const activities = DEFAULT_ACTIVITIES.map(a => ({
        pssr_id: pssrId,
        ...a,
      }));

      const { data: inserted, error: actError } = await supabase
        .from('pssr_key_activities')
        .insert(activities)
        .select('id, label, activity_type');
      if (actError) throw actError;

      // Create tasks for PSSR Lead to schedule each activity
      if (inserted && pssrLeadId) {
        const tasks = inserted.map(act => ({
          user_id: pssrLeadId,
          title: `Schedule ${act.label}`,
          description: `Schedule the ${act.label} for PSSR: ${pssrTitle}`,
          priority: 'High',
          type: 'action',
          status: 'pending',
          metadata: {
            pssr_id: pssrId,
            activity_id: act.id,
            activity_type: act.activity_type,
            module: 'pssr',
          },
        }));

        const { data: taskData, error: taskError } = await supabase
          .from('user_tasks')
          .insert(tasks)
          .select('id, metadata');
        
        if (!taskError && taskData) {
          // Link task IDs back to activities
          const updates = taskData.map(t => {
            const meta = t.metadata as Record<string, any>;
            return supabase
              .from('pssr_key_activities')
              .update({ task_id: t.id })
              .eq('id', meta.activity_id);
          });
          await Promise.all(updates);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pssr-key-activities', pssrId] });
      queryClient.invalidateQueries({ queryKey: ['user-tasks'] });
    },
  });

  // Schedule an activity
  const scheduleActivity = useMutation({
    mutationFn: async ({
      activityId,
      scheduledDate,
      scheduledEndDate,
      location,
      notes,
      outlookEventId,
    }: {
      activityId: string;
      scheduledDate: string;
      scheduledEndDate?: string;
      location?: string;
      notes?: string;
      outlookEventId?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('pssr_key_activities')
        .update({
          status: 'scheduled',
          scheduled_date: scheduledDate,
          scheduled_end_date: scheduledEndDate || null,
          location: location || null,
          notes: notes || null,
          outlook_event_id: outlookEventId || null,
          scheduled_by: user?.id || null,
        })
        .eq('id', activityId);
      if (error) throw error;

      // Auto-complete the associated task
      const { data: activity } = await supabase
        .from('pssr_key_activities')
        .select('task_id')
        .eq('id', activityId)
        .single();
      
      if (activity?.task_id) {
        await supabase
          .from('user_tasks')
          .update({ status: 'completed' })
          .eq('id', activity.task_id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pssr-key-activities', pssrId] });
      queryClient.invalidateQueries({ queryKey: ['user-tasks'] });
    },
  });

  // Add a custom activity
  const addActivity = useMutation({
    mutationFn: async ({ label, pssrLeadId, pssrTitle }: { label: string; pssrLeadId?: string; pssrTitle?: string }) => {
      if (!pssrId) throw new Error('No PSSR ID');
      
      const maxOrder = (query.data || []).reduce((max, a) => Math.max(max, a.display_order), 0);
      
      const { data: inserted, error } = await supabase
        .from('pssr_key_activities')
        .insert({
          pssr_id: pssrId,
          activity_type: 'custom',
          label,
          display_order: maxOrder + 1,
        })
        .select('id, label')
        .single();
      if (error) throw error;

      // Create task for PSSR Lead
      if (pssrLeadId && inserted) {
        const { data: taskData } = await supabase
          .from('user_tasks')
          .insert({
            user_id: pssrLeadId,
            title: `Schedule ${label}`,
            description: `Schedule ${label} for PSSR: ${pssrTitle || ''}`,
            priority: 'High',
            type: 'action',
            status: 'pending',
            metadata: {
              pssr_id: pssrId,
              activity_id: inserted.id,
              activity_type: 'custom',
              module: 'pssr',
            },
          })
          .select('id')
          .single();
        
        if (taskData) {
          await supabase
            .from('pssr_key_activities')
            .update({ task_id: taskData.id })
            .eq('id', inserted.id);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pssr-key-activities', pssrId] });
      queryClient.invalidateQueries({ queryKey: ['user-tasks'] });
    },
  });

  return {
    activities: query.data || [],
    isLoading: query.isLoading,
    initializeActivities,
    scheduleActivity,
    addActivity,
  };
}

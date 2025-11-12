import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';

export const useORPRealtime = (planId?: string) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel('orp-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orp_plan_deliverables',
          filter: planId ? `orp_plan_id=eq.${planId}` : undefined
        },
        (payload) => {
          console.log('Deliverable updated:', payload);
          queryClient.invalidateQueries({ queryKey: ['orp-plan', planId] });
          queryClient.invalidateQueries({ queryKey: ['orp-plans'] });
          
          toast({
            title: 'Update',
            description: 'A deliverable was updated'
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orp_approvals',
          filter: planId ? `orp_plan_id=eq.${planId}` : undefined
        },
        (payload: any) => {
          console.log('Approval updated:', payload);
          queryClient.invalidateQueries({ queryKey: ['orp-plan', planId] });
          
          const status = payload.new.status;
          toast({
            title: 'Approval Update',
            description: `An approval was ${status.toLowerCase()}`,
            variant: status === 'APPROVED' ? 'default' : 'destructive'
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'orp_collaborators'
        },
        (payload) => {
          console.log('Collaborator added:', payload);
          queryClient.invalidateQueries({ queryKey: ['orp-plan', planId] });
          
          toast({
            title: 'New Collaborator',
            description: 'You were added as a collaborator'
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'orp_resources',
          filter: planId ? `orp_plan_id=eq.${planId}` : undefined
        },
        (payload) => {
          console.log('Resource added:', payload);
          queryClient.invalidateQueries({ queryKey: ['orp-plan', planId] });
          
          toast({
            title: 'Resource Added',
            description: 'A new team member was added to the ORP'
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [planId, toast, queryClient]);
};

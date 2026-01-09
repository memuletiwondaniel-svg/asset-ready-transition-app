import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';

export const useORPRealtime = (planId?: string) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    console.log('🔄 Setting up ORA realtime subscriptions...', planId ? `for plan ${planId}` : 'for all plans');

    const channel = supabase
      .channel('orp-changes')
      // Deliverable status changes
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orp_plan_deliverables',
          filter: planId ? `orp_plan_id=eq.${planId}` : undefined
        },
        (payload) => {
          console.log('📋 Deliverable updated:', payload);
          const oldData = payload.old;
          const newData = payload.new;

          queryClient.invalidateQueries({ queryKey: ['orp-plan-details', planId] });
          queryClient.invalidateQueries({ queryKey: ['orp-plans'] });

          // Status change notification
          if (oldData.status !== newData.status) {
            const statusLabels: Record<string, string> = {
              NOT_STARTED: 'Not Started',
              IN_PROGRESS: 'In Progress',
              COMPLETED: 'Completed',
              ON_HOLD: 'On Hold'
            };

            toast({
              title: '📊 Deliverable Status Changed',
              description: `Moved from ${statusLabels[oldData.status]} to ${statusLabels[newData.status]}`,
              duration: 4000,
            });
          }

          // Progress update notification
          if (oldData.completion_percentage !== newData.completion_percentage) {
            if (newData.completion_percentage === 100) {
              toast({
                title: '🎉 Deliverable Completed!',
                description: 'A deliverable has reached 100% completion',
                duration: 5000,
              });
            } else if (newData.completion_percentage > oldData.completion_percentage) {
              toast({
                title: '📈 Progress Update',
                description: `Completion increased to ${newData.completion_percentage}%`,
                duration: 3000,
              });
            }
          }
        }
      )
      // Approval updates
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orp_approvals',
          filter: planId ? `orp_plan_id=eq.${planId}` : undefined
        },
        (payload: any) => {
          console.log('✅ Approval updated:', payload);
          queryClient.invalidateQueries({ queryKey: ['orp-plan-details', planId] });
          queryClient.invalidateQueries({ queryKey: ['orp-plans'] });
          
          const status = payload.new.status;
          const role = payload.new.approver_role;
          
          if (status === 'APPROVED') {
            toast({
              title: '✅ Approval Granted',
              description: `${role} has approved the ORA plan`,
              duration: 5000,
            });
          } else if (status === 'REJECTED') {
            toast({
              title: '❌ Approval Rejected',
              description: `${role} has rejected the ORA plan`,
              variant: 'destructive',
              duration: 5000,
            });
          }
        }
      )
      // New collaborators
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'orp_collaborators'
        },
        (payload) => {
          console.log('🤝 Collaborator added:', payload);
          queryClient.invalidateQueries({ queryKey: ['orp-plan-details', planId] });
          queryClient.invalidateQueries({ queryKey: ['orp-plans'] });
          
          toast({
            title: '🤝 New Collaborator',
            description: 'A collaborator was added to a deliverable',
            duration: 4000,
          });
        }
      )
      // New resources
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'orp_resources',
          filter: planId ? `orp_plan_id=eq.${planId}` : undefined
        },
        (payload: any) => {
          console.log('👥 Resource added:', payload);
          queryClient.invalidateQueries({ queryKey: ['orp-plan-details', planId] });
          queryClient.invalidateQueries({ queryKey: ['orp-plans'] });
          
          const resourceName = payload.new.name;
          toast({
            title: '👥 Team Member Added',
            description: `${resourceName} has been assigned to the ORA`,
            duration: 4000,
          });
        }
      )
      // Plan status updates
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orp_plans',
          filter: planId ? `id=eq.${planId}` : undefined
        },
        (payload: any) => {
          console.log('📊 ORA Plan updated:', payload);
          const oldData = payload.old;
          const newData = payload.new;

          queryClient.invalidateQueries({ queryKey: ['orp-plan-details', planId] });
          queryClient.invalidateQueries({ queryKey: ['orp-plans'] });

          if (oldData.status !== newData.status) {
            const statusLabels: Record<string, string> = {
              DRAFT: 'Draft',
              IN_PROGRESS: 'In Progress',
              PENDING_APPROVAL: 'Pending Approval',
              APPROVED: 'Approved',
              COMPLETED: 'Completed'
            };

            toast({
              title: '📋 ORA Status Updated',
              description: `Plan moved to ${statusLabels[newData.status]}`,
              duration: 5000,
            });
          }
        }
      )
      // New attachments
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'orp_deliverable_attachments'
        },
        (payload: any) => {
          console.log('📎 Attachment added:', payload);
          queryClient.invalidateQueries({ queryKey: ['orp-plan-details', planId] });
          
          const fileName = payload.new.file_name;
          toast({
            title: '📎 New Attachment',
            description: `File uploaded: ${fileName}`,
            duration: 3000,
          });
        }
      )
      .subscribe((status) => {
        console.log('🔌 ORA Realtime channel status:', status);
      });

    return () => {
      console.log('🔌 Cleaning up ORA realtime subscriptions...');
      supabase.removeChannel(channel);
    };
  }, [planId, toast, queryClient]);
};

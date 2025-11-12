import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';

interface SendNotificationParams {
  handover_id: string;
  notification_type: 'approval_ready' | 'approval_completed' | 'deliverable_updated';
  recipient_email: string;
  recipient_name: string;
  handover_details: {
    project_name: string;
    project_id: string;
    phase: string;
    stage?: string;
  };
}

export const useP2ANotifications = () => {
  const { toast } = useToast();

  const sendNotification = async (params: SendNotificationParams) => {
    try {
      const { data, error } = await supabase.functions.invoke('send-p2a-notification', {
        body: params
      });

      if (error) throw error;

      console.log('Notification sent:', data);
      
      return { success: true, data };
    } catch (error: any) {
      console.error('Failed to send notification:', error);
      toast({
        title: 'Notification Error',
        description: 'Failed to send email notification. The approval was saved successfully.',
        variant: 'destructive',
      });
      return { success: false, error };
    }
  };

  const sendApprovalReadyNotification = async (
    handoverId: string,
    recipientEmail: string,
    recipientName: string,
    projectDetails: { project_name: string; project_id: string; phase: string; stage: string }
  ) => {
    return sendNotification({
      handover_id: handoverId,
      notification_type: 'approval_ready',
      recipient_email: recipientEmail,
      recipient_name: recipientName,
      handover_details: projectDetails,
    });
  };

  const sendApprovalCompletedNotification = async (
    handoverId: string,
    recipientEmail: string,
    recipientName: string,
    projectDetails: { project_name: string; project_id: string; phase: string }
  ) => {
    return sendNotification({
      handover_id: handoverId,
      notification_type: 'approval_completed',
      recipient_email: recipientEmail,
      recipient_name: recipientName,
      handover_details: projectDetails,
    });
  };

  const sendDeliverableUpdatedNotification = async (
    handoverId: string,
    recipientEmail: string,
    recipientName: string,
    projectDetails: { project_name: string; project_id: string; phase: string }
  ) => {
    return sendNotification({
      handover_id: handoverId,
      notification_type: 'deliverable_updated',
      recipient_email: recipientEmail,
      recipient_name: recipientName,
      handover_details: projectDetails,
    });
  };

  return {
    sendApprovalReadyNotification,
    sendApprovalCompletedNotification,
    sendDeliverableUpdatedNotification,
  };
};
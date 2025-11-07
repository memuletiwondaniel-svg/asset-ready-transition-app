import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';

export interface Notification {
  id: string;
  title: string;
  content: string;
  type: string;
  status: string;
  created_at: string;
  pssr_id: string | null;
  recipient_email: string;
  recipient_user_id: string;
}

export const useNotifications = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data, error } = await supabase
          .from('notifications')
          .select('*')
          .eq('recipient_user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(20);

        if (error) throw error;
        
        setNotifications(data || []);
        setUnreadCount(data?.filter(n => n.status === 'PENDING').length || 0);
      } catch (error) {
        console.error('Error fetching notifications:', error);
        toast({
          title: "Error",
          description: "Failed to load notifications",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchNotifications();

    // Subscribe to real-time updates
    const channel = supabase
      .channel('notifications-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
        },
        (payload) => {
          console.log('Notification change:', payload);
          fetchNotifications();
          
          // Show toast for new notifications
          if (payload.eventType === 'INSERT') {
            const newNotification = payload.new as Notification;
            toast({
              title: newNotification.title,
              description: newNotification.content,
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [toast]);

  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ status: 'SENT' })
        .eq('id', notificationId);

      if (error) throw error;

      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, status: 'SENT' } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('notifications')
        .update({ status: 'SENT' })
        .eq('recipient_user_id', user.id)
        .eq('status', 'PENDING');

      if (error) throw error;

      setNotifications(prev =>
        prev.map(n => ({ ...n, status: 'SENT' }))
      );
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  return {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead
  };
};

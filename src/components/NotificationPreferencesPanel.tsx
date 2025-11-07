import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { Bell, Mail, CheckCircle, AlertCircle } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

interface NotificationPreferences {
  pssr_updates: boolean;
  system_alerts: boolean;
  delegation_alerts: boolean;
  email_notifications: boolean;
}

interface NotificationPreferencesPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const NotificationPreferencesPanel: React.FC<NotificationPreferencesPanelProps> = ({
  open,
  onOpenChange,
}) => {
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    pssr_updates: true,
    system_alerts: true,
    delegation_alerts: true,
    email_notifications: true,
  });
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      fetchPreferences();
    }
  }, [open]);

  const fetchPreferences = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('profiles')
        .select('notification_preferences')
        .eq('user_id', user.id)
        .single();

      if (error) throw error;

      if (data?.notification_preferences) {
        setPreferences(data.notification_preferences as any as NotificationPreferences);
      }
    } catch (error) {
      console.error('Error fetching preferences:', error);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('profiles')
        .update({ notification_preferences: preferences as any })
        .eq('user_id', user.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Notification preferences updated",
      });
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving preferences:', error);
      toast({
        title: "Error",
        description: "Failed to update preferences",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updatePreference = (key: keyof NotificationPreferences, value: boolean) => {
    setPreferences(prev => ({ ...prev, [key]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] backdrop-blur-xl bg-card/95">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <Bell className="w-6 h-6 text-primary" />
            Notification Preferences
          </DialogTitle>
          <DialogDescription>
            Customize which notifications you want to receive
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* In-App Notifications */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-foreground/80 flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              In-App Notifications
            </h3>
            
            <div className="space-y-4 pl-6">
              <div className="flex items-center justify-between">
                <Label htmlFor="pssr_updates" className="flex flex-col gap-1 cursor-pointer">
                  <span className="font-medium">PSSR Updates</span>
                  <span className="text-sm text-muted-foreground">
                    Notifications about PSSR status changes and approvals
                  </span>
                </Label>
                <Switch
                  id="pssr_updates"
                  checked={preferences.pssr_updates}
                  onCheckedChange={(checked) => updatePreference('pssr_updates', checked)}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <Label htmlFor="delegation_alerts" className="flex flex-col gap-1 cursor-pointer">
                  <span className="font-medium">Delegation Alerts</span>
                  <span className="text-sm text-muted-foreground">
                    Notifications when tasks are delegated to you
                  </span>
                </Label>
                <Switch
                  id="delegation_alerts"
                  checked={preferences.delegation_alerts}
                  onCheckedChange={(checked) => updatePreference('delegation_alerts', checked)}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <Label htmlFor="system_alerts" className="flex flex-col gap-1 cursor-pointer">
                  <span className="font-medium">System Alerts</span>
                  <span className="text-sm text-muted-foreground">
                    Important system notifications and updates
                  </span>
                </Label>
                <Switch
                  id="system_alerts"
                  checked={preferences.system_alerts}
                  onCheckedChange={(checked) => updatePreference('system_alerts', checked)}
                />
              </div>
            </div>
          </div>

          <Separator className="my-4" />

          {/* Email Notifications */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-foreground/80 flex items-center gap-2">
              <Mail className="w-4 h-4" />
              Email Notifications
            </h3>
            
            <div className="space-y-4 pl-6">
              <div className="flex items-center justify-between">
                <Label htmlFor="email_notifications" className="flex flex-col gap-1 cursor-pointer">
                  <span className="font-medium">Email Alerts</span>
                  <span className="text-sm text-muted-foreground">
                    Receive notification summaries via email
                  </span>
                </Label>
                <Switch
                  id="email_notifications"
                  checked={preferences.email_notifications}
                  onCheckedChange={(checked) => updatePreference('email_notifications', checked)}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={loading}
            className="bg-primary hover:bg-primary/90"
          >
            {loading ? "Saving..." : "Save Preferences"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

import React, { useState, useEffect } from 'react';
import { Bell, Mail, MessageSquare, Shield, CheckCircle2, AlertTriangle, Clock } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface NotificationPreference {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  enabled: boolean;
}

export const NotificationPreferencesPanel: React.FC = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [emailDigestFrequency, setEmailDigestFrequency] = useState<'instant' | 'daily' | 'weekly'>('instant');
  const [preferences, setPreferences] = useState<NotificationPreference[]>([
    {
      id: 'pssr_updates',
      label: 'PSSR Updates',
      description: 'Notifications about Pre-Startup Safety Review changes',
      icon: <CheckCircle2 className="h-4 w-4" />,
      enabled: true,
    },
    {
      id: 'checklist_items',
      label: 'Checklist Items',
      description: 'Alerts when new checklist items are assigned to you',
      icon: <Bell className="h-4 w-4" />,
      enabled: true,
    },
    {
      id: 'system_alerts',
      label: 'System Alerts',
      description: 'Important system notifications and warnings',
      icon: <AlertTriangle className="h-4 w-4" />,
      enabled: true,
    },
    {
      id: 'team_messages',
      label: 'Team Messages',
      description: 'Messages and mentions from team members',
      icon: <MessageSquare className="h-4 w-4" />,
      enabled: false,
    },
    {
      id: 'email_notifications',
      label: 'Email Notifications',
      description: 'Receive notifications via email',
      icon: <Mail className="h-4 w-4" />,
      enabled: true,
    },
    {
      id: 'security_alerts',
      label: 'Security Alerts',
      description: 'Account security and login notifications',
      icon: <Shield className="h-4 w-4" />,
      enabled: true,
    },
  ]);

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading preferences:', error);
        return;
      }

      if (data) {
        // Update preferences with database values
        setPreferences(prev =>
          prev.map(pref => ({
            ...pref,
            enabled: data[pref.id] ?? pref.enabled,
          }))
        );
        const frequency = data.email_digest_frequency as 'instant' | 'daily' | 'weekly';
        setEmailDigestFrequency(frequency || 'instant');
      }
    } catch (error) {
      console.error('Error loading preferences:', error);
    } finally {
      setLoading(false);
    }
  };

  const togglePreference = (id: string) => {
    setPreferences(prev =>
      prev.map(pref =>
        pref.id === id ? { ...pref, enabled: !pref.enabled } : pref
      )
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Error",
          description: "You must be logged in to save preferences.",
          variant: "destructive",
        });
        return;
      }

      const preferencesData = {
        user_id: user.id,
        pssr_updates: preferences.find(p => p.id === 'pssr_updates')?.enabled ?? true,
        checklist_items: preferences.find(p => p.id === 'checklist_items')?.enabled ?? true,
        system_alerts: preferences.find(p => p.id === 'system_alerts')?.enabled ?? true,
        team_messages: preferences.find(p => p.id === 'team_messages')?.enabled ?? false,
        email_notifications: preferences.find(p => p.id === 'email_notifications')?.enabled ?? true,
        security_alerts: preferences.find(p => p.id === 'security_alerts')?.enabled ?? true,
        email_digest_frequency: emailDigestFrequency,
      };

      const { error } = await supabase
        .from('notification_preferences')
        .upsert(preferencesData, {
          onConflict: 'user_id'
        });

      if (error) throw error;

      toast({
        title: "Preferences saved",
        description: "Your notification preferences have been updated.",
      });
    } catch (error) {
      console.error('Error saving preferences:', error);
      toast({
        title: "Error",
        description: "Failed to save notification preferences.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const defaultData = {
        user_id: user.id,
        pssr_updates: true,
        checklist_items: true,
        system_alerts: true,
        team_messages: false,
        email_notifications: true,
        security_alerts: true,
        email_digest_frequency: 'instant',
      };

      const { error } = await supabase
        .from('notification_preferences')
        .upsert(defaultData, {
          onConflict: 'user_id'
        });

      if (error) throw error;

      await loadPreferences();
      
      toast({
        title: "Preferences reset",
        description: "Your notification preferences have been reset to defaults.",
      });
    } catch (error) {
      console.error('Error resetting preferences:', error);
      toast({
        title: "Error",
        description: "Failed to reset notification preferences.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h2 className="text-2xl font-bold">Notification Preferences</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Control what types of notifications you receive
        </p>
      </div>

      <Separator />

      <div className="space-y-4">
        {preferences.map((pref) => (
          <Card key={pref.id} className="border-border/40">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-start gap-4">
                  <div className="mt-1 p-2 rounded-lg bg-primary/10 text-primary">
                    {pref.icon}
                  </div>
                  <div className="flex-1">
                    <Label htmlFor={pref.id} className="text-base font-semibold cursor-pointer">
                      {pref.label}
                    </Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      {pref.description}
                    </p>
                  </div>
                </div>
                <Switch
                  id={pref.id}
                  checked={pref.enabled}
                  onCheckedChange={() => togglePreference(pref.id)}
                  disabled={saving}
                />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Separator />

      {/* Email Digest Frequency */}
      <Card className="border-border/40">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-start gap-4">
              <div className="mt-1 p-2 rounded-lg bg-primary/10 text-primary">
                <Clock className="h-4 w-4" />
              </div>
              <div className="flex-1">
                <Label htmlFor="digest-frequency" className="text-base font-semibold">
                  Email Digest Frequency
                </Label>
                <p className="text-sm text-muted-foreground mt-1">
                  How often you want to receive email notifications
                </p>
              </div>
            </div>
            <Select
              value={emailDigestFrequency}
              onValueChange={(value) => setEmailDigestFrequency(value as 'instant' | 'daily' | 'weekly')}
              disabled={saving}
            >
              <SelectTrigger className="w-[150px]" id="digest-frequency">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="instant">Instant</SelectItem>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3 pt-4">
        <Button variant="outline" onClick={handleReset} disabled={saving}>
          Reset to defaults
        </Button>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save preferences'}
        </Button>
      </div>
    </div>
  );
};

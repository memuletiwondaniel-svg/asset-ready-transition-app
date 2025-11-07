import React, { useState } from 'react';
import { Bell, Mail, MessageSquare, Shield, CheckCircle2, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/components/ui/use-toast';

interface NotificationPreference {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  enabled: boolean;
}

export const NotificationPreferencesPanel: React.FC = () => {
  const { toast } = useToast();
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

  const togglePreference = (id: string) => {
    setPreferences(prev =>
      prev.map(pref =>
        pref.id === id ? { ...pref, enabled: !pref.enabled } : pref
      )
    );
  };

  const handleSave = () => {
    // Here you would save to the database
    toast({
      title: "Preferences saved",
      description: "Your notification preferences have been updated.",
    });
  };

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
                />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <Button variant="outline">Reset to defaults</Button>
        <Button onClick={handleSave}>Save preferences</Button>
      </div>
    </div>
  );
};

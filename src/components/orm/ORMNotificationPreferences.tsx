import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Bell, Save, RotateCcw } from 'lucide-react';
import { useORMNotificationPreferences } from '@/hooks/useORMNotificationPreferences';
import { Skeleton } from '@/components/ui/skeleton';

export const ORMNotificationPreferences: React.FC = () => {
  const { preferences, isLoading, updatePreferences } = useORMNotificationPreferences();
  
  const [frequency, setFrequency] = useState<'daily' | 'weekly' | 'never'>('weekly');
  const [includePendingReviews, setIncludePendingReviews] = useState(true);
  const [includeOverdueTasks, setIncludeOverdueTasks] = useState(true);
  const [includeMilestoneProgress, setIncludeMilestoneProgress] = useState(true);
  const [digestTime, setDigestTime] = useState('09:00:00');

  useEffect(() => {
    if (preferences) {
      setFrequency(preferences.digest_frequency);
      setIncludePendingReviews(preferences.include_pending_reviews);
      setIncludeOverdueTasks(preferences.include_overdue_tasks);
      setIncludeMilestoneProgress(preferences.include_milestone_progress);
      setDigestTime(preferences.digest_time);
    }
  }, [preferences]);

  const handleSave = () => {
    updatePreferences({
      digest_frequency: frequency,
      include_pending_reviews: includePendingReviews,
      include_overdue_tasks: includeOverdueTasks,
      include_milestone_progress: includeMilestoneProgress,
      digest_time: digestTime,
    });
  };

  const handleReset = () => {
    setFrequency('weekly');
    setIncludePendingReviews(true);
    setIncludeOverdueTasks(true);
    setIncludeMilestoneProgress(true);
    setDigestTime('09:00:00');
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>ORM Notification Digest</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-primary" />
          <CardTitle>ORM Notification Digest</CardTitle>
        </div>
        <CardDescription>
          Configure your email digest for ORM updates, pending reviews, and task notifications
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Frequency Selection */}
        <div className="space-y-2">
          <Label htmlFor="frequency">Digest Frequency</Label>
          <Select value={frequency} onValueChange={(val) => setFrequency(val as any)}>
            <SelectTrigger id="frequency">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="never">Never</SelectItem>
              <SelectItem value="daily">Daily</SelectItem>
              <SelectItem value="weekly">Weekly</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            {frequency === 'daily' && 'Receive a daily summary of ORM activities'}
            {frequency === 'weekly' && 'Receive a weekly summary every Monday'}
            {frequency === 'never' && 'No digest emails will be sent'}
          </p>
        </div>

        {/* Digest Time */}
        {frequency !== 'never' && (
          <div className="space-y-2">
            <Label htmlFor="time">Delivery Time</Label>
            <Select value={digestTime} onValueChange={setDigestTime}>
              <SelectTrigger id="time">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="06:00:00">6:00 AM</SelectItem>
                <SelectItem value="07:00:00">7:00 AM</SelectItem>
                <SelectItem value="08:00:00">8:00 AM</SelectItem>
                <SelectItem value="09:00:00">9:00 AM</SelectItem>
                <SelectItem value="10:00:00">10:00 AM</SelectItem>
                <SelectItem value="12:00:00">12:00 PM</SelectItem>
                <SelectItem value="18:00:00">6:00 PM</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Content Preferences */}
        {frequency !== 'never' && (
          <div className="space-y-4 pt-4 border-t">
            <Label>Include in Digest</Label>
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="pending-reviews" className="font-normal">
                  Pending Reviews
                </Label>
                <p className="text-xs text-muted-foreground">
                  Deliverables awaiting your review
                </p>
              </div>
              <Switch
                id="pending-reviews"
                checked={includePendingReviews}
                onCheckedChange={setIncludePendingReviews}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="overdue-tasks" className="font-normal">
                  Overdue Tasks
                </Label>
                <p className="text-xs text-muted-foreground">
                  Tasks that are past their due date
                </p>
              </div>
              <Switch
                id="overdue-tasks"
                checked={includeOverdueTasks}
                onCheckedChange={setIncludeOverdueTasks}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="milestone-progress" className="font-normal">
                  Milestone Progress
                </Label>
                <p className="text-xs text-muted-foreground">
                  Progress updates on project milestones
                </p>
              </div>
              <Switch
                id="milestone-progress"
                checked={includeMilestoneProgress}
                onCheckedChange={setIncludeMilestoneProgress}
              />
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-4">
          <Button onClick={handleReset} variant="outline" size="sm">
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset
          </Button>
          <Button onClick={handleSave} size="sm">
            <Save className="h-4 w-4 mr-2" />
            Save Preferences
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

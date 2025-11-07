import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2 } from 'lucide-react';
import { WidgetConfig } from '@/hooks/useWidgetConfigs';

interface WidgetSettingsModalProps {
  widget: WidgetConfig | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (settings: Record<string, any>, size: 'small' | 'medium' | 'large') => void;
  onDelete: () => void;
}

export const WidgetSettingsModal: React.FC<WidgetSettingsModalProps> = ({
  widget,
  open,
  onOpenChange,
  onSave,
  onDelete
}) => {
  const [size, setSize] = useState<'small' | 'medium' | 'large'>(widget?.size || 'medium');
  const [settings, setSettings] = useState<Record<string, any>>(widget?.settings || {});

  React.useEffect(() => {
    if (widget) {
      setSize(widget.size);
      setSettings(widget.settings);
    }
  }, [widget]);

  if (!widget) return null;

  const handleSave = () => {
    onSave(settings, size);
    onOpenChange(false);
  };

  const renderWidgetSpecificSettings = () => {
    switch (widget.widget_type) {
      case 'tasks':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Maximum Tasks to Display</Label>
              <Select 
                value={String(settings.maxTasks || 3)}
                onValueChange={(val) => setSettings({ ...settings, maxTasks: Number(val) })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="3">3 tasks</SelectItem>
                  <SelectItem value="5">5 tasks</SelectItem>
                  <SelectItem value="10">10 tasks</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="show-completed">Show Completed Tasks</Label>
              <Switch 
                id="show-completed"
                checked={settings.showCompleted || false}
                onCheckedChange={(checked) => setSettings({ ...settings, showCompleted: checked })}
              />
            </div>
          </div>
        );
      case 'quick-stats':
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="auto-refresh">Auto Refresh</Label>
              <Switch 
                id="auto-refresh"
                checked={settings.autoRefresh !== false}
                onCheckedChange={(checked) => setSettings({ ...settings, autoRefresh: checked })}
              />
            </div>
          </div>
        );
      case 'recent-activity':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Number of Activities</Label>
              <Select 
                value={String(settings.maxActivities || 3)}
                onValueChange={(val) => setSettings({ ...settings, maxActivities: Number(val) })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="3">3 activities</SelectItem>
                  <SelectItem value="5">5 activities</SelectItem>
                  <SelectItem value="10">10 activities</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        );
      case 'calendar':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Default View</Label>
              <Select 
                value={settings.defaultView || 'month'}
                onValueChange={(val) => setSettings({ ...settings, defaultView: val })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="day">Day</SelectItem>
                  <SelectItem value="week">Week</SelectItem>
                  <SelectItem value="month">Month</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Widget Settings</DialogTitle>
          <DialogDescription>
            Customize your {widget.widget_type} widget
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <Label>Widget Size</Label>
            <Select value={size} onValueChange={(val) => setSize(val as 'small' | 'medium' | 'large')}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="small">Small</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="large">Large</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {renderWidgetSpecificSettings()}
        </div>

        <DialogFooter className="flex justify-between">
          <Button 
            variant="destructive" 
            onClick={onDelete}
            className="mr-auto"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Delete Widget
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={handleSave}>Save Changes</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

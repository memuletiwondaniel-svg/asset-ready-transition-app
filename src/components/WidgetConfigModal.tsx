import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Settings, Maximize2 } from 'lucide-react';
import { WidgetConfig } from '@/hooks/useWidgetConfigs';

interface WidgetConfigModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  widget: WidgetConfig | null;
  onSave: (widgetId: string, size: 'small' | 'medium' | 'large', settings: Record<string, any>) => void;
}

export const WidgetConfigModal: React.FC<WidgetConfigModalProps> = ({
  open,
  onOpenChange,
  widget,
  onSave,
}) => {
  const [size, setSize] = useState<'small' | 'medium' | 'large'>(widget?.size || 'medium');
  const [settings, setSettings] = useState<Record<string, any>>(widget?.settings || {});

  const handleSave = () => {
    if (widget) {
      onSave(widget.id, size, settings);
      onOpenChange(false);
    }
  };

  const getWidgetTitle = (type: string) => {
    switch (type) {
      case 'tasks':
        return 'Tasks Widget';
      case 'quick-stats':
        return 'Quick Stats Widget';
      case 'recent-activity':
        return 'Recent Activity Widget';
      default:
        return 'Widget Configuration';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] backdrop-blur-xl bg-card/95">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <Settings className="w-6 h-6 text-primary" />
            {widget && getWidgetTitle(widget.widget_type)}
          </DialogTitle>
          <DialogDescription>
            Customize the appearance and behavior of this widget
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Size Configuration */}
          <div className="space-y-3">
            <Label htmlFor="widget-size" className="flex items-center gap-2 text-base font-semibold">
              <Maximize2 className="w-4 h-4" />
              Widget Size
            </Label>
            <Select value={size} onValueChange={(value: any) => setSize(value)}>
              <SelectTrigger id="widget-size" className="backdrop-blur-sm bg-background/80">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="backdrop-blur-xl bg-background/98">
                <SelectItem value="small">Small (1 column)</SelectItem>
                <SelectItem value="medium">Medium (2 columns)</SelectItem>
                <SelectItem value="large">Large (3 columns)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              Adjust the width of the widget in the dashboard grid
            </p>
          </div>

          {/* Widget-specific settings */}
          {widget?.widget_type === 'tasks' && (
            <div className="space-y-3">
              <Label htmlFor="task-limit" className="text-base font-semibold">
                Display Options
              </Label>
              <Select 
                value={settings.limit?.toString() || '5'} 
                onValueChange={(value) => setSettings({ ...settings, limit: parseInt(value) })}
              >
                <SelectTrigger id="task-limit" className="backdrop-blur-sm bg-background/80">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="backdrop-blur-xl bg-background/98">
                  <SelectItem value="3">Show 3 tasks</SelectItem>
                  <SelectItem value="5">Show 5 tasks</SelectItem>
                  <SelectItem value="10">Show 10 tasks</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {widget?.widget_type === 'quick-stats' && (
            <div className="space-y-3">
              <Label className="text-base font-semibold">
                Stats Display
              </Label>
              <p className="text-sm text-muted-foreground">
                Configure which statistics to display in the widget
              </p>
            </div>
          )}

          {widget?.widget_type === 'recent-activity' && (
            <div className="space-y-3">
              <Label htmlFor="activity-limit" className="text-base font-semibold">
                Activity Items
              </Label>
              <Select 
                value={settings.limit?.toString() || '5'} 
                onValueChange={(value) => setSettings({ ...settings, limit: parseInt(value) })}
              >
                <SelectTrigger id="activity-limit" className="backdrop-blur-sm bg-background/80">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="backdrop-blur-xl bg-background/98">
                  <SelectItem value="3">Show 3 activities</SelectItem>
                  <SelectItem value="5">Show 5 activities</SelectItem>
                  <SelectItem value="8">Show 8 activities</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            className="bg-primary hover:bg-primary/90"
          >
            Save Changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

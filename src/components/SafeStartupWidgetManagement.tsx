import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Activity, Zap, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';

interface SafeStartupWidgetConfig {
  id: string;
  title: string;
  isVisible: boolean;
  isExpanded: boolean;
}

interface SafeStartupWidgetManagementProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  widgets: SafeStartupWidgetConfig[];
  onToggleWidget: (widgetId: string) => void;
  onResetWidgets: () => void;
}

export const SafeStartupWidgetManagement: React.FC<SafeStartupWidgetManagementProps> = ({
  open,
  onOpenChange,
  widgets,
  onToggleWidget,
  onResetWidgets
}) => {
  const [showResetDialog, setShowResetDialog] = useState(false);

  const availableWidgetTypes = [
    { 
      id: 'pssr-stats', 
      title: 'PSSR Statistics', 
      icon: Activity, 
      description: 'Overview of PSSR counts and progress' 
    },
    { 
      id: 'quick-actions', 
      title: 'Quick Actions', 
      icon: Zap, 
      description: 'Fast access to create PSSR and manage checklists' 
    },
  ];

  const handleReset = () => {
    onResetWidgets();
    setShowResetDialog(false);
    toast.success('Widgets reset to default configuration');
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl flex items-center gap-2">
              <Activity className="w-6 h-6" />
              Safe Start-Up Widget Management
            </DialogTitle>
            <DialogDescription>
              Customize your Safe Start-Up page by showing or hiding widgets
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-primary"></span>
                Available Widgets
              </h3>
              <div className="space-y-2">
                {availableWidgetTypes.map((widgetType) => {
                  const widget = widgets.find(w => w.id === widgetType.id);
                  const Icon = widgetType.icon;
                  return (
                    <Card key={widgetType.id} className="border-border/40">
                      <CardContent className="p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-primary/10">
                            <Icon className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium text-sm">{widgetType.title}</p>
                            <p className="text-xs text-muted-foreground">{widgetType.description}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={widget?.isVisible ? "default" : "secondary"} className="text-xs">
                            {widget?.isVisible ? 'Visible' : 'Hidden'}
                          </Badge>
                          <Switch
                            checked={widget?.isVisible ?? true}
                            onCheckedChange={() => onToggleWidget(widgetType.id)}
                          />
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>

            {/* Instructions */}
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">
                  <strong className="text-foreground">Tip:</strong> You can drag widgets to reposition them. Hover over a widget to see the drag handle.
                </p>
              </CardContent>
            </Card>
          </div>

          <DialogFooter className="flex items-center justify-between">
            <Button
              variant="outline"
              onClick={() => setShowResetDialog(true)}
              className="gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              Reset to Default
            </Button>
            <Button onClick={() => onOpenChange(false)}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Confirmation Dialog */}
      <AlertDialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset Widget Configuration?</AlertDialogTitle>
            <AlertDialogDescription>
              This will restore all Safe Start-Up widgets to their default visibility and positions. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleReset}>
              Reset Widgets
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

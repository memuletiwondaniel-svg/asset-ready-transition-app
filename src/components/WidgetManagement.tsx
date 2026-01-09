import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Eye, EyeOff, Plus, RotateCcw, Sparkles, ListTodo } from 'lucide-react';
import { toast } from 'sonner';

interface WidgetConfig {
  id: string;
  title: string;
  isVisible: boolean;
  isExpanded: boolean;
}

interface WidgetManagementProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  widgets: WidgetConfig[];
  onToggleWidget: (widgetId: string) => void;
  onResetWidgets: () => void;
  aiPanelVisible: boolean;
  tasksPanelVisible: boolean;
  onToggleAiPanel: () => void;
  onToggleTasksPanel: () => void;
}

export const WidgetManagement: React.FC<WidgetManagementProps> = ({
  open,
  onOpenChange,
  widgets,
  onToggleWidget,
  onResetWidgets,
  aiPanelVisible,
  tasksPanelVisible,
  onToggleAiPanel,
  onToggleTasksPanel
}) => {
  const [showResetDialog, setShowResetDialog] = useState(false);

  const availableWidgetTypes = [
    { id: 'quick-actions', title: 'Quick Actions', icon: Sparkles, description: 'Quick access to common actions' },
  ];

  const panelWidgets = [
    { id: 'ai-assistant', title: 'AI Assistant', icon: Sparkles, description: 'Chat with AI assistant', visible: aiPanelVisible, onToggle: onToggleAiPanel },
    { id: 'tasks-panel', title: 'My Tasks', icon: ListTodo, description: 'View and manage tasks', visible: tasksPanelVisible, onToggle: onToggleTasksPanel },
  ];

  const handleReset = () => {
    onResetWidgets();
    setShowResetDialog(false);
    toast.success('Widgets reset to default configuration');
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl flex items-center gap-2">
              <Sparkles className="w-6 h-6" />
              Widget Management
            </DialogTitle>
            <DialogDescription>
              Customize your dashboard by showing or hiding widgets
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Main Panels Section */}
            <div>
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-primary"></span>
                Main Panels
              </h3>
              <div className="space-y-2">
                {panelWidgets.map((panel) => {
                  const Icon = panel.icon;
                  return (
                    <Card key={panel.id} className="border-border/40">
                      <CardContent className="p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-primary/10">
                            <Icon className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium text-sm">{panel.title}</p>
                            <p className="text-xs text-muted-foreground">{panel.description}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={panel.visible ? "default" : "secondary"} className="text-xs">
                            {panel.visible ? 'Visible' : 'Hidden'}
                          </Badge>
                          <Switch
                            checked={panel.visible}
                            onCheckedChange={panel.onToggle}
                          />
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>

            {/* Dashboard Widgets Section */}
            <div>
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-accent"></span>
                Dashboard Widgets
              </h3>
              <div className="space-y-2">
                {availableWidgetTypes.map((widgetType) => {
                  const widget = widgets.find(w => w.id === widgetType.id);
                  const Icon = widgetType.icon;
                  return (
                    <Card key={widgetType.id} className="border-border/40">
                      <CardContent className="p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-accent/10">
                            <Icon className="w-5 h-5 text-accent" />
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
                            checked={widget?.isVisible ?? false}
                            onCheckedChange={() => onToggleWidget(widgetType.id)}
                          />
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>

            {/* Coming Soon Section */}
            <div>
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-muted-foreground"></span>
                Coming Soon
              </h3>
              <Card className="border-border/40 border-dashed">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3 opacity-50">
                    <div className="p-2 rounded-lg bg-muted">
                      <Plus className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">Create Custom Widget</p>
                      <p className="text-xs text-muted-foreground">Design your own widgets (Coming Soon)</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
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
              This will restore all widgets to their default visibility and positions. This action cannot be undone.
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

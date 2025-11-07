import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, TrendingUp, Activity, Calendar, Briefcase, Bell, Sparkles, Plus, BarChart3, Users } from 'lucide-react';

interface WidgetLibraryProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddWidget: (widgetType: string, size: 'small' | 'medium' | 'large') => void;
  existingWidgets: string[];
}

const AVAILABLE_WIDGETS = [
  {
    type: 'tasks',
    name: 'Tasks',
    description: 'View and manage your recent tasks',
    icon: CheckCircle,
    defaultSize: 'medium' as const,
    color: 'text-primary'
  },
  {
    type: 'quick-stats',
    name: 'Quick Stats',
    description: 'Dashboard statistics at a glance',
    icon: TrendingUp,
    defaultSize: 'small' as const,
    color: 'text-accent'
  },
  {
    type: 'recent-activity',
    name: 'Recent Activity',
    description: 'Your latest actions and updates',
    icon: Activity,
    defaultSize: 'medium' as const,
    color: 'text-success'
  },
  {
    type: 'calendar',
    name: 'Calendar',
    description: 'Upcoming events and deadlines',
    icon: Calendar,
    defaultSize: 'medium' as const,
    color: 'text-blue-500'
  },
  {
    type: 'projects',
    name: 'Projects Overview',
    description: 'Track active projects and milestones',
    icon: Briefcase,
    defaultSize: 'large' as const,
    color: 'text-purple-500'
  },
  {
    type: 'notifications',
    name: 'Notifications',
    description: 'Recent notifications and alerts',
    icon: Bell,
    defaultSize: 'small' as const,
    color: 'text-orange-500'
  },
  {
    type: 'ai-assistant',
    name: 'AI Assistant',
    description: 'Quick access to AI chat',
    icon: Sparkles,
    defaultSize: 'medium' as const,
    color: 'text-cyan-500'
  },
  {
    type: 'pssr-stats',
    name: 'PSSR Statistics',
    description: 'Real-time PSSR analytics with charts',
    icon: BarChart3,
    defaultSize: 'large' as const,
    color: 'text-indigo-500'
  },
  {
    type: 'team-members',
    name: 'Team Members',
    description: 'Team availability and current tasks',
    icon: Users,
    defaultSize: 'medium' as const,
    color: 'text-green-500'
  }
];

export const WidgetLibrary: React.FC<WidgetLibraryProps> = ({ open, onOpenChange, onAddWidget, existingWidgets }) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Widget Library</DialogTitle>
          <DialogDescription>Choose widgets to add to your dashboard</DialogDescription>
        </DialogHeader>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
          {AVAILABLE_WIDGETS.map((widget) => {
            const Icon = widget.icon;
            const isAdded = existingWidgets.includes(widget.type);
            
            return (
              <Card key={widget.type} className="relative overflow-hidden group hover:shadow-lg transition-all">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className={`w-12 h-12 rounded-lg bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center mb-2`}>
                      <Icon className={`w-6 h-6 ${widget.color}`} />
                    </div>
                    {isAdded && (
                      <div className="bg-success/10 text-success text-xs px-2 py-1 rounded-full">Added</div>
                    )}
                  </div>
                  <CardTitle className="text-lg">{widget.name}</CardTitle>
                  <CardDescription className="text-xs">{widget.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button 
                    onClick={() => onAddWidget(widget.type, widget.defaultSize)}
                    size="sm"
                    className="w-full"
                    variant="outline"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Widget
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
};

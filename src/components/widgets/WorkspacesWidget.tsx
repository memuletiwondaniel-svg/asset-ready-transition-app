import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ClipboardList, KeyRound, Settings } from 'lucide-react';

interface WorkspacesWidgetProps {
  onNavigate?: (section: string) => void;
}

export const WorkspacesWidget: React.FC<WorkspacesWidgetProps> = ({ onNavigate }) => {
  const workspaces = [
    {
      id: 'safe-startup',
      title: 'Safe Start-Up',
      description: 'Manage PSSR processes and safety checklists',
      icon: ClipboardList,
      gradient: 'from-blue-500 to-blue-600'
    },
    {
      id: 'p2o',
      title: 'Project-to-Operations',
      description: 'Manage seamless project handovers',
      icon: KeyRound,
      gradient: 'from-purple-500 to-purple-600'
    },
    {
      id: 'admin-tools',
      title: 'Admin & Tools',
      description: 'Manage users, roles, and permissions',
      icon: Settings,
      gradient: 'from-orange-500 to-orange-600'
    }
  ];

  return (
    <Card className="glass-card glass-card-hover overflow-hidden">
      <CardHeader className="border-b border-border/40 py-3">
        <CardTitle className="text-lg font-bold">Workspaces</CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        <div className="grid grid-cols-3 gap-3">
          {workspaces.map((workspace) => {
            const Icon = workspace.icon;
            return (
              <Button
                key={workspace.id}
                variant="outline"
                onClick={() => onNavigate?.(workspace.id)}
                className="h-auto flex flex-col items-center gap-2 p-4 hover:bg-muted/50 group"
              >
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${workspace.gradient} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <span className="text-xs font-medium text-center">{workspace.title}</span>
              </Button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

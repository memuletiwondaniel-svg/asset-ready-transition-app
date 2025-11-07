import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ClipboardList, KeyRound, Settings, ArrowUpRight } from 'lucide-react';

interface WorkspacesWidgetProps {
  onNavigate?: (section: string) => void;
}

export const WorkspacesWidget: React.FC<WorkspacesWidgetProps> = ({ onNavigate }) => {
  const workspaces = [
    {
      id: 'safe-startup',
      title: 'Safe Start-Up',
      description: 'PSSR & Safety',
      icon: ClipboardList,
      color: 'text-blue-500',
      bg: 'bg-blue-500/10 hover:bg-blue-500/20'
    },
    {
      id: 'p2o',
      title: 'P2O Handover',
      description: 'Project Transition',
      icon: KeyRound,
      color: 'text-purple-500',
      bg: 'bg-purple-500/10 hover:bg-purple-500/20'
    },
    {
      id: 'admin-tools',
      title: 'Admin Tools',
      description: 'Users & Settings',
      icon: Settings,
      color: 'text-orange-500',
      bg: 'bg-orange-500/10 hover:bg-orange-500/20'
    }
  ];

  return (
    <Card className="glass-card overflow-hidden border-border/40">
      <CardHeader className="border-b border-border/40 pb-4">
        <CardTitle className="text-base font-semibold">Workspaces</CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <div className="grid grid-cols-3 gap-4">
          {workspaces.map((workspace) => {
            const Icon = workspace.icon;
            return (
              <button
                key={workspace.id}
                onClick={() => onNavigate?.(workspace.id)}
                className={`relative p-4 rounded-xl ${workspace.bg} transition-all group border border-transparent hover:border-border/60`}
              >
                <Icon className={`w-8 h-8 ${workspace.color} mb-3`} />
                <h3 className="text-sm font-semibold mb-1 text-left">{workspace.title}</h3>
                <p className="text-xs text-muted-foreground text-left">{workspace.description}</p>
                <ArrowUpRight className="w-4 h-4 absolute top-3 right-3 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

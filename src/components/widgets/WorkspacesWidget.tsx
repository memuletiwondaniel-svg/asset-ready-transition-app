import React from 'react';
import { ClipboardList, KeyRound, Settings, ArrowRight } from 'lucide-react';

interface WorkspacesWidgetProps {
  onNavigate?: (section: string) => void;
  className?: string;
}

export const WorkspacesWidget: React.FC<WorkspacesWidgetProps> = ({ onNavigate, className }) => {
  const workspaces = [
    {
      id: 'safe-startup',
      title: 'Safe Start-Up',
      description: 'PSSR & Safety Checklists',
      icon: ClipboardList,
      color: 'text-blue-500',
      bg: 'bg-blue-500/10',
      hoverBg: 'hover:bg-blue-500/20'
    },
    {
      id: 'p2o',
      title: 'P2O Handover',
      description: 'Project-to-Operations Transition',
      icon: KeyRound,
      color: 'text-purple-500',
      bg: 'bg-purple-500/10',
      hoverBg: 'hover:bg-purple-500/20'
    },
    {
      id: 'admin-tools',
      title: 'Admin Tools',
      description: 'Users, Roles & Permissions',
      icon: Settings,
      color: 'text-orange-500',
      bg: 'bg-orange-500/10',
      hoverBg: 'hover:bg-orange-500/20'
    }
  ];

  return (
    <div className={className}>
      <div className="space-y-3">
        {workspaces.map((workspace, index) => {
          const Icon = workspace.icon;
          return (
            <button
              key={workspace.id}
              onClick={() => onNavigate?.(workspace.id)}
              className={`relative w-full p-4 rounded-xl ${workspace.bg} ${workspace.hoverBg} transition-all duration-300 group border border-transparent hover:border-border/60 hover:shadow-md animate-fade-in`}
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-lg bg-background/50 group-hover:scale-110 transition-transform duration-300`}>
                  <Icon className={`w-6 h-6 ${workspace.color}`} />
                </div>
                <div className="flex-1 text-left">
                  <h3 className="text-sm font-semibold">{workspace.title}</h3>
                </div>
                <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-foreground group-hover:translate-x-1 transition-all duration-300" />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

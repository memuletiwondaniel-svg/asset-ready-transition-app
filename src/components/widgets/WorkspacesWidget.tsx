import React from 'react';
import { AlertTriangle, Package, Sliders, CalendarCheck, Key, Wrench, FolderKanban } from 'lucide-react';

interface WorkspacesWidgetProps {
  onNavigate?: (section: string) => void;
  className?: string;
}

export const WorkspacesWidget: React.FC<WorkspacesWidgetProps> = ({ onNavigate, className }) => {
  const workspaces = [
    {
      id: 'projects',
      title: 'Projects',
      description: 'Project Management & Tracking',
      icon: FolderKanban,
      gradient: 'from-indigo-500/20 to-violet-500/20',
      iconBg: 'bg-gradient-to-br from-indigo-500 to-violet-500',
      iconColor: 'text-white'
    },
    {
      id: 'pssr',
      title: 'PSSR',
      description: 'Pre-Start Up Safety Review & Checklists',
      icon: AlertTriangle,
      gradient: 'from-amber-500/20 to-orange-500/20',
      iconBg: 'bg-gradient-to-br from-amber-500 to-orange-500',
      iconColor: 'text-white'
    },
    {
      id: 'operation-readiness',
      title: 'ORA Plans',
      description: 'ORA Planning & Tracking',
      icon: CalendarCheck,
      gradient: 'from-blue-500/20 to-cyan-500/20',
      iconBg: 'bg-gradient-to-br from-blue-500 to-cyan-500',
      iconColor: 'text-white'
    },
    {
      id: 'or-maintenance',
      title: 'OR Maintenance',
      description: 'CMMS & IMS Development',
      icon: Wrench,
      gradient: 'from-emerald-500/20 to-teal-500/20',
      iconBg: 'bg-gradient-to-br from-emerald-500 to-teal-500',
      iconColor: 'text-white'
    },
    {
      id: 'p2a-handover',
      title: 'P2A Plan',
      description: 'Project-to-Asset Transition',
      icon: Key,
      gradient: 'from-purple-500/20 to-pink-500/20',
      iconBg: 'bg-gradient-to-br from-purple-500 to-pink-500',
      iconColor: 'text-white'
    },
    {
      id: 'admin-tools',
      title: 'Admin Tools',
      description: 'Users, Roles & Permissions',
      icon: Sliders,
      gradient: 'from-slate-500/20 to-gray-600/20',
      iconBg: 'bg-gradient-to-br from-slate-600 to-gray-700',
      iconColor: 'text-white'
    }
  ];

  return (
    <div className={className}>
      <div className="space-y-3 group/list">
        {workspaces.map((workspace, index) => {
          const Icon = workspace.icon;
          return (
            <button
              key={workspace.id}
              onClick={() => onNavigate?.(workspace.id)}
              className={`relative w-full p-4 rounded-xl backdrop-blur-sm border border-border/40 bg-gradient-to-br ${workspace.gradient} hover:border-primary/30 transition-all duration-300 group/item overflow-hidden animate-fade-in shadow-sm hover:shadow-lg hover:scale-[1.02] group-hover/list:opacity-50 hover:!opacity-100`}
              style={{ animationDelay: `${index * 100}ms` }}
            >
              {/* Shine effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover/item:translate-x-[100%] transition-transform duration-700" />
              
              <div className="flex items-center gap-4 relative z-10">
                {/* Modern icon with gradient */}
                <div className={`flex-shrink-0 w-12 h-12 rounded-xl ${workspace.iconBg} flex items-center justify-center shadow-lg group-hover/item:scale-110 group-hover/item:rotate-3 transition-all duration-300`}>
                  <Icon className={`w-6 h-6 ${workspace.iconColor}`} />
                </div>
                
                {/* Content */}
                <div className="flex-1 text-left min-w-0">
                  <h3 className="text-sm font-semibold text-foreground mb-0.5 group-hover/item:translate-x-1 transition-transform duration-300">{workspace.title}</h3>
                  <p className="text-xs text-muted-foreground line-clamp-1">{workspace.description}</p>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

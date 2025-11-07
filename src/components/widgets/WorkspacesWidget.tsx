import React from 'react';
import { ClipboardList, KeyRound, Settings, ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

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
      gradient: 'from-primary/20 via-primary/10 to-transparent',
      iconBg: 'bg-primary/10',
      iconColor: 'text-primary',
      badge: 'Active',
      badgeVariant: 'default' as const
    },
    {
      id: 'p2o',
      title: 'P2O Handover',
      description: 'Project-to-Operations Transition',
      icon: KeyRound,
      gradient: 'from-accent/20 via-accent/10 to-transparent',
      iconBg: 'bg-accent/10',
      iconColor: 'text-accent',
      badge: 'New',
      badgeVariant: 'secondary' as const
    },
    {
      id: 'admin-tools',
      title: 'Admin Tools',
      description: 'Users, Roles & Permissions',
      icon: Settings,
      gradient: 'from-orange-500/20 via-orange-500/10 to-transparent',
      iconBg: 'bg-orange-500/10',
      iconColor: 'text-orange-500',
      badge: null,
      badgeVariant: null
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
              className="relative w-full group animate-fade-in overflow-hidden"
              style={{ animationDelay: `${index * 80}ms` }}
            >
              {/* Gradient background */}
              <div className={`absolute inset-0 bg-gradient-to-br ${workspace.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
              
              {/* Card content */}
              <div className="relative backdrop-blur-sm bg-card/50 border border-border/40 rounded-xl p-4 group-hover:border-border/80 group-hover:shadow-lg group-hover:-translate-y-0.5 transition-all duration-300">
                <div className="flex items-start gap-4">
                  {/* Icon container */}
                  <div className={`flex-shrink-0 p-3 rounded-xl ${workspace.iconBg} group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shadow-sm`}>
                    <Icon className={`w-5 h-5 ${workspace.iconColor}`} strokeWidth={2.5} />
                  </div>
                  
                  {/* Content */}
                  <div className="flex-1 text-left min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                        {workspace.title}
                      </h3>
                      {workspace.badge && (
                        <Badge variant={workspace.badgeVariant} className="text-[10px] h-5 px-1.5">
                          {workspace.badge}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-1">
                      {workspace.description}
                    </p>
                  </div>
                  
                  {/* Arrow CTA */}
                  <div className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-lg bg-muted/30 group-hover:bg-primary/10 transition-all duration-300">
                    <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all duration-300" />
                  </div>
                </div>
              </div>
              
              {/* Shine effect on hover */}
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

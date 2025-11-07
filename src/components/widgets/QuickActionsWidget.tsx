import React from 'react';
import { Zap, CheckCircle, FileText, ChevronRight } from 'lucide-react';

interface QuickActionsWidgetProps {
  onActionClick?: (action: string) => void;
  className?: string;
}

export const QuickActionsWidget: React.FC<QuickActionsWidgetProps> = ({ onActionClick, className }) => {
  const quickActions = [
    {
      id: 'create-pssr',
      label: 'Create PSSR',
      description: 'Start a new safety review',
      icon: Zap,
      gradient: 'from-primary/10 to-accent/10',
      iconBg: 'bg-gradient-to-br from-primary to-accent',
      iconColor: 'text-white'
    },
    {
      id: 'approve-pssr',
      label: 'Approve PSSR',
      description: 'Review pending requests',
      icon: CheckCircle,
      gradient: 'from-green-500/10 to-emerald-500/10',
      iconBg: 'bg-gradient-to-br from-green-500 to-emerald-500',
      iconColor: 'text-white'
    },
    {
      id: 'develop-p2a',
      label: 'Develop P2A',
      description: 'Create handover plan',
      icon: FileText,
      gradient: 'from-blue-500/10 to-cyan-500/10',
      iconBg: 'bg-gradient-to-br from-blue-500 to-cyan-500',
      iconColor: 'text-white'
    }
  ];

  return (
    <div className={className}>
      <div className="space-y-3">
        {quickActions.map((action, index) => {
          const Icon = action.icon;
          return (
            <button
              key={action.id}
              onClick={() => onActionClick?.(action.id)}
              className={`relative w-full p-4 rounded-xl backdrop-blur-sm border border-border/40 bg-gradient-to-br ${action.gradient} hover:border-primary/30 transition-all duration-300 group overflow-hidden animate-fade-in text-left shadow-sm hover:shadow-md`}
              style={{ animationDelay: `${index * 50}ms` }}
            >
              {/* Shine effect on hover */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
              
              <div className="flex items-center gap-4 relative z-10">
                {/* Icon */}
                <div className={`flex-shrink-0 w-11 h-11 rounded-xl ${action.iconBg} flex items-center justify-center shadow-lg group-hover:scale-110 group-hover:rotate-3 transition-all duration-300`}>
                  <Icon className={`w-5 h-5 ${action.iconColor}`} />
                </div>
                
                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground mb-0.5 group-hover:translate-x-1 transition-transform duration-300">
                    {action.label}
                  </p>
                  <p className="text-xs text-muted-foreground line-clamp-1">{action.description}</p>
                </div>
                
                {/* Arrow CTA */}
                <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-background/50 backdrop-blur-sm flex items-center justify-center group-hover:bg-primary/10 transition-all duration-300">
                  <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all duration-300" />
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

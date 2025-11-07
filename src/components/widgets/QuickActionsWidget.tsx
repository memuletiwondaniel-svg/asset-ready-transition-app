import React from 'react';
import { ArrowRight } from 'lucide-react';

interface QuickActionsWidgetProps {
  onActionClick?: (action: string) => void;
  className?: string;
}

export const QuickActionsWidget: React.FC<QuickActionsWidgetProps> = ({ onActionClick, className }) => {
  const quickActions = [
    {
      id: 'create-pssr',
      label: 'Create PSSR',
      description: 'Start a new safety review'
    },
    {
      id: 'approve-pssr',
      label: 'Approve PSSR',
      description: 'Review pending requests'
    },
    {
      id: 'develop-p2a',
      label: 'Develop P2A',
      description: 'Create handover plan'
    }
  ];

  return (
    <div className={className}>
      <div className="space-y-2">
        {quickActions.map((action, index) => (
          <button
            key={action.id}
            onClick={() => onActionClick?.(action.id)}
            className="relative w-full p-4 rounded-lg hover:bg-accent transition-all duration-300 group border border-transparent hover:border-border/60 animate-fade-in text-left"
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <p className="text-sm font-medium group-hover:text-foreground transition-colors">
                  {action.label}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">{action.description}</p>
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground group-hover:translate-x-1 transition-all duration-300" />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

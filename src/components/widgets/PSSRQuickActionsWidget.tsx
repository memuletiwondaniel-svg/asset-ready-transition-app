import React, { useState } from 'react';
import { WidgetCard } from './WidgetCard';
import { Plus, Settings, MessageSquare } from 'lucide-react';
import { ORSHChatDialog } from './ORSHChatDialog';

interface PSSRQuickActionsWidgetProps {
  onCreatePSSR: () => void;
  onManageChecklist: () => void;
  onChatWithORSH: () => void;
  isExpanded?: boolean;
  isVisible?: boolean;
  onToggleExpand?: () => void;
  onToggleVisibility?: () => void;
}

export const PSSRQuickActionsWidget: React.FC<PSSRQuickActionsWidgetProps> = ({
  onCreatePSSR,
  onManageChecklist,
  onChatWithORSH,
  isExpanded,
  isVisible,
  onToggleExpand,
  onToggleVisibility
}) => {
  const [chatOpen, setChatOpen] = useState(false);

  const handleChatClick = () => {
    setChatOpen(true);
  };

  const actions = [
    {
      label: 'Create PSSR',
      icon: Plus,
      onClick: onCreatePSSR,
      color: 'primary',
    },
    {
      label: 'Manage Checklist',
      icon: Settings,
      onClick: onManageChecklist,
      color: 'secondary',
    },
    {
      label: 'Ask ORSH AI',
      icon: MessageSquare,
      onClick: handleChatClick,
      color: 'accent',
    },
  ];

  const getColorClasses = (color: string) => {
    switch (color) {
      case 'primary':
        return {
          bg: 'bg-primary/10 group-hover:bg-primary/20',
          icon: 'text-primary',
          border: 'border-primary/20 group-hover:border-primary/40',
        };
      case 'secondary':
        return {
          bg: 'bg-secondary/10 group-hover:bg-secondary/20',
          icon: 'text-secondary-foreground',
          border: 'border-secondary/20 group-hover:border-secondary/40',
        };
      case 'accent':
        return {
          bg: 'bg-accent/10 group-hover:bg-accent/20',
          icon: 'text-accent-foreground',
          border: 'border-accent/20 group-hover:border-accent/40',
        };
      default:
        return {
          bg: 'bg-muted/10 group-hover:bg-muted/20',
          icon: 'text-foreground',
          border: 'border-border/20 group-hover:border-border/40',
        };
    }
  };

  return (
    <>
      <WidgetCard 
        title="Quick Actions" 
        className="h-full flex flex-col"
        isExpanded={isExpanded}
        isVisible={isVisible}
        onToggleExpand={onToggleExpand}
        onToggleVisibility={onToggleVisibility}
      >
        <div className="space-y-2.5">
          {actions.map((action, index) => {
            const Icon = action.icon;
            const colors = getColorClasses(action.color);
            
            return (
              <button
                key={index}
                onClick={action.onClick}
                className={`group w-full flex items-center gap-3 p-3 rounded-xl border ${colors.border} ${colors.bg} transition-all duration-300 hover:-translate-y-0.5 hover:shadow-sm`}
              >
                <div className="flex items-center justify-center w-11 h-11 rounded-lg bg-background/50 backdrop-blur-sm flex-shrink-0 transition-transform duration-300 group-hover:scale-110">
                  <Icon className={`h-5 w-5 ${colors.icon}`} />
                </div>
                <span className="font-medium text-sm text-foreground flex-1 text-left">
                  {action.label}
                </span>
              </button>
            );
          })}
        </div>
      </WidgetCard>
      <ORSHChatDialog open={chatOpen} onOpenChange={setChatOpen} />
    </>
  );
};

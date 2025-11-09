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
  dragAttributes?: any;
  dragListeners?: any;
}

export const PSSRQuickActionsWidget: React.FC<PSSRQuickActionsWidgetProps> = ({
  onCreatePSSR,
  onManageChecklist,
  onChatWithORSH,
  isExpanded,
  isVisible,
  onToggleExpand,
  onToggleVisibility,
  dragAttributes,
  dragListeners
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
          bg: 'bg-gradient-to-br from-primary/15 to-primary/5 group-hover:from-primary/25 group-hover:to-primary/10',
          icon: 'text-primary',
          border: 'border-primary/20 group-hover:border-primary/40',
          ring: 'group-hover:ring-2 group-hover:ring-primary/20'
        };
      case 'secondary':
        return {
          bg: 'bg-gradient-to-br from-accent/15 to-accent/5 group-hover:from-accent/25 group-hover:to-accent/10',
          icon: 'text-accent-foreground',
          border: 'border-accent/30 group-hover:border-accent/50',
          ring: 'group-hover:ring-2 group-hover:ring-accent/20'
        };
      case 'accent':
        return {
          bg: 'bg-gradient-to-br from-primary/10 to-primary/5 group-hover:from-primary/20 group-hover:to-primary/10',
          icon: 'text-primary',
          border: 'border-primary/15 group-hover:border-primary/30',
          ring: 'group-hover:ring-2 group-hover:ring-primary/15'
        };
      default:
        return {
          bg: 'bg-muted/10 group-hover:bg-muted/20',
          icon: 'text-foreground',
          border: 'border-border/20 group-hover:border-border/40',
          ring: ''
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
        dragAttributes={dragAttributes}
        dragListeners={dragListeners}
      >
        <div className="space-y-2.5">
          {actions.map((action, index) => {
            const Icon = action.icon;
            const colors = getColorClasses(action.color);
            
            return (
              <button
                key={index}
                onClick={action.onClick}
                className={`group w-full flex items-center gap-3 p-3 rounded-xl border ${colors.border} ${colors.bg} ${colors.ring} transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md`}
              >
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-background/60 backdrop-blur-sm flex-shrink-0 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3">
                  <Icon className={`h-5 w-5 ${colors.icon}`} />
                </div>
                <span className="font-semibold text-sm text-foreground flex-1 text-left">
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

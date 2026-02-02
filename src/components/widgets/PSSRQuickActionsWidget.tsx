import React, { useState } from 'react';
import { WidgetCard } from './WidgetCard';
import { Plus, Settings, MessageSquare } from 'lucide-react';
import { ORSHChatDialog } from './ORSHChatDialog';
import { useCanPerformActions } from '@/hooks/useCurrentUserRole';

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
  const { canPerformActions } = useCanPerformActions();

  const handleChatClick = () => {
    setChatOpen(true);
  };

  // Filter actions based on user permissions
  const allActions = [
    {
      label: 'Create PSSR',
      icon: Plus,
      onClick: onCreatePSSR,
      color: 'primary',
      requiresAction: true, // Directors can't do this
    },
    {
      label: 'Manage Checklist',
      icon: Settings,
      onClick: onManageChecklist,
      color: 'secondary',
      requiresAction: true, // Directors can't do this
    },
    {
      label: 'Ask ORSH AI',
      icon: MessageSquare,
      onClick: handleChatClick,
      color: 'tertiary',
      requiresAction: false, // Everyone can use AI
    },
  ];

  // Filter out actions that directors can't perform
  const actions = allActions.filter(action => 
    !action.requiresAction || canPerformActions
  );

  const getColorClasses = (color: string) => {
    switch (color) {
      case 'primary':
        return {
          bg: 'bg-gradient-to-br from-primary/15 to-primary/5',
          hoverBg: 'hover:from-primary/25 hover:to-primary/10',
          icon: 'text-primary',
          border: 'border-primary/20',
          hoverBorder: 'hover:border-primary/40',
          ring: 'hover:ring-2 hover:ring-primary/20'
        };
      case 'secondary':
        return {
          bg: 'bg-gradient-to-br from-emerald-500/15 to-emerald-500/5',
          hoverBg: 'hover:from-emerald-500/25 hover:to-emerald-500/10',
          icon: 'text-emerald-600 dark:text-emerald-400',
          border: 'border-emerald-500/30',
          hoverBorder: 'hover:border-emerald-500/50',
          ring: 'hover:ring-2 hover:ring-emerald-500/20'
        };
      case 'tertiary':
        return {
          bg: 'bg-gradient-to-br from-violet-500/15 to-violet-500/5',
          hoverBg: 'hover:from-violet-500/25 hover:to-violet-500/10',
          icon: 'text-violet-600 dark:text-violet-400',
          border: 'border-violet-500/30',
          hoverBorder: 'hover:border-violet-500/50',
          ring: 'hover:ring-2 hover:ring-violet-500/20'
        };
      default:
        return {
          bg: 'bg-muted/10',
          hoverBg: 'hover:bg-muted/20',
          icon: 'text-foreground',
          border: 'border-border/20',
          hoverBorder: 'hover:border-border/40',
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
        <div className="space-y-3 flex-1">
          {actions.map((action, index) => {
            const Icon = action.icon;
            const colors = getColorClasses(action.color);
            
            return (
              <button
                key={index}
                onClick={action.onClick}
                className={`group w-full flex items-center gap-3 p-3 rounded-xl border ${colors.border} ${colors.hoverBorder} ${colors.bg} ${colors.hoverBg} ${colors.ring} transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md`}
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

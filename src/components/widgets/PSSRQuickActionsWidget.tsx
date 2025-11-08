import React, { useState } from 'react';
import { WidgetCard } from './WidgetCard';
import { Plus, Settings, MessageSquare, ChevronRight } from 'lucide-react';
import { ORSHChatDialog } from './ORSHChatDialog';

interface PSSRQuickActionsWidgetProps {
  onCreatePSSR: () => void;
  onManageChecklist: () => void;
  onChatWithORSH: () => void;
}

export const PSSRQuickActionsWidget: React.FC<PSSRQuickActionsWidgetProps> = ({
  onCreatePSSR,
  onManageChecklist,
  onChatWithORSH,
}) => {
  const [chatOpen, setChatOpen] = useState(false);

  const handleChatClick = () => {
    setChatOpen(true);
  };

  const actions = [
    {
      label: 'Create PSSR',
      description: 'New safety review',
      icon: Plus,
      onClick: onCreatePSSR,
      featured: true,
    },
    {
      label: 'Manage',
      description: 'Checklist setup',
      icon: Settings,
      onClick: onManageChecklist,
      featured: false,
    },
    {
      label: 'Ask AI',
      description: 'ORSH assistant',
      icon: MessageSquare,
      onClick: handleChatClick,
      featured: false,
    },
  ];

  return (
    <>
      <WidgetCard title="Quick Actions" className="h-full flex flex-col">
        <div className="grid grid-cols-3 gap-2">
          {actions.map((action, index) => {
            const Icon = action.icon;
            return (
              <button
                key={index}
                onClick={action.onClick}
                className={`group relative flex flex-col items-center justify-center p-3 rounded-lg border transition-all duration-300 hover:-translate-y-1 hover:shadow-md ${
                  action.featured
                    ? 'bg-primary border-primary text-primary-foreground col-span-3'
                    : 'bg-card border-border/50 hover:border-primary/30 hover:bg-accent/5'
                }`}
              >
                <div className="flex items-center gap-2 w-full">
                  <div
                    className={`flex items-center justify-center rounded-md flex-shrink-0 transition-all duration-300 group-hover:scale-110 ${
                      action.featured
                        ? 'w-10 h-10 bg-primary-foreground/20'
                        : 'w-8 h-8 bg-primary/10'
                    }`}
                  >
                    <Icon className={`${action.featured ? 'h-5 w-5 text-primary-foreground' : 'h-4 w-4 text-primary'}`} />
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <p className={`font-semibold text-sm leading-tight truncate ${action.featured ? 'text-primary-foreground' : 'text-foreground'}`}>
                      {action.label}
                    </p>
                    <p className={`text-xs leading-tight truncate ${action.featured ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
                      {action.description}
                    </p>
                  </div>
                  {action.featured && (
                    <ChevronRight className="h-4 w-4 text-primary-foreground/60 flex-shrink-0 transition-transform group-hover:translate-x-1" />
                  )}
                </div>
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-background/5 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 pointer-events-none" />
              </button>
            );
          })}
        </div>
      </WidgetCard>
      <ORSHChatDialog open={chatOpen} onOpenChange={setChatOpen} />
    </>
  );
};

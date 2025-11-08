import React, { useState } from 'react';
import { WidgetCard } from './WidgetCard';
import { Button } from '@/components/ui/button';
import { Plus, Settings, MessageSquare } from 'lucide-react';
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
      description: 'Start new safety review',
      icon: Plus,
      onClick: onCreatePSSR,
      primary: true,
    },
    {
      label: 'Manage Checklist',
      description: 'Configure templates',
      icon: Settings,
      onClick: onManageChecklist,
      primary: false,
    },
    {
      label: 'Ask ORSH',
      description: 'AI assistance',
      icon: MessageSquare,
      onClick: handleChatClick,
      primary: false,
    },
  ];

  return (
    <>
      <WidgetCard title="Quick Actions" className="h-full flex flex-col">
        <div className="space-y-2">
          {actions.map((action, index) => {
            const Icon = action.icon;
            return (
              <button
                key={index}
                onClick={action.onClick}
                className={`group relative w-full rounded-lg border transition-all duration-300 overflow-hidden ${
                  action.primary
                    ? 'bg-primary text-primary-foreground border-primary hover:shadow-lg hover:shadow-primary/20 hover:-translate-y-0.5'
                    : 'bg-card border-border/50 hover:border-border hover:bg-accent/5 hover:-translate-y-0.5'
                }`}
              >
                <div className="flex items-center gap-3 p-3">
                  <div
                    className={`flex items-center justify-center w-9 h-9 rounded-md flex-shrink-0 transition-all duration-300 ${
                      action.primary
                        ? 'bg-primary-foreground/20 group-hover:bg-primary-foreground/30 group-hover:scale-110'
                        : 'bg-primary/10 group-hover:bg-primary/20 group-hover:scale-110'
                    }`}
                  >
                    <Icon className={`h-4 w-4 ${action.primary ? 'text-primary-foreground' : 'text-primary'}`} />
                  </div>
                  <div className="flex-1 text-left">
                    <p className={`font-semibold text-sm leading-tight mb-0.5 ${action.primary ? 'text-primary-foreground' : 'text-foreground'}`}>
                      {action.label}
                    </p>
                    <p className={`text-xs leading-tight ${action.primary ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
                      {action.description}
                    </p>
                  </div>
                </div>
                {!action.primary && (
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/5 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                )}
              </button>
            );
          })}
        </div>
      </WidgetCard>
      <ORSHChatDialog open={chatOpen} onOpenChange={setChatOpen} />
    </>
  );
};

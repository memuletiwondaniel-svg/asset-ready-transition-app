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
      description: 'Start a new Pre-Start-Up Safety Review',
      icon: Plus,
      onClick: onCreatePSSR,
      variant: 'default' as const,
      className: 'bg-primary hover:bg-primary/90 text-primary-foreground',
    },
    {
      label: 'Manage Checklist',
      description: 'Configure and manage checklist templates',
      icon: Settings,
      onClick: onManageChecklist,
      variant: 'outline' as const,
      className: 'hover:bg-muted/50',
    },
    {
      label: 'Ask ORSH',
      description: 'Get AI-powered assistance and answers',
      icon: MessageSquare,
      onClick: handleChatClick,
      variant: 'outline' as const,
      className: 'hover:bg-muted/50',
    },
  ];

  return (
    <>
      <WidgetCard title="Quick Actions" className="h-full">
        <div className="flex flex-col gap-1.5">
          {actions.map((action, index) => {
            const Icon = action.icon;
            return (
              <Button
                key={index}
                variant={action.variant}
                onClick={action.onClick}
                className={`w-full h-auto py-1.5 px-2 flex items-center gap-2 justify-start ${action.className}`}
              >
                <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-background/10 flex-shrink-0">
                  <Icon className="h-3.5 w-3.5" />
                </div>
                <div className="flex-1 text-left">
                  <p className="font-semibold text-xs leading-tight">{action.label}</p>
                  <p className="text-xs opacity-70 font-normal leading-tight">{action.description}</p>
                </div>
              </Button>
            );
          })}
        </div>
      </WidgetCard>
      <ORSHChatDialog open={chatOpen} onOpenChange={setChatOpen} />
    </>
  );
};

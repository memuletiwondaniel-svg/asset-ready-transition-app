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
      description: 'Start a new safety review',
      icon: Plus,
      onClick: onCreatePSSR,
      gradient: 'from-primary to-primary/80',
      iconBg: 'bg-primary-foreground/20',
      iconColor: 'text-primary-foreground',
    },
    {
      label: 'Manage Checklist',
      description: 'Configure templates',
      icon: Settings,
      onClick: onManageChecklist,
      gradient: 'from-accent to-accent/80',
      iconBg: 'bg-accent-foreground/20',
      iconColor: 'text-accent-foreground',
    },
    {
      label: 'Ask ORSH',
      description: 'AI-powered assistance',
      icon: MessageSquare,
      onClick: handleChatClick,
      gradient: 'from-secondary to-secondary/80',
      iconBg: 'bg-secondary-foreground/20',
      iconColor: 'text-secondary-foreground',
    },
  ];

  return (
    <>
      <WidgetCard title="Quick Actions" className="h-full flex flex-col">
        <div className="flex flex-col gap-3">
          {actions.map((action, index) => {
            const Icon = action.icon;
            return (
              <button
                key={index}
                onClick={action.onClick}
                className={`group relative w-full overflow-hidden rounded-xl bg-gradient-to-br ${action.gradient} p-4 transition-all duration-300 hover:scale-[1.02] hover:shadow-lg active:scale-[0.98]`}
              >
                <div className="flex items-center gap-3">
                  <div className={`flex items-center justify-center w-10 h-10 rounded-lg ${action.iconBg} backdrop-blur-sm flex-shrink-0 transition-transform duration-300 group-hover:scale-110`}>
                    <Icon className={`h-5 w-5 ${action.iconColor}`} />
                  </div>
                  <div className="flex-1 text-left">
                    <p className={`font-semibold text-sm ${action.iconColor} leading-tight mb-0.5`}>{action.label}</p>
                    <p className={`text-xs ${action.iconColor} opacity-80 leading-tight`}>{action.description}</p>
                  </div>
                </div>
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
              </button>
            );
          })}
        </div>
      </WidgetCard>
      <ORSHChatDialog open={chatOpen} onOpenChange={setChatOpen} />
    </>
  );
};

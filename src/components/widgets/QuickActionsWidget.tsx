import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
    <Card className={`glass-card overflow-hidden border-border/40 ${className}`}>
      <CardHeader className="border-b border-border/40 pb-4">
        <CardTitle className="text-base font-semibold">Quick Actions</CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <div className="space-y-3">
          {quickActions.map((action, index) => (
            <button
              key={action.id}
              onClick={() => onActionClick?.(action.label)}
              className="w-full text-left p-4 rounded-lg border border-border/40 hover:border-primary/40 hover:bg-muted/30 hover:shadow-md transition-all duration-300 group animate-fade-in"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm mb-1 group-hover:text-primary transition-colors duration-300">{action.label}</p>
                  <p className="text-xs text-muted-foreground">{action.description}</p>
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all duration-300" />
              </div>
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

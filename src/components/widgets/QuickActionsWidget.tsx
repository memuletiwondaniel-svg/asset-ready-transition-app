import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ClipboardList, CheckCircle, FileText } from 'lucide-react';

interface QuickActionsWidgetProps {
  onActionClick?: (action: string) => void;
}

export const QuickActionsWidget: React.FC<QuickActionsWidgetProps> = ({ onActionClick }) => {
  const quickActions = [
    {
      id: 'create-pssr',
      label: 'Create a PSSR',
      icon: ClipboardList,
      gradient: 'from-blue-500 to-blue-600'
    },
    {
      id: 'approve-pssr',
      label: 'Approve a PSSR',
      icon: CheckCircle,
      gradient: 'from-green-500 to-green-600'
    },
    {
      id: 'develop-p2a',
      label: 'Develop a P2A Plan',
      icon: FileText,
      gradient: 'from-purple-500 to-purple-600'
    }
  ];

  return (
    <Card className="glass-card glass-card-hover overflow-hidden">
      <CardHeader className="border-b border-border/40 py-3">
        <CardTitle className="text-lg font-bold">Quick Actions</CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        <div className="grid grid-cols-1 gap-3">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <Button
                key={action.id}
                variant="outline"
                onClick={() => onActionClick?.(action.label)}
                className="h-auto flex items-center justify-start gap-3 p-4 hover:bg-muted/50 group"
              >
                <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${action.gradient} flex items-center justify-center group-hover:scale-110 transition-transform flex-shrink-0`}>
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <span className="text-sm font-medium">{action.label}</span>
              </Button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

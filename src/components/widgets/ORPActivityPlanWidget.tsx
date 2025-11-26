import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CalendarCheck, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { StyledWidgetIcon } from './StyledWidgetIcon';

interface ORPActivityPlanWidgetProps {
  projectId: string;
  dragAttributes?: any;
  dragListeners?: any;
}

export const ORPActivityPlanWidget: React.FC<ORPActivityPlanWidgetProps> = ({ projectId, dragAttributes, dragListeners }) => {
  const navigate = useNavigate();

  // Mock data - replace with actual data fetching
  const plans = [
    { id: '1', phase: 'Design', status: 'in-progress', deliverables: 12, completed: 8 },
    { id: '2', phase: 'Procurement', status: 'pending', deliverables: 8, completed: 0 }
  ];

  return (
    <Card className="h-full transition-all duration-300 hover:shadow-lg hover:scale-[1.02] hover:border-purple-500/20 group">
      <CardHeader {...dragAttributes} {...dragListeners} className="cursor-grab active:cursor-grabbing">
        <CardTitle className="text-lg flex items-center gap-3">
          <StyledWidgetIcon 
            Icon={CalendarCheck}
            gradientFrom="from-purple-500"
            gradientTo="to-violet-500"
            glowFrom="from-purple-500/40"
            glowTo="to-violet-500/40"
          />
          <span>OR Activity Plan</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {plans.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <CalendarCheck className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p className="mb-3">No activity plans yet</p>
            <Button size="sm" onClick={() => navigate('/orp')}>
              Create First Plan
            </Button>
          </div>
        ) : (
          plans.map((plan) => (
            <div key={plan.id} className="p-3 border rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium">{plan.phase}</span>
                <Badge variant={plan.status === 'in-progress' ? 'default' : 'secondary'}>
                  {plan.status}
                </Badge>
              </div>
              <div className="text-sm text-muted-foreground">
                {plan.completed}/{plan.deliverables} deliverables completed
              </div>
              <Button size="sm" variant="link" className="p-0 h-auto mt-2" onClick={() => navigate('/orp')}>
                View Details <ExternalLink className="h-3 w-3 ml-1" />
              </Button>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
};

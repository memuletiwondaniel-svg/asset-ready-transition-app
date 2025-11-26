import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Wrench, Plus, ExternalLink, GripVertical } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { StyledWidgetIcon } from './StyledWidgetIcon';

interface ORMtceWidgetProps {
  projectId: string;
  dragAttributes?: any;
  dragListeners?: any;
}

export const ORMtceWidget: React.FC<ORMtceWidgetProps> = ({ projectId, dragAttributes, dragListeners }) => {
  const navigate = useNavigate();

  // Mock data - replace with actual data fetching
  const plans = [
    { id: '1', name: 'Maintenance Plan A', status: 'active', progress: 60, deliverables: 10, completed: 6 },
    { id: '2', name: 'Maintenance Plan B', status: 'planning', progress: 15, deliverables: 8, completed: 1 }
  ];

  return (
    <Card className="h-full transition-all duration-300 hover:shadow-lg hover:scale-[1.02] hover:border-emerald-500/20 group">
      <CardHeader>
        <div className="flex items-center gap-2 mb-2 opacity-0 group-hover/widget:opacity-100 transition-opacity" {...dragAttributes} {...dragListeners}>
          <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab active:cursor-grabbing" />
        </div>
        <CardTitle className="text-lg flex items-center justify-between">
          <div className="flex items-center gap-3">
            <StyledWidgetIcon 
              Icon={Wrench}
              gradientFrom="from-emerald-500"
              gradientTo="to-teal-500"
              glowFrom="from-emerald-500/40"
              glowTo="to-teal-500/40"
            />
            <span>OR Maintenance</span>
          </div>
          <Button size="sm" variant="ghost" onClick={() => navigate('/orm')}>
            <Plus className="h-4 w-4 mr-1" />
            New Plan
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {plans.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Wrench className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p className="mb-3">No maintenance plans yet</p>
            <Button size="sm" onClick={() => navigate('/orm')}>
              Create First Plan
            </Button>
          </div>
        ) : (
          plans.map((plan) => (
            <div key={plan.id} className="p-3 border rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium">{plan.name}</span>
                <Badge variant={plan.status === 'active' ? 'default' : 'secondary'}>
                  {plan.status}
                </Badge>
              </div>
              <div className="text-sm text-muted-foreground mb-2">
                Progress: {plan.progress}% ({plan.completed}/{plan.deliverables} deliverables)
              </div>
              <Button size="sm" variant="link" className="p-0 h-auto" onClick={() => navigate('/orm')}>
                View Details <ExternalLink className="h-3 w-3 ml-1" />
              </Button>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
};

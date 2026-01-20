import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CalendarCheck, ExternalLink, EyeOff, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { StyledWidgetIcon } from './StyledWidgetIcon';
import { useProjectORPPlans, PHASE_LABELS } from '@/hooks/useProjectORPPlans';
import { Progress } from '@/components/ui/progress';

interface ORPActivityPlanWidgetProps {
  projectId: string;
  dragAttributes?: any;
  dragListeners?: any;
  onHide?: () => void;
}

const STATUS_CONFIG: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
  'DRAFT': { label: 'Draft', variant: 'secondary' },
  'IN_PROGRESS': { label: 'In Progress', variant: 'default' },
  'PENDING_APPROVAL': { label: 'Pending Approval', variant: 'outline' },
  'APPROVED': { label: 'Approved', variant: 'default' },
  'COMPLETED': { label: 'Completed', variant: 'default' },
};

export const ORPActivityPlanWidget: React.FC<ORPActivityPlanWidgetProps> = ({ projectId, dragAttributes, dragListeners, onHide }) => {
  const navigate = useNavigate();
  const { data: plans = [], isLoading } = useProjectORPPlans(projectId);

  return (
    <Card className="h-full transition-all duration-300 hover:shadow-lg hover:scale-[1.02] hover:border-purple-500/20 group">
      <CardHeader {...dragAttributes} {...dragListeners} className="cursor-grab active:cursor-grabbing">
        <CardTitle className="text-lg flex items-center justify-between">
          <div className="flex items-center gap-3">
            <StyledWidgetIcon 
              Icon={CalendarCheck}
              gradientFrom="from-purple-500"
              gradientTo="to-violet-500"
              glowFrom="from-purple-500/40"
              glowTo="to-violet-500/40"
            />
            <span>ORA Activity Plan</span>
            {plans.length > 0 && (
              <Badge variant="secondary" className="ml-1 text-xs">
                {plans.length}
              </Badge>
            )}
          </div>
          {onHide && (
            <Button
              size="icon"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation();
                onHide();
              }}
              className="opacity-0 group-hover:opacity-100 transition-opacity h-7 w-7"
              title="Hide widget"
            >
              <EyeOff className="h-4 w-4" />
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : plans.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <CalendarCheck className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p className="mb-3">No activity plans yet</p>
            <Button size="sm" onClick={() => navigate('/orp')}>
              Create First Plan
            </Button>
          </div>
        ) : (
          plans.map((plan) => {
            const statusConfig = STATUS_CONFIG[plan.status] || STATUS_CONFIG['DRAFT'];
            const phaseLabel = PHASE_LABELS[plan.phase] || plan.phase;
            
            return (
              <div key={plan.id} className="p-3 border rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">{phaseLabel}</span>
                  <Badge variant={statusConfig.variant}>
                    {statusConfig.label}
                  </Badge>
                </div>
                
                {/* Progress bar */}
                <div className="mb-2">
                  <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                    <span>Progress</span>
                    <span>{plan.overall_progress}%</span>
                  </div>
                  <Progress value={plan.overall_progress} className="h-1.5" />
                </div>
                
                <div className="text-sm text-muted-foreground">
                  {plan.completed_count}/{plan.deliverable_count} deliverables completed
                </div>
                
                <Button 
                  size="sm" 
                  variant="link" 
                  className="p-0 h-auto mt-2" 
                  onClick={() => navigate(`/orp/${plan.id}`)}
                >
                  View Details <ExternalLink className="h-3 w-3 ml-1" />
                </Button>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
};

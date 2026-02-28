import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { 
  Plus, 
  GraduationCap, 
  Clock, 
  DollarSign, 
  Users, 
  Calendar,
  Building,
  ChevronRight,
  CheckCircle2,
  CircleDot,
  Circle,
} from 'lucide-react';
import { P2AHandoverPoint } from '../hooks/useP2AHandoverPoints';
import { useVCRTrainingDeliverables, VCRTrainingDeliverable } from '../hooks/useVCRDeliverables';
import { ExecutionPlanGate } from './ExecutionPlanGate';
import { AddTrainingDialog } from './AddTrainingDialog';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface VCRTrainingTabProps {
  handoverPoint: P2AHandoverPoint;
}

const ORA_STATUS_CONFIG: Record<string, { label: string; icon: React.ElementType; className: string }> = {
  'NOT_STARTED': { label: 'Not Started', icon: Circle, className: 'text-muted-foreground' },
  'IN_PROGRESS': { label: 'In Progress', icon: CircleDot, className: 'text-amber-500' },
  'COMPLETED': { label: 'Completed', icon: CheckCircle2, className: 'text-emerald-500' },
};

export const VCRTrainingTab: React.FC<VCRTrainingTabProps> = ({ handoverPoint }) => {
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const executionPlanStatus = handoverPoint.execution_plan_status || 'DRAFT';
  
  const { data: trainingItems, isLoading } = useVCRTrainingDeliverables(handoverPoint.id);
  const items = trainingItems || [];

  const completedCount = items.filter(i => i.ora.ora_status === 'COMPLETED').length;
  const inProgressCount = items.filter(i => i.ora.ora_status === 'IN_PROGRESS').length;
  const overallProgress = items.length > 0
    ? Math.round(items.reduce((sum, i) => sum + i.ora.ora_completion_percentage, 0) / items.length)
    : 0;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-20" />
        <Skeleton className="h-20" />
        <Skeleton className="h-20" />
      </div>
    );
  }

  return (
    <ExecutionPlanGate
      executionPlanStatus={executionPlanStatus}
      deliverableType="Training"
      icon={<GraduationCap className="w-8 h-8" />}
    >
      <div className="space-y-6">
        {/* Header with Summary Stats */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div>
              <h3 className="text-sm font-medium">Training Deliverables</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {items.length} items from VCR Execution Plan
              </p>
            </div>
            {items.length > 0 && (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 text-xs">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  <span className="text-muted-foreground">{completedCount}/{items.length}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Progress value={overallProgress} className="h-1.5 w-20" />
                  <span className="text-xs text-muted-foreground">{overallProgress}%</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Training Items List */}
        {items.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <div className="w-16 h-16 rounded-full bg-violet-500/10 flex items-center justify-center mb-4">
                <GraduationCap className="w-8 h-8 text-violet-500" />
              </div>
              <h3 className="font-medium text-lg">No Training Planned</h3>
              <p className="text-sm text-muted-foreground text-center max-w-md mt-1">
                No training items were defined in the VCR Execution Plan for this VCR.
              </p>
            </CardContent>
          </Card>
        ) : (
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-3">
              {items.map((item) => (
                <TrainingDeliverableCard key={item.id} item={item} />
              ))}
            </div>
          </ScrollArea>
        )}
      </div>
    </ExecutionPlanGate>
  );
};

// Training Deliverable Card Component
const TrainingDeliverableCard: React.FC<{ item: VCRTrainingDeliverable }> = ({ item }) => {
  const oraConfig = ORA_STATUS_CONFIG[item.ora.ora_status] || ORA_STATUS_CONFIG['NOT_STARTED'];
  const StatusIcon = oraConfig.icon;

  return (
    <Card className="transition-all hover:shadow-sm">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            {/* Title and ORA Status */}
            <div className="flex items-center gap-2">
              <GraduationCap className="w-4 h-4 text-violet-500 shrink-0" />
              <h4 className="font-medium truncate">{item.title}</h4>
            </div>

            {/* Description */}
            {item.description && (
              <p className="text-sm text-muted-foreground mt-1 line-clamp-1">{item.description}</p>
            )}

            {/* Meta Info */}
            <div className="flex flex-wrap gap-4 mt-3 text-xs">
              {item.training_provider && (
                <span className="flex items-center gap-1 text-muted-foreground">
                  <Building className="w-3 h-3" />
                  {item.training_provider}
                </span>
              )}
              {item.duration_hours && (
                <span className="flex items-center gap-1 text-muted-foreground">
                  <Clock className="w-3 h-3" />
                  {item.duration_hours}h
                </span>
              )}
              {item.estimated_cost && item.estimated_cost > 0 && (
                <span className="flex items-center gap-1 text-muted-foreground">
                  <DollarSign className="w-3 h-3" />
                  ${Number(item.estimated_cost).toLocaleString()}
                </span>
              )}
              {item.tentative_date && (
                <span className="flex items-center gap-1 text-muted-foreground">
                  <Calendar className="w-3 h-3" />
                  {format(new Date(item.tentative_date), 'MMM d, yyyy')}
                </span>
              )}
              {item.target_audience && item.target_audience.length > 0 && (
                <span className="flex items-center gap-1 text-muted-foreground">
                  <Users className="w-3 h-3" />
                  {item.target_audience.length} audiences
                </span>
              )}
            </div>
          </div>

          {/* Right Side - ORA Execution Status */}
          <div className="flex flex-col items-end gap-2 shrink-0">
            <Badge
              variant="outline"
              className={cn('gap-1.5 text-xs', oraConfig.className)}
            >
              <StatusIcon className="w-3.5 h-3.5" />
              {oraConfig.label}
            </Badge>
            {item.ora.ora_completion_percentage > 0 && item.ora.ora_status !== 'COMPLETED' && (
              <div className="flex items-center gap-1.5">
                <Progress value={item.ora.ora_completion_percentage} className="h-1 w-12" />
                <span className="text-[10px] text-muted-foreground">
                  {item.ora.ora_completion_percentage}%
                </span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

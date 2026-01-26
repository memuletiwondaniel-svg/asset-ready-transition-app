import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Plus, 
  GraduationCap, 
  Clock, 
  DollarSign, 
  Users, 
  Calendar,
  Building,
  Layers,
  Target,
  ChevronRight,
  Flame,
  Snowflake
} from 'lucide-react';
import { P2AHandoverPoint } from '../hooks/useP2AHandoverPoints';
import { useVCRTraining, VCRTrainingItem } from '../hooks/useVCRTraining';
import { AddTrainingDialog } from './AddTrainingDialog';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface VCRTrainingTabProps {
  handoverPoint: P2AHandoverPoint;
}

const EXECUTION_STAGES: Record<string, { label: string; color: string }> = {
  'NOT_STARTED': { label: 'Not Started', color: 'bg-slate-500' },
  'MATERIALS_REQUESTED': { label: 'Materials Requested', color: 'bg-blue-500' },
  'MATERIALS_UNDER_REVIEW': { label: 'Under Review', color: 'bg-amber-500' },
  'MATERIALS_APPROVED': { label: 'Approved', color: 'bg-green-500' },
  'PO_ISSUED': { label: 'PO Issued', color: 'bg-purple-500' },
  'TRAINEES_IDENTIFIED': { label: 'Trainees ID', color: 'bg-indigo-500' },
  'SCHEDULED': { label: 'Scheduled', color: 'bg-cyan-500' },
  'IN_PROGRESS': { label: 'In Progress', color: 'bg-orange-500' },
  'COMPLETED': { label: 'Completed', color: 'bg-emerald-500' },
};

export const VCRTrainingTab: React.FC<VCRTrainingTabProps> = ({ handoverPoint }) => {
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  
  // Extract handover_plan_id from handoverPoint
  const handoverPlanId = handoverPoint.handover_plan_id;
  
  // For now, we'll use the same ID for ora_plan_id as this is a P2A context
  // In a real scenario, you'd need to link P2A handover plans to ORA plans
  const { trainingItems, isLoading, getTrainingForVCR } = useVCRTraining(handoverPlanId);
  
  // Get training items mapped to this VCR
  const vcrTrainingItems = getTrainingForVCR(handoverPoint.id);
  
  // Also show all training items for the central list
  const allTrainingItems = trainingItems;

  const getStageInfo = (stage: string) => {
    return EXECUTION_STAGES[stage] || EXECUTION_STAGES['NOT_STARTED'];
  };

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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium">Training Requirements</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {allTrainingItems.length} total items • {vcrTrainingItems.length} mapped to this VCR
          </p>
        </div>
        <Button 
          size="sm" 
          onClick={() => setAddDialogOpen(true)}
          className="bg-violet-500 hover:bg-violet-600 gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Training
        </Button>
      </div>

      {/* Training Items List */}
      {allTrainingItems.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="w-16 h-16 rounded-full bg-violet-500/10 flex items-center justify-center mb-4">
              <GraduationCap className="w-8 h-8 text-violet-500" />
            </div>
            <h3 className="font-medium text-lg">No Training Items</h3>
            <p className="text-sm text-muted-foreground text-center max-w-md mt-1">
              Add training requirements and map them to specific systems.
            </p>
            <Button 
              onClick={() => setAddDialogOpen(true)} 
              className="mt-4 gap-2 bg-violet-500 hover:bg-violet-600"
            >
              <Plus className="w-4 h-4" />
              Add First Training
            </Button>
          </CardContent>
        </Card>
      ) : (
        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-3">
            {allTrainingItems.map((item) => (
              <TrainingItemCard 
                key={item.id} 
                item={item} 
                currentVCRId={handoverPoint.id}
              />
            ))}
          </div>
        </ScrollArea>
      )}

      {/* Add Training Dialog */}
      <AddTrainingDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        handoverPlanId={handoverPlanId}
        oraPlanId={handoverPlanId}
        preselectedVCRId={handoverPoint.id}
      />
    </div>
  );
};

// Training Item Card Component
const TrainingItemCard: React.FC<{ 
  item: VCRTrainingItem; 
  currentVCRId: string;
}> = ({ item, currentVCRId }) => {
  const stageInfo = EXECUTION_STAGES[item.execution_stage] || EXECUTION_STAGES['NOT_STARTED'];
  const isMappedToCurrentVCR = item.system_mappings?.some(m => m.handover_point_id === currentVCRId);

  return (
    <Card className={cn(
      'cursor-pointer transition-all hover:border-violet-500/50',
      isMappedToCurrentVCR && 'border-violet-500/30 bg-violet-500/5'
    )}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            {/* Title and Status */}
            <div className="flex items-center gap-2">
              <GraduationCap className="w-4 h-4 text-violet-500 shrink-0" />
              <h4 className="font-medium truncate">{item.title}</h4>
              {isMappedToCurrentVCR && (
                <Badge variant="outline" className="text-[10px] border-violet-500 text-violet-500">
                  This VCR
                </Badge>
              )}
            </div>

            {/* Overview */}
            {item.overview && (
              <p className="text-sm text-muted-foreground mt-1 line-clamp-1">{item.overview}</p>
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
              {item.estimated_cost > 0 && (
                <span className="flex items-center gap-1 text-muted-foreground">
                  <DollarSign className="w-3 h-3" />
                  ${item.estimated_cost.toLocaleString()}
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

            {/* System Mappings */}
            {item.system_mappings && item.system_mappings.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Layers className="w-3 h-3" />
                  Systems:
                </span>
                {item.system_mappings.slice(0, 3).map((mapping) => (
                  <Badge 
                    key={mapping.id} 
                    variant="outline" 
                    className="text-[10px] gap-1"
                  >
                    {mapping.system?.name ? (
                      <>
                        <span className="max-w-[80px] truncate">{mapping.system.name}</span>
                      </>
                    ) : (
                      'Unknown System'
                    )}
                  </Badge>
                ))}
                {item.system_mappings.length > 3 && (
                  <Badge variant="outline" className="text-[10px]">
                    +{item.system_mappings.length - 3} more
                  </Badge>
                )}
              </div>
            )}

            {/* VCR Mappings */}
            {item.system_mappings && item.system_mappings.some(m => m.handover_point) && (
              <div className="flex flex-wrap gap-2 mt-2">
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Target className="w-3 h-3" />
                  VCRs:
                </span>
                {[...new Set(item.system_mappings
                  .filter(m => m.handover_point)
                  .map(m => m.handover_point?.vcr_code))]
                  .slice(0, 3)
                  .map((vcrCode, idx) => (
                    <Badge 
                      key={idx} 
                      variant="secondary" 
                      className="text-[10px] bg-cyan-500/10 text-cyan-600"
                    >
                      {vcrCode?.split('-').slice(0, 2).join('-')}
                    </Badge>
                  ))}
              </div>
            )}
          </div>

          {/* Right Side - Stage Badge */}
          <div className="flex items-center gap-2 shrink-0">
            <Badge 
              variant="outline" 
              className={cn('text-white border-none', stageInfo.color)}
            >
              {stageInfo.label}
            </Badge>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

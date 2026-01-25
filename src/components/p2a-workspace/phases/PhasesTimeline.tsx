import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Plus, GitBranch, FileCheck } from 'lucide-react';
import { P2APhase, P2AMilestone } from '../hooks/useP2APhases';
import { P2AHandoverPoint } from '../hooks/useP2AHandoverPoints';
import { PhaseColumn } from './PhaseColumn';
import { MilestoneMarker } from './MilestoneMarker';
import { CreatePhaseDialog } from './CreatePhaseDialog';
import { UnassignedVCRsPanel } from '../handover-points/UnassignedVCRsPanel';
import { cn } from '@/lib/utils';

interface PhasesTimelineProps {
  phases: P2APhase[];
  milestones: P2AMilestone[];
  handoverPoints: P2AHandoverPoint[];
  unassignedPoints: P2AHandoverPoint[];
  handoverPlanId: string;
  projectCode?: string;
  onCreatePhase: (data: any) => void;
  onCreateMilestone: (data: any) => void;
  onDeletePhase: (id: string) => void;
  onCreateHandoverPoint: (phaseId?: string) => void;
  onOpenVCR: (point: P2AHandoverPoint) => void;
  onAssignVCRToPhase: (vcrId: string, phaseId: string | null) => void;
  isCreatingPhase?: boolean;
}

export const PhasesTimeline: React.FC<PhasesTimelineProps> = ({
  phases,
  milestones,
  handoverPoints,
  unassignedPoints,
  handoverPlanId,
  projectCode,
  onCreatePhase,
  onCreateMilestone,
  onDeletePhase,
  onCreateHandoverPoint,
  onOpenVCR,
  onAssignVCRToPhase,
  isCreatingPhase,
}) => {
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  // Sort milestones by display order
  const sortedMilestones = [...milestones].sort((a, b) => a.display_order - b.display_order);

  // Empty state
  if (phases.length === 0 && unassignedPoints.length === 0) {
    return (
      <>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-md">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500/10 to-cyan-500/10 flex items-center justify-center mx-auto mb-4">
              <GitBranch className="w-10 h-10 text-blue-500" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Get Started with Your Handover Plan</h3>
            <p className="text-sm text-muted-foreground mb-6">
              Create phases to organize your timeline, or start by adding VCRs (Verification Checkpoints) 
              that can be assigned to phases later.
            </p>
            <div className="flex gap-3 justify-center">
              <Button onClick={() => setShowCreateDialog(true)} className="gap-2">
                <Plus className="w-4 h-4" />
                Create Phase
              </Button>
              <Button variant="outline" onClick={() => onCreateHandoverPoint()} className="gap-2">
                <FileCheck className="w-4 h-4" />
                Create VCR
              </Button>
            </div>
          </div>
        </div>

        <CreatePhaseDialog
          open={showCreateDialog}
          onOpenChange={setShowCreateDialog}
          milestones={milestones}
          onCreatePhase={(data) => {
            onCreatePhase({ ...data, handover_plan_id: handoverPlanId });
          }}
          onCreateMilestone={(data) => {
            onCreateMilestone({ ...data, handover_plan_id: handoverPlanId, source: 'MANUAL' });
          }}
          handoverPlanId={handoverPlanId}
          existingPhasesCount={phases.length}
          isCreating={isCreatingPhase}
        />
      </>
    );
  }

  return (
    <>
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Milestones Timeline Header */}
        {sortedMilestones.length > 0 && (
          <div className="flex items-center gap-0 px-4 py-3 border-b border-border bg-muted/30 overflow-x-auto">
            <div className="flex items-center">
              {sortedMilestones.map((milestone, idx) => (
                <React.Fragment key={milestone.id}>
                  <MilestoneMarker 
                    milestone={milestone} 
                    isFirst={idx === 0}
                    isLast={idx === sortedMilestones.length - 1}
                  />
                  {idx < sortedMilestones.length - 1 && (
                    <div className="w-24 h-0.5 bg-border mx-1" />
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>
        )}

        {/* Top Action Bar */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-card/50">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {phases.length} Phase{phases.length !== 1 ? 's' : ''} • {handoverPoints.length} VCR{handoverPoints.length !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => onCreateHandoverPoint()}
              className="gap-1.5"
            >
              <FileCheck className="w-3.5 h-3.5" />
              New VCR
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setShowCreateDialog(true)}
              className="gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              New Phase
            </Button>
          </div>
        </div>

        {/* Unassigned VCRs Panel */}
        {unassignedPoints.length > 0 && (
          <UnassignedVCRsPanel
            vcrs={unassignedPoints}
            phases={phases}
            onOpenVCR={onOpenVCR}
            onAssignToPhase={onAssignVCRToPhase}
          />
        )}

        {/* Phases Columns */}
        <ScrollArea className="flex-1">
          <div className="flex gap-4 p-4 h-full min-h-[400px]">
            {phases.map(phase => (
              <PhaseColumn
                key={phase.id}
                phase={phase}
                handoverPoints={handoverPoints.filter(p => p.phase_id === phase.id)}
                onCreateHandoverPoint={() => onCreateHandoverPoint(phase.id)}
                onEditPhase={() => {/* TODO */}}
                onDeletePhase={() => onDeletePhase(phase.id)}
                onOpenVCR={onOpenVCR}
                projectCode={projectCode}
              />
            ))}

            {/* Add Phase Button */}
            <div className="flex-shrink-0 w-48 h-full flex items-center justify-center">
              <Button 
                variant="outline" 
                className="h-auto py-8 px-6 border-dashed flex-col gap-2"
                onClick={() => setShowCreateDialog(true)}
              >
                <Plus className="w-5 h-5" />
                <span className="text-xs">Add Phase</span>
              </Button>
            </div>
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </div>

      <CreatePhaseDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        milestones={milestones}
        onCreatePhase={(data) => {
          onCreatePhase({ ...data, handover_plan_id: handoverPlanId });
        }}
        onCreateMilestone={(data) => {
          onCreateMilestone({ ...data, handover_plan_id: handoverPlanId, source: 'MANUAL' });
        }}
        handoverPlanId={handoverPlanId}
        existingPhasesCount={phases.length}
        isCreating={isCreatingPhase}
      />
    </>
  );
};

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Plus, GitBranch, FileCheck } from 'lucide-react';
import { P2APhase, P2AMilestone } from '../hooks/useP2APhases';
import { P2AHandoverPoint } from '../hooks/useP2AHandoverPoints';
import { StaircasePhaseColumn } from './StaircasePhaseColumn';
import { MilestoneMarker } from './MilestoneMarker';
import { CreatePhaseDialog } from './CreatePhaseDialog';
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

  // Calculate staircase offset for each phase
  const getStaircaseOffset = (phaseIndex: number) => {
    // Each phase starts lower than the previous, creating a staircase effect
    return phaseIndex * 60; // 60px offset per phase
  };

  // Empty state
  if (phases.length === 0) {
    return (
      <>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-md">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500/10 to-cyan-500/10 flex items-center justify-center mx-auto mb-4">
              <GitBranch className="w-10 h-10 text-blue-500" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Get Started with Your Handover Plan</h3>
            <p className="text-sm text-muted-foreground mb-6">
              Create phases to organize your timeline. VCRs will be arranged in a staircase 
              pattern showing the handover progression from top to bottom.
            </p>
            <div className="flex gap-3 justify-center">
              <Button onClick={() => setShowCreateDialog(true)} className="gap-2">
                <Plus className="w-4 h-4" />
                Create First Phase
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
        {/* Top Action Bar */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-card/50">
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium">Handover Timeline</span>
            <span className="text-xs text-muted-foreground">
              {phases.length} Phase{phases.length !== 1 ? 's' : ''} • {handoverPoints.length + unassignedPoints.length} VCR{(handoverPoints.length + unassignedPoints.length) !== 1 ? 's' : ''}
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

        {/* Staircase Workspace */}
        <ScrollArea className="flex-1">
          <div className="relative p-4 min-h-[600px]">
            {/* Staircase Flow Line */}
            <svg 
              className="absolute inset-0 pointer-events-none z-0"
              style={{ width: '100%', height: '100%' }}
            >
              <defs>
                <linearGradient id="staircaseGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0.1" />
                </linearGradient>
              </defs>
              {phases.length > 1 && phases.slice(0, -1).map((phase, idx) => {
                const x1 = (idx * 280) + 140;
                const y1 = getStaircaseOffset(idx) + 100;
                const x2 = ((idx + 1) * 280) + 140;
                const y2 = getStaircaseOffset(idx + 1) + 100;
                return (
                  <g key={phase.id}>
                    <line
                      x1={x1}
                      y1={y1}
                      x2={x2}
                      y2={y2}
                      stroke="url(#staircaseGradient)"
                      strokeWidth="2"
                      strokeDasharray="8 4"
                    />
                    <circle cx={x1} cy={y1} r="4" fill="hsl(var(--primary))" opacity="0.3" />
                  </g>
                );
              })}
              {phases.length > 0 && (
                <circle 
                  cx={(phases.length - 1) * 280 + 140} 
                  cy={getStaircaseOffset(phases.length - 1) + 100} 
                  r="4" 
                  fill="hsl(var(--primary))" 
                  opacity="0.3" 
                />
              )}
            </svg>

            {/* Phase Columns in Staircase Layout */}
            <div className="flex gap-4 relative z-10">
              {phases.map((phase, idx) => (
                <StaircasePhaseColumn
                  key={phase.id}
                  phase={phase}
                  phaseIndex={idx}
                  handoverPoints={handoverPoints.filter(p => p.phase_id === phase.id)}
                  staircaseOffset={getStaircaseOffset(idx)}
                  onCreateHandoverPoint={() => onCreateHandoverPoint(phase.id)}
                  onEditPhase={() => {/* TODO */}}
                  onDeletePhase={() => onDeletePhase(phase.id)}
                  onOpenVCR={onOpenVCR}
                  projectCode={projectCode}
                  isFirstPhase={idx === 0}
                  isLastPhase={idx === phases.length - 1}
                />
              ))}

              {/* Add Phase Button */}
              <div 
                className="flex-shrink-0 w-48 flex items-start justify-center"
                style={{ paddingTop: getStaircaseOffset(phases.length) }}
              >
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
          </div>
          <ScrollBar orientation="horizontal" />
          <ScrollBar orientation="vertical" />
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

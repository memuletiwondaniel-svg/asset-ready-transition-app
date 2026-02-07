import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, GitBranch } from 'lucide-react';
import { P2APhase, P2AMilestone } from '../hooks/useP2APhases';
import { P2AHandoverPoint } from '../hooks/useP2AHandoverPoints';
import { StaircasePhaseColumn } from './StaircasePhaseColumn';
import { MilestoneMarker } from './MilestoneMarker';
import { CreatePhaseDialog } from './CreatePhaseDialog';
import { EditPhaseDialog } from './EditPhaseDialog';
import { SortableContext, horizontalListSortingStrategy } from '@dnd-kit/sortable';

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
  onUpdatePhase: (data: { id: string; updates: Partial<P2APhase> }) => void;
  onCreateHandoverPoint: (phaseId?: string | null) => void;
  onOpenVCR: (point: P2AHandoverPoint) => void;
  onAssignVCRToPhase: (vcrId: string, phaseId: string | null) => void;
  isCreatingPhase?: boolean;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
  showMapping?: boolean;
  vcrAlignmentTargets?: Record<string, number>;
  // Undo props
  canUndo?: boolean;
  isUndoing?: boolean;
  lastActionDescription?: string | null;
  onUndo?: () => Promise<boolean>;
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
  onUpdatePhase,
  onCreateHandoverPoint,
  onOpenVCR,
  onAssignVCRToPhase,
  isCreatingPhase,
  isFullscreen,
  onToggleFullscreen,
  showMapping = false,
  vcrAlignmentTargets = {},
  canUndo,
  isUndoing,
  lastActionDescription,
  onUndo,
}) => {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingPhase, setEditingPhase] = useState<P2APhase | null>(null);

  // Sort milestones by display order
  const sortedMilestones = [...milestones].sort((a, b) => a.display_order - b.display_order);

  // Build interleaved render items: phases with milestones between them
  const buildRenderItems = () => {
    const items: Array<
      | { type: 'phase'; phase: P2APhase; idx: number }
      | { type: 'milestone'; milestone: P2AMilestone }
    > = [];

    // Track which milestones have been rendered
    const renderedMilestoneIds = new Set<string>();

    phases.forEach((phase, idx) => {
      // Add the phase
      items.push({ type: 'phase', phase, idx });

      // Check if this phase has an end_milestone_id - render milestone after it
      if (phase.end_milestone_id) {
        const endMilestone = sortedMilestones.find(m => m.id === phase.end_milestone_id);
        if (endMilestone && !renderedMilestoneIds.has(endMilestone.id)) {
          items.push({ type: 'milestone', milestone: endMilestone });
          renderedMilestoneIds.add(endMilestone.id);
        }
      } else {
        // Fallback: use display_order correlation
        // Milestone with display_order = idx + 1 appears after phase at index idx
        const separatorMilestone = sortedMilestones.find(
          m => m.display_order === idx + 1 && !renderedMilestoneIds.has(m.id)
        );
        if (separatorMilestone) {
          items.push({ type: 'milestone', milestone: separatorMilestone });
          renderedMilestoneIds.add(separatorMilestone.id);
        }
      }
    });

    return items;
  };

  const renderItems = buildRenderItems();

  // Empty state
  if (phases.length === 0) {
    return (
      <div className="flex-1 flex flex-col min-h-0">
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
      </div>
    );
  }

   return (
    <div className="flex-1 flex flex-col overflow-hidden min-h-0">
      <div className="flex-1 min-h-0 relative overflow-x-auto overflow-y-auto">
        <div className="relative p-4 pb-8">
          {/* Phase Columns with Milestones Interleaved */}
          <div className="flex gap-4 relative z-10">
            <SortableContext items={phases.map(p => p.id)} strategy={horizontalListSortingStrategy}>
              {renderItems.map((item, index) => {
                if (item.type === 'phase') {
                  return (
                    <StaircasePhaseColumn
                      key={item.phase.id}
                      phase={item.phase}
                      phaseIndex={item.idx}
                      handoverPoints={handoverPoints.filter(p => p.phase_id === item.phase.id)}
                      staircaseOffset={0}
                      onCreateHandoverPoint={() => onCreateHandoverPoint(item.phase.id)}
                      onEditPhase={() => setEditingPhase(item.phase)}
                      onDeletePhase={() => onDeletePhase(item.phase.id)}
                      onOpenVCR={onOpenVCR}
                      projectCode={projectCode}
                      isFirstPhase={item.idx === 0}
                      isLastPhase={item.idx === phases.length - 1}
                      showMapping={showMapping}
                      vcrAlignmentTargets={vcrAlignmentTargets}
                    />
                  );
                } else {
                  return (
                    <MilestoneMarker
                      key={`milestone-${item.milestone.id}`}
                      milestone={item.milestone}
                    />
                  );
                }
              })}
            </SortableContext>

            {/* Add Phase Button */}
            <div className="flex-shrink-0 flex items-start pt-4">
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

      {editingPhase && (
        <EditPhaseDialog
          open={!!editingPhase}
          onOpenChange={(open) => { if (!open) setEditingPhase(null); }}
          phase={editingPhase}
          onUpdatePhase={onUpdatePhase}
        />
      )}
    </div>
  );
};

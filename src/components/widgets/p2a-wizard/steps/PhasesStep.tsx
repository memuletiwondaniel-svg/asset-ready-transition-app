import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Milestone,
  Plus,
  Key,
  ArrowRight,
  GripVertical,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { WizardVCR } from './VCRCreationStep';
import { PhaseCard } from './phases/PhaseCard';
import { DraggableVCRChip, VCRChipOverlay } from './phases/DraggableVCRChip';
import { PhaseFormDialog } from './phases/PhaseFormDialog';

export interface WizardPhase {
  id: string;
  name: string;
  description: string;
  display_order: number;
  milestoneIds: string[];
}

interface PhasesStepProps {
  vcrs: WizardVCR[];
  phases: WizardPhase[];
  vcrPhaseAssignments: Record<string, string>;
  milestones?: Array<{ id: string; name: string; target_date?: string }>;
  onPhasesChange: (phases: WizardPhase[]) => void;
  onVCRPhaseAssignmentsChange: (assignments: Record<string, string>) => void;
}

export const PhasesStep: React.FC<PhasesStepProps> = ({
  vcrs,
  phases,
  vcrPhaseAssignments,
  milestones = [],
  onPhasesChange,
  onVCRPhaseAssignmentsChange,
}) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPhase, setEditingPhase] = useState<WizardPhase | null>(null);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
  );

  // ── Phase CRUD ───────────────────────────────────────────
  const handleCreatePhase = (data: { name: string; description: string; milestoneIds: string[] }) => {
    const phase: WizardPhase = {
      id: `phase-${Date.now()}`,
      name: data.name,
      description: data.description,
      display_order: phases.length + 1,
      milestoneIds: data.milestoneIds,
    };
    onPhasesChange([...phases, phase]);
  };

  const handleEditPhase = (data: { name: string; description: string; milestoneIds: string[] }) => {
    if (!editingPhase) return;
    onPhasesChange(
      phases.map(p =>
        p.id === editingPhase.id
          ? { ...p, name: data.name, description: data.description, milestoneIds: data.milestoneIds }
          : p
      )
    );
  };

  const handleDeletePhase = (id: string) => {
    onPhasesChange(phases.filter(p => p.id !== id).map((p, i) => ({ ...p, display_order: i + 1 })));
    const updated = { ...vcrPhaseAssignments };
    for (const [vcrId, phaseId] of Object.entries(updated)) {
      if (phaseId === id) delete updated[vcrId];
    }
    onVCRPhaseAssignmentsChange(updated);
  };

  const handleStartEdit = (phase: WizardPhase) => {
    setEditingPhase(phase);
    setDialogOpen(true);
  };

  const handleOpenCreate = () => {
    setEditingPhase(null);
    setDialogOpen(true);
  };

  // ── Reorder ──────────────────────────────────────────────
  const movePhase = (index: number, direction: 'left' | 'right') => {
    const newPhases = [...phases];
    const targetIndex = direction === 'left' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newPhases.length) return;
    [newPhases[index], newPhases[targetIndex]] = [newPhases[targetIndex], newPhases[index]];
    onPhasesChange(newPhases.map((p, i) => ({ ...p, display_order: i + 1 })));
  };

  // ── Drag & Drop ──────────────────────────────────────────
  const handleDragStart = (event: DragStartEvent) => {
    setActiveDragId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveDragId(null);
    const { active, over } = event;
    if (!over) return;

    const vcrId = (active.data.current as { vcrId?: string })?.vcrId;
    const overId = over.id as string;

    if (vcrId && overId.startsWith('phase-')) {
      const phaseId = overId.replace('phase-', '');
      onVCRPhaseAssignmentsChange({ ...vcrPhaseAssignments, [vcrId]: phaseId });
    }
  };

  const handleUnassignVCR = (vcrId: string) => {
    const updated = { ...vcrPhaseAssignments };
    delete updated[vcrId];
    onVCRPhaseAssignmentsChange(updated);
  };

  // ── Derived data ─────────────────────────────────────────
  const unassignedVCRs = vcrs.filter(v => !vcrPhaseAssignments[v.id]);
  const getPhaseVCRs = (phaseId: string) => vcrs.filter(v => vcrPhaseAssignments[v.id] === phaseId);
  const activeDragVCR = activeDragId
    ? vcrs.find(v => `vcr-${v.id}` === activeDragId)
    : null;
  const activeDragVCRIndex = activeDragVCR
    ? vcrs.findIndex(v => v.id === activeDragVCR.id)
    : -1;

  // ── No VCRs fallback ─────────────────────────────────────
  if (vcrs.length === 0 && phases.length === 0) {
    return (
      <div className="p-4 text-center">
        <div className="py-8 text-muted-foreground">
          <Milestone className="h-8 w-8 mx-auto mb-2 opacity-40" />
          <p className="text-sm">Create VCRs first, then define phases</p>
        </div>
      </div>
    );
  }

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex flex-col gap-3 p-4 h-full min-h-0">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium">Handover Phases</h3>
            <p className="text-xs text-muted-foreground">
              {phases.length === 0
                ? 'Create phases to define when handovers are planned'
                : 'Drag VCRs from below into phase cards to assign them'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline">{phases.length} phase{phases.length !== 1 ? 's' : ''}</Badge>
            <Button size="sm" className="h-7 text-xs gap-1" onClick={handleOpenCreate}>
              <Plus className="h-3.5 w-3.5" /> Add Phase
            </Button>
          </div>
        </div>

        {/* Phase cards – horizontal layout */}
        <ScrollArea className="flex-1 min-h-0 w-full [&>[data-radix-scroll-area-viewport]]:overflow-visible">
          <div className="flex gap-3 pb-2 pt-3 h-full">
            {phases.map((phase, index) => (
              <PhaseCard
                key={phase.id}
                phase={phase}
                index={index}
                total={phases.length}
                milestones={milestones}
                assignedVCRs={getPhaseVCRs(phase.id)}
                allVCRs={vcrs}
                isReceivingDrag={!!activeDragId}
                onEdit={handleStartEdit}
                onDelete={handleDeletePhase}
                onMoveLeft={() => movePhase(index, 'left')}
                onMoveRight={() => movePhase(index, 'right')}
                onUnassignVCR={handleUnassignVCR}
              />
            ))}

            {phases.length === 0 && (
              <div className="flex-1 flex flex-col items-center justify-center py-10 text-muted-foreground">
                <Milestone className="h-8 w-8 mb-2 opacity-40" />
                <p className="text-sm">No phases defined yet</p>
                <p className="text-[11px] mt-1">Click "Add Phase" to get started</p>
              </div>
            )}
          </div>
        </ScrollArea>


        {/* Unassigned VCRs tray – shown as soon as phases exist */}
        {phases.length > 0 && vcrs.length > 0 && (
          <div className={cn(
            'border rounded-lg p-3 space-y-2 transition-colors',
            activeDragId ? 'bg-muted/10 border-dashed border-border' : 'bg-muted/30',
          )}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium">
                  {unassignedVCRs.length > 0 ? 'Unassigned VCRs' : 'All VCRs Assigned'}
                </span>
              </div>
            </div>

            {unassignedVCRs.length > 0 ? (
              <>
                <p className="text-[10px] text-muted-foreground">
                  Drag a VCR and drop it onto a phase card above
                </p>
                <div className="grid grid-cols-3 gap-1.5">
                  {unassignedVCRs.map(vcr => {
                    const vcrIndex = vcrs.findIndex(v => v.id === vcr.id);
                    return (
                      <DraggableVCRChip key={vcr.id} vcr={vcr} index={vcrIndex} />
                    );
                  })}
                </div>
              </>
            ) : (
              <p className="text-[10px] text-muted-foreground">
                All VCRs have been assigned to phases. You can unassign a VCR by clicking the × on its chip inside a phase card.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Drag overlay – portalled to document.body to escape Dialog transforms */}
      {createPortal(
        <DragOverlay
          dropAnimation={{
            duration: 200,
            easing: 'cubic-bezier(0.2, 0, 0, 1)',
          }}
        >
          {activeDragVCR && (
            <VCRChipOverlay vcr={activeDragVCR} index={activeDragVCRIndex} />
          )}
        </DragOverlay>,
        document.body,
      )}

      <PhaseFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        milestones={milestones}
        editingPhase={editingPhase}
        onSave={editingPhase ? handleEditPhase : handleCreatePhase}
      />
    </DndContext>
  );
};

import React, { useState, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  closestCenter,
} from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Milestone,
  Plus,
  Key,
  ArrowRight,
  GripVertical,
  ExternalLink,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { WizardVCR } from './VCRCreationStep';
import { WizardSystem } from './SystemsImportStep';
import { PhaseCard } from './phases/PhaseCard';
import { DraggableVCRChip, VCRChipOverlay } from './phases/DraggableVCRChip';
import { PhaseFormDialog } from './phases/PhaseFormDialog';
import { CombineVCRDialog } from './phases/CombineVCRDialog';
import { VCREditOverlay } from './phases/VCREditOverlay';

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
  systems: WizardSystem[];
  vcrPhaseAssignments: Record<string, string>;
  mappings: Record<string, string[]>;
  milestones?: Array<{ id: string; name: string; target_date?: string }>;
  onPhasesChange: (phases: WizardPhase[]) => void;
  onVCRPhaseAssignmentsChange: (assignments: Record<string, string>) => void;
  onVCRsChange: (vcrs: WizardVCR[]) => void;
  onMappingsChange: (mappings: Record<string, string[]>) => void;
  onOpenFullWorkspace?: () => void;
}

export const PhasesStep: React.FC<PhasesStepProps> = ({
  vcrs,
  phases,
  systems,
  vcrPhaseAssignments,
  mappings,
  milestones = [],
  onPhasesChange,
  onVCRPhaseAssignmentsChange,
  onVCRsChange,
  onMappingsChange,
  onOpenFullWorkspace,
}) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPhase, setEditingPhase] = useState<WizardPhase | null>(null);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [combineDialogOpen, setCombineDialogOpen] = useState(false);
  const [combineContext, setCombineContext] = useState<{ source: WizardVCR; target: WizardVCR } | null>(null);
  const [vcrOverlayOpen, setVcrOverlayOpen] = useState(false);
  const [selectedVCR, setSelectedVCR] = useState<WizardVCR | null>(null);
  // Track VCR ordering within each phase: phaseId -> ordered vcrId[]
  const [phaseVcrOrder, setPhaseVcrOrder] = useState<Record<string, string[]>>({});

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

  const findPhaseForVCR = useCallback((vcrId: string): string | undefined => {
    return vcrPhaseAssignments[vcrId];
  }, [vcrPhaseAssignments]);

  const getOrderedPhaseVCRs = useCallback((phaseId: string): string[] => {
    const assignedIds = vcrs.filter(v => vcrPhaseAssignments[v.id] === phaseId).map(v => v.id);
    const order = phaseVcrOrder[phaseId];
    if (!order) return assignedIds;
    // Return ordered IDs, filtering out stale entries and appending new ones
    const ordered = order.filter(id => assignedIds.includes(id));
    const remaining = assignedIds.filter(id => !order.includes(id));
    return [...ordered, ...remaining];
  }, [vcrs, vcrPhaseAssignments, phaseVcrOrder]);

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveDragId(null);
    const { active, over } = event;
    if (!over) return;

    const vcrId = (active.data.current as { vcrId?: string })?.vcrId;
    const overId = over.id as string;
    if (!vcrId) return;

    // Dropped onto a phase card directly
    if (overId.startsWith('phase-')) {
      const targetPhaseId = overId.replace('phase-', '');
      const sourcePhaseId = findPhaseForVCR(vcrId);

      // Remove from source phase order
      if (sourcePhaseId && sourcePhaseId !== targetPhaseId) {
        setPhaseVcrOrder(prev => ({
          ...prev,
          [sourcePhaseId]: (prev[sourcePhaseId] || []).filter(id => id !== vcrId),
        }));
      }

      // Add to target phase order
      setPhaseVcrOrder(prev => {
        const current = prev[targetPhaseId] || [];
        if (!current.includes(vcrId)) return { ...prev, [targetPhaseId]: [...current, vcrId] };
        return prev;
      });

      onVCRPhaseAssignmentsChange({ ...vcrPhaseAssignments, [vcrId]: targetPhaseId });
      return;
    }

    // Dropped onto another VCR — open combine dialog
    if (overId.startsWith('vcr-')) {
      const overVcrId = overId.replace('vcr-', '');
      const sourceVCR = vcrs.find(v => v.id === vcrId);
      const targetVCR = vcrs.find(v => v.id === overVcrId);
      if (sourceVCR && targetVCR && sourceVCR.id !== targetVCR.id) {
        setCombineContext({ source: sourceVCR, target: targetVCR });
        setCombineDialogOpen(true);
      }
    }
  };

  const handleCombineVCRs = (sourceId: string, targetId: string, newName: string) => {
    const sourceVCR = vcrs.find(v => v.id === sourceId);
    const targetVCR = vcrs.find(v => v.id === targetId);
    if (!sourceVCR || !targetVCR) return;

    // Create new combined VCR keeping target's position
    const remainingVcrs = vcrs.filter(v => v.id !== sourceId && v.id !== targetId);
    const newVCR: WizardVCR = {
      id: `vcr-${Date.now()}`,
      name: newName,
      reason: [sourceVCR.reason, targetVCR.reason].filter(Boolean).join('; '),
      targetMilestone: targetVCR.targetMilestone || sourceVCR.targetMilestone,
    };
    const newVcrs = [...remainingVcrs, newVCR];

    // Re-generate codes
    const projectCodeMatch = sourceVCR.code?.match(/VCR-([A-Z0-9]+)-/);
    const prefix = projectCodeMatch ? projectCodeMatch[1] : 'XXX';
    const codedVcrs = newVcrs.map((v, i) => ({
      ...v,
      code: `VCR-${prefix}-${String(i + 1).padStart(3, '0')}`,
    }));
    onVCRsChange(codedVcrs);

    // Merge mappings: combine systems from both source VCRs
    const sourceSystems = mappings[sourceId] || [];
    const targetSystems = mappings[targetId] || [];
    const mergedSystems = [...new Set([...sourceSystems, ...targetSystems])];
    const newMappings = { ...mappings };
    delete newMappings[sourceId];
    delete newMappings[targetId];
    newMappings[newVCR.id] = mergedSystems;
    onMappingsChange(newMappings);

    // Update phase assignments: use target's phase
    const targetPhaseId = vcrPhaseAssignments[targetId] || vcrPhaseAssignments[sourceId];
    const newAssignments = { ...vcrPhaseAssignments };
    delete newAssignments[sourceId];
    delete newAssignments[targetId];
    if (targetPhaseId) {
      newAssignments[newVCR.id] = targetPhaseId;
    }
    onVCRPhaseAssignmentsChange(newAssignments);

    // Update phase VCR order
    setPhaseVcrOrder(prev => {
      const updated = { ...prev };
      for (const phaseId of Object.keys(updated)) {
        updated[phaseId] = updated[phaseId]
          .filter(id => id !== sourceId && id !== targetId);
        if (phaseId === targetPhaseId) {
          updated[phaseId].push(newVCR.id);
        }
      }
      return updated;
    });
  };

  const handleUnassignVCR = (vcrId: string) => {
    const phaseId = findPhaseForVCR(vcrId);
    if (phaseId) {
      setPhaseVcrOrder(prev => ({
        ...prev,
        [phaseId]: (prev[phaseId] || []).filter(id => id !== vcrId),
      }));
    }
    const updated = { ...vcrPhaseAssignments };
    delete updated[vcrId];
    onVCRPhaseAssignmentsChange(updated);
  };

  // ── Derived data ─────────────────────────────────────────
  const unassignedVCRs = vcrs.filter(v => !vcrPhaseAssignments[v.id]);
  const getPhaseVCRs = (phaseId: string): WizardVCR[] => {
    const orderedIds = getOrderedPhaseVCRs(phaseId);
    return orderedIds.map(id => vcrs.find(v => v.id === id)).filter(Boolean) as WizardVCR[];
  };
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
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
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
            {onOpenFullWorkspace && (
              <Button
                variant="outline"
                size="sm"
                onClick={onOpenFullWorkspace}
                className="text-xs h-7 px-2.5 gap-1.5"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Open Workspace
              </Button>
            )}
            <Button size="sm" className="h-7 text-xs gap-1" onClick={handleOpenCreate}>
              <Plus className="h-3.5 w-3.5" /> Add Phase
            </Button>
          </div>
        </div>

        {/* Phase cards – horizontal layout */}
        <ScrollArea className="flex-1 min-h-0 w-full [&>[data-radix-scroll-area-viewport]]:overflow-visible">
          <div className="flex gap-3 pb-2 pt-3 h-full justify-center">
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
                onVCRClick={(vcr) => { setSelectedVCR(vcr); setVcrOverlayOpen(true); }}
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
                      <DraggableVCRChip key={vcr.id} vcr={vcr} index={vcrIndex} onVCRClick={(v) => { setSelectedVCR(v); setVcrOverlayOpen(true); }} />
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

      {combineContext && (
        <CombineVCRDialog
          open={combineDialogOpen}
          onOpenChange={setCombineDialogOpen}
          sourceVCR={combineContext.source}
          targetVCR={combineContext.target}
          onCombine={handleCombineVCRs}
        />
      )}

      {selectedVCR && (
        <VCREditOverlay
          open={vcrOverlayOpen}
          onOpenChange={setVcrOverlayOpen}
          vcr={selectedVCR}
          vcrIndex={vcrs.findIndex(v => v.id === selectedVCR.id)}
          phases={phases}
          systems={systems}
          mappings={mappings}
          vcrPhaseAssignments={vcrPhaseAssignments}
          onVCRUpdate={(id, updates) => {
            onVCRsChange(vcrs.map(v => v.id === id ? { ...v, ...updates } : v));
            if (updates.name && selectedVCR.id === id) {
              setSelectedVCR({ ...selectedVCR, ...updates });
            }
          }}
          onPhaseAssign={(vcrId, phaseId) => {
            const updated = { ...vcrPhaseAssignments };
            if (phaseId) {
              updated[vcrId] = phaseId;
            } else {
              delete updated[vcrId];
            }
            onVCRPhaseAssignmentsChange(updated);
          }}
          onMappingsChange={onMappingsChange}
        />
      )}
    </DndContext>
  );
};

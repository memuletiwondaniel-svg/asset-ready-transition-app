import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DndContext, DragEndEvent, DragOverlay, useSensor, useSensors, PointerSensor, closestCenter, rectIntersection, CollisionDetection, pointerWithin } from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Maximize2, Minimize2, Undo2 } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useP2AHandoverPlan } from './hooks/useP2AHandoverPlan';
import { useP2ASystems } from './hooks/useP2ASystems';
import { useP2APhases, useP2AMilestones } from './hooks/useP2APhases';
import { useP2AHandoverPoints, P2AHandoverPoint } from './hooks/useP2AHandoverPoints';
import { useVCRRelationships } from './hooks/useVCRRelationships';
import { useUndoStack } from './hooks/useUndoStack';
import { EmptyWorkspaceState } from './EmptyWorkspaceState';
import { SystemsPanel } from './systems/SystemsPanel';
import { SystemCard } from './systems/SystemCard';
import { PhasesTimeline } from './phases/PhasesTimeline';
import { UnassignedVCRPanel } from './phases/UnassignedVCRPanel';
import { CreateHandoverPointDialog } from './handover-points/CreateHandoverPointDialog';
import { HandoverPointCard } from './handover-points/HandoverPointCard';
import { VCRDetailSheet } from './handover-points/VCRDetailSheet';
import { VCRRelationshipDialog } from './handover-points/VCRRelationshipDialog';
import { cn } from '@/lib/utils';
import { MappingOverlay } from './mapping/MappingOverlay';
import { useMappingPositions } from './mapping/useMappingPositions';
import { useVCRAlignment } from './mapping/useVCRAlignment';
import { useToast } from '@/hooks/use-toast';

interface P2AHandoverWorkspaceProps {
  projectId: string;
  /** @deprecated Use projectId instead */
  oraPlanId?: string;
  projectName?: string;
  projectNumber?: string;
  showMapping?: boolean;
  zoomLevel?: number;
}

export const P2AHandoverWorkspace: React.FC<P2AHandoverWorkspaceProps> = ({
  projectId,
  oraPlanId,
  projectName,
  projectNumber,
  showMapping = false,
  zoomLevel = 1.0,
}) => {
  const workspaceContainerRef = useRef<HTMLDivElement>(null);
  const [activeDragItem, setActiveDragItem] = useState<{ type: 'system' | 'vcr' | 'phase'; data: any } | null>(null);
  const [showCreateVCRDialog, setShowCreateVCRDialog] = useState(false);
  const [selectedPhaseIdForVCR, setSelectedPhaseIdForVCR] = useState<string | null>(null);
  const [selectedVCR, setSelectedVCR] = useState<P2AHandoverPoint | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  // VCR Relationship Dialog state
  const [showVCRRelationshipDialog, setShowVCRRelationshipDialog] = useState(false);
  const [vcrRelationshipContext, setVcrRelationshipContext] = useState<{
    source: P2AHandoverPoint;
    target: P2AHandoverPoint;
  } | null>(null);
  
  // Local UI overrides to prevent post-drop "snap-back" while React Query + Supabase sync.
  const [uiVcrOverrides, setUiVcrOverrides] = useState<
    Record<string, { position_x: number; position_y: number; phase_id?: string | null }>
  >({});

  // Hooks
  const { plan, isLoading: planLoading, createPlan, isCreating } = useP2AHandoverPlan(projectId, 'project_id');
  const { 
    systems, 
    unassignedSystems, 
    assignedSystems,
    isLoading: systemsLoading,
    addSystem,
    addSystemsBulk,
    updateSystem,
    isAdding,
    isImporting,
    isUpdating,
  } = useP2ASystems(plan?.id || '');
  const { milestones, addMilestone } = useP2AMilestones(plan?.id || '');
  const { phases, isLoading: phasesLoading, addPhase, updatePhase, deletePhase, reorderPhases, isAdding: isAddingPhase } = useP2APhases(plan?.id || '');
  const { 
    handoverPoints,
    assignedPoints,
    unassignedPoints,
    createHandoverPoint,
    assignSystemToPoint,
    unassignSystemFromPoint,
    moveHandoverPointToPhase,
    reorderHandoverPoints,
    updateVCRPosition,
    combineVCRs,
    deleteHandoverPoint,
    isCreating: isCreatingVCR,
    isCombining,
    isDeleting: isDeletingVCR,
  } = useP2AHandoverPoints(plan?.id || '');

  // VCR Relationships hook
  const {
    createRelationship,
    isCreating: isCreatingRelationship,
  } = useVCRRelationships(plan?.id || '');

  // Undo stack for workspace actions
  const { pushAction, undo, canUndo, isUndoing, lastActionDescription } = useUndoStack();
  const { toast } = useToast();

  // Mapping overlay positions
  const { bundles } = useMappingPositions(systems, showMapping, workspaceContainerRef);

  // VCR alignment targets for horizontal mapping lines
  const vcrAlignmentTargets = useVCRAlignment(showMapping, workspaceContainerRef);

  const handoverPointsWithUi = useMemo(() => {
    if (!handoverPoints?.length) return [];
    return handoverPoints.map((p) => {
      const o = uiVcrOverrides[p.id];
      return o
        ? {
            ...p,
            position_x: o.position_x,
            position_y: o.position_y,
            phase_id: o.phase_id !== undefined ? o.phase_id : p.phase_id,
          }
        : p;
    });
  }, [handoverPoints, uiVcrOverrides]);

  const assignedPointsWithUi = useMemo(
    () => {
      // Only treat a VCR as "assigned" if its phase actually exists.
      // This prevents "ghost" VCRs (phase deleted / missing) from disappearing
      // while their systems still look assigned/colored.
      const validPhaseIds = new Set(phases.map((p) => p.id));
      return handoverPointsWithUi.filter(
        (p) => !!p.phase_id && validPhaseIds.has(p.phase_id)
      );
    },
    [handoverPointsWithUi, phases]
  );
  const unassignedPointsWithUi = useMemo(
    () => {
      const validPhaseIds = new Set(phases.map((p) => p.id));
      return handoverPointsWithUi.filter(
        (p) => !p.phase_id || !validPhaseIds.has(p.phase_id)
      );
    },
    [handoverPointsWithUi, phases]
  );

  // Clear overrides once server/cache has caught up to the same coordinates.
  useEffect(() => {
    if (!handoverPoints?.length) return;

    setUiVcrOverrides((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const [id, o] of Object.entries(prev)) {
        const p = handoverPoints.find((hp) => hp.id === id);
        if (!p) continue;
        const phaseMatches = o.phase_id === undefined ? true : (p.phase_id ?? null) === (o.phase_id ?? null);
        const posMatches = p.position_x === o.position_x && p.position_y === o.position_y;
        if (phaseMatches && posMatches) {
          delete next[id];
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [handoverPoints]);

  // Sync vertical scroll between systems panel and phases timeline
  // IMPORTANT: Skip the systems panel's own ScrollArea — only sync the
  // phases-timeline viewports with each other.
  useEffect(() => {
    const container = workspaceContainerRef.current;
    if (!container) return;

    // The systems panel has [data-systems-panel] — skip any viewport inside it
    const systemsPanelEl = container.querySelector('[data-systems-panel]');
    const allViewports = Array.from(container.querySelectorAll('[data-radix-scroll-area-viewport]'));
    const timelineViewports = allViewports.filter(
      (vp) => !systemsPanelEl?.contains(vp)
    ) as HTMLElement[];

    if (timelineViewports.length < 2) return;

    // Sync all timeline viewports together
    let scrollSource: HTMLElement | null = null;
    let scrollTimer: number | null = null;

    const clearSource = () => {
      if (scrollTimer) clearTimeout(scrollTimer);
      scrollTimer = window.setTimeout(() => { scrollSource = null; }, 60);
    };

    const handlers = timelineViewports.map((vp) => {
      const handler = () => {
        if (scrollSource && scrollSource !== vp) return;
        scrollSource = vp;
        for (const other of timelineViewports) {
          if (other !== vp) other.scrollTop = vp.scrollTop;
        }
        clearSource();
      };
      vp.addEventListener('scroll', handler, { passive: true });
      return { vp, handler };
    });

    return () => {
      for (const { vp, handler } of handlers) {
        vp.removeEventListener('scroll', handler);
      }
      if (scrollTimer) clearTimeout(scrollTimer);
    };
  }, [plan]);

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  );

  // Custom collision detection: when dragging phases, only consider other phases as drop targets
  const customCollisionDetection: CollisionDetection = useCallback((args) => {
    const { active, droppableContainers } = args;
    
    // If dragging a phase-column, use closestCenter but filter to only phase targets
    if (active.data.current?.type === 'phase-column') {
      // Get all collisions using closestCenter
      const collisions = closestCenter(args);
      
      // Filter to only include phase-related droppables
      const phaseCollisions = collisions.filter(collision => {
        const id = collision.id.toString();
        const container = droppableContainers.find(c => c.id === collision.id);
        const data = container?.data.current;
        return data?.type === 'phase-column' || data?.type === 'phase' || phases.some(p => p.id === id);
      });
      
      return phaseCollisions.length > 0 ? phaseCollisions : collisions;
    }
    
    // For other drag types (VCRs, systems), use pointerWithin for better precision
    return pointerWithin(args);
  }, [phases]);

  const handleDragStart = (event: any) => {
    const { active } = event;
   console.log('Drag started:', active.id, active.data.current?.type);
    if (active.data.current?.type === 'system') {
      setActiveDragItem({ type: 'system', data: active.data.current.system });
    } else if (active.data.current?.type === 'vcr') {
      setActiveDragItem({ type: 'vcr', data: active.data.current.handoverPoint });
    } else if (active.data.current?.type === 'phase-column') {
      setActiveDragItem({ type: 'phase', data: active.data.current.phase });
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveDragItem(null);
    
    const { active, over, delta } = event;
    console.log('Drag ended:', { 
      activeId: active.id, 
      activeType: active.data.current?.type,
      overId: over?.id, 
      overType: over?.data.current?.type,
      delta
    });
   
    if (!over) {
      // If VCR was dropped but not over any target, update its position in current phase
      if (active.data.current?.type === 'vcr' && delta) {
        const vcr = active.data.current.handoverPoint;
        const newX = Math.round(Math.max(0, vcr.position_x + delta.x));
        const newY = Math.round(Math.max(0, vcr.position_y + delta.y));

        // Immediate UI update to avoid snap-back
        setUiVcrOverrides((prev) => ({
          ...prev,
          [vcr.id]: { position_x: newX, position_y: newY },
        }));
        updateVCRPosition({ 
          id: vcr.id, 
          position_x: newX, 
          position_y: newY 
        });
      }
      return;
    }

    // Handle reordering phase columns
    if (active.data.current?.type === 'phase-column') {
      const activeId = active.id.toString();
      const rawOverId = over.id.toString();
      // Can be either the sortable id (phase.id) or the droppable id (phase-<phase.id>)
      const overId = rawOverId.startsWith('phase-') ? rawOverId.replace('phase-', '') : rawOverId;
      
      // Check if we're dropping on another phase (either by type or by matching phase ID)
      const overType = over.data.current?.type;
      const isOverPhase = overType === 'phase-column' || overType === 'phase' || phases.some(p => p.id === overId);
      
      console.log('Phase reorder attempt:', { overType, activeId, rawOverId, overId, isOverPhase });
      
      if (isOverPhase && activeId !== overId) {
        const oldIndex = phases.findIndex(p => p.id === activeId);
        const newIndex = phases.findIndex(p => p.id === overId);
        
        if (oldIndex !== -1 && newIndex !== -1) {
          const reordered = arrayMove(phases, oldIndex, newIndex);
          const updates = reordered.map((phase, idx) => ({
            id: phase.id,
            display_order: idx,
          }));
          reorderPhases(updates);
        }
      }
      return;
    }

    // Handle VCR positioning - update position based on drag delta
    if (active.data.current?.type === 'vcr') {
      const vcr = active.data.current.handoverPoint;
      const overType = over.data.current?.type;
      const overId = over.id.toString();
      
      // FIRST: Check if dropping on another VCR
      if (overType === 'vcr' || overId.startsWith('vcr-')) {
        const targetVCR = over.data.current?.handoverPoint;
        if (targetVCR && vcr.id !== targetVCR.id) {
          // Always open relationship dialog when dropping VCR on another VCR
          setVcrRelationshipContext({ source: vcr, target: targetVCR });
          setShowVCRRelationshipDialog(true);
          return;
        }
        // If dropped on self, just return without action
        return;
      }
      
      // If dropping on a phase (same or different)
      if (overId.startsWith('phase-') || overType === 'phase') {
        const rawPhaseId = overId.startsWith('phase-') ? overId.replace('phase-', '') : overId;
        // Special drop zone: "phase-unassigned" => set phase_id to null
        const phaseId: string | null = rawPhaseId === 'unassigned' ? null : rawPhaseId;
        const isSamePhase = (phaseId ?? null) === (vcr.phase_id ?? null);
        
        if (delta) {
          const oldX = vcr.position_x;
          const oldY = vcr.position_y;
          const oldPhaseId = vcr.phase_id;
          const newX = Math.round(Math.max(0, Math.min(50, vcr.position_x + delta.x)));
          const newY = Math.round(Math.max(0, Math.min(320, vcr.position_y + delta.y)));
          const newPhaseId: string | null | undefined = isSamePhase ? undefined : phaseId;

          // Immediate UI update (prevents snap-back between drag end and cache update)
          setUiVcrOverrides((prev) => ({
            ...prev,
            [vcr.id]: {
              position_x: newX,
              position_y: newY,
              // IMPORTANT: only include phase_id override when actually changing phases.
              // Including `phase_id: undefined` can lead to accidental nulling in some update paths.
              ...(newPhaseId !== undefined ? { phase_id: newPhaseId } : {}),
            },
          }));
          
          // IMPORTANT: only send phase_id when changing phases.
          // Sending `phase_id: undefined` can cause the VCR to become unassigned (appear to disappear).
          updateVCRPosition(
            newPhaseId !== undefined
              ? {
                  id: vcr.id,
                  position_x: newX,
                  position_y: newY,
                  phase_id: newPhaseId,
                }
              : {
                  id: vcr.id,
                  position_x: newX,
                  position_y: newY,
                }
          );

          // Push undo action
          const vcrShortCode = vcr.vcr_code.match(/^(VCR-\d+)/)?.[1] || 'VCR';
          pushAction({
            type: 'vcr_move',
            description: `Move ${vcrShortCode}`,
            undo: () => {
              setUiVcrOverrides((prev) => ({
                ...prev,
                [vcr.id]: { position_x: oldX, position_y: oldY, phase_id: oldPhaseId },
              }));
              // oldPhaseId is always a concrete value for an assigned VCR.
              updateVCRPosition({
                id: vcr.id,
                position_x: oldX,
                position_y: oldY,
                phase_id: oldPhaseId,
              });
            },
          });
        } else if (!isSamePhase) {
          const oldPhaseId = vcr.phase_id;
          moveHandoverPointToPhase({ handoverPointId: vcr.id, newPhaseId: phaseId });

          // Push undo action for phase change
          const vcrShortCode = vcr.vcr_code.match(/^(VCR-\d+)/)?.[1] || 'VCR';
          pushAction({
            type: 'vcr_move',
            description: `Move ${vcrShortCode} to phase`,
            undo: () => {
              moveHandoverPointToPhase({ handoverPointId: vcr.id, newPhaseId: oldPhaseId || '' });
            },
          });
        }
        return;
      }
    }

    // Handle dropping system on VCR
    if (active.data.current?.type === 'system' && over.id.toString().startsWith('vcr-')) {
      const systemId = active.data.current.system.id;
      const handoverPointId = over.id.toString().replace('vcr-', '');
      assignSystemToPoint({ handoverPointId, systemId });
      return;
    }

    // Handle dropping system on unassigned zone to unassign it
    if (active.data.current?.type === 'system' && over.id === 'systems-unassigned') {
      const system = active.data.current.system;
      if (system.assigned_handover_point_id) {
        unassignSystemFromPoint({ systemId: system.id });
      }
    }
  };

  // Default to first phase when creating VCR without specific phase
  const handleCreateHandoverPoint = (phaseId?: string | null) => {
    // If explicitly null, create as unassigned.
    if (phaseId === null) {
      setSelectedPhaseIdForVCR(null);
      setShowCreateVCRDialog(true);
      return;
    }

    // If no phase specified and phases exist, default to first phase
    const defaultPhaseId = phaseId || (phases.length > 0 ? phases[0].id : null);
    setSelectedPhaseIdForVCR(defaultPhaseId);
    setShowCreateVCRDialog(true);
  };

  const handleOpenVCR = (point: P2AHandoverPoint) => {
    setSelectedVCR(point);
  };

  // Loading state
  if (planLoading) {
    return (
      <div className="flex-1 p-6 space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  // Empty state - no plan created yet
  if (!plan) {
    return (
      <EmptyWorkspaceState
        onCreatePlan={createPlan}
        isCreating={isCreating}
        projectName={projectName}
        projectNumber={projectNumber}
      />
    );
  }

  return (
    <div 
      className={cn(
        "flex flex-col transition-all duration-300 relative",
        isFullscreen 
          ? "fixed inset-0 z-50 bg-background" 
          : "flex-1 h-full"
      )}
    >
      {/* Dynamic Multicolor Animated Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div 
          className="absolute top-0 left-0 w-[600px] h-[600px] rounded-full opacity-[0.08] dark:opacity-[0.04] will-change-transform animate-journey-tl"
          style={{ 
            background: 'radial-gradient(circle, hsl(280, 45%, 60%), transparent 70%)',
            filter: 'blur(100px)',
            transform: 'translateZ(0)',
          }}
        />
        <div 
          className="absolute top-0 right-0 w-[650px] h-[650px] rounded-full opacity-[0.18] dark:opacity-[0.10] will-change-transform animate-journey-tr"
          style={{ 
            background: 'radial-gradient(circle, hsl(200, 70%, 60%), transparent 70%)',
            filter: 'blur(110px)',
            transform: 'translateZ(0)',
          }}
        />
        <div 
          className="absolute bottom-0 left-0 w-[550px] h-[550px] rounded-full opacity-[0.14] dark:opacity-[0.08] will-change-transform animate-journey-bl"
          style={{ 
            background: 'radial-gradient(circle, hsl(170, 55%, 60%), transparent 70%)',
            filter: 'blur(100px)',
            transform: 'translateZ(0)',
          }}
        />
        <div 
          className="absolute bottom-0 right-0 w-[500px] h-[500px] rounded-full opacity-[0.24] dark:opacity-[0.14] will-change-transform animate-journey-br"
          style={{ 
            background: 'radial-gradient(circle, hsl(45, 85%, 58%), transparent 70%)',
            filter: 'blur(90px)',
            transform: 'translateZ(0)',
          }}
        />
        <div 
          className="absolute top-1/2 left-1/4 w-[450px] h-[450px] rounded-full opacity-[0.16] dark:opacity-[0.09] will-change-transform animate-journey-center"
          style={{ 
            background: 'radial-gradient(circle, hsl(330, 60%, 65%), transparent 70%)',
            filter: 'blur(95px)',
            transform: 'translateZ(0)',
          }}
        />
        <div 
          className="absolute top-1/3 right-1/4 w-[480px] h-[480px] rounded-full opacity-[0.20] dark:opacity-[0.11] will-change-transform animate-journey-roam-1"
          style={{ 
            background: 'radial-gradient(circle, hsl(35, 80%, 55%), transparent 70%)',
            filter: 'blur(100px)',
            transform: 'translateZ(0)',
          }}
        />
        <div 
          className="absolute bottom-1/3 left-1/3 w-[420px] h-[420px] rounded-full opacity-[0.14] dark:opacity-[0.08] will-change-transform animate-journey-roam-2"
          style={{ 
            background: 'radial-gradient(circle, hsl(260, 65%, 62%), transparent 70%)',
            filter: 'blur(95px)',
            transform: 'translateZ(0)',
          }}
        />
        <div 
          className="absolute top-1/4 left-1/2 w-[400px] h-[400px] rounded-full opacity-[0.12] dark:opacity-[0.07] will-change-transform animate-journey-roam-3"
          style={{ 
            background: 'radial-gradient(circle, hsl(150, 55%, 58%), transparent 70%)',
            filter: 'blur(90px)',
            transform: 'translateZ(0)',
          }}
        />
        <div 
          className="absolute top-1/2 left-1/2 w-[700px] h-[700px] rounded-full opacity-[0.06] dark:opacity-[0.04] will-change-transform animate-pulse-center"
          style={{ 
            background: 'radial-gradient(circle, hsl(240, 45%, 70%), transparent 60%)',
            filter: 'blur(130px)',
            transform: 'translateZ(0)',
          }}
        />
      </div>

    <DndContext
      sensors={sensors}
      collisionDetection={customCollisionDetection}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >

      {/* Main Content Area - Systems Panel + Timeline (above background) */}
      <div className="flex-1 flex overflow-hidden min-h-0 relative z-10" ref={workspaceContainerRef} data-workspace-container data-hide-ids={zoomLevel < 0.8 ? '' : undefined} style={{ '--ws-zoom': 1, '--ws-zoom-y': zoomLevel } as React.CSSProperties}>
        {/* Mapping SVG Overlay */}
        {showMapping && <MappingOverlay bundles={bundles} />}

        {/* Systems Panel - LEFT Side */}
        <SystemsPanel
          systems={systems}
          unassignedSystems={unassignedSystems}
          assignedSystems={assignedSystems}
          handoverPlanId={plan.id}
          plantCode={plan.plant_code}
          projectCode={plan.project_code}
          onAddSystem={addSystem}
          onImportSystems={addSystemsBulk}
          onUpdateSystem={(id, updates) => updateSystem({ id, updates })}
          isAdding={isAdding}
          isImporting={isImporting}
          isUpdating={isUpdating}
          showMapping={showMapping}
          phases={phases}
          handoverPoints={[...assignedPoints, ...unassignedPoints]}
        />

        {/* Phases Timeline Area */}
        <PhasesTimeline
          phases={phases}
          milestones={milestones}
          handoverPoints={assignedPointsWithUi}
          unassignedPoints={unassignedPointsWithUi}
          handoverPlanId={plan.id}
          projectCode={plan.project_code}
          onCreatePhase={addPhase}
          onCreateMilestone={addMilestone}
          onDeletePhase={deletePhase}
          onUpdatePhase={updatePhase}
          onCreateHandoverPoint={handleCreateHandoverPoint}
          onOpenVCR={handleOpenVCR}
          isFullscreen={isFullscreen}
          onToggleFullscreen={() => setIsFullscreen(!isFullscreen)}
          onAssignVCRToPhase={(vcrId, phaseId) => moveHandoverPointToPhase({ handoverPointId: vcrId, newPhaseId: phaseId })}
          isCreatingPhase={isAddingPhase}
          showMapping={showMapping}
          vcrAlignmentTargets={vcrAlignmentTargets}
          canUndo={canUndo}
          isUndoing={isUndoing}
          lastActionDescription={lastActionDescription}
          onUndo={async () => {
            const success = await undo();
            if (success) {
              toast({ title: 'Undone', description: lastActionDescription || 'Action undone' });
            }
            return success;
          }}
        />

        {/* Unassigned VCRs Panel - RIGHT Side */}
        <UnassignedVCRPanel
          handoverPoints={unassignedPointsWithUi}
          onOpenVCR={handleOpenVCR}
          onCreateHandoverPoint={() => handleCreateHandoverPoint(null)}
        />
      </div>

      {/* Drag Overlay - shows the dragged item preview */}
      <DragOverlay dropAnimation={null}>
        {activeDragItem?.type === 'system' && (
          <div className="shadow-lg cursor-grabbing">
            <SystemCard system={activeDragItem.data} compact />
          </div>
        )}
        {activeDragItem?.type === 'vcr' && (
          <div className="shadow-lg cursor-grabbing rotate-1">
            <HandoverPointCard handoverPoint={activeDragItem.data} />
          </div>
        )}
        {activeDragItem?.type === 'phase' && (
          <div className="bg-card border-2 border-primary rounded-lg px-4 py-2 shadow-lg cursor-grabbing">
            <span className="font-medium">{activeDragItem.data?.name || 'Phase'}</span>
          </div>
        )}
      </DragOverlay>

      {/* Create VCR Dialog */}
      <CreateHandoverPointDialog
        open={showCreateVCRDialog}
        onOpenChange={setShowCreateVCRDialog}
        onCreateHandoverPoint={createHandoverPoint}
        phases={phases}
        selectedPhaseId={selectedPhaseIdForVCR}
        projectCode={plan.project_code || 'XXX'}
        handoverPlanId={plan.id}
        isCreating={isCreatingVCR}
      />

      {/* VCR Detail Sheet */}
      {selectedVCR && (
        <VCRDetailSheet
          handoverPoint={selectedVCR}
          open={!!selectedVCR}
          onOpenChange={(open) => !open && setSelectedVCR(null)}
          phases={phases}
          allSystems={systems}
          onMoveToPhase={(vcrId, phaseId) => moveHandoverPointToPhase({ handoverPointId: vcrId, newPhaseId: phaseId || '' })}
          onAssignSystem={(pointId, systemId) => assignSystemToPoint({ handoverPointId: pointId, systemId })}
          onUnassignSystem={(pointId, systemId) => unassignSystemFromPoint({ systemId })}
          onDelete={() => {
            deleteHandoverPoint(selectedVCR.id);
            setSelectedVCR(null);
          }}
          isDeleting={isDeletingVCR}
        />
      )}

      {/* VCR Relationship Dialog */}
      {vcrRelationshipContext && (
        <VCRRelationshipDialog
          open={showVCRRelationshipDialog}
          onOpenChange={setShowVCRRelationshipDialog}
          sourceVCR={vcrRelationshipContext.source}
          targetVCR={vcrRelationshipContext.target}
          onCreateRelationship={createRelationship}
          onCombineVCRs={(data) =>
            combineVCRs({
              ...data,
              projectCode: plan.project_code || 'XXX',
            })
          }
          isCreating={isCreatingRelationship}
          isCombining={isCombining}
        />
      )}
    </DndContext>
    </div>
  );
};

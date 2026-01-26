import React, { useState } from 'react';
import { DndContext, DragEndEvent, DragOverlay, useSensor, useSensors, PointerSensor, closestCenter } from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Maximize2, Minimize2 } from 'lucide-react';
import { useP2AHandoverPlan } from './hooks/useP2AHandoverPlan';
import { useP2ASystems } from './hooks/useP2ASystems';
import { useP2APhases, useP2AMilestones } from './hooks/useP2APhases';
import { useP2AHandoverPoints, P2AHandoverPoint } from './hooks/useP2AHandoverPoints';
import { EmptyWorkspaceState } from './EmptyWorkspaceState';
import { SystemsPanel } from './systems/SystemsPanel';
import { SystemCard } from './systems/SystemCard';
import { PhasesTimeline } from './phases/PhasesTimeline';
import { CreateHandoverPointDialog } from './handover-points/CreateHandoverPointDialog';
import { HandoverPointCard } from './handover-points/HandoverPointCard';
import { VCRDetailOverlay } from './handover-points/VCRDetailOverlay';
import { cn } from '@/lib/utils';

interface P2AHandoverWorkspaceProps {
  oraPlanId: string;
  projectName?: string;
  projectNumber?: string;
}

export const P2AHandoverWorkspace: React.FC<P2AHandoverWorkspaceProps> = ({
  oraPlanId,
  projectName,
  projectNumber,
}) => {
  const [systemsPanelCollapsed, setSystemsPanelCollapsed] = useState(false);
  const [activeDragItem, setActiveDragItem] = useState<{ type: 'system' | 'vcr' | 'phase'; data: any } | null>(null);
  const [showCreateVCRDialog, setShowCreateVCRDialog] = useState(false);
  const [selectedPhaseIdForVCR, setSelectedPhaseIdForVCR] = useState<string | null>(null);
  const [selectedVCR, setSelectedVCR] = useState<P2AHandoverPoint | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Hooks
  const { plan, isLoading: planLoading, createPlan, isCreating } = useP2AHandoverPlan(oraPlanId);
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
  const { phases, isLoading: phasesLoading, addPhase, deletePhase, reorderPhases, isAdding: isAddingPhase } = useP2APhases(plan?.id || '');
  const { 
    handoverPoints,
    assignedPoints,
    unassignedPoints,
    createHandoverPoint,
    assignSystemToPoint,
    moveHandoverPointToPhase,
    reorderHandoverPoints,
    isCreating: isCreatingVCR,
  } = useP2AHandoverPoints(plan?.id || '');

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  );

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
    
    const { active, over } = event;
   console.log('Drag ended:', { 
     activeId: active.id, 
     activeType: active.data.current?.type,
     overId: over?.id, 
     overType: over?.data.current?.type 
   });
   
    if (!over) return;

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

    // Handle reordering VCRs within same phase
    if (active.data.current?.type === 'vcr' && over.data.current?.type === 'vcr') {
      const activeVCR = active.data.current.handoverPoint;
      const overVCR = over.data.current.handoverPoint;
      
      // Only reorder if same phase and different VCR
      if (activeVCR.phase_id === overVCR.phase_id && activeVCR.id !== overVCR.id) {
        const phasePoints = handoverPoints
          .filter(p => p.phase_id === activeVCR.phase_id)
          .sort((a, b) => a.position_y - b.position_y);
        
        const oldIndex = phasePoints.findIndex(p => p.id === activeVCR.id);
        const newIndex = phasePoints.findIndex(p => p.id === overVCR.id);
        
        if (oldIndex !== -1 && newIndex !== -1) {
          const reordered = arrayMove(phasePoints, oldIndex, newIndex);
          const updates = reordered.map((point, idx) => ({
            id: point.id,
            position_y: idx,
          }));
          reorderHandoverPoints(updates);
        }
      }
      return;
    }

    // Handle dropping system on VCR
    if (active.data.current?.type === 'system' && over.id.toString().startsWith('vcr-')) {
      const systemId = active.data.current.system.id;
      const handoverPointId = over.id.toString().replace('vcr-', '');
      assignSystemToPoint({ handoverPointId, systemId });
    }
    
    // Handle dropping VCR on phase (cross-phase move)
    if (active.data.current?.type === 'vcr' && over.id.toString().startsWith('phase-')) {
      const vcrId = active.data.current.handoverPoint.id;
      const phaseId = over.id.toString().replace('phase-', '');
      const currentPhaseId = active.data.current.handoverPoint.phase_id;
      
      // Only move if dropping on a different phase
      if (phaseId !== currentPhaseId) {
        moveHandoverPointToPhase({ handoverPointId: vcrId, newPhaseId: phaseId });
      }
    }
  };

  // Default to first phase when creating VCR without specific phase
  const handleCreateHandoverPoint = (phaseId?: string) => {
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
        "flex flex-col transition-all duration-300",
        isFullscreen 
          ? "fixed inset-0 z-50 bg-background" 
          : "flex-1 h-full"
      )}
    >
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      {/* Workspace Header - Full Width at Top */}
      <div className="p-4 border-b border-border bg-card/50">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">{plan.name}</h2>
            {plan.description && (
              <p className="text-sm text-muted-foreground">{plan.description}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="h-8 w-8"
              title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
            >
              {isFullscreen ? (
                <Minimize2 className="h-4 w-4" />
              ) : (
                <Maximize2 className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content Area - Systems Panel + Timeline */}
      <div className="flex-1 flex overflow-hidden">
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
          isCollapsed={systemsPanelCollapsed}
          onToggleCollapse={() => setSystemsPanelCollapsed(!systemsPanelCollapsed)}
        />

        {/* Phases Timeline Area */}
        <PhasesTimeline
          phases={phases}
          milestones={milestones}
          handoverPoints={assignedPoints}
          unassignedPoints={unassignedPoints}
          handoverPlanId={plan.id}
          projectCode={plan.project_code}
          onCreatePhase={addPhase}
          onCreateMilestone={addMilestone}
          onDeletePhase={deletePhase}
          onCreateHandoverPoint={handleCreateHandoverPoint}
          onOpenVCR={handleOpenVCR}
          onAssignVCRToPhase={(vcrId, phaseId) => moveHandoverPointToPhase({ handoverPointId: vcrId, newPhaseId: phaseId })}
          isCreatingPhase={isAddingPhase}
        />
      </div>

      {/* Drag Overlay */}
      <DragOverlay>
        {activeDragItem?.type === 'system' && (
          <div className="opacity-80">
            <SystemCard system={activeDragItem.data} compact />
          </div>
        )}
        {activeDragItem?.type === 'vcr' && (
          <div className="opacity-80 rotate-2">
            <HandoverPointCard handoverPoint={activeDragItem.data} />
          </div>
        )}
        {activeDragItem?.type === 'phase' && (
          <div className="opacity-80 rotate-1 bg-card border-2 border-primary rounded-lg px-4 py-2 shadow-lg">
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

      {/* VCR Detail Overlay */}
      {selectedVCR && (
        <VCRDetailOverlay
          handoverPoint={selectedVCR}
          open={!!selectedVCR}
          onOpenChange={(open) => !open && setSelectedVCR(null)}
        />
      )}
    </DndContext>
    </div>
  );
};

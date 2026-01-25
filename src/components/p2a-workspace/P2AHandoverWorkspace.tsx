import React, { useState } from 'react';
import { DndContext, DragEndEvent, DragOverlay, useSensor, useSensors, PointerSensor } from '@dnd-kit/core';
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
  const [activeDragSystem, setActiveDragSystem] = useState<any>(null);
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
  const { phases, isLoading: phasesLoading, addPhase, deletePhase, isAdding: isAddingPhase } = useP2APhases(plan?.id || '');
  const { 
    handoverPoints,
    assignedPoints,
    unassignedPoints,
    createHandoverPoint,
    assignSystemToPoint,
    moveHandoverPointToPhase,
    isCreating: isCreatingVCR,
  } = useP2AHandoverPoints(plan?.id || '');

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  );

  const handleDragStart = (event: any) => {
    if (event.active.data.current?.type === 'system') {
      setActiveDragSystem(event.active.data.current.system);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveDragSystem(null);
    
    const { active, over } = event;
    if (!over) return;

    // Check if dropping system on VCR
    if (active.data.current?.type === 'system' && over.id.toString().startsWith('vcr-')) {
      const systemId = active.data.current.system.id;
      const handoverPointId = over.id.toString().replace('vcr-', '');
      assignSystemToPoint({ handoverPointId, systemId });
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
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex-1 flex h-full overflow-hidden">
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

        {/* Main Workspace Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Workspace Header */}
          <div className="p-4 border-b border-border bg-card/50">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">{plan.name}</h2>
                {plan.description && (
                  <p className="text-sm text-muted-foreground">{plan.description}</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  {plan.project_code && (
                    <span className="px-2 py-1 bg-muted rounded">Project: {plan.project_code}</span>
                  )}
                  {plan.plant_code && (
                    <span className="px-2 py-1 bg-muted rounded">Plant: {plan.plant_code}</span>
                  )}
                </div>
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
      </div>

      {/* Drag Overlay */}
      <DragOverlay>
        {activeDragSystem && (
          <div className="opacity-80">
            <SystemCard system={activeDragSystem} compact />
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

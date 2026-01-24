import React, { useState } from 'react';
import { DndContext, DragEndEvent, DragOverlay, useSensor, useSensors, PointerSensor } from '@dnd-kit/core';
import { Skeleton } from '@/components/ui/skeleton';
import { useP2AHandoverPlan } from './hooks/useP2AHandoverPlan';
import { useP2ASystems } from './hooks/useP2ASystems';
import { useP2APhases } from './hooks/useP2APhases';
import { useP2AHandoverPoints } from './hooks/useP2AHandoverPoints';
import { EmptyWorkspaceState } from './EmptyWorkspaceState';
import { SystemsPanel } from './systems/SystemsPanel';
import { SystemCard } from './systems/SystemCard';

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

  // Hooks
  const { plan, isLoading: planLoading, createPlan, isCreating } = useP2AHandoverPlan(oraPlanId);
  const { 
    systems, 
    unassignedSystems, 
    assignedSystems,
    isLoading: systemsLoading,
    addSystem,
    addSystemsBulk,
    isAdding,
    isImporting,
  } = useP2ASystems(plan?.id || '');
  const { phases, isLoading: phasesLoading } = useP2APhases(plan?.id || '');
  const { 
    handoverPoints,
    assignSystemToPoint,
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
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex-1 flex h-full overflow-hidden">
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
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                {plan.project_code && (
                  <span className="px-2 py-1 bg-muted rounded">Project: {plan.project_code}</span>
                )}
                {plan.plant_code && (
                  <span className="px-2 py-1 bg-muted rounded">Plant: {plan.plant_code}</span>
                )}
              </div>
            </div>
          </div>

          {/* Phases Timeline Area */}
          <div className="flex-1 p-6 overflow-auto">
            {phases.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center max-w-md">
                  <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl">📅</span>
                  </div>
                  <h3 className="font-semibold mb-2">No Phases Defined</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Create project phases to organize handover points between milestones.
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Phase and milestone management coming in next update.
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-center text-muted-foreground">
                Phases timeline will be rendered here
              </div>
            )}
          </div>
        </div>

        {/* Systems Panel - Right Side */}
        <SystemsPanel
          systems={systems}
          unassignedSystems={unassignedSystems}
          assignedSystems={assignedSystems}
          handoverPlanId={plan.id}
          plantCode={plan.plant_code}
          projectCode={plan.project_code}
          onAddSystem={addSystem}
          onImportSystems={addSystemsBulk}
          isAdding={isAdding}
          isImporting={isImporting}
          isCollapsed={systemsPanelCollapsed}
          onToggleCollapse={() => setSystemsPanelCollapsed(!systemsPanelCollapsed)}
        />
      </div>

      {/* Drag Overlay */}
      <DragOverlay>
        {activeDragSystem && (
          <div className="opacity-80">
            <SystemCard system={activeDragSystem} compact />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
};

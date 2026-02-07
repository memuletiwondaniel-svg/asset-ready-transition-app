import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  Plus, 
  Search, 
  ChevronDown, 
  ChevronRight,
  Layers,
  Database,
  Upload,
} from 'lucide-react';
import { P2ASystem } from '../hooks/useP2ASystems';
import { P2APhase } from '../hooks/useP2APhases';
import { P2AHandoverPoint } from '../hooks/useP2AHandoverPoints';
import { DraggableSystemCard } from './SystemCard';
import { WorkspaceAddSystemModal } from './WorkspaceAddSystemModal';
import { WorkspaceExcelUploadModal } from './WorkspaceExcelUploadModal';
import { CMSImportModal } from '@/components/widgets/p2a-wizard/steps/CMSImportModal';
import { SystemDetailOverlay } from './SystemDetailOverlay';
import { useDroppable, useDndContext } from '@dnd-kit/core';
import { cn } from '@/lib/utils';
import { WizardSystem } from '@/components/widgets/p2a-wizard/steps/SystemsImportStep';

// Unassigned Systems Drop Zone Component
interface UnassignedSystemsDropZoneProps {
  systems: P2ASystem[];
  isExpanded: boolean;
  onToggle: () => void;
  onSystemClick: (system: P2ASystem) => void;
}

const UnassignedSystemsDropZone: React.FC<UnassignedSystemsDropZoneProps> = ({
  systems,
  isExpanded,
  onToggle,
  onSystemClick,
}) => {
  const { active: dndActive } = useDndContext();
  const isSystemDragging = dndActive?.data.current?.type === 'system';
  const draggedSystem = dndActive?.data.current?.system as P2ASystem | undefined;
  const isAssignedSystemDragging = isSystemDragging && draggedSystem?.assigned_handover_point_id;

  const { isOver, setNodeRef } = useDroppable({
    id: 'systems-unassigned',
    data: {
      type: 'systems-unassigned',
    },
  });

  const showDropHighlight = isOver && isAssignedSystemDragging;

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "rounded-lg transition-colors",
        showDropHighlight && "bg-primary/10 ring-1 ring-primary/30"
      )}
    >
      <Collapsible open={isExpanded} onOpenChange={onToggle}>
        <CollapsibleTrigger className="flex items-center justify-between w-full p-2 rounded-md hover:bg-muted/50 transition-colors">
          <div className="flex items-center gap-2">
            {isExpanded ? (
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            )}
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 min-w-[18px] flex items-center justify-center">
              {systems.length}
            </Badge>
            <span className="text-xs text-muted-foreground">Unassigned</span>
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-2 overflow-hidden">
          {systems.length > 0 ? (
            <div className="flex flex-wrap gap-1.5 overflow-hidden">
              {systems.map(system => (
                <DraggableSystemCard
                  key={system.id}
                  system={system}
                  compact
                  onClick={() => onSystemClick(system)}
                />
              ))}
            </div>
          ) : (
            <div className="text-[10px] text-muted-foreground text-center py-2">
              {isAssignedSystemDragging ? 'Drop here to unassign' : 'No unassigned systems'}
            </div>
          )}
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
};

interface SystemsPanelProps {
  systems: P2ASystem[];
  unassignedSystems: P2ASystem[];
  assignedSystems: P2ASystem[];
  handoverPlanId: string;
  plantCode?: string;
  projectCode?: string;
  onAddSystem: (system: any) => void;
  onImportSystems: (systems: any[]) => void;
  onUpdateSystem?: (id: string, updates: Partial<P2ASystem>) => void;
  isAdding?: boolean;
  isImporting?: boolean;
  isUpdating?: boolean;
  showMapping?: boolean;
  phases?: P2APhase[];
  handoverPoints?: P2AHandoverPoint[];
}

export const SystemsPanel: React.FC<SystemsPanelProps> = ({
  systems,
  unassignedSystems,
  assignedSystems,
  handoverPlanId,
  plantCode,
  projectCode,
  onAddSystem,
  onImportSystems,
  onUpdateSystem,
  isAdding,
  isImporting,
  isUpdating,
  showMapping = false,
  phases = [],
  handoverPoints = [],
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddManualModal, setShowAddManualModal] = useState(false);
  const [showExcelModal, setShowExcelModal] = useState(false);
  const [showCMSModal, setShowCMSModal] = useState(false);
  const [selectedSystem, setSelectedSystem] = useState<P2ASystem | null>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [expandedSections, setExpandedSections] = useState({
    unassigned: false,
    assigned: true,
  });

  const toggleSection = (section: 'unassigned' | 'assigned') => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  // Filter systems by search query
  const filterSystems = (systemsList: P2ASystem[]) => {
    if (!searchQuery.trim()) return systemsList;
    const query = searchQuery.toLowerCase();
    return systemsList.filter(s => 
      s.name.toLowerCase().includes(query) ||
      s.system_id.toLowerCase().includes(query)
    );
  };

  const filteredUnassigned = filterSystems(unassignedSystems);

  // Sort assigned systems by delivery order:
  // 1. Phase display_order (Phase 1 before Phase 2, etc.)
  // 2. VCR position_y within phase (top VCR first)
  // 3. System name alphabetically within each VCR
  const sortedAssigned = (() => {
    const filtered = filterSystems(assignedSystems);

    // Build lookup: handoverPointId → { phaseDisplayOrder, vcrPositionY, vcrCode }
    const phaseOrderMap = new Map(phases.map(p => [p.id, p.display_order]));
    const vcrInfoMap = new Map(
      handoverPoints.map(hp => [
        hp.id,
        {
          phaseOrder: hp.phase_id ? (phaseOrderMap.get(hp.phase_id) ?? 9999) : 9999,
          positionY: hp.position_y ?? 0,
          vcrCode: hp.vcr_code || '',
        },
      ])
    );

    return filtered.sort((a, b) => {
      const aInfo = vcrInfoMap.get(a.assigned_handover_point_id || '') || { phaseOrder: 9999, positionY: 0, vcrCode: '' };
      const bInfo = vcrInfoMap.get(b.assigned_handover_point_id || '') || { phaseOrder: 9999, positionY: 0, vcrCode: '' };

      // Primary: phase order
      if (aInfo.phaseOrder !== bInfo.phaseOrder) return aInfo.phaseOrder - bInfo.phaseOrder;
      // Secondary: VCR position within phase
      if (aInfo.positionY !== bInfo.positionY) return aInfo.positionY - bInfo.positionY;
      // Tertiary: system name
      return a.name.localeCompare(b.name);
    });
  })();
  const filteredAssigned = sortedAssigned;

  // Convert CMS-imported WizardSystems to workspace-compatible format
  const handleCMSImport = (importedSystems: WizardSystem[]) => {
    const converted = importedSystems.map(ws => ({
      handover_plan_id: handoverPlanId,
      system_id: ws.system_id,
      name: ws.name,
      is_hydrocarbon: ws.is_hydrocarbon,
      completion_status: 'NOT_STARTED' as const,
      completion_percentage: ws.progress || 0,
      source_type: 'CMS_IMPORT' as const,
      punchlist_a_count: 0,
      punchlist_b_count: 0,
      itr_a_count: 0,
      itr_b_count: 0,
      itr_total_count: 0,
    }));
    onImportSystems(converted);
  };

  return (
    <>
      <div 
        className="w-48 flex flex-col border-r border-border bg-card overflow-hidden min-h-0 flex-shrink-0"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Header */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center gap-2 mb-3">
            <Layers className="w-4 h-4 text-muted-foreground" />
            <h3 className="font-semibold text-sm">Systems</h3>
          </div>

          {/* Search - always visible */}
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
            <Input
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-6 h-6 text-[10px] placeholder:text-[9px] placeholder:text-muted-foreground/50"
            />
          </div>
        </div>

        {/* Systems List - fills remaining height with vertical scroll only */}
        <ScrollArea className="flex-1 min-h-0 overflow-hidden">
          <div className="p-3 space-y-3">
            {/* Assigned Systems Section - only show when there are assigned systems */}
            {filteredAssigned.length > 0 && (
              <>
                <Collapsible 
                  open={expandedSections.assigned}
                  onOpenChange={() => toggleSection('assigned')}
                >
                  <CollapsibleTrigger className="flex items-center justify-between w-full p-2 rounded-md hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-2">
                      {expandedSections.assigned ? (
                        <ChevronDown className="w-4 h-4 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      )}
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 min-w-[18px] flex items-center justify-center">
                        {filteredAssigned.length}
                      </Badge>
                      <span className="text-xs text-muted-foreground">Assigned</span>
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="pt-2 overflow-hidden">
                    <div className="flex flex-col gap-1.5 overflow-hidden">
                    {showMapping ? (
                        // Group by VCR in delivery order when mapping is active
                        (() => {
                          // Build ordered groups preserving the delivery-order sort
                          const orderedGroups: { vcrCode: string; systems: P2ASystem[] }[] = [];
                          const seenCodes = new Set<string>();
                          filteredAssigned.forEach(s => {
                            const code = s.assigned_vcr_code || 'Unknown';
                            if (!seenCodes.has(code)) {
                              seenCodes.add(code);
                              orderedGroups.push({ vcrCode: code, systems: [] });
                            }
                            orderedGroups.find(g => g.vcrCode === code)!.systems.push(s);
                          });
                          return orderedGroups.map(({ vcrCode, systems: groupSystems }) => (
                            <div key={vcrCode}>
                              <span className="text-[8px] font-semibold text-muted-foreground uppercase tracking-wider px-0.5 mb-0.5 block">
                                {vcrCode}
                              </span>
                              <div className="flex flex-wrap gap-1.5">
                                {groupSystems.map(system => (
                                  <DraggableSystemCard
                                    key={system.id}
                                    system={system}
                                    compact
                                    onClick={() => setSelectedSystem(system)}
                                  />
                                ))}
                              </div>
                            </div>
                          ));
                        })()
                      ) : (
                        <div className="flex flex-wrap gap-1.5">
                          {filteredAssigned.map(system => (
                            <DraggableSystemCard
                              key={system.id}
                              system={system}
                              compact
                              onClick={() => setSelectedSystem(system)}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  </CollapsibleContent>
                </Collapsible>

                <Separator />
              </>
            )}

            {/* Unassigned Systems Section - Droppable */}
            <div className={cn(showMapping && "opacity-40 transition-opacity")}>
              <UnassignedSystemsDropZone
                systems={filteredUnassigned}
                isExpanded={expandedSections.unassigned}
                onToggle={() => toggleSection('unassigned')}
                onSystemClick={(system) => setSelectedSystem(system)}
              />
            </div>
          </div>
        </ScrollArea>

        {/* Add System Cards - Fixed at bottom, matching wizard's 3-card grid */}
        <div className="flex-shrink-0 h-[180px] px-3 py-2 border-t border-border bg-muted/30 flex flex-col justify-start gap-1.5">
          <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground px-0.5">
            Add Systems
          </span>
          <button
            onClick={() => setShowCMSModal(true)}
            className="group flex items-center gap-2 p-2 rounded-lg border border-border bg-card hover:bg-accent/50 hover:border-primary/30 hover:shadow-sm transition-all duration-200"
          >
            <div className="w-6 h-6 rounded-md bg-amber-500/10 flex items-center justify-center group-hover:bg-amber-500/20 transition-colors shrink-0">
              <Database className="h-3 w-3 text-amber-600" />
            </div>
            <div className="text-left min-w-0">
              <span className="font-medium text-[10px] block leading-tight">CMS Import</span>
              <span className="text-[8px] text-muted-foreground leading-tight">Sync from GoHub</span>
            </div>
          </button>
          <button
            onClick={() => setShowExcelModal(true)}
            className="group flex items-center gap-2 p-2 rounded-lg border border-border bg-card hover:bg-accent/50 hover:border-primary/30 hover:shadow-sm transition-all duration-200"
          >
            <div className="w-6 h-6 rounded-md bg-emerald-500/10 flex items-center justify-center group-hover:bg-emerald-500/20 transition-colors shrink-0">
              <Upload className="h-3 w-3 text-emerald-600" />
            </div>
            <div className="text-left min-w-0">
              <span className="font-medium text-[10px] block leading-tight">Upload Excel</span>
              <span className="text-[8px] text-muted-foreground leading-tight">Import spreadsheet</span>
            </div>
          </button>
          <button
            onClick={() => setShowAddManualModal(true)}
            className="group flex items-center gap-2 p-2 rounded-lg border border-border bg-card hover:bg-accent/50 hover:border-primary/30 hover:shadow-sm transition-all duration-200"
          >
            <div className="w-6 h-6 rounded-md bg-blue-500/10 flex items-center justify-center group-hover:bg-blue-500/20 transition-colors shrink-0">
              <Plus className="h-3 w-3 text-blue-600" />
            </div>
            <div className="text-left min-w-0">
              <span className="font-medium text-[10px] block leading-tight">Add Manually</span>
              <span className="text-[8px] text-muted-foreground leading-tight">Enter details</span>
            </div>
          </button>
        </div>
      </div>

      {/* Manual Add System Modal - wizard-style */}
      <WorkspaceAddSystemModal
        open={showAddManualModal}
        onOpenChange={setShowAddManualModal}
        onAddSystem={onAddSystem}
        handoverPlanId={handoverPlanId}
        plantCode={plantCode}
        projectCode={projectCode}
        isAdding={isAdding}
      />

      {/* Excel Upload Modal - wizard-style */}
      <WorkspaceExcelUploadModal
        open={showExcelModal}
        onOpenChange={setShowExcelModal}
        onImportSystems={onImportSystems}
        handoverPlanId={handoverPlanId}
        isImporting={isImporting}
      />

      {/* CMS Import Modal - reused from wizard */}
      <CMSImportModal
        open={showCMSModal}
        onOpenChange={setShowCMSModal}
        onImport={handleCMSImport}
        projectCode={projectCode}
      />

      {/* System Detail Overlay */}
      {selectedSystem && (
        <SystemDetailOverlay
          system={selectedSystem}
          open={!!selectedSystem}
          onOpenChange={(open) => !open && setSelectedSystem(null)}
          onUpdateSystem={onUpdateSystem}
          isUpdating={isUpdating}
        />
      )}
    </>
  );
};

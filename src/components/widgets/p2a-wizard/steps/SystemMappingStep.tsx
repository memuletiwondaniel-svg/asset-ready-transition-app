import React, { useState, useMemo } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Key, ArrowRight, ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { WizardSystem } from './SystemsImportStep';
import { WizardVCR } from './VCRCreationStep';

// Reuse the same VCR ID color palette from VCRCreationStep
const VCR_ID_HUES = [210, 260, 180, 320, 195, 280, 170, 300];

const getVCRIdStyle = (index: number) => {
  const hue = VCR_ID_HUES[index % VCR_ID_HUES.length];
  return {
    backgroundColor: `hsl(${hue}, 40%, 94%)`,
    color: `hsl(${hue}, 50%, 35%)`,
    borderColor: `hsl(${hue}, 35%, 88%)`,
  };
};

const getVCRHeaderStyle = (index: number, hasAssignments: boolean) => {
  const hue = VCR_ID_HUES[index % VCR_ID_HUES.length];
  if (hasAssignments) {
    return {
      backgroundColor: `hsl(${hue}, 30%, 96%)`,
      borderBottomColor: `hsl(${hue}, 25%, 90%)`,
    };
  }
  return {};
};

interface SystemMappingStepProps {
  systems: WizardSystem[];
  vcrs: WizardVCR[];
  mappings: Record<string, string[]>; // vcrId -> systemIds[]
  onMappingsChange: (mappings: Record<string, string[]>) => void;
}

export const SystemMappingStep: React.FC<SystemMappingStepProps> = ({
  systems,
  vcrs,
  mappings,
  onMappingsChange,
}) => {
  // Default all VCRs to collapsed
  const [collapsedVCRs, setCollapsedVCRs] = useState<Set<string>>(() => new Set(vcrs.map(v => v.id)));

  const toggleCollapse = (vcrId: string) => {
    setCollapsedVCRs(prev => {
      const next = new Set(prev);
      if (next.has(vcrId)) {
        next.delete(vcrId);
      } else {
        next.add(vcrId);
      }
      return next;
    });
  };

  const toggleMapping = (vcrId: string, systemId: string) => {
    const currentSystems = mappings[vcrId] || [];
    if (currentSystems.includes(systemId)) {
      // Unassign from this VCR
      onMappingsChange({
        ...mappings,
        [vcrId]: currentSystems.filter(id => id !== systemId),
      });
    } else {
      // Assign to this VCR (exclusive — remove from any other VCR first)
      const updated = { ...mappings };
      for (const key of Object.keys(updated)) {
        if (key !== vcrId) {
          updated[key] = (updated[key] || []).filter(id => id !== systemId);
        }
      }
      updated[vcrId] = [...currentSystems, systemId];
      onMappingsChange(updated);
    }
  };

  const getAssignedCount = (vcrId: string) => {
    return (mappings[vcrId] || []).length;
  };

  const getSystemOwnerVCR = (systemId: string): string | null => {
    for (const [vcrId, systemIds] of Object.entries(mappings)) {
      if (systemIds.includes(systemId)) return vcrId;
    }
    return null;
  };

  const isSystemAssigned = (systemId: string) => {
    return getSystemOwnerVCR(systemId) !== null;
  };

  const unassignedSystems = systems.filter(s => !isSystemAssigned(s.id));

  // Sort VCRs: those with assignments first
  const sortedVCRs = useMemo(() => {
    return [...vcrs].sort((a, b) => {
      const aCount = getAssignedCount(a.id);
      const bCount = getAssignedCount(b.id);
      if (aCount > 0 && bCount === 0) return -1;
      if (aCount === 0 && bCount > 0) return 1;
      return 0;
    });
  }, [vcrs, mappings]);

  if (systems.length === 0 || vcrs.length === 0) {
    return (
      <div className="p-4 text-center">
        <div className="py-8 text-muted-foreground">
          <ArrowRight className="h-8 w-8 mx-auto mb-2 opacity-40" />
          <p className="text-sm">
            {systems.length === 0 && vcrs.length === 0 
              ? "Add systems and VCRs first to create mappings"
              : systems.length === 0 
                ? "Add systems first to map them to VCRs"
                : "Create VCRs first to map systems to them"
            }
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 p-4 h-full">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium">Map Systems to VCRs</h3>
          <p className="text-xs text-muted-foreground">
            Click on each VCR to expand and select its systems
          </p>
        </div>
        <Badge variant="outline" className={cn(
          unassignedSystems.length > 0 && "bg-amber-50 text-amber-700 border-amber-200"
        )}>
          {unassignedSystems.length} unassigned
        </Badge>
      </div>

      <ScrollArea className="flex-1 min-h-0">
        <div className="space-y-3">
          {sortedVCRs.map((vcr) => {
            const originalIndex = vcrs.findIndex(v => v.id === vcr.id);
            const assignedCount = getAssignedCount(vcr.id);
            const hasAssignments = assignedCount > 0;
            const isCollapsed = collapsedVCRs.has(vcr.id);

            return (
              <div
                key={vcr.id}
                className={cn(
                  "border rounded-lg overflow-hidden transition-all",
                  hasAssignments && "border-primary/20 shadow-sm"
                )}
              >
                {/* VCR Header */}
                <div
                  className={cn(
                    "flex items-center gap-2 p-2.5 border-b cursor-pointer select-none transition-colors hover:bg-muted/50",
                    !hasAssignments && "bg-muted/30"
                  )}
                  style={hasAssignments ? getVCRHeaderStyle(originalIndex, true) : undefined}
                  onClick={() => toggleCollapse(vcr.id)}
                >
                  {isCollapsed ? (
                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  ) : (
                    <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  )}
                  <span className="font-medium text-sm">{vcr.name}</span>
                  <span
                    className="text-[10px] font-mono font-medium px-1.5 py-0.5 rounded border"
                    style={getVCRIdStyle(originalIndex)}
                  >
                    {vcr.code}
                  </span>
                  <Badge
                    variant="secondary"
                    className={cn(
                      "ml-auto text-[10px]",
                      hasAssignments && "bg-primary/10 text-primary"
                    )}
                  >
                    {assignedCount} systems
                  </Badge>
                </div>

                {/* System List - collapsible */}
                {!isCollapsed && (() => {
                  const vcrMappings = mappings[vcr.id] || [];
                  const selectedSystems = systems.filter(s => vcrMappings.includes(s.id));
                  const availableSystems = systems.filter(s => !vcrMappings.includes(s.id) && !getSystemOwnerVCR(s.id));

                  const renderSystem = (system: WizardSystem, isChecked: boolean) => (
                    <div
                      key={system.id}
                      className={cn(
                        "flex items-center gap-3 p-2 rounded cursor-pointer transition-colors",
                        isChecked 
                          ? "bg-primary/5 border border-primary/20" 
                          : "hover:bg-muted/50"
                      )}
                      onClick={() => toggleMapping(vcr.id, system.id)}
                    >
                      <Checkbox
                        checked={isChecked}
                        onCheckedChange={() => toggleMapping(vcr.id, system.id)}
                      />
                      <div className="flex-1 min-w-0">
                        <span className="text-sm">{system.name}</span>
                        <span className="text-xs text-muted-foreground ml-2 font-mono">
                          {system.system_id}
                        </span>
                      </div>
                      {system.is_hydrocarbon && (
                        <Badge variant="outline" className="text-[10px] bg-orange-50 text-orange-700 border-orange-200">
                          HC
                        </Badge>
                      )}
                    </div>
                  );

                  return (
                    <div className="p-2 space-y-2">
                      {selectedSystems.length > 0 && (
                        <div>
                          <p className="text-[10px] font-medium text-primary uppercase tracking-wider px-2 pb-1">
                            Assigned ({selectedSystems.length})
                          </p>
                          <div className="space-y-1">
                            {selectedSystems.map(s => renderSystem(s, true))}
                          </div>
                        </div>
                      )}
                      {availableSystems.length > 0 && (
                        <div>
                          {selectedSystems.length > 0 && (
                            <div className="border-t my-2" />
                          )}
                          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider px-2 pb-1">
                            Available ({availableSystems.length})
                          </p>
                          <div className="space-y-1">
                            {availableSystems.map(s => renderSystem(s, false))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            );
          })}
        </div>
      </ScrollArea>

      {unassignedSystems.length > 0 && (
        <div className="p-3 bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-800/50 rounded-lg shrink-0">
          <div className="text-xs text-amber-700 dark:text-amber-400">
            <strong>Note:</strong> {unassignedSystems.length} system{unassignedSystems.length !== 1 ? 's are' : ' is'} not assigned to any VCR:
            <span className="font-medium ml-1">
              {unassignedSystems.map(s => s.name).join(', ')}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

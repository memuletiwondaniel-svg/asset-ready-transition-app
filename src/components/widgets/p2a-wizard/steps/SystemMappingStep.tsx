import React, { useState, useMemo, useEffect } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { WizardSystem, WizardSubsystem } from './SystemsImportStep';
import { WizardVCR } from './VCRCreationStep';

// ── Mapping key helpers ──────────────────────────────────────
const SUB_SEP = '::sub::';

export const makeSubKey = (systemId: string, subSystemId: string) =>
  `${systemId}${SUB_SEP}${subSystemId}`;

export const isSubKey = (key: string) => key.includes(SUB_SEP);

export const parseSubKey = (key: string) => {
  const [systemId, subSystemId] = key.split(SUB_SEP);
  return { systemId, subSystemId };
};

/** For a system without subsystems → [system.id]. With subsystems → composite keys. */
const getMappableKeys = (system: WizardSystem): string[] => {
  if (system.subsystems && system.subsystems.length > 0) {
    return system.subsystems.map(sub => makeSubKey(system.id, sub.system_id));
  }
  return [system.id];
};

// ── VCR color palette (shared with VCRCreationStep) ──────────
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

// ── Props ────────────────────────────────────────────────────
interface SystemMappingStepProps {
  systems: WizardSystem[];
  vcrs: WizardVCR[];
  mappings: Record<string, string[]>; // vcrId -> mappingKeys[]
  onMappingsChange: (mappings: Record<string, string[]>) => void;
}

export const SystemMappingStep: React.FC<SystemMappingStepProps> = ({
  systems,
  vcrs,
  mappings,
  onMappingsChange,
}) => {
  const [collapsedVCRs, setCollapsedVCRs] = useState<Set<string>>(
    () => new Set(vcrs.map(v => v.id))
  );
  const [expandedSystems, setExpandedSystems] = useState<Set<string>>(new Set());

  // ── Valid mapping keys (derived from current systems) ─────
  const validKeys = useMemo(() => {
    return new Set(systems.flatMap(getMappableKeys));
  }, [systems]);

  // ── Auto-clean stale mapping entries on systems change ────
  useEffect(() => {
    let hasStale = false;
    const cleaned: Record<string, string[]> = {};
    for (const [vcrId, keys] of Object.entries(mappings)) {
      const valid = keys.filter(k => validKeys.has(k));
      cleaned[vcrId] = valid;
      if (valid.length !== keys.length) hasStale = true;
    }
    if (hasStale) {
      onMappingsChange(cleaned);
    }
  }, [validKeys]); // only re-run when the set of valid keys changes

  // ── VCR collapse ─────────────────────────────────────────
  const toggleVCRCollapse = (vcrId: string) => {
    setCollapsedVCRs(prev => {
      const next = new Set(prev);
      next.has(vcrId) ? next.delete(vcrId) : next.add(vcrId);
      return next;
    });
  };

  // ── System expand (for subsystems) ───────────────────────
  const toggleSystemExpand = (systemId: string) => {
    setExpandedSystems(prev => {
      const next = new Set(prev);
      next.has(systemId) ? next.delete(systemId) : next.add(systemId);
      return next;
    });
  };

  // ── All flat mapping keys across all VCRs ────────────────
  const allMappedKeys = useMemo(() => {
    const set = new Set<string>();
    Object.values(mappings).forEach(keys => keys.forEach(k => set.add(k)));
    return set;
  }, [mappings]);

  // ── Owner lookup ─────────────────────────────────────────
  const getKeyOwnerVCR = (key: string): string | null => {
    for (const [vcrId, keys] of Object.entries(mappings)) {
      if (keys.includes(key)) return vcrId;
    }
    return null;
  };

  // ── Toggle a single mapping key (exclusive across VCRs) ──
  const toggleKey = (vcrId: string, key: string) => {
    const current = mappings[vcrId] || [];
    if (current.includes(key)) {
      // Unassign from this VCR
      onMappingsChange({
        ...mappings,
        [vcrId]: current.filter(k => k !== key),
      });
    } else {
      // Assign: remove from any other VCR first (exclusive)
      const updated = { ...mappings };
      for (const vid of Object.keys(updated)) {
        if (vid !== vcrId) {
          updated[vid] = (updated[vid] || []).filter(k => k !== key);
        }
      }
      updated[vcrId] = [...current, key];
      onMappingsChange(updated);
    }
  };

  // ── Toggle ALL subsystem keys for a parent system ────────
  const toggleParentSystem = (vcrId: string, system: WizardSystem) => {
    const subKeys = system.subsystems!.map(sub => makeSubKey(system.id, sub.system_id));
    // Only consider keys that are either unmapped or mapped to THIS VCR (skip owned-elsewhere)
    const availableKeys = subKeys.filter(k => {
      const owner = getKeyOwnerVCR(k);
      return !owner || owner === vcrId;
    });
    if (availableKeys.length === 0) return;

    const current = mappings[vcrId] || [];
    const assignedToThisVCR = availableKeys.filter(k => current.includes(k));
    const allAssigned = assignedToThisVCR.length === availableKeys.length;

    const updated = { ...mappings };

    if (allAssigned) {
      // Unassign all available from this VCR
      updated[vcrId] = current.filter(k => !availableKeys.includes(k));
    } else {
      // Assign all available to this VCR
      const existing = new Set(updated[vcrId] || []);
      availableKeys.forEach(k => existing.add(k));
      updated[vcrId] = Array.from(existing);
    }
    onMappingsChange(updated);
  };

  // ── Count helpers ────────────────────────────────────────
  const getAssignedCount = (vcrId: string) => (mappings[vcrId] || []).length;

  /** Total mappable items not assigned to any VCR */
  const totalUnassigned = useMemo(() => {
    const allKeys = systems.flatMap(getMappableKeys);
    return allKeys.filter(k => !allMappedKeys.has(k)).length;
  }, [systems, allMappedKeys]);

  // ── Sort VCRs: those with assignments first ──────────────
  const sortedVCRs = useMemo(() => {
    return [...vcrs].sort((a, b) => {
      const aCount = getAssignedCount(a.id);
      const bCount = getAssignedCount(b.id);
      if (aCount > 0 && bCount === 0) return -1;
      if (aCount === 0 && bCount > 0) return 1;
      return 0;
    });
  }, [vcrs, mappings]);

  // ── Empty state ──────────────────────────────────────────
  if (systems.length === 0 || vcrs.length === 0) {
    return (
      <div className="p-4 text-center">
        <div className="py-8 text-muted-foreground">
          <ArrowRight className="h-8 w-8 mx-auto mb-2 opacity-40" />
          <p className="text-sm">
            {systems.length === 0 && vcrs.length === 0
              ? 'Add systems and VCRs first to create mappings'
              : systems.length === 0
                ? 'Add systems first to map them to VCRs'
                : 'Create VCRs first to map systems to them'}
          </p>
        </div>
      </div>
    );
  }

  // ── Render helpers ───────────────────────────────────────
  /** Find the VCR name/code that owns a given key (for labelling) */
  const getOwnerVCRLabel = (key: string, excludeVcrId: string): string | null => {
    const ownerId = getKeyOwnerVCR(key);
    if (!ownerId || ownerId === excludeVcrId) return null;
    const ownerVcr = vcrs.find(v => v.id === ownerId);
    return ownerVcr ? ownerVcr.code : null;
  };

  const renderSubsystemRow = (
    system: WizardSystem,
    sub: WizardSubsystem,
    vcrId: string,
    isChecked: boolean,
  ) => {
    const key = makeSubKey(system.id, sub.system_id);
    const ownerLabel = getOwnerVCRLabel(key, vcrId);
    const isOwnedElsewhere = ownerLabel !== null;

    if (isOwnedElsewhere) {
      // Read-only row: mapped to a different VCR
      return (
        <div
          key={key}
          className="flex items-center gap-2.5 py-1 px-2 rounded ml-5 opacity-50"
        >
          <span className="h-3.5 w-3.5 shrink-0" />
          <span className="text-[10px] font-mono text-muted-foreground shrink-0">
            {sub.system_id}
          </span>
          <span className="text-[11px] truncate flex-1 text-muted-foreground">
            {sub.name}
          </span>
          <span className="text-[9px] font-mono text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded border shrink-0">
            → {ownerLabel}
          </span>
        </div>
      );
    }

    return (
      <div
        key={key}
        className={cn(
          'flex items-center gap-2.5 py-1 px-2 rounded cursor-pointer transition-colors ml-5',
          isChecked
            ? 'bg-primary/5 border border-primary/15'
            : 'hover:bg-muted/40',
        )}
        onClick={() => toggleKey(vcrId, key)}
      >
        <Checkbox
          checked={isChecked}
          onCheckedChange={() => toggleKey(vcrId, key)}
          className="h-3.5 w-3.5"
        />
        <span className="text-[10px] font-mono text-muted-foreground shrink-0">
          {sub.system_id}
        </span>
        <span className="text-[11px] truncate flex-1 text-muted-foreground">
          {sub.name}
        </span>
      </div>
    );
  };

  const renderSystemRow = (
    system: WizardSystem,
    vcrId: string,
    vcrMappings: string[],
  ) => {
    const hasSubsystems = system.subsystems && system.subsystems.length > 0;
    const isExpanded = expandedSystems.has(`${vcrId}::${system.id}`);

    if (!hasSubsystems) {
      // Simple system — direct checkbox (current behavior)
      const isChecked = vcrMappings.includes(system.id);
      return (
        <div key={system.id}>
          <div
            className={cn(
              'flex items-center gap-2 p-2 rounded cursor-pointer transition-colors',
              isChecked
                ? 'bg-primary/5 border border-primary/20'
                : 'hover:bg-muted/50',
            )}
            onClick={() => toggleKey(vcrId, system.id)}
          >
            {/* Invisible spacer matching the chevron width in expandable rows */}
            <span className="h-3.5 w-3.5 shrink-0" />
            <Checkbox
              checked={isChecked}
              onCheckedChange={() => toggleKey(vcrId, system.id)}
            />
            <div className="flex-1 min-w-0">
              <span className="text-sm">{system.name}</span>
              <span className="text-xs text-muted-foreground ml-2 font-mono">
                {system.system_id}
              </span>
            </div>
            {system.is_hydrocarbon && (
              <Badge
                variant="outline"
                className="text-[10px] bg-orange-50 text-orange-700 border-orange-200"
              >
                HC
              </Badge>
            )}
          </div>
        </div>
      );
    }

    // System with subsystems — expandable
    const subKeys = system.subsystems!.map(sub =>
      makeSubKey(system.id, sub.system_id),
    );
    const assignedHere = subKeys.filter(k => vcrMappings.includes(k));
    // Only count keys that are selectable (unmapped or mapped here)
    const selectableKeys = subKeys.filter(k => {
      const owner = getKeyOwnerVCR(k);
      return !owner || owner === vcrId;
    });
    const allChecked = selectableKeys.length > 0 && assignedHere.length === selectableKeys.length;
    const someChecked = assignedHere.length > 0 && !allChecked;

    return (
      <div key={system.id} className="space-y-0.5">
        <div
          className={cn(
            'flex items-center gap-2 p-2 rounded cursor-pointer transition-colors',
            assignedHere.length > 0
              ? 'bg-primary/5 border border-primary/20'
              : 'hover:bg-muted/50',
          )}
          onClick={() => toggleSystemExpand(`${vcrId}::${system.id}`)}
        >
          {isExpanded ? (
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          )}
          <Checkbox
            checked={allChecked ? true : someChecked ? 'indeterminate' : false}
            onCheckedChange={(e) => {
              e; // consume
              toggleParentSystem(vcrId, system);
            }}
            onClick={(e) => e.stopPropagation()}
          />
          <div className="flex-1 min-w-0">
            <span className="text-sm">{system.name}</span>
            <span className="text-xs text-muted-foreground ml-2 font-mono">
              {system.system_id}
            </span>
          </div>
          <span className="text-[10px] text-muted-foreground tabular-nums shrink-0">
            {assignedHere.length}/{selectableKeys.length}
          </span>
          {system.is_hydrocarbon && (
            <Badge
              variant="outline"
              className="text-[10px] bg-orange-50 text-orange-700 border-orange-200"
            >
              HC
            </Badge>
          )}
        </div>

        {/* Subsystem rows */}
        {isExpanded && (
          <div className="border-l-2 border-muted ml-3 pl-1 space-y-0.5 py-0.5">
            {system.subsystems!.map(sub => {
              const key = makeSubKey(system.id, sub.system_id);
              const isChecked = vcrMappings.includes(key);
              return renderSubsystemRow(system, sub, vcrId, isChecked);
            })}
          </div>
        )}
      </div>
    );
  };

  // ── Partition systems for a given VCR ────────────────────
  const getPartitionedSystems = (vcrId: string) => {
    const vcrMappings = mappings[vcrId] || [];

    const assigned: WizardSystem[] = [];
    const available: WizardSystem[] = [];

    for (const system of systems) {
      const keys = getMappableKeys(system);
      const hasAnyHere = keys.some(k => vcrMappings.includes(k));
      const hasAnyAvailable = keys.some(k => !allMappedKeys.has(k));

      if (hasAnyHere) {
        assigned.push(system);
      }
      // Also show in available if some subsystems are still unmapped
      if (hasAnyAvailable && !hasAnyHere) {
        available.push(system);
      }
    }

    return { assigned, available, vcrMappings };
  };

  // ── Main render ──────────────────────────────────────────
  return (
    <div className="flex flex-col gap-3 p-4 h-full">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium">Map Systems to VCRs</h3>
          <p className="text-xs text-muted-foreground">
            Expand systems to map individual subsystems
          </p>
        </div>
        <Badge
          variant="outline"
          className={cn(
            totalUnassigned > 0 &&
              'bg-amber-50 text-amber-700 border-amber-200',
          )}
        >
          {totalUnassigned} unassigned
        </Badge>
      </div>

      <ScrollArea className="flex-1 min-h-0">
        <div className="space-y-3">
          {sortedVCRs.map(vcr => {
            const originalIndex = vcrs.findIndex(v => v.id === vcr.id);
            const assignedCount = getAssignedCount(vcr.id);
            const hasAssignments = assignedCount > 0;
            const isCollapsed = collapsedVCRs.has(vcr.id);
            const { assigned, available, vcrMappings } = getPartitionedSystems(vcr.id);

            return (
              <div
                key={vcr.id}
                className={cn(
                  'border rounded-lg overflow-hidden transition-all',
                  hasAssignments && 'border-primary/20 shadow-sm',
                )}
              >
                {/* VCR Header */}
                <div
                  className={cn(
                    'flex items-center gap-2 p-2.5 border-b cursor-pointer select-none transition-colors hover:bg-muted/50',
                    !hasAssignments && 'bg-muted/30',
                  )}
                  style={
                    hasAssignments
                      ? getVCRHeaderStyle(originalIndex, true)
                      : undefined
                  }
                  onClick={() => toggleVCRCollapse(vcr.id)}
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
                      'ml-auto text-[10px]',
                      hasAssignments && 'bg-primary/10 text-primary',
                    )}
                  >
                    {assignedCount} mapped
                  </Badge>
                </div>

                {/* System List — collapsible */}
                {!isCollapsed && (
                  <div className="p-2 space-y-2">
                    {assigned.length > 0 && (
                      <div>
                        <p className="text-[10px] font-medium text-primary uppercase tracking-wider px-2 pb-1">
                          Assigned ({assigned.length})
                        </p>
                        <div className="space-y-1">
                          {assigned.map(s =>
                            renderSystemRow(s, vcr.id, vcrMappings),
                          )}
                        </div>
                      </div>
                    )}
                    {available.length > 0 && (
                      <div>
                        {assigned.length > 0 && (
                          <div className="border-t my-2" />
                        )}
                        <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider px-2 pb-1">
                          Available ({available.length})
                        </p>
                        <div className="space-y-1">
                          {available.map(s =>
                            renderSystemRow(s, vcr.id, vcrMappings),
                          )}
                        </div>
                      </div>
                    )}
                    {assigned.length === 0 && available.length === 0 && (
                      <p className="text-xs text-muted-foreground text-center py-2">
                        All systems are assigned to other VCRs
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </ScrollArea>

      {totalUnassigned > 0 && (
        <div className="p-3 bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-800/50 rounded-lg shrink-0">
          <div className="text-xs text-amber-700 dark:text-amber-400">
            <strong>Note:</strong> {totalUnassigned} item{totalUnassigned !== 1 ? 's are' : ' is'} not assigned to any VCR.
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  ChevronDown,
  ChevronRight,
  ArrowRight,
  Check,
  X,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { WizardSystem, WizardSubsystem } from './SystemsImportStep';
import { WizardVCR } from './VCRCreationStep';
import { shortVCRCode } from './phases/vcrDisplayUtils';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

// ── Mapping key helpers ──────────────────────────────────────
const SUB_SEP = '::sub::';

export const makeSubKey = (systemId: string, subSystemId: string) =>
  `${systemId}${SUB_SEP}${subSystemId}`;

export const isSubKey = (key: string) => key.includes(SUB_SEP);

export const parseSubKey = (key: string) => {
  const [systemId, subSystemId] = key.split(SUB_SEP);
  return { systemId, subSystemId };
};

const getMappableKeys = (system: WizardSystem): string[] => {
  if (system.subsystems && system.subsystems.length > 0) {
    return system.subsystems.map(sub => makeSubKey(system.id, sub.system_id));
  }
  return [system.id];
};

// ── VCR color palette ────────────────────────────────────────
const VCR_COLORS = [
  { bg: 'hsl(210, 85%, 95%)', text: 'hsl(210, 60%, 40%)', border: 'hsl(210, 50%, 85%)', dot: 'hsl(210, 65%, 55%)' },
  { bg: 'hsl(260, 75%, 95%)', text: 'hsl(260, 50%, 40%)', border: 'hsl(260, 40%, 85%)', dot: 'hsl(260, 55%, 55%)' },
  { bg: 'hsl(160, 60%, 93%)', text: 'hsl(160, 50%, 32%)', border: 'hsl(160, 40%, 82%)', dot: 'hsl(160, 55%, 45%)' },
  { bg: 'hsl(340, 70%, 95%)', text: 'hsl(340, 50%, 38%)', border: 'hsl(340, 40%, 85%)', dot: 'hsl(340, 55%, 55%)' },
  { bg: 'hsl(30, 80%, 94%)', text: 'hsl(30, 60%, 35%)', border: 'hsl(30, 50%, 84%)', dot: 'hsl(30, 65%, 50%)' },
  { bg: 'hsl(195, 70%, 94%)', text: 'hsl(195, 55%, 35%)', border: 'hsl(195, 45%, 83%)', dot: 'hsl(195, 60%, 50%)' },
  { bg: 'hsl(280, 65%, 95%)', text: 'hsl(280, 45%, 40%)', border: 'hsl(280, 35%, 85%)', dot: 'hsl(280, 50%, 55%)' },
  { bg: 'hsl(140, 55%, 93%)', text: 'hsl(140, 45%, 30%)', border: 'hsl(140, 35%, 82%)', dot: 'hsl(140, 50%, 42%)' },
];

const getVCRColor = (index: number) => VCR_COLORS[index % VCR_COLORS.length];

// ── Props ────────────────────────────────────────────────────
interface SystemMappingStepProps {
  systems: WizardSystem[];
  vcrs: WizardVCR[];
  mappings: Record<string, string[]>;
  onMappingsChange: (mappings: Record<string, string[]>) => void;
}

// ── VCR Pill Selector ────────────────────────────────────────
const VCRPillSelector: React.FC<{
  vcrs: WizardVCR[];
  currentVcrId: string | null;
  onSelect: (vcrId: string | null) => void;
  vcrOriginalIndices: Map<string, number>;
}> = ({ vcrs, currentVcrId, onSelect, vcrOriginalIndices }) => {
  const [open, setOpen] = useState(false);
  const currentVcr = vcrs.find(v => v.id === currentVcrId);
  const colorIdx = currentVcr ? (vcrOriginalIndices.get(currentVcr.id) ?? 0) : 0;
  const color = currentVcr ? getVCRColor(colorIdx) : null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className={cn(
            'inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium transition-all w-[180px]',
            'border hover:shadow-sm focus:outline-none focus:ring-1 focus:ring-primary/30',
            currentVcr
              ? 'cursor-pointer'
              : 'border-dashed border-muted-foreground/30 text-muted-foreground hover:border-primary/40 hover:text-primary cursor-pointer',
          )}
          style={currentVcr && color ? {
            backgroundColor: color.bg,
            color: color.text,
            borderColor: color.border,
          } : undefined}
        >
          {currentVcr ? (
            <>
              <span
                className="inline-flex items-center px-1 py-0.5 rounded text-[9px] font-medium shrink-0 opacity-50"
                style={{ color: color?.text }}
              >
                {shortVCRCode(currentVcr.code)}
              </span>
              <span className="truncate max-w-[100px]">{currentVcr.name}</span>
            </>
          ) : (
            <span>Assign VCR</span>
          )}
          <ChevronDown className="h-3 w-3 shrink-0 opacity-60" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-48 p-1"
        align="end"
        sideOffset={4}
        onClick={(e) => e.stopPropagation()}
      >
        {vcrs.map(vcr => {
          const idx = vcrOriginalIndices.get(vcr.id) ?? 0;
          const c = getVCRColor(idx);
          const isSelected = vcr.id === currentVcrId;
          return (
            <button
              key={vcr.id}
              className={cn(
                'w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs transition-colors text-left',
                isSelected ? 'bg-primary/8' : 'hover:bg-muted/60',
              )}
              onClick={() => {
                onSelect(isSelected ? null : vcr.id);
                setOpen(false);
              }}
            >
              <span
                className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold shrink-0"
                style={{ backgroundColor: c.bg, color: c.text }}
              >
                {shortVCRCode(vcr.code)}
              </span>
              <span className="flex-1 truncate font-medium">{vcr.name}</span>
              {isSelected && <Check className="h-3 w-3 text-primary shrink-0" />}
            </button>
          );
        })}
        {currentVcrId && (
          <>
            <div className="border-t my-1" />
            <button
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs text-destructive hover:bg-destructive/8 transition-colors"
              onClick={() => {
                onSelect(null);
                setOpen(false);
              }}
            >
              <X className="h-3 w-3" />
              <span>Remove assignment</span>
            </button>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
};

// ── Main Component ───────────────────────────────────────────
export const SystemMappingStep: React.FC<SystemMappingStepProps> = ({
  systems,
  vcrs,
  mappings,
  onMappingsChange,
}) => {
  const [expandedSystems, setExpandedSystems] = useState<Set<string>>(new Set());
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const systemRowRefs = React.useRef<Map<string, HTMLDivElement>>(new Map());
  const prevMappedCountRef = React.useRef<number>(0);

  // ── Valid mapping keys ─────────────────────────────────────
  const validKeys = useMemo(
    () => new Set(systems.flatMap(getMappableKeys)),
    [systems],
  );

  // ── Auto-clean stale mappings ──────────────────────────────
  useEffect(() => {
    let hasStale = false;
    const cleaned: Record<string, string[]> = {};
    for (const [vcrId, keys] of Object.entries(mappings)) {
      const valid = keys.filter(k => validKeys.has(k));
      cleaned[vcrId] = valid;
      if (valid.length !== keys.length) hasStale = true;
    }
    if (hasStale) onMappingsChange(cleaned);
  }, [validKeys]);

  // ── VCR original index map ─────────────────────────────────
  const vcrOriginalIndices = useMemo(() => {
    const map = new Map<string, number>();
    vcrs.forEach((v, i) => map.set(v.id, i));
    return map;
  }, [vcrs]);

  // ── Ownership lookup ───────────────────────────────────────
  const keyOwnerMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const [vcrId, keys] of Object.entries(mappings)) {
      keys.forEach(k => map.set(k, vcrId));
    }
    return map;
  }, [mappings]);

  const getKeyOwner = useCallback(
    (key: string) => keyOwnerMap.get(key) ?? null,
    [keyOwnerMap],
  );

  // ── Counts ─────────────────────────────────────────────────
  const totalMappable = useMemo(() => validKeys.size, [validKeys]);
  const totalMapped = useMemo(() => keyOwnerMap.size, [keyOwnerMap]);
  const totalUnassigned = totalMappable - totalMapped;

  const vcrCounts = useMemo(() => {
    const counts = new Map<string, number>();
    vcrs.forEach(v => counts.set(v.id, (mappings[v.id] || []).length));
    return counts;
  }, [vcrs, mappings]);

  // ── Assignment logic ───────────────────────────────────────
  const assignKey = useCallback(
    (key: string, vcrId: string | null) => {
      const updated = { ...mappings };
      // Remove from any existing VCR
      for (const vid of Object.keys(updated)) {
        updated[vid] = (updated[vid] || []).filter(k => k !== key);
      }
      // Assign to new VCR
      if (vcrId) {
        updated[vcrId] = [...(updated[vcrId] || []), key];
      }
      onMappingsChange(updated);
    },
    [mappings, onMappingsChange],
  );

  /** Assign all mappable keys of a system to a VCR */
  const assignSystemToVCR = useCallback(
    (system: WizardSystem, vcrId: string | null) => {
      const keys = getMappableKeys(system);
      const updated = { ...mappings };
      // Remove all keys from any VCR
      for (const vid of Object.keys(updated)) {
        updated[vid] = (updated[vid] || []).filter(k => !keys.includes(k));
      }
      // Assign to new VCR
      if (vcrId) {
        updated[vcrId] = [...(updated[vcrId] || []), ...keys];
      }
      onMappingsChange(updated);
    },
    [mappings, onMappingsChange],
  );

  // ── Auto-assign (round-robin unassigned to VCRs) ───────────
  const handleAutoAssign = useCallback(() => {
    if (vcrs.length === 0) return;
    const allKeys = systems.flatMap(getMappableKeys);
    const unassigned = allKeys.filter(k => !keyOwnerMap.has(k));
    if (unassigned.length === 0) return;

    const updated = { ...mappings };
    unassigned.forEach((key, i) => {
      const vcrId = vcrs[i % vcrs.length].id;
      updated[vcrId] = [...(updated[vcrId] || []), key];
    });
    onMappingsChange(updated);
  }, [systems, vcrs, mappings, keyOwnerMap, onMappingsChange]);

  // ── Toggle expand ──────────────────────────────────────────
  const toggleExpand = (systemId: string) => {
    setExpandedSystems(prev => {
      const next = new Set(prev);
      next.has(systemId) ? next.delete(systemId) : next.add(systemId);
      return next;
    });
  };

  // ── Filtering ──────────────────────────────────────────────
  // ── Sort systems by VCR group (chip order), unassigned last ──
  const sortedSystems = useMemo(() => {
    // Build VCR order map from vcrs array (matches chip order)
    const vcrOrder = new Map<string, number>();
    vcrs.forEach((v, i) => vcrOrder.set(v.id, i));

    const getSystemSortKey = (system: WizardSystem): number => {
      const keys = getMappableKeys(system);
      // Find the first assigned VCR for this system
      for (const k of keys) {
        const owner = keyOwnerMap.get(k);
        if (owner && vcrOrder.has(owner)) {
          return vcrOrder.get(owner)!;
        }
      }
      // Unassigned systems go to the end
      return vcrs.length;
    };

    return [...systems].sort((a, b) => {
      const aKey = getSystemSortKey(a);
      const bKey = getSystemSortKey(b);
      if (aKey !== bKey) return aKey - bKey;
      // Preserve original order within same group
      return systems.indexOf(a) - systems.indexOf(b);
    });
  }, [systems, vcrs, keyOwnerMap]);

  const filteredSystems = useMemo(() => {
    if (!activeFilter) return sortedSystems;
    if (activeFilter === 'unassigned') {
      return sortedSystems.filter(s => {
        const keys = getMappableKeys(s);
        return keys.some(k => !keyOwnerMap.has(k));
      });
    }
    // Filter to systems assigned to a specific VCR
    const vcrKeys = new Set(mappings[activeFilter] || []);
    return sortedSystems.filter(s => {
      const keys = getMappableKeys(s);
      return keys.some(k => vcrKeys.has(k));
    });
  }, [sortedSystems, activeFilter, keyOwnerMap, mappings]);

  // ── Auto-scroll to show unassigned systems after assignment ──
  useEffect(() => {
    const currentMapped = keyOwnerMap.size;
    if (currentMapped > prevMappedCountRef.current && activeFilter === null) {
      // Find the first two unassigned systems in the sorted order
      const unassignedSystems = sortedSystems.filter(s => {
        const keys = getMappableKeys(s);
        return keys.some(k => !keyOwnerMap.has(k));
      });
      // Scroll to show the 2nd unassigned system (so at least 2 are visible)
      const target = unassignedSystems[Math.min(1, unassignedSystems.length - 1)];
      if (target) {
        const el = systemRowRefs.current.get(target.id);
        if (el) {
          requestAnimationFrame(() => {
            el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          });
        }
      }
    }
    prevMappedCountRef.current = currentMapped;
  }, [keyOwnerMap, sortedSystems, activeFilter]);

  // ── Get system-level VCR owner (for systems without subsystems, or where all subs are same VCR) ──
  const getSystemOwner = useCallback(
    (system: WizardSystem): string | null => {
      const keys = getMappableKeys(system);
      if (keys.length === 0) return null;
      const owners = new Set(keys.map(k => getKeyOwner(k)).filter(Boolean));
      if (owners.size === 1) return [...owners][0] as string;
      return null; // mixed or unassigned
    },
    [getKeyOwner],
  );

  // ── Empty state ────────────────────────────────────────────
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

  return (
    <div className="flex flex-col gap-3 p-4 h-full">
      {/* ── Header ────────────────────────────────────────── */}
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h3 className="text-sm font-medium">Map Systems to VCRs</h3>
          <p className="text-xs text-muted-foreground">
            Assign each system or subsystem to a VCR
          </p>
        </div>
        {totalUnassigned > 0 && (
          <Button
            variant="outline"
            size="sm"
            className="text-xs gap-1.5 h-7"
            onClick={handleAutoAssign}
          >
            <Zap className="h-3 w-3" />
            Auto-assign
          </Button>
        )}
      </div>

      {/* ── VCR Filter Chips ──────────────────────────────── */}
      <div className="flex flex-wrap gap-1.5 shrink-0">
        <button
          className={cn(
            'px-2 py-1 rounded-md text-[11px] font-medium border transition-all',
            !activeFilter
              ? 'bg-foreground text-background border-foreground'
              : 'bg-transparent text-muted-foreground border-border hover:border-foreground/30',
          )}
          onClick={() => setActiveFilter(null)}
        >
          All ({totalMappable})
        </button>
        <button
          className={cn(
            'px-2 py-1 rounded-md text-[11px] font-medium border transition-all',
            activeFilter === 'unassigned'
              ? 'bg-foreground text-background border-foreground'
              : 'bg-transparent text-muted-foreground border-border hover:border-foreground/30',
          )}
          onClick={() => setActiveFilter('unassigned')}
        >
          Unassigned ({totalUnassigned})
        </button>
        {vcrs.map(vcr => {
          const idx = vcrOriginalIndices.get(vcr.id) ?? 0;
          const c = getVCRColor(idx);
          const count = vcrCounts.get(vcr.id) ?? 0;
          const isActive = activeFilter === vcr.id;
          return (
            <button
              key={vcr.id}
              className={cn(
                'inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-medium border transition-all',
                isActive ? 'shadow-sm' : 'hover:shadow-sm',
              )}
              style={{
                backgroundColor: isActive ? c.dot : c.bg,
                color: isActive ? '#fff' : c.text,
                borderColor: isActive ? c.dot : c.border,
              }}
              onClick={() => setActiveFilter(isActive ? null : vcr.id)}
            >
              {vcr.name}
              <span className="opacity-70">{count}</span>
            </button>
          );
        })}
      </div>

      {/* ── Progress Bar ──────────────────────────────────── */}
      <div className="shrink-0">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] text-muted-foreground">
            {totalMapped} of {totalMappable} mapped
          </span>
          <span className="text-[10px] font-medium tabular-nums">
            {totalMappable > 0 ? Math.round((totalMapped / totalMappable) * 100) : 0}%
          </span>
        </div>
        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-primary transition-all duration-300"
            style={{ width: `${totalMappable > 0 ? (totalMapped / totalMappable) * 100 : 0}%` }}
          />
        </div>
      </div>

      {/* ── System List ───────────────────────────────────── */}
      <ScrollArea className="flex-1 min-h-0">
        <div className="space-y-1">
          {filteredSystems.map(system => {
            const hasSubsystems = system.subsystems && system.subsystems.length > 0;
            const isExpanded = expandedSystems.has(system.id);
            const systemOwner = getSystemOwner(system);
            const keys = getMappableKeys(system);
            const mappedCount = keys.filter(k => keyOwnerMap.has(k)).length;

            return (
              <div
                key={system.id}
                ref={(el) => {
                  if (el) systemRowRefs.current.set(system.id, el);
                  else systemRowRefs.current.delete(system.id);
                }}
              >
                {/* System Row */}
                <div
                  className={cn(
                    'flex items-center gap-2 px-3 py-2 rounded-lg transition-colors group',
                    hasSubsystems ? 'cursor-pointer' : '',
                    'hover:bg-muted/50',
                  )}
                  onClick={hasSubsystems ? () => toggleExpand(system.id) : undefined}
                >
                  {/* Expand chevron */}
                  {hasSubsystems ? (
                    isExpanded ? (
                      <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    ) : (
                      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    )
                  ) : (
                    <span className="w-3.5 shrink-0" />
                  )}

                  {/* System info */}
                  <div className="flex-1 min-w-0 flex items-center gap-2">
                    <span className="text-sm font-medium truncate">{system.name}</span>
                    {system.is_hydrocarbon && (
                      <span className="text-[9px] font-semibold px-1 py-0.5 rounded bg-orange-100 text-orange-700 border border-orange-200 shrink-0">
                        HC
                      </span>
                    )}
                    {hasSubsystems && (
                      <span className="text-[10px] text-muted-foreground tabular-nums shrink-0">
                        {mappedCount}/{keys.length}
                      </span>
                    )}
                  </div>

                  {/* VCR Assignment – only for leaf systems or fully-assigned parent */}
                  {!hasSubsystems ? (
                    <div onClick={e => e.stopPropagation()}>
                      <VCRPillSelector
                        vcrs={vcrs}
                        currentVcrId={systemOwner}
                        onSelect={(vcrId) => assignKey(system.id, vcrId)}
                        vcrOriginalIndices={vcrOriginalIndices}
                      />
                    </div>
                  ) : systemOwner ? (
                    <div onClick={e => e.stopPropagation()}>
                      <VCRPillSelector
                        vcrs={vcrs}
                        currentVcrId={systemOwner}
                        onSelect={(vcrId) => assignSystemToVCR(system, vcrId)}
                        vcrOriginalIndices={vcrOriginalIndices}
                      />
                    </div>
                  ) : mappedCount > 0 ? (
                    <span className="text-[10px] text-muted-foreground italic">Mixed</span>
                  ) : (
                    <div onClick={e => e.stopPropagation()}>
                      <VCRPillSelector
                        vcrs={vcrs}
                        currentVcrId={null}
                        onSelect={(vcrId) => assignSystemToVCR(system, vcrId)}
                        vcrOriginalIndices={vcrOriginalIndices}
                      />
                    </div>
                  )}
                </div>

                {/* Subsystem rows */}
                {hasSubsystems && isExpanded && (
                  <div className="ml-6 border-l-2 border-muted pl-2 space-y-0.5 py-0.5">
                    {system.subsystems!.map(sub => {
                      const key = makeSubKey(system.id, sub.system_id);
                      const subOwner = getKeyOwner(key);
                      return (
                        <div
                          key={key}
                          className="flex items-center gap-2 px-2 py-1.5 rounded transition-colors hover:bg-muted/40"
                        >
                          <span className="w-3.5 shrink-0" />
                          <div className="flex-1 min-w-0 flex items-center gap-2">
                            <span className="text-xs truncate text-muted-foreground">
                              {sub.name}
                            </span>
                            <span className="text-[10px] font-mono text-muted-foreground/60 shrink-0">
                              {sub.system_id}
                            </span>
                          </div>
                          <VCRPillSelector
                            vcrs={vcrs}
                            currentVcrId={subOwner}
                            onSelect={(vcrId) => assignKey(key, vcrId)}
                            vcrOriginalIndices={vcrOriginalIndices}
                          />
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}

          {filteredSystems.length === 0 && (
            <div className="text-center py-6 text-xs text-muted-foreground">
              No systems match the current filter
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};

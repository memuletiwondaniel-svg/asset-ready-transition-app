import React, { useState, useMemo } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import {
  ChevronDown,
  ChevronRight,
  Pencil,
  Check,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { WizardVCR } from '../VCRCreationStep';
import { WizardPhase } from '../PhasesStep';
import { WizardSystem, WizardSubsystem } from '../SystemsImportStep';
import { getVCRIdStyle } from './DraggableVCRChip';
import { shortVCRCode } from './vcrDisplayUtils';

const SUB_SEP = '::sub::';
const makeSubKey = (systemId: string, subSystemId: string) =>
  `${systemId}${SUB_SEP}${subSystemId}`;

const getMappableKeys = (system: WizardSystem): string[] => {
  if (system.subsystems && system.subsystems.length > 0) {
    return system.subsystems.map(sub => makeSubKey(system.id, sub.system_id));
  }
  return [system.id];
};

interface VCREditOverlayProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vcr: WizardVCR;
  vcrIndex: number;
  phases: WizardPhase[];
  systems: WizardSystem[];
  mappings: Record<string, string[]>;
  vcrPhaseAssignments: Record<string, string>;
  onVCRUpdate: (id: string, updates: Partial<WizardVCR>) => void;
  onPhaseAssign: (vcrId: string, phaseId: string | null) => void;
  onMappingsChange: (mappings: Record<string, string[]>) => void;
}

export const VCREditOverlay: React.FC<VCREditOverlayProps> = ({
  open,
  onOpenChange,
  vcr,
  vcrIndex,
  phases,
  systems,
  mappings,
  vcrPhaseAssignments,
  onVCRUpdate,
  onPhaseAssign,
  onMappingsChange,
}) => {
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState(vcr.name);
  const [expandedSystems, setExpandedSystems] = useState<Set<string>>(new Set());

  const currentPhaseId = vcrPhaseAssignments[vcr.id] || '';
  const vcrMappings = mappings[vcr.id] || [];

  // Build ownership map for all keys
  const keyOwnerMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const [vcrId, keys] of Object.entries(mappings)) {
      keys.forEach(k => map.set(k, vcrId));
    }
    return map;
  }, [mappings]);

  const handleSaveName = () => {
    if (nameValue.trim() && nameValue !== vcr.name) {
      onVCRUpdate(vcr.id, { name: nameValue.trim() });
    }
    setEditingName(false);
  };

  const handlePhaseChange = (phaseId: string) => {
    onPhaseAssign(vcr.id, phaseId === 'none' ? null : phaseId);
  };

  const toggleKey = (key: string) => {
    const current = mappings[vcr.id] || [];
    if (current.includes(key)) {
      // Unassign
      onMappingsChange({
        ...mappings,
        [vcr.id]: current.filter(k => k !== key),
      });
    } else {
      // Assign exclusively
      const updated = { ...mappings };
      for (const vid of Object.keys(updated)) {
        if (vid !== vcr.id) {
          updated[vid] = (updated[vid] || []).filter(k => k !== key);
        }
      }
      updated[vcr.id] = [...current, key];
      onMappingsChange(updated);
    }
  };

  const toggleParentSystem = (system: WizardSystem) => {
    const subKeys = system.subsystems!.map(sub => makeSubKey(system.id, sub.system_id));
    const available = subKeys.filter(k => {
      const owner = keyOwnerMap.get(k);
      return !owner || owner === vcr.id;
    });
    if (available.length === 0) return;

    const current = mappings[vcr.id] || [];
    const assignedHere = available.filter(k => current.includes(k));
    const allAssigned = assignedHere.length === available.length;

    const updated = { ...mappings };
    if (allAssigned) {
      updated[vcr.id] = current.filter(k => !available.includes(k));
    } else {
      const existing = new Set(updated[vcr.id] || []);
      available.forEach(k => existing.add(k));
      updated[vcr.id] = Array.from(existing);
    }
    onMappingsChange(updated);
  };

  const toggleExpand = (systemId: string) => {
    setExpandedSystems(prev => {
      const next = new Set(prev);
      next.has(systemId) ? next.delete(systemId) : next.add(systemId);
      return next;
    });
  };

  // Partition systems
  const { assigned, available } = useMemo(() => {
    const assigned: WizardSystem[] = [];
    const available: WizardSystem[] = [];
    const allMapped = new Set<string>();
    Object.values(mappings).forEach(keys => keys.forEach(k => allMapped.add(k)));

    for (const system of systems) {
      const keys = getMappableKeys(system);
      const hasAnyHere = keys.some(k => vcrMappings.includes(k));
      const hasAnyAvailable = keys.some(k => !allMapped.has(k) || vcrMappings.includes(k));

      if (hasAnyHere) {
        assigned.push(system);
      } else if (hasAnyAvailable) {
        available.push(system);
      }
    }
    return { assigned, available };
  }, [systems, mappings, vcrMappings]);

  const renderSystemRow = (system: WizardSystem, section: 'assigned' | 'available') => {
    const hasSubsystems = system.subsystems && system.subsystems.length > 0;
    const isExpanded = expandedSystems.has(system.id);

    if (!hasSubsystems) {
      const isChecked = vcrMappings.includes(system.id);
      const owner = keyOwnerMap.get(system.id);
      const isOwnedElsewhere = owner && owner !== vcr.id;

      return (
        <div
          key={system.id}
          className={cn(
            'flex items-center gap-2 px-3 py-2 rounded-md transition-colors',
            isOwnedElsewhere ? 'opacity-40' : 'cursor-pointer hover:bg-muted/50',
            isChecked && 'bg-primary/5',
          )}
          onClick={!isOwnedElsewhere ? () => toggleKey(system.id) : undefined}
        >
          <Checkbox checked={isChecked} disabled={!!isOwnedElsewhere} className="h-3.5 w-3.5" />
          <span className="text-sm flex-1 truncate">{system.name}</span>
          {system.is_hydrocarbon && (
            <span className="text-[9px] font-semibold px-1 py-0.5 rounded bg-orange-100 text-orange-700 border border-orange-200">HC</span>
          )}
        </div>
      );
    }

    // System with subsystems
    const subKeys = system.subsystems!.map(sub => makeSubKey(system.id, sub.system_id));
    const assignedHere = subKeys.filter(k => vcrMappings.includes(k));
    const selectableKeys = subKeys.filter(k => {
      const owner = keyOwnerMap.get(k);
      return !owner || owner === vcr.id;
    });
    const allChecked = selectableKeys.length > 0 && assignedHere.length === selectableKeys.length;
    const someChecked = assignedHere.length > 0 && !allChecked;

    return (
      <div key={system.id}>
        <div
          className={cn(
            'flex items-center gap-2 px-3 py-2 rounded-md cursor-pointer transition-colors hover:bg-muted/50',
            assignedHere.length > 0 && 'bg-primary/5',
          )}
          onClick={() => toggleExpand(system.id)}
        >
          {isExpanded ? (
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          )}
          <Checkbox
            checked={allChecked ? true : someChecked ? 'indeterminate' : false}
            onCheckedChange={() => toggleParentSystem(system)}
            onClick={(e) => e.stopPropagation()}
            className="h-3.5 w-3.5"
          />
          <span className="text-sm flex-1 truncate">{system.name}</span>
          {system.is_hydrocarbon && (
            <span className="text-[9px] font-semibold px-1 py-0.5 rounded bg-orange-100 text-orange-700 border border-orange-200">HC</span>
          )}
          <span className="text-[10px] text-muted-foreground tabular-nums">{assignedHere.length}/{subKeys.length}</span>
        </div>
        {isExpanded && (
          <div className="ml-6 border-l-2 border-muted pl-2 space-y-0.5 py-0.5">
            {system.subsystems!.map(sub => {
              const key = makeSubKey(system.id, sub.system_id);
              const isChecked = vcrMappings.includes(key);
              const owner = keyOwnerMap.get(key);
              const isOwnedElsewhere = owner && owner !== vcr.id;

              return (
                <div
                  key={key}
                  className={cn(
                    'flex items-center gap-2 px-2 py-1.5 rounded transition-colors',
                    isOwnedElsewhere ? 'opacity-40' : 'cursor-pointer hover:bg-muted/40',
                    isChecked && 'bg-primary/5',
                  )}
                  onClick={!isOwnedElsewhere ? () => toggleKey(key) : undefined}
                >
                  <Checkbox checked={isChecked} disabled={!!isOwnedElsewhere} className="h-3 w-3" />
                  <span className="text-xs flex-1 truncate">{sub.name}</span>
                  <span className="text-[10px] font-mono text-muted-foreground/60">{sub.system_id}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-md p-0 flex flex-col" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <SheetHeader className="px-4 pt-4 pb-3 border-b shrink-0">
          <div className="flex items-center gap-2">
            <span
              className="text-[10px] font-mono font-medium px-1.5 py-0.5 rounded border"
              style={getVCRIdStyle(vcrIndex)}
            >
              {shortVCRCode(vcr.code)}
            </span>
            <SheetTitle className="text-base sr-only">Edit VCR</SheetTitle>
          </div>
          {/* Editable name */}
          {editingName ? (
            <div className="flex items-center gap-1.5 mt-1">
              <Input
                value={nameValue}
                onChange={e => setNameValue(e.target.value)}
                className="h-8 text-sm"
                autoFocus
                onKeyDown={e => {
                  if (e.key === 'Enter') handleSaveName();
                  if (e.key === 'Escape') { setEditingName(false); setNameValue(vcr.name); }
                }}
              />
              <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={handleSaveName}>
                <Check className="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => { setEditingName(false); setNameValue(vcr.name); }}>
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          ) : (
            <button
              className="flex items-center gap-1.5 group text-left mt-1"
              onClick={() => { setEditingName(true); setNameValue(vcr.name); }}
            >
              <span className="text-lg font-semibold">{vcr.name}</span>
              <Pencil className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          )}
        </SheetHeader>

        {/* Phase assignment */}
        <div className="px-4 py-3 border-b shrink-0 space-y-1.5">
          <Label className="text-xs text-muted-foreground uppercase tracking-wider">Phase</Label>
          <Select value={currentPhaseId || 'none'} onValueChange={handlePhaseChange}>
            <SelectTrigger className="h-8 text-sm">
              <SelectValue placeholder="Unassigned" />
            </SelectTrigger>
            <SelectContent className="z-[150]">
              <SelectItem value="none">Unassigned</SelectItem>
              {phases.map(p => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Systems */}
        <div className="flex-1 min-h-0 flex flex-col">
          <div className="px-4 py-2 flex items-center justify-between shrink-0">
            <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
              Systems
            </span>
            <Badge variant="secondary" className="text-[10px]">
              {vcrMappings.length} mapped
            </Badge>
          </div>

          <ScrollArea className="flex-1 px-4 pb-4">
            <div className="space-y-0.5">
              {assigned.length > 0 && (
                <div className="mb-2">
                  <p className="text-[10px] font-medium text-primary uppercase tracking-wider px-3 pb-1">
                    Assigned ({assigned.length})
                  </p>
                  {assigned.map(s => renderSystemRow(s, 'assigned'))}
                </div>
              )}
              {available.length > 0 && (
                <div>
                  {assigned.length > 0 && <div className="border-t my-2" />}
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider px-3 pb-1">
                    Available ({available.length})
                  </p>
                  {available.map(s => renderSystemRow(s, 'available'))}
                </div>
              )}
              {assigned.length === 0 && available.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-4">
                  All systems are assigned to other VCRs
                </p>
              )}
            </div>
          </ScrollArea>
        </div>
      </SheetContent>
    </Sheet>
  );
};

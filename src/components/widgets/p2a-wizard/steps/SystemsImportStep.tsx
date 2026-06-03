import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

import {
  Plus,
  Trash2,
  Upload,
  Database,
  Edit2,
  Check,
  ChevronRight,
  Info,
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import { CMSImportModal } from './CMSImportModal';
import { ExcelUploadModal } from './ExcelUploadModal';
import { AddSystemModal } from './AddSystemModal';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { isAPIConfigured } from '@/lib/api-config-storage';



export interface WizardSubsystem {
  system_id: string;
  name: string;
  progress: number;
}

export interface WizardSystem {
  id: string;
  system_id: string;
  name: string;
  description: string;
  is_hydrocarbon: boolean;
  progress?: number;
  subsystems?: WizardSubsystem[];
}

interface SystemsImportStepProps {
  systems: WizardSystem[];
  onSystemsChange: (systems: WizardSystem[]) => void;
  projectCode?: string;
}


// Natural / alphanumeric comparator so -101, -101A, -101B, -102, -103 sort correctly
// (and -1010 comes after -102, not between -101 and -102).
const naturalCollator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });
function compareSystemIds(a: string, b: string) {
  return naturalCollator.compare(a ?? '', b ?? '');
}

export const SystemsImportStep: React.FC<SystemsImportStepProps> = ({
  systems,
  onSystemsChange,
  projectCode,
}) => {
  const { toast } = useToast();
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showCMSModal, setShowCMSModal] = useState(false);
  const [showExcelModal, setShowExcelModal] = useState(false);
  const [showClearAllConfirm, setShowClearAllConfirm] = useState(false);




  const handleAddSystem = (system: WizardSystem) => {
    onSystemsChange([...systems, system]);
  };

  const handleRemoveSystem = (id: string) => {
    onSystemsChange(systems.filter(s => s.id !== id));
  };

  const handleUpdateSystem = (id: string, updates: Partial<WizardSystem>) => {
    onSystemsChange(systems.map(s => s.id === id ? { ...s, ...updates } : s));
    setEditingId(null);
  };

  const handleCMSImport = (importedSystems: WizardSystem[]) => {
    if (!importedSystems.length) return;
    // Deduplicate: merge by system_id, keeping existing entries and deduplicating subsystems
    const existingMap = new Map(systems.map(s => [s.system_id, s]));
    const newSystems: WizardSystem[] = [];

    for (const imported of importedSystems) {
      const existing = existingMap.get(imported.system_id);
      if (existing) {
        if (imported.subsystems?.length) {
          const existingSubs = existing.subsystems || [];
          const existingSubIds = new Set(existingSubs.map(s => s.system_id));
          const newSubs = imported.subsystems.filter(s => !existingSubIds.has(s.system_id));
          if (newSubs.length > 0) {
            existing.subsystems = [...existingSubs, ...newSubs];
          }
        }
      } else {
        if (imported.subsystems?.length) {
          const seen = new Set<string>();
          imported.subsystems = imported.subsystems.filter(s => {
            if (seen.has(s.system_id)) return false;
            seen.add(s.system_id);
            return true;
          });
        }
        existingMap.set(imported.system_id, imported);
        newSystems.push(imported);
      }
    }

    onSystemsChange([...systems, ...newSystems]);
    toast({
      title: 'Imported from GoCompletions',
      description: `Added ${newSystems.length} ${newSystems.length === 1 ? 'system' : 'systems'}${
        importedSystems.length !== newSystems.length ? ` (${importedSystems.length - newSystems.length} already present)` : ''
      }`,
    });
  };

  const handleExcelUpload = (file: File) => {
    toast({
      title: 'Excel Upload',
      description: `Processing ${file.name}...`,
    });
    const mockSystems: WizardSystem[] = [
      { id: `excel-${Date.now()}-1`, system_id: 'SYS-XLS-001', name: 'Excel System 1', description: 'From Excel', is_hydrocarbon: false },
    ];
    onSystemsChange([...systems, ...mockSystems]);
  };

  const [cmsConfigured, setCmsConfigured] = useState<boolean>(() => isAPIConfigured('gocompletions'));

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await supabase
          .from('dms_sync_credentials')
          .select('id')
          .eq('dms_platform', 'gocompletions')
          .limit(1);
        if (!cancelled && !error && data && data.length > 0) {
          setCmsConfigured(true);
        }
      } catch { /* ignore */ }
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="flex flex-col gap-3 p-4 h-full">
      {/* Header */}
      <div className="flex items-center justify-between shrink-0">
        <h3 className="text-sm font-semibold">Systems</h3>
        {systems.length > 0 && (
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="shrink-0">{systems.length} systems</Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowClearAllConfirm(true)}
              className="h-7 gap-1.5 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Clear all
            </Button>
          </div>
        )}
      </div>

      {/* Systems list OR prominent empty state tightly coupled with the action cards */}
      {systems.length === 0 ? (
        <div className="flex flex-col items-center text-center pt-6 pb-2 shrink-0">
          <div className="w-16 h-16 rounded-2xl bg-muted/70 flex items-center justify-center mb-4 ring-1 ring-border/60">
            <Database className="h-7 w-7 text-muted-foreground" />
          </div>
          <p className="text-lg font-semibold tracking-tight">No systems yet</p>
          <p className="text-sm text-muted-foreground mt-1.5 max-w-md">
            Pick an import method below to get started, or continue to the next step and assign systems later.
          </p>
          <TooltipProvider delayDuration={150}>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="mt-3 inline-flex items-center gap-1.5 text-[11px] text-muted-foreground/80 cursor-help">
                  <Info className="h-3.5 w-3.5 text-muted-foreground/70" />
                  This step is optional — you can skip it.
                </span>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-xs text-xs">
                Systems can be assigned now or later in the wizard. Skipping won't block submission.
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      ) : (
        <div className="border rounded-lg flex-1 min-h-0 bg-muted/20">
          <ScrollArea className="h-full">
            <div className="p-1.5 space-y-1">
              {[...systems]
                .sort((a, b) => compareSystemIds(a.system_id, b.system_id))
                .map((system) => (
                  <SystemListItem
                    key={system.id}
                    system={system}
                    isEditing={editingId === system.id}
                    onEdit={() => setEditingId(system.id)}
                    onCancelEdit={() => setEditingId(null)}
                    onUpdate={(updates) => handleUpdateSystem(system.id, updates)}
                    onRemove={() => handleRemoveSystem(system.id)}
                  />
                ))}
            </div>
          </ScrollArea>
        </div>
      )}

      {/* Import options — large cards when empty, compact action row once systems exist */}
      {systems.length === 0 ? (
        <div className="grid grid-cols-3 gap-3 shrink-0">
          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => setShowCMSModal(true)}
                  className={cn(
                    "group relative flex flex-col items-center gap-2 p-4 rounded-xl border transition-all duration-200 text-left",
                    cmsConfigured
                      ? "border-border bg-card hover:bg-accent/50 hover:border-primary/30 hover:shadow-md hover:-translate-y-0.5"
                      : "border-dashed border-border/60 bg-muted/30 opacity-75 hover:opacity-100 hover:bg-muted/50"
                  )}
                >
                  <div className={cn(
                    "w-9 h-9 rounded-lg flex items-center justify-center transition-colors",
                    cmsConfigured ? "bg-amber-500/10 group-hover:bg-amber-500/20" : "bg-muted"
                  )}>
                    <Database className={cn("h-4 w-4", cmsConfigured ? "text-amber-600" : "text-muted-foreground")} />
                  </div>
                  <span className={cn("font-medium text-xs", !cmsConfigured && "text-muted-foreground")}>CMS Import</span>
                  <span className="text-[10px] text-muted-foreground leading-tight text-center">
                    Import from GoCompletions CMS
                  </span>
                </button>
              </TooltipTrigger>
              {!cmsConfigured && (
                <TooltipContent side="top" className="max-w-xs text-xs">
                  GoCompletions integration isn't configured yet. An admin can connect it in Admin → Integrations.
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
          <button
            onClick={() => setShowExcelModal(true)}
            className="group relative flex flex-col items-center gap-2 p-4 rounded-xl border border-border bg-card hover:bg-accent/50 hover:border-primary/30 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
          >
            <div className="w-9 h-9 rounded-lg bg-emerald-500/10 flex items-center justify-center group-hover:bg-emerald-500/20 transition-colors">
              <Upload className="h-4 w-4 text-emerald-600" />
            </div>
            <span className="font-medium text-xs">Upload Excel</span>
            <span className="text-[10px] text-muted-foreground leading-tight text-center">Import spreadsheet</span>
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="group relative flex flex-col items-center gap-2 p-4 rounded-xl border border-border bg-card hover:bg-accent/50 hover:border-primary/30 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
          >
            <div className="w-9 h-9 rounded-lg bg-blue-500/10 flex items-center justify-center group-hover:bg-blue-500/20 transition-colors">
              <Plus className="h-4 w-4 text-blue-600" />
            </div>
            <span className="font-medium text-xs">Add Manually</span>
            <span className="text-[10px] text-muted-foreground leading-tight text-center">Enter details</span>
          </button>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <span className="text-[11px] uppercase tracking-wider text-muted-foreground mr-1">Add more:</span>
          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowCMSModal(true)}
                  disabled={!cmsConfigured}
                  className="h-8 gap-1.5"
                >
                  <Database className="h-3.5 w-3.5 text-amber-600" />
                  <span className="text-xs">CMS Import</span>
                </Button>
              </TooltipTrigger>
              {!cmsConfigured && (
                <TooltipContent side="top" className="max-w-xs text-xs">
                  GoCompletions integration isn't configured yet.
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
          <Button variant="outline" size="sm" onClick={() => setShowExcelModal(true)} className="h-8 gap-1.5">
            <Upload className="h-3.5 w-3.5 text-emerald-600" />
            <span className="text-xs">Upload Excel</span>
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowAddModal(true)} className="h-8 gap-1.5">
            <Plus className="h-3.5 w-3.5 text-blue-600" />
            <span className="text-xs">Add Manually</span>
          </Button>
        </div>
      )}




      {/* CMS Import Modal */}
      <CMSImportModal
        open={showCMSModal}
        onOpenChange={setShowCMSModal}
        onImport={handleCMSImport}
        projectCode={projectCode}
      />

      {/* Excel Upload Modal */}
      <ExcelUploadModal
        open={showExcelModal}
        onOpenChange={setShowExcelModal}
        onUpload={handleExcelUpload}
        title="Upload Systems"
        description="Import systems from an Excel spreadsheet"
      />

      {/* Add System Modal */}
      <AddSystemModal
        open={showAddModal}
        onOpenChange={setShowAddModal}
        onAdd={handleAddSystem}
      />
    </div>
  );
};

// ─── Extracted System List Item ──────────────────────────────

interface SystemListItemProps {
  system: WizardSystem;
  isEditing: boolean;
  onEdit: () => void;
  onCancelEdit: () => void;
  onUpdate: (updates: Partial<WizardSystem>) => void;
  onRemove: () => void;
}

const SystemListItem: React.FC<SystemListItemProps> = ({
  system,
  isEditing,
  onEdit,
  onCancelEdit,
  onUpdate,
  onRemove,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const hasSubsystems = system.subsystems && system.subsystems.length > 0;

  if (isEditing) {
    return (
      <div className={cn("flex items-center gap-3 p-3 rounded-lg border bg-card ring-2 ring-primary")}>
        <div className="flex-1 space-y-2">
          <div className="flex gap-2">
            <Input
              value={system.system_id}
              onChange={(e) => onUpdate({ system_id: e.target.value })}
              placeholder="System ID"
              className="h-8 text-sm w-40"
            />
            <Input
              value={system.name}
              onChange={(e) => onUpdate({ name: e.target.value })}
              placeholder="System Name"
              className="h-8 text-sm flex-1"
            />
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              checked={system.is_hydrocarbon}
              onCheckedChange={(checked) => 
                onUpdate({ is_hydrocarbon: checked as boolean })
              }
            />
            <Label className="text-xs">Hydrocarbon System</Label>
            <div className="flex-1" />
            <Button size="sm" variant="ghost" onClick={onCancelEdit}>
              <Check className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-0">
      <div
        className={cn("group flex items-center gap-2 py-1.5 px-2.5 rounded-md border bg-card hover:bg-muted/50 transition-colors", hasSubsystems && "cursor-pointer")}
        onClick={() => hasSubsystems && setIsExpanded(!isExpanded)}
      >
        {/* Left disclosure chevron — muted secondary affordance, always rendered for alignment */}
        <ChevronRight className={cn(
          "h-3.5 w-3.5 shrink-0 transition-transform duration-200",
          hasSubsystems ? "text-muted-foreground/70" : "invisible",
          isExpanded && "rotate-90"
        )} />

        <span className="inline-flex items-center justify-center px-1.5 py-0.5 rounded text-[10px] font-mono tabular-nums tracking-tight shrink-0 leading-none border border-border/60 bg-muted/40 text-muted-foreground w-[160px] truncate">
          {system.system_id}
        </span>
        <span className="font-medium text-xs truncate flex-1 min-w-0">{system.name}</span>

        {/* Fixed-width classification column — keeps Hydrocarbon labels aligned */}
        <div className="w-[88px] shrink-0 flex justify-end">
          {system.is_hydrocarbon && (
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded border border-amber-200 bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:border-amber-900/40 dark:text-amber-300">
              Hydrocarbon
            </span>
          )}
        </div>

        {/* Fixed-width subsystem count column */}
        <span className="text-[10px] text-muted-foreground shrink-0 w-[96px] text-right tabular-nums">
          {hasSubsystems ? `${system.subsystems!.length} ${system.subsystems!.length === 1 ? 'subsystem' : 'subsystems'}` : ''}
        </span>

        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            size="icon"
            variant="ghost"
            className="h-6 w-6 shrink-0"
            onClick={(e) => { e.stopPropagation(); onEdit(); }}
          >
            <Edit2 className="h-3 w-3" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-6 w-6 text-destructive shrink-0"
            onClick={(e) => { e.stopPropagation(); onRemove(); }}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Subsystems panel */}
      {isExpanded && hasSubsystems && (
        <div className="ml-5 pl-3 border-l-2 border-muted space-y-0.5 py-1">
          {system.subsystems!.map((sub, idx) => (
            <div
              key={sub.system_id + idx}
              className="flex items-center gap-2 py-0.5 px-2 rounded text-xs"
            >
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-mono tabular-nums tracking-tight shrink-0 leading-none border border-border bg-muted text-muted-foreground w-[160px] truncate">
                {sub.system_id}
              </span>
              <span className="truncate flex-1 min-w-0 text-muted-foreground text-[10px]">{sub.name}</span>
              {/* Spacer matching the width of the parent's hover action buttons */}
              <div className="w-[52px] shrink-0" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

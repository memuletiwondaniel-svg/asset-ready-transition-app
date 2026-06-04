import React, { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Search, Layers, Trash2, Flame, Snowflake, ChevronRight, ChevronDown,
  Plus, RefreshCw, CheckCircle2, Info, Lock, Database, Upload,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useAuth } from '@/components/enhanced-auth/AuthProvider';
import { CMSImportModal } from '@/components/widgets/p2a-wizard/steps/CMSImportModal';
import { ExcelUploadModal } from '@/components/widgets/p2a-wizard/steps/ExcelUploadModal';
import { AddSystemModal } from '@/components/widgets/p2a-wizard/steps/AddSystemModal';
import type { WizardSystem } from '@/components/widgets/p2a-wizard/steps/SystemsImportStep';

interface SystemsStepProps {
  vcrId: string;
  projectCode?: string;
}

interface SubsystemRow {
  id: string;
  subsystem_id: string;
  name: string;
  assignmentId?: string; // p2a_handover_point_systems row when subsystem is mapped
}

interface SystemRow {
  id: string;
  system_id: string;
  name: string;
  is_hydrocarbon: boolean;
  systemAssignmentId?: string; // p2a_handover_point_systems row when whole system is mapped
  subsystems: SubsystemRow[];
}

export const SystemsStep: React.FC<SystemsStepProps> = ({ vcrId, projectCode }) => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; label: string } | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerSelection, setPickerSelection] = useState<Record<string, true>>({});
  const [syncing, setSyncing] = useState(false);
  const [showCMSModal, setShowCMSModal] = useState(false);
  const [showExcelModal, setShowExcelModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [importing, setImporting] = useState(false);

  // Resolve handover_plan_id + finalize state from VCR
  const { data: vcrMeta } = useQuery({
    queryKey: ['vcr-systems-meta', vcrId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('p2a_handover_points')
        .select('handover_plan_id, systems_finalized_at, systems_finalized_by, execution_plan_status')
        .eq('id', vcrId)
        .maybeSingle();
      if (error) throw error;
      return data as {
        handover_plan_id?: string;
        systems_finalized_at?: string | null;
        systems_finalized_by?: string | null;
        execution_plan_status?: string;
      } | null;
    },
  });
  const planId = vcrMeta?.handover_plan_id;
  const isFinalized = !!vcrMeta?.systems_finalized_at;
  const isLocked = vcrMeta?.execution_plan_status === 'APPROVED';

  // Load assigned + all systems with subsystems
  const { data: rows = [], isLoading } = useQuery({
    queryKey: ['vcr-systems-tree', vcrId, planId],
    enabled: !!planId,
    queryFn: async (): Promise<SystemRow[]> => {
      const [{ data: assignments }, { data: systems }] = await Promise.all([
        (supabase as any)
          .from('p2a_handover_point_systems')
          .select('id, system_id, subsystem_id')
          .eq('handover_point_id', vcrId),
        (supabase as any)
          .from('p2a_systems')
          .select('id, system_id, name, is_hydrocarbon')
          .eq('handover_plan_id', planId)
          .order('display_order', { ascending: true, nullsFirst: false })
          .order('system_id', { ascending: true }),
      ]);
      const assigned = assignments || [];
      const allSystems = systems || [];
      const assignedSystemIds = new Set(assigned.filter((a: any) => !a.subsystem_id).map((a: any) => a.system_id));
      const assignedSubsystemIds = new Set(assigned.filter((a: any) => a.subsystem_id).map((a: any) => a.subsystem_id));
      const involvedSystemIds = new Set([
        ...assignedSystemIds,
        ...assigned.filter((a: any) => a.subsystem_id).map((a: any) => a.system_id),
      ]);
      const filteredSystems = allSystems.filter((s: any) => involvedSystemIds.has(s.id));
      if (filteredSystems.length === 0) return [];

      const { data: subs } = await (supabase as any)
        .from('p2a_subsystems')
        .select('id, system_id, subsystem_id, name')
        .in('system_id', filteredSystems.map((s: any) => s.id))
        .order('subsystem_id', { ascending: true });

      const subsBySystem = new Map<string, any[]>();
      for (const s of subs || []) {
        const arr = subsBySystem.get(s.system_id) || [];
        arr.push(s);
        subsBySystem.set(s.system_id, arr);
      }

      return filteredSystems.map((s: any) => {
        const sysAssign = assigned.find((a: any) => a.system_id === s.id && !a.subsystem_id);
        const subList: SubsystemRow[] = (subsBySystem.get(s.id) || []).map((ss: any) => {
          const subAssign = assigned.find((a: any) => a.subsystem_id === ss.id);
          return {
            id: ss.id,
            subsystem_id: ss.subsystem_id,
            name: ss.name,
            assignmentId: subAssign?.id,
          };
        });
        return {
          id: s.id,
          system_id: s.system_id,
          name: s.name,
          is_hydrocarbon: !!s.is_hydrocarbon,
          systemAssignmentId: sysAssign?.id,
          subsystems: subList,
        };
      });
    },
  });

  // Available systems for picker (not yet assigned at system-level to this VCR)
  const { data: pickerOptions = [] } = useQuery({
    queryKey: ['vcr-systems-picker', vcrId, planId, pickerOpen],
    enabled: pickerOpen && !!planId,
    queryFn: async () => {
      const [{ data: assigned }, { data: all }] = await Promise.all([
        (supabase as any).from('p2a_handover_point_systems').select('system_id, subsystem_id').eq('handover_point_id', vcrId),
        (supabase as any).from('p2a_systems').select('id, system_id, name, is_hydrocarbon').eq('handover_plan_id', planId).order('system_id'),
      ]);
      const fullyAssigned = new Set((assigned || []).filter((a: any) => !a.subsystem_id).map((a: any) => a.system_id));
      return (all || []).filter((s: any) => !fullyAssigned.has(s.id));
    },
  });

  const addMutation = useMutation({
    mutationFn: async (systemIds: string[]) => {
      const inserts = systemIds.map(sid => ({
        handover_point_id: vcrId,
        system_id: sid,
        subsystem_id: null,
      }));
      // Remove any existing subsystem-level rows for these systems first
      await (supabase as any)
        .from('p2a_handover_point_systems')
        .delete()
        .eq('handover_point_id', vcrId)
        .in('system_id', systemIds)
        .not('subsystem_id', 'is', null);
      const { error } = await (supabase as any).from('p2a_handover_point_systems').insert(inserts);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vcr-systems-tree'] });
      queryClient.invalidateQueries({ queryKey: ['vcr-systems-picker'] });
      toast.success('Systems added');
      setPickerOpen(false);
      setPickerSelection({});
    },
    onError: (e: any) => toast.error(e?.message || 'Failed to add systems'),
  });

  /**
   * Assign a batch of WizardSystem (from CMS / Excel / Manual) to this VCR.
   * Two-step: (1) upsert into p2a_systems scoped to parent plan,
   * (2) insert p2a_handover_point_systems rows for any not already linked.
   */
  const assignWizardSystems = async (incoming: WizardSystem[]) => {
    if (!planId || !incoming.length) return;
    setImporting(true);
    try {
      // 1) Upsert into p2a_systems (unique on system_id + handover_plan_id).
      const rowsToUpsert = incoming.map(s => ({
        handover_plan_id: planId,
        system_id: s.system_id,
        name: s.name,
        is_hydrocarbon: !!s.is_hydrocarbon,
        source_type: 'MANUAL' as const,
      }));
      const { data: upserted, error: upErr } = await (supabase as any)
        .from('p2a_systems')
        .upsert(rowsToUpsert, { onConflict: 'system_id,handover_plan_id', ignoreDuplicates: false })
        .select('id, system_id');
      if (upErr) throw upErr;

      // Build system_id (text) → uuid map. Fall back to a fetch if upsert didn't return rows.
      let codeToUuid = new Map<string, string>((upserted || []).map((r: any) => [r.system_id, r.id]));
      const missingCodes = incoming.map(s => s.system_id).filter(c => !codeToUuid.has(c));
      if (missingCodes.length) {
        const { data: fetched } = await (supabase as any)
          .from('p2a_systems')
          .select('id, system_id')
          .eq('handover_plan_id', planId)
          .in('system_id', missingCodes);
        for (const r of fetched || []) codeToUuid.set(r.system_id, r.id);
      }

      // 2) Skip systems already assigned at system-level to this VCR.
      const newSystemUuids = Array.from(codeToUuid.values());
      const { data: existing } = await (supabase as any)
        .from('p2a_handover_point_systems')
        .select('system_id, subsystem_id')
        .eq('handover_point_id', vcrId)
        .in('system_id', newSystemUuids);
      const alreadyFullyAssigned = new Set(
        (existing || []).filter((r: any) => !r.subsystem_id).map((r: any) => r.system_id)
      );
      const toLink = newSystemUuids.filter(uuid => !alreadyFullyAssigned.has(uuid));

      // Remove any subsystem-level rows for systems we're about to fully assign.
      if (toLink.length) {
        await (supabase as any)
          .from('p2a_handover_point_systems')
          .delete()
          .eq('handover_point_id', vcrId)
          .in('system_id', toLink)
          .not('subsystem_id', 'is', null);
        const inserts = toLink.map(uuid => ({
          handover_point_id: vcrId,
          system_id: uuid,
          subsystem_id: null,
        }));
        const { error: linkErr } = await (supabase as any)
          .from('p2a_handover_point_systems')
          .insert(inserts);
        if (linkErr) throw linkErr;
      }

      queryClient.invalidateQueries({ queryKey: ['vcr-systems-tree'] });
      queryClient.invalidateQueries({ queryKey: ['vcr-systems-picker'] });
      const newCount = toLink.length;
      const expandedPlan = incoming.length - alreadyFullyAssigned.size;
      toast.success(
        newCount === 0
          ? 'All selected systems were already on this VCR'
          : `Added ${newCount} ${newCount === 1 ? 'system' : 'systems'} to VCR${
              expandedPlan > 0 && incoming.some(s => !codeToUuid.has(s.system_id) === false)
                ? ''
                : ''
            }`
      );
    } catch (e: any) {
      toast.error(e?.message || 'Failed to add systems');
    } finally {
      setImporting(false);
    }
  };

  const deleteMutation = useMutation({
    mutationFn: async (assignmentId: string) => {
      const { error } = await (supabase as any)
        .from('p2a_handover_point_systems')
        .delete()
        .eq('id', assignmentId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vcr-systems-tree'] });
      toast.success('Removed');
      setDeleteTarget(null);
    },
  });

  const toggleHC = useMutation({
    mutationFn: async ({ id, value }: { id: string; value: boolean }) => {
      const { error } = await (supabase as any)
        .from('p2a_systems')
        .update({ is_hydrocarbon: value })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['vcr-systems-tree'] }),
  });

  const finalizeMutation = useMutation({
    mutationFn: async (finalize: boolean) => {
      const { error } = await (supabase as any)
        .from('p2a_handover_points')
        .update({
          systems_finalized_at: finalize ? new Date().toISOString() : null,
          systems_finalized_by: finalize ? user?.id ?? null : null,
        })
        .eq('id', vcrId);
      if (error) throw error;
    },
    onSuccess: (_d, finalize) => {
      queryClient.invalidateQueries({ queryKey: ['vcr-systems-meta', vcrId] });
      queryClient.invalidateQueries({ queryKey: ['project-vcrs'] });
      toast.success(finalize ? 'Systems finalized for this VCR' : 'Systems re-opened for editing');
    },
    onError: (e: any) => toast.error(e?.message || 'Failed to update finalize state'),
  });

  const handleSync = async () => {
    if (!planId) return;
    setSyncing(true);
    try {
      const systemIdList = (rows || []).map(r => r.system_id);
      const cleanProjectCode = (projectCode || '').replace(/-/g, '');
      const { data, error } = await supabase.functions.invoke('gohub-sync-counts', {
        body: { projectFilter: cleanProjectCode, systemIds: systemIdList },
      });
      if (error) throw error;
      if (data?.success) {
        toast.success(`Synced ${data.total_updated || 0} systems from GoCompletions`);
        queryClient.invalidateQueries({ queryKey: ['vcr-systems-tree'] });
      } else {
        toast.error(data?.error || 'Sync failed');
      }
    } catch (e: any) {
      toast.error(e?.message || 'Sync failed');
    } finally {
      setSyncing(false);
    }
  };

  const filtered = useMemo(() => {
    if (!searchQuery) return rows;
    const q = searchQuery.toLowerCase();
    return rows.filter(s =>
      s.name.toLowerCase().includes(q) ||
      s.system_id.toLowerCase().includes(q) ||
      s.subsystems.some(ss => ss.name.toLowerCase().includes(q) || ss.subsystem_id.toLowerCase().includes(q))
    );
  }, [rows, searchQuery]);

  const hcCount = rows.filter(r => r.is_hydrocarbon).length;

  if (isLoading) {
    return <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-14" />)}</div>;
  }

  return (
    <div className="space-y-4">
      {/* ── Finalize success banner (only when finalized) ────────── */}
      {isFinalized && (
        <div className="flex items-center gap-2 rounded-md border border-emerald-500/40 bg-emerald-500/5 px-3 py-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <div className="text-[12px] leading-snug flex-1">
            <span className="font-semibold text-emerald-700 dark:text-emerald-400">Systems finalized.</span>{' '}
            <span className="text-muted-foreground">
              This list is the source of truth for the VCR. P2A plan edits will not overwrite it.
            </span>
          </div>
          {!isLocked && (
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs"
              onClick={() => finalizeMutation.mutate(false)}
              disabled={finalizeMutation.isPending}
            >
              Re-open
            </Button>
          )}
        </div>
      )}

      {/* ── Populated state: search + count + actions ────────────── */}
      {rows.length > 0 && (
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search systems / subsystems..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          {rows.length > 0 && <Badge variant="outline">{rows.length} systems</Badge>}
          {hcCount > 0 && (
            <Badge variant="outline" className="border-orange-300 text-orange-600 gap-1">
              <Flame className="w-3 h-3" />
              {hcCount} HC
            </Badge>
          )}
          <Button
            size="icon"
            variant="outline"
            onClick={handleSync}
            disabled={syncing}
            title="Sync GoCompletions"
            aria-label="Sync GoCompletions"
            className="h-8 w-8"
          >
            <RefreshCw className={cn("w-3.5 h-3.5", syncing && "animate-spin")} />
          </Button>
          {!isFinalized && !isLocked && (
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs gap-1.5"
              onClick={() => finalizeMutation.mutate(true)}
              disabled={finalizeMutation.isPending}
              title="Mark this system list as final"
            >
              <Lock className="w-3 h-3" />
              Finalize
            </Button>
          )}
        </div>
      )}

      {rows.length === 0 ? (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col items-center text-center pt-6 pb-2 shrink-0">
            <div className="w-16 h-16 rounded-2xl bg-muted/70 flex items-center justify-center mb-4 ring-1 ring-border/60">
              <Database className="h-7 w-7 text-muted-foreground" />
            </div>
            <p className="text-lg font-semibold tracking-tight">No systems yet</p>
            <p className="text-sm text-muted-foreground mt-1.5 max-w-md">
              Pick an import method below to get started, or add systems to this VCR.
            </p>
          </div>
          <div className="grid grid-cols-4 gap-3 shrink-0">
            <button
              onClick={() => setShowCMSModal(true)}
              className="group relative flex flex-col items-center gap-2 p-4 rounded-xl border border-border bg-card hover:bg-accent/50 hover:border-primary/30 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
            >
              <div className="w-9 h-9 rounded-lg bg-amber-500/10 flex items-center justify-center group-hover:bg-amber-500/20 transition-colors">
                <Database className="h-4 w-4 text-amber-600" />
              </div>
              <span className="font-medium text-xs">CMS Import</span>
              <span className="text-[10px] text-muted-foreground leading-tight text-center">
                Import from GoCompletions CMS
              </span>
            </button>
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
            <button
              onClick={() => setPickerOpen(true)}
              className="group relative flex flex-col items-center gap-2 p-4 rounded-xl border border-border bg-card hover:bg-accent/50 hover:border-primary/30 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
            >
              <div className="w-9 h-9 rounded-lg bg-violet-500/10 flex items-center justify-center group-hover:bg-violet-500/20 transition-colors">
                <Layers className="h-4 w-4 text-violet-600" />
              </div>
              <span className="font-medium text-xs">Pick from Plan</span>
              <span className="text-[10px] text-muted-foreground leading-tight text-center">Already in P2A plan</span>
            </button>
          </div>
        </div>
      ) : (
        <ScrollArea className="h-[calc(min(90vh,780px)-320px)]">
          <div className="space-y-2 pr-3">
            {filtered.map((sys) => {
              const isOpen = !!expanded[sys.id];
              return (
                <Card key={sys.id} className="group">
                  <div className="p-3 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setExpanded(prev => ({ ...prev, [sys.id]: !prev[sys.id] }))}
                      className="p-1 rounded hover:bg-muted shrink-0"
                      aria-label={isOpen ? 'Collapse' : 'Expand'}
                    >
                      {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </button>
                    {sys.is_hydrocarbon
                      ? <Flame className="w-4 h-4 text-orange-500 shrink-0" />
                      : <Snowflake className="w-4 h-4 text-blue-500 shrink-0" />}
                    <Badge variant="outline" className="text-[10px] font-mono shrink-0">{sys.system_id}</Badge>
                    <span className="text-sm font-medium truncate flex-1 min-w-0">{sys.name}</span>
                    <label className="flex items-center gap-1.5 text-[11px] text-muted-foreground shrink-0 cursor-pointer">
                      <Checkbox
                        checked={sys.is_hydrocarbon}
                        onCheckedChange={(v) => toggleHC.mutate({ id: sys.id, value: !!v })}
                      />
                      Hydrocarbon
                    </label>
                    {(sys.systemAssignmentId || sys.subsystems.some(s => s.assignmentId)) && (
                      <button
                        onClick={() => {
                          // Remove the whole system mapping (and any subsystem mappings)
                          const id = sys.systemAssignmentId;
                          if (id) {
                            setDeleteTarget({ id, label: sys.name });
                          } else {
                            // Bulk-remove all subsystem mappings under this system
                            const ids = sys.subsystems.filter(s => s.assignmentId).map(s => s.assignmentId!);
                            Promise.all(ids.map(i =>
                              (supabase as any).from('p2a_handover_point_systems').delete().eq('id', i)
                            )).then(() => {
                              queryClient.invalidateQueries({ queryKey: ['vcr-systems-tree'] });
                              toast.success('Removed');
                            });
                          }
                        }}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-md hover:bg-destructive/10 text-destructive shrink-0"
                        aria-label="Remove"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  {isOpen && sys.subsystems.length > 0 && (
                    <div className="border-t bg-muted/20 px-3 py-2 space-y-1">
                      {sys.subsystems.map((ss) => {
                        const isMapped = !!ss.assignmentId || !!sys.systemAssignmentId;
                        return (
                          <div key={ss.id} className="flex items-center gap-2 py-1 group/sub">
                            <Checkbox
                              checked={isMapped}
                              disabled={!!sys.systemAssignmentId}
                              onCheckedChange={async (v) => {
                                if (v) {
                                  const { error } = await (supabase as any)
                                    .from('p2a_handover_point_systems')
                                    .insert({ handover_point_id: vcrId, system_id: sys.id, subsystem_id: ss.id });
                                  if (error) toast.error(error.message);
                                  else {
                                    queryClient.invalidateQueries({ queryKey: ['vcr-systems-tree'] });
                                    toast.success('Subsystem added');
                                  }
                                } else if (ss.assignmentId) {
                                  const { error } = await (supabase as any)
                                    .from('p2a_handover_point_systems')
                                    .delete()
                                    .eq('id', ss.assignmentId);
                                  if (error) toast.error(error.message);
                                  else {
                                    queryClient.invalidateQueries({ queryKey: ['vcr-systems-tree'] });
                                    toast.success('Subsystem removed');
                                  }
                                }
                              }}
                            />
                            <Badge variant="outline" className="text-[10px] font-mono shrink-0">{ss.subsystem_id}</Badge>
                            <span className="text-xs text-foreground/80 truncate flex-1 min-w-0">{ss.name}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {isOpen && sys.subsystems.length === 0 && (
                    <div className="border-t px-3 py-2 text-[11px] text-muted-foreground">
                      No subsystems available. Sync with GoCompletions to populate.
                    </div>
                  )}
                </Card>
              );
            })}
            {filtered.length === 0 && searchQuery && (
              <Card><CardContent className="py-8 text-center">
                <p className="text-sm text-muted-foreground">No systems match your search</p>
              </CardContent></Card>
            )}
          </div>
        </ScrollArea>
      )}

      {/* CMS Import */}
      <CMSImportModal
        open={showCMSModal}
        onOpenChange={setShowCMSModal}
        onImport={(systems) => { setShowCMSModal(false); void assignWizardSystems(systems); }}
        projectCode={projectCode}
      />

      {/* Excel Upload */}
      <ExcelUploadModal
        open={showExcelModal}
        onOpenChange={setShowExcelModal}
        title="Upload Systems"
        description="Import systems from an Excel spreadsheet (.xlsx, .xls, .csv)"
        onUpload={async (file) => {
          setShowExcelModal(false);
          try {
            const { parseSystemsExcel } = await import('@/components/widgets/p2a-wizard/steps/parseSystemsExcel');
            const parsed = await parseSystemsExcel(file);
            if (!parsed.length) {
              toast.error('No systems found. Expecting columns like "System ID" and "Name".');
              return;
            }
            await assignWizardSystems(parsed);
          } catch (e: any) {
            toast.error(e?.message || 'Failed to parse Excel file');
          }
        }}
      />

      {/* Manual Add */}
      <AddSystemModal
        open={showAddModal}
        onOpenChange={setShowAddModal}
        onAdd={(system) => { setShowAddModal(false); void assignWizardSystems([system]); }}
      />

      {/* Add System Picker */}
      <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
        <DialogContent className="max-w-lg z-[110]" overlayClassName="z-[105]">
          <DialogHeader>
            <DialogTitle>Add Systems to VCR</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[420px] pr-3">
            <div className="space-y-1">
              {pickerOptions.length === 0 ? (
                <p className="text-sm text-muted-foreground py-6 text-center">All systems already added.</p>
              ) : pickerOptions.map((s: any) => (
                <label key={s.id} className="flex items-center gap-2 p-2 rounded-md hover:bg-muted cursor-pointer">
                  <Checkbox
                    checked={!!pickerSelection[s.id]}
                    onCheckedChange={(v) => setPickerSelection(prev => {
                      const next = { ...prev };
                      if (v) next[s.id] = true; else delete next[s.id];
                      return next;
                    })}
                  />
                  <Badge variant="outline" className="text-[10px] font-mono">{s.system_id}</Badge>
                  {s.is_hydrocarbon && (
                    <Badge className="text-[9px] h-4 px-1.5 bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300 border-0 font-semibold">
                      HC
                    </Badge>
                  )}
                  <span className="text-sm truncate">{s.name}</span>
                </label>
              ))}
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setPickerOpen(false); setPickerSelection({}); }}>Cancel</Button>
            <Button
              disabled={Object.keys(pickerSelection).length === 0 || addMutation.isPending}
              onClick={() => addMutation.mutate(Object.keys(pickerSelection))}
            >
              Add {Object.keys(pickerSelection).length || ''}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent className="z-[110]">
          <AlertDialogHeader>
            <AlertDialogTitle>Remove System</AlertDialogTitle>
            <AlertDialogDescription>
              Remove "{deleteTarget?.label}" from this VCR mapping?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

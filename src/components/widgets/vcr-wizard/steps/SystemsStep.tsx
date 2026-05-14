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
  Plus, RefreshCw,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { getAPIConfig } from '@/lib/api-config-storage';

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
  const [searchQuery, setSearchQuery] = useState('');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; label: string } | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerSelection, setPickerSelection] = useState<Record<string, true>>({});
  const [syncing, setSyncing] = useState(false);

  // Resolve handover_plan_id from VCR
  const { data: planId } = useQuery({
    queryKey: ['vcr-plan-id', vcrId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('p2a_handover_points')
        .select('handover_plan_id')
        .eq('id', vcrId)
        .maybeSingle();
      if (error) throw error;
      return data?.handover_plan_id as string | undefined;
    },
  });

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

  const handleSync = async () => {
    if (!planId) return;
    const config = getAPIConfig('gocompletions');
    if (!config || config.status !== 'configured' || !config.rpaCredentials) {
      toast.error('GoCompletions not configured. Go to Administration > APIs.');
      return;
    }
    const { portalUrl, username, password } = config.rpaCredentials;
    if (!username || !password) {
      toast.error('GoCompletions credentials incomplete.');
      return;
    }
    setSyncing(true);
    try {
      const systemIdList = (rows || []).map(r => r.system_id);
      const cleanProjectCode = (projectCode || '').replace(/-/g, '');
      const { data, error } = await supabase.functions.invoke('gohub-sync-counts', {
        body: { portalUrl, username, password, projectFilter: cleanProjectCode, systemIds: systemIdList },
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
        <Badge variant="outline">{rows.length} systems</Badge>
        {hcCount > 0 && (
          <Badge variant="outline" className="border-orange-300 text-orange-600 gap-1">
            <Flame className="w-3 h-3" />
            {hcCount} HC
          </Badge>
        )}
        <Button size="sm" variant="outline" onClick={handleSync} disabled={syncing} className="gap-1.5">
          <RefreshCw className={cn("w-3.5 h-3.5", syncing && "animate-spin")} />
          Sync GoCompletions
        </Button>
        <Button size="sm" onClick={() => setPickerOpen(true)} className="gap-1.5">
          <Plus className="w-3.5 h-3.5" />
          Add System
        </Button>
      </div>

      {rows.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="w-14 h-14 rounded-full bg-orange-500/10 flex items-center justify-center mb-3">
              <Layers className="w-7 h-7 text-orange-500" />
            </div>
            <h3 className="font-medium">No Systems Mapped</h3>
            <p className="text-xs text-muted-foreground mt-1 mb-4">Add systems or subsystems to this VCR.</p>
            <Button size="sm" onClick={() => setPickerOpen(true)} className="gap-1.5">
              <Plus className="w-3.5 h-3.5" />
              Add System
            </Button>
          </CardContent>
        </Card>
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
                    {sys.systemAssignmentId && (
                      <Badge variant="secondary" className="text-[10px] shrink-0">Whole system</Badge>
                    )}
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

      {/* Add System Picker */}
      <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
        <DialogContent className="max-w-lg">
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
                  {s.is_hydrocarbon
                    ? <Flame className="w-3.5 h-3.5 text-orange-500" />
                    : <Snowflake className="w-3.5 h-3.5 text-blue-500" />}
                  <Badge variant="outline" className="text-[10px] font-mono">{s.system_id}</Badge>
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
        <AlertDialogContent>
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

import React, { useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Plus, Trash2, Eye, ShieldAlert, Pencil, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface InspectionTestPlanStepProps {
  vcrId: string;
  projectCode?: string;
}

interface ITPRow {
  id: string;
  system_id: string;
  activity_name: string;
  inspection_type: 'WITNESS' | 'HOLD';
  notes: string | null;
  display_order: number;
  isNew?: boolean;
}

interface MappedSystem {
  systemId: string;
  name: string;
  systemCode: string;
  isHydrocarbon: boolean;
}

export const InspectionTestPlanStep: React.FC<InspectionTestPlanStepProps> = ({ vcrId }) => {
  const queryClient = useQueryClient();

  const [selectedSystem, setSelectedSystem] = useState('');
  const [activityName, setActivityName] = useState('');
  const [inspectionType, setInspectionType] = useState<'WITNESS' | 'HOLD'>('WITNESS');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editType, setEditType] = useState<'WITNESS' | 'HOLD'>('WITNESS');

  // ── Fetch mapped systems ──
  const { data: systems = [], isLoading: loadingSystems } = useQuery({
    queryKey: ['itp-systems', vcrId],
    queryFn: async () => {
      const { data: mappings, error: mapErr } = await (supabase as any)
        .from('p2a_handover_point_systems')
        .select('system_id')
        .eq('handover_point_id', vcrId);
      if (mapErr) { console.error('[ITP] mappings error', mapErr); throw mapErr; }
      const ids = [...new Set((mappings || []).map((r: any) => r.system_id))] as string[];
      if (ids.length === 0) return [];
      const { data: sysData, error: sysErr } = await (supabase as any)
        .from('p2a_systems')
        .select('id, name, system_id, is_hydrocarbon')
        .in('id', ids)
        .order('name');
      if (sysErr) { console.error('[ITP] systems error', sysErr); throw sysErr; }
      return (sysData || []).map((s: any) => ({
        systemId: s.id,
        name: s.name || 'Unknown',
        systemCode: s.system_id || '',
        isHydrocarbon: s.is_hydrocarbon || false,
      })) as MappedSystem[];
    },
  });

  // ── Fetch existing ITP rows ──
  const { data: rows = [], isLoading: loadingRows } = useQuery({
    queryKey: ['itp-activities', vcrId],
    queryFn: async () => {
      try {
        const { data, error } = await (supabase as any)
          .from('p2a_itp_activities')
          .select('*')
          .eq('handover_point_id', vcrId)
          .order('display_order');
        if (error) { console.warn('[ITP] activities query:', error.message); return []; }
        return (data || []) as ITPRow[];
      } catch { return []; }
    },
  });

  // ── Group rows by system_id ──
  const groupedRows = useMemo(() => {
    const map = new Map<string, ITPRow[]>();
    for (const row of rows) {
      const list = map.get(row.system_id) || [];
      list.push(row);
      map.set(row.system_id, list);
    }
    return map;
  }, [rows]);

  // Ordered system ids that appear in rows
  const orderedSystemIds = useMemo(() => {
    const seen = new Set<string>();
    const result: string[] = [];
    for (const row of rows) {
      if (!seen.has(row.system_id)) {
        seen.add(row.system_id);
        result.push(row.system_id);
      }
    }
    return result;
  }, [rows]);

  const systemLookup = useMemo(() => new Map(systems.map((s) => [s.systemId, s])), [systems]);

  // ── Mutations ──
  const insertRow = useMutation({
    mutationFn: async (row: { system_id: string; activity_name: string; inspection_type: string; display_order: number }) => {
      const { error } = await (supabase as any).from('p2a_itp_activities').insert({
        id: crypto.randomUUID(),
        handover_point_id: vcrId,
        ...row,
      });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['itp-activities', vcrId] }),
  });

  const updateRow = useMutation({
    mutationFn: async ({ id, activity_name, inspection_type }: { id: string; activity_name: string; inspection_type: string }) => {
      const { error } = await (supabase as any).from('p2a_itp_activities').update({ activity_name, inspection_type }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['itp-activities', vcrId] }),
  });

  const deleteRow = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from('p2a_itp_activities').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['itp-activities', vcrId] }),
  });

  // ── Handlers ──
  const handleAdd = useCallback(() => {
    if (!selectedSystem || !activityName.trim()) return;
    insertRow.mutate({
      system_id: selectedSystem,
      activity_name: activityName.trim(),
      inspection_type: inspectionType,
      display_order: rows.length,
    });
    setActivityName('');
  }, [selectedSystem, activityName, inspectionType, rows.length, insertRow]);

  const startEdit = (row: ITPRow) => {
    setEditingId(row.id);
    setEditName(row.activity_name);
    setEditType(row.inspection_type);
  };

  const confirmEdit = () => {
    if (!editingId || !editName.trim()) return;
    updateRow.mutate({ id: editingId, activity_name: editName.trim(), inspection_type: editType });
    setEditingId(null);
  };

  const cancelEdit = () => setEditingId(null);

  const wCount = rows.filter((r) => r.inspection_type === 'WITNESS').length;
  const hCount = rows.filter((r) => r.inspection_type === 'HOLD').length;

  if (loadingSystems || loadingRows) {
    return <div className="space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-10" />)}</div>;
  }

  if (systems.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <div className="w-14 h-14 rounded-full bg-orange-500/10 flex items-center justify-center mb-3">
            <ShieldAlert className="w-7 h-7 text-orange-500" />
          </div>
          <h3 className="font-medium">No Systems Mapped</h3>
          <p className="text-xs text-muted-foreground mt-1">Map systems from the VCR workspace first.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary badges */}
      <div className="flex items-center gap-2 flex-wrap">
        <Badge variant="outline" className="text-[10px] font-mono">{systems.length} systems</Badge>
        <Badge variant="outline" className="text-[10px] font-mono">{rows.length} activities</Badge>
        {wCount > 0 && (
          <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-700 gap-1 text-[10px]">
            <Eye className="w-3 h-3" />{wCount} Witness
          </Badge>
        )}
        {hCount > 0 && (
          <Badge className="bg-red-500/15 text-red-700 dark:text-red-400 border-red-300 dark:border-red-700 gap-1 text-[10px]">
            <ShieldAlert className="w-3 h-3" />{hCount} Hold
          </Badge>
        )}
      </div>

      {/* Add form */}
      <Card>
        <CardContent className="p-3">
          <div className="flex items-end gap-2 flex-wrap">
            <div className="flex-1 min-w-[160px] space-y-1">
              <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">System</label>
              <Select value={selectedSystem} onValueChange={setSelectedSystem}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Select system..." />
                </SelectTrigger>
                <SelectContent>
                  {systems.map((s) => (
                    <SelectItem key={s.systemId} value={s.systemId} className="text-xs">
                      {s.name} <span className="text-muted-foreground ml-1">({s.systemCode})</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 min-w-[160px] space-y-1">
              <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Activity</label>
              <Input
                value={activityName}
                onChange={(e) => setActivityName(e.target.value)}
                placeholder="e.g. Leak Testing"
                className="h-8 text-xs"
                onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Type</label>
              <ToggleGroup
                type="single"
                value={inspectionType}
                onValueChange={(v) => v && setInspectionType(v as 'WITNESS' | 'HOLD')}
                className="gap-0 border rounded-md"
              >
                <ToggleGroupItem value="WITNESS" className="h-8 px-3 text-xs rounded-r-none data-[state=on]:bg-amber-500/20 data-[state=on]:text-amber-700 dark:data-[state=on]:text-amber-400">W</ToggleGroupItem>
                <ToggleGroupItem value="HOLD" className="h-8 px-3 text-xs rounded-l-none data-[state=on]:bg-red-500/20 data-[state=on]:text-red-700 dark:data-[state=on]:text-red-400">H</ToggleGroupItem>
              </ToggleGroup>
            </div>
            <Button size="sm" className="h-8 gap-1 text-xs" onClick={handleAdd} disabled={!selectedSystem || !activityName.trim() || insertRow.isPending}>
              <Plus className="w-3.5 h-3.5" />Add
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Table – grouped by system, no repeated system name */}
      {rows.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-6">No inspection activities added yet. Use the form above to add W (Witness) or H (Hold) points.</p>
      ) : (
        <div className="rounded-md border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead className="text-[11px] h-8 w-[200px] uppercase tracking-wide">System</TableHead>
                <TableHead className="text-[11px] h-8 w-[44px] uppercase tracking-wide text-center px-1">Type</TableHead>
                <TableHead className="text-[11px] h-8 uppercase tracking-wide">Activity</TableHead>
                <TableHead className="text-[11px] h-8 w-[80px] text-right uppercase tracking-wide">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orderedSystemIds.map((sysId) => {
                const sys = systemLookup.get(sysId);
                const activities = groupedRows.get(sysId) || [];

                return activities.map((row, idx) => {
                  const sysIdx = orderedSystemIds.indexOf(sysId);
                  const isFirst = idx === 0;
                  const isEditing = editingId === row.id;

                  return (
                    <TableRow
                      key={row.id}
                      className={cn(
                        'group',
                        idx < activities.length - 1 && 'border-b-0',
                        isFirst && sysIdx > 0 && 'border-t-[3px] border-t-muted',
                      )}
                    >
                      {/* System cell – only rendered on first row, spans all activities */}
                      {isFirst && (
                        <TableCell
                          className="py-2 align-top"
                          rowSpan={activities.length}
                        >
                          <div>
                            <span className="text-xs font-medium leading-tight">{sys?.name || '—'}</span>
                            {sys?.systemCode && (
                              <p className="text-[10px] text-muted-foreground/60 font-mono mt-0.5">{sys.systemCode}</p>
                            )}
                          </div>
                        </TableCell>
                      )}

                      {/* Type */}
                      <TableCell className="py-1.5 px-1 text-center">
                        {isEditing ? (
                          <ToggleGroup
                            type="single"
                            value={editType}
                            onValueChange={(v) => v && setEditType(v as 'WITNESS' | 'HOLD')}
                            className="gap-0 border rounded-md justify-center"
                          >
                            <ToggleGroupItem value="WITNESS" className="h-6 px-2 text-[10px] rounded-r-none data-[state=on]:bg-amber-500/20 data-[state=on]:text-amber-700 dark:data-[state=on]:text-amber-400">W</ToggleGroupItem>
                            <ToggleGroupItem value="HOLD" className="h-6 px-2 text-[10px] rounded-l-none data-[state=on]:bg-red-500/20 data-[state=on]:text-red-700 dark:data-[state=on]:text-red-400">H</ToggleGroupItem>
                          </ToggleGroup>
                        ) : (
                          <Badge
                            className={cn(
                              'text-[9px] font-bold px-1.5 py-0',
                              row.inspection_type === 'WITNESS'
                                ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-700'
                                : 'bg-red-500/15 text-red-700 dark:text-red-400 border-red-300 dark:border-red-700',
                            )}
                          >
                            {row.inspection_type === 'WITNESS' ? 'W' : 'H'}
                          </Badge>
                        )}
                      </TableCell>

                      {/* Activity */}
                      <TableCell className="py-1.5 text-xs">
                        {isEditing ? (
                          <Input
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="h-7 text-xs"
                            autoFocus
                            onKeyDown={(e) => { if (e.key === 'Enter') confirmEdit(); if (e.key === 'Escape') cancelEdit(); }}
                          />
                        ) : (
                          row.activity_name
                        )}
                      </TableCell>

                      {/* Actions */}
                      <TableCell className="py-1.5 text-right">
                        {isEditing ? (
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={confirmEdit}><Check className="w-3.5 h-3.5 text-green-600" /></Button>
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={cancelEdit}><X className="w-3.5 h-3.5" /></Button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => startEdit(row)}><Pencil className="w-3 h-3" /></Button>
                            <Button variant="ghost" size="icon" className="h-6 w-6 hover:bg-destructive/10 hover:text-destructive" onClick={() => deleteRow.mutate(row.id)}>
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                });
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
};

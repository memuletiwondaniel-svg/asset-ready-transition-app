import React, { useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext, verticalListSortingStrategy, useSortable, arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Plus, Trash2, Eye, ShieldAlert, Pencil, Check, X, GripVertical } from 'lucide-react';
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

// ── Sortable activity row ──
const SortableActivityRow: React.FC<{
  row: ITPRow;
  isEditing: boolean;
  editName: string;
  editType: 'WITNESS' | 'HOLD';
  onStartEdit: (row: ITPRow) => void;
  onConfirmEdit: () => void;
  onCancelEdit: () => void;
  onEditNameChange: (v: string) => void;
  onEditTypeChange: (v: 'WITNESS' | 'HOLD') => void;
  onDelete: (id: string) => void;
}> = ({ row, isEditing, editName, editType, onStartEdit, onConfirmEdit, onCancelEdit, onEditNameChange, onEditTypeChange, onDelete }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: row.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'group/activity flex items-center gap-1.5 py-1 px-1 rounded-md transition-colors hover:bg-muted/50',
        isDragging && 'opacity-50 bg-muted/30',
      )}
    >
      {/* Drag handle – auto-hide */}
      <button
        {...attributes}
        {...listeners}
        className="shrink-0 w-4 h-4 flex items-center justify-center cursor-grab active:cursor-grabbing text-muted-foreground/30 opacity-0 group-hover/activity:opacity-100 transition-opacity"
      >
        <GripVertical className="w-3 h-3" />
      </button>

      {/* Activity name */}
      <div className="flex-1 min-w-0">
        {isEditing ? (
          <Input
            value={editName}
            onChange={(e) => onEditNameChange(e.target.value)}
            className="h-7 text-xs"
            autoFocus
            onKeyDown={(e) => { if (e.key === 'Enter') onConfirmEdit(); if (e.key === 'Escape') onCancelEdit(); }}
          />
        ) : (
          <span className="text-xs">{row.activity_name}</span>
        )}
      </div>

      {/* Type badge – tight to activity */}
      <div className="shrink-0 ml-0.5">
        {isEditing ? (
          <ToggleGroup
            type="single"
            value={editType}
            onValueChange={(v) => v && onEditTypeChange(v as 'WITNESS' | 'HOLD')}
            className="gap-0 border rounded-md"
          >
            <ToggleGroupItem value="WITNESS" className="h-5 px-1.5 text-[9px] rounded-r-none data-[state=on]:bg-amber-500/20 data-[state=on]:text-amber-700 dark:data-[state=on]:text-amber-400">W</ToggleGroupItem>
            <ToggleGroupItem value="HOLD" className="h-5 px-1.5 text-[9px] rounded-l-none data-[state=on]:bg-red-500/20 data-[state=on]:text-red-700 dark:data-[state=on]:text-red-400">H</ToggleGroupItem>
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
      </div>

      {/* Actions */}
      <div className="shrink-0 flex items-center gap-0.5">
        {isEditing ? (
          <>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onConfirmEdit}><Check className="w-3.5 h-3.5 text-green-600" /></Button>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onCancelEdit}><X className="w-3.5 h-3.5" /></Button>
          </>
        ) : (
          <div className="flex items-center gap-0.5 opacity-0 group-hover/activity:opacity-100 transition-opacity">
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onStartEdit(row)}><Pencil className="w-3 h-3" /></Button>
            <Button variant="ghost" size="icon" className="h-6 w-6 hover:bg-destructive/10 hover:text-destructive" onClick={() => onDelete(row.id)}>
              <Trash2 className="w-3 h-3" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

// ── Sortable system group ──
const SortableSystemGroup: React.FC<{
  sysId: string;
  sys: MappedSystem | undefined;
  activities: ITPRow[];
  editingId: string | null;
  editName: string;
  editType: 'WITNESS' | 'HOLD';
  onStartEdit: (row: ITPRow) => void;
  onConfirmEdit: () => void;
  onCancelEdit: () => void;
  onEditNameChange: (v: string) => void;
  onEditTypeChange: (v: 'WITNESS' | 'HOLD') => void;
  onDelete: (id: string) => void;
  onReorderActivities: (sysId: string, oldIndex: number, newIndex: number) => void;
}> = ({ sysId, sys, activities, editingId, editName, editType, onStartEdit, onConfirmEdit, onCancelEdit, onEditNameChange, onEditTypeChange, onDelete, onReorderActivities }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: `sys-${sysId}` });
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const handleActivityDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = activities.findIndex((a) => a.id === active.id);
    const newIndex = activities.findIndex((a) => a.id === over.id);
    if (oldIndex >= 0 && newIndex >= 0) {
      onReorderActivities(sysId, oldIndex, newIndex);
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'border rounded-md overflow-hidden transition-all',
        isDragging && 'opacity-50',
      )}
    >
      {/* System header */}
      <div className="group/sys flex items-center gap-2 px-3 py-2.5 bg-muted/20">
        <button
          {...attributes}
          {...listeners}
          className="shrink-0 w-4 h-4 flex items-center justify-center cursor-grab active:cursor-grabbing text-muted-foreground/30 opacity-0 group-hover/sys:opacity-100 transition-opacity"
        >
          <GripVertical className="w-3.5 h-3.5" />
        </button>
        <div className="flex-1 min-w-0">
          <span className="text-xs font-semibold">{sys?.name || '—'}</span>
          {sys?.systemCode && (
            <span className="text-[10px] text-muted-foreground/50 font-mono ml-2">{sys.systemCode}</span>
          )}
        </div>
        <Badge variant="outline" className="text-[9px] font-mono px-1.5 py-0">{activities.length}</Badge>
      </div>

      {/* Activities list – indented, subtle bg */}
      <div className="pl-6 pr-2 py-1.5 bg-background border-t border-border/40">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleActivityDragEnd}>
          <SortableContext items={activities.map((a) => a.id)} strategy={verticalListSortingStrategy}>
            {activities.map((row) => (
              <SortableActivityRow
                key={row.id}
                row={row}
                isEditing={editingId === row.id}
                editName={editName}
                editType={editType}
                onStartEdit={onStartEdit}
                onConfirmEdit={onConfirmEdit}
                onCancelEdit={onCancelEdit}
                onEditNameChange={onEditNameChange}
                onEditTypeChange={onEditTypeChange}
                onDelete={onDelete}
              />
            ))}
          </SortableContext>
        </DndContext>
      </div>
    </div>
  );
};

// ── Main component ──
export const InspectionTestPlanStep: React.FC<InspectionTestPlanStepProps> = ({ vcrId }) => {
  const queryClient = useQueryClient();

  const [selectedSystem, setSelectedSystem] = useState('');
  const [activityName, setActivityName] = useState('');
  const [inspectionType, setInspectionType] = useState<'WITNESS' | 'HOLD'>('WITNESS');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editType, setEditType] = useState<'WITNESS' | 'HOLD'>('WITNESS');

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

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

  // ── Grouped data ──
  const { groupedRows, orderedSystemIds } = useMemo(() => {
    const map = new Map<string, ITPRow[]>();
    const order: string[] = [];
    const seen = new Set<string>();
    for (const row of rows) {
      const list = map.get(row.system_id) || [];
      list.push(row);
      map.set(row.system_id, list);
      if (!seen.has(row.system_id)) { seen.add(row.system_id); order.push(row.system_id); }
    }
    return { groupedRows: map, orderedSystemIds: order };
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

  const bulkUpdateOrder = useMutation({
    mutationFn: async (updates: { id: string; display_order: number }[]) => {
      for (const u of updates) {
        const { error } = await (supabase as any).from('p2a_itp_activities').update({ display_order: u.display_order }).eq('id', u.id);
        if (error) throw error;
      }
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

  const startEdit = (row: ITPRow) => { setEditingId(row.id); setEditName(row.activity_name); setEditType(row.inspection_type); };
  const confirmEdit = () => {
    if (!editingId || !editName.trim()) return;
    updateRow.mutate({ id: editingId, activity_name: editName.trim(), inspection_type: editType });
    setEditingId(null);
  };
  const cancelEdit = () => setEditingId(null);

  // Reorder activities within a system
  const handleReorderActivities = useCallback((sysId: string, oldIndex: number, newIndex: number) => {
    const activities = groupedRows.get(sysId);
    if (!activities) return;
    const reordered = arrayMove(activities, oldIndex, newIndex);
    // Optimistic update via query cache
    queryClient.setQueryData(['itp-activities', vcrId], (prev: ITPRow[] | undefined) => {
      if (!prev) return prev;
      const others = prev.filter((r) => r.system_id !== sysId);
      const updated = reordered.map((a, i) => ({ ...a, display_order: i }));
      return [...others, ...updated].sort((a, b) => a.display_order - b.display_order);
    });
    bulkUpdateOrder.mutate(reordered.map((a, i) => ({ id: a.id, display_order: i })));
  }, [groupedRows, queryClient, vcrId, bulkUpdateOrder]);

  // Reorder system groups
  const handleSystemDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const activeId = (active.id as string).replace('sys-', '');
    const overId = (over.id as string).replace('sys-', '');
    const oldIdx = orderedSystemIds.indexOf(activeId);
    const newIdx = orderedSystemIds.indexOf(overId);
    if (oldIdx < 0 || newIdx < 0) return;

    const newOrder = arrayMove(orderedSystemIds, oldIdx, newIdx);
    // Reassign display_order globally based on new system order
    const updates: { id: string; display_order: number }[] = [];
    let order = 0;
    for (const sysId of newOrder) {
      const activities = groupedRows.get(sysId) || [];
      for (const a of activities) {
        updates.push({ id: a.id, display_order: order++ });
      }
    }
    // Optimistic
    queryClient.setQueryData(['itp-activities', vcrId], (prev: ITPRow[] | undefined) => {
      if (!prev) return prev;
      return updates.map((u) => {
        const existing = prev.find((r) => r.id === u.id);
        return existing ? { ...existing, display_order: u.display_order } : null;
      }).filter(Boolean).sort((a, b) => a!.display_order - b!.display_order) as ITPRow[];
    });
    bulkUpdateOrder.mutate(updates);
  }, [orderedSystemIds, groupedRows, queryClient, vcrId, bulkUpdateOrder]);

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

      {/* System groups with DnD */}
      {rows.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-6">No inspection activities added yet. Use the form above to add W (Witness) or H (Hold) points.</p>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleSystemDragEnd}>
          <SortableContext items={orderedSystemIds.map((id) => `sys-${id}`)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {orderedSystemIds.map((sysId) => (
                <SortableSystemGroup
                  key={sysId}
                  sysId={sysId}
                  sys={systemLookup.get(sysId)}
                  activities={groupedRows.get(sysId) || []}
                  editingId={editingId}
                  editName={editName}
                  editType={editType}
                  onStartEdit={startEdit}
                  onConfirmEdit={confirmEdit}
                  onCancelEdit={cancelEdit}
                  onEditNameChange={setEditName}
                  onEditTypeChange={setEditType}
                  onDelete={(id) => deleteRow.mutate(id)}
                  onReorderActivities={handleReorderActivities}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
};

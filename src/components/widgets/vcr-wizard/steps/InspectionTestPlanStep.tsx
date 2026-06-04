import React, { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '@/components/ui/tooltip';
import { Eye, Plus, Pencil, Trash2, ShieldAlert } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { AddWitnessHoldPointModal } from './witness-hold/AddWitnessHoldPointModal';

interface InspectionTestPlanStepProps {
  vcrId: string;
  projectCode?: string;
}

interface ITPRow {
  id: string;
  system_id: string;
  activity_name: string;
  inspection_type: 'WITNESS' | 'HOLD' | string;
  notes: string | null;
  display_order: number;
}

interface MappedSystem {
  systemId: string;
  name: string;
  systemCode: string;
}

const pluralize = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

export const InspectionTestPlanStep: React.FC<InspectionTestPlanStepProps> = ({ vcrId }) => {
  const queryClient = useQueryClient();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<ITPRow | null>(null);
  const [recentlyAddedId, setRecentlyAddedId] = useState<string | null>(null);

  // Systems mapped to this VCR
  const { data: systems = [], isLoading: loadingSystems } = useQuery<MappedSystem[]>({
    queryKey: ['itp-systems', vcrId],
    queryFn: async () => {
      const { data: mappings } = await (supabase as any)
        .from('p2a_handover_point_systems')
        .select('system_id')
        .eq('handover_point_id', vcrId);
      const ids = [...new Set((mappings || []).map((r: any) => r.system_id))] as string[];
      if (ids.length === 0) return [];
      const { data: sysData } = await (supabase as any)
        .from('p2a_systems')
        .select('id, name, system_id')
        .in('id', ids)
        .order('name');
      return (sysData || []).map((s: any) => ({
        systemId: s.id,
        name: s.name || 'Unknown',
        systemCode: s.system_id || '',
      }));
    },
  });

  // Witness/Hold rows
  const { data: rows = [], isLoading: loadingRows } = useQuery<ITPRow[]>({
    queryKey: ['itp-activities', vcrId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('p2a_itp_activities')
        .select('*')
        .eq('handover_point_id', vcrId)
        .order('display_order');
      if (error) { console.warn('[ITP] activities:', error.message); return []; }
      return (data || []) as ITPRow[];
    },
  });

  // Highlight a new row after add
  const handleAdded = () => {
    queryClient.invalidateQueries({ queryKey: ['itp-activities', vcrId] }).then(() => {
      const sorted = (queryClient.getQueryData<ITPRow[]>(['itp-activities', vcrId]) || [])
        .slice().sort((a, b) => (b.display_order ?? 0) - (a.display_order ?? 0));
      if (sorted[0]) {
        setRecentlyAddedId(sorted[0].id);
        setTimeout(() => setRecentlyAddedId(null), 600);
      }
    });
  };

  const systemLookup = useMemo(() => new Map(systems.map((s) => [s.systemId, s])), [systems]);

  // Group rows by system_id
  const grouped = useMemo(() => {
    const map = new Map<string, ITPRow[]>();
    rows.forEach((r) => {
      const list = map.get(r.system_id) || [];
      list.push(r);
      map.set(r.system_id, list);
    });
    return map;
  }, [rows]);

  const orderedSystemIds = useMemo(() => {
    const seen = new Set<string>();
    const out: string[] = [];
    rows.forEach((r) => {
      if (!seen.has(r.system_id)) { seen.add(r.system_id); out.push(r.system_id); }
    });
    return out;
  }, [rows]);

  const wCount = rows.filter((r) => r.inspection_type === 'WITNESS').length;
  const hCount = rows.filter((r) => r.inspection_type === 'HOLD').length;
  const systemCount = orderedSystemIds.length;

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from('p2a_itp_activities').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['itp-activities', vcrId] });
      toast.success('Point removed');
      setPendingDelete(null);
    },
    onError: (e: any) => toast.error(e?.message || 'Failed to delete'),
  });

  const openAdd = () => { setEditingId(null); setModalOpen(true); };
  const openEdit = (row: ITPRow) => { setEditingId(row.id); setModalOpen(true); };

  if (loadingSystems || loadingRows) {
    return <div className="space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-10" />)}</div>;
  }

  if (systems.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 border border-dashed border-border/60 rounded-md">
        <div className="w-11 h-11 rounded-full bg-muted/60 flex items-center justify-center mb-3">
          <ShieldAlert className="w-5 h-5 text-muted-foreground" />
        </div>
        <h3 className="text-sm font-medium">No systems mapped</h3>
        <p className="text-xs text-muted-foreground mt-1">Map systems from the Systems step first.</p>
      </div>
    );
  }

  const isEmpty = rows.length === 0;

  return (
    <TooltipProvider>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-0.5">
            <h2 className="text-base font-semibold">Witness &amp; Hold points</h2>
            <p className="text-xs text-muted-foreground">
              Identify activities where ORA must witness or place a hold before commissioning can proceed.
            </p>
          </div>
          {!isEmpty && (
            <Button variant="outline" size="sm" onClick={openAdd} className="gap-1.5 shrink-0">
              <Plus className="w-3.5 h-3.5" /> Add point
            </Button>
          )}
        </div>

        {isEmpty ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-11 h-11 rounded-full bg-muted flex items-center justify-center mb-4">
              <Eye className="w-[22px] h-[22px] text-muted-foreground" />
            </div>
            <h3 className="text-sm font-medium">No witness or hold points yet</h3>
            <p className="text-[13px] text-muted-foreground max-w-[380px] mt-2 leading-relaxed">
              Identify commissioning activities that require ORA presence (witness) or approval before proceeding (hold). Examples: pigging, dewatering, hydrotest sign-off.
            </p>
            <Button variant="outline" size="sm" onClick={openAdd} className="gap-1.5 mt-4">
              <Plus className="w-3.5 h-3.5" /> Add first point
            </Button>
          </div>
        ) : (
          <>
            {/* Stat pills */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center px-2.5 py-[3px] rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 text-xs font-medium">
                Witness {wCount}
              </span>
              <span className="inline-flex items-center px-2.5 py-[3px] rounded-full bg-red-50 dark:bg-red-950/40 text-red-800 dark:text-red-300 text-xs font-medium">
                Hold {hCount}
              </span>
              <span className="text-xs text-muted-foreground">across {pluralize(systemCount, 'system')}</span>
            </div>

            {/* Table */}
            <div className="border border-border/60 rounded-md overflow-hidden">
              <div className="grid grid-cols-[minmax(180px,260px)_60px_1fr_60px] bg-muted/40 text-[11px] uppercase tracking-[0.04em] text-muted-foreground">
                <div className="px-3.5 py-2">System</div>
                <div className="px-3.5 py-2 text-center">Type</div>
                <div className="px-3.5 py-2">Activity</div>
                <div className="px-3.5 py-2" />
              </div>
              <div>
                {orderedSystemIds.map((sysId) => {
                  const sys = systemLookup.get(sysId);
                  const activities = grouped.get(sysId) || [];
                  return activities.map((row, idx) => {
                    const isFirst = idx === 0;
                    const isHighlight = recentlyAddedId === row.id;
                    return (
                      <div
                        key={row.id}
                        onClick={() => openEdit(row)}
                        className={cn(
                          'group grid grid-cols-[minmax(180px,260px)_60px_1fr_60px] items-center border-t border-border/40 first:border-t-0 cursor-pointer transition-colors',
                          'hover:bg-muted/30',
                          isHighlight && 'bg-muted/40',
                        )}
                      >
                        {/* System cell */}
                        <div className="px-3.5 py-2">
                          {isFirst ? (
                            <div>
                              <div className="text-[13px] font-medium leading-tight">{sys?.name || '—'}</div>
                              {sys?.systemCode && (
                                <div className="text-[11px] text-muted-foreground/70 font-mono mt-0.5">{sys.systemCode}</div>
                              )}
                            </div>
                          ) : null}
                        </div>

                        {/* Type badge */}
                        <div className="px-3.5 py-2 flex justify-center">
                          <TypeBadge type={row.inspection_type} />
                        </div>

                        {/* Activity */}
                        <div className="px-3.5 py-2 text-[13px]">{row.activity_name}</div>

                        {/* Actions */}
                        <div className="px-3.5 py-2 flex items-center justify-end gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={(e) => { e.stopPropagation(); openEdit(row); }}
                            className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
                            aria-label="Edit"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); setPendingDelete(row); }}
                            className="p-1.5 rounded text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                            aria-label="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  });
                })}
              </div>
            </div>
          </>
        )}

        <AddWitnessHoldPointModal
          vcrId={vcrId}
          open={modalOpen}
          onOpenChange={setModalOpen}
          editingActivityId={editingId}
          onAdded={handleAdded}
          onClose={() => setEditingId(null)}
        />

        <AlertDialog open={!!pendingDelete} onOpenChange={(o) => !o && setPendingDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remove this point?</AlertDialogTitle>
              <AlertDialogDescription>
                {pendingDelete && (
                  <>
                    Remove the {pendingDelete.inspection_type === 'WITNESS' ? 'witness' : 'hold'} point
                    <span className="font-medium text-foreground"> &ldquo;{pendingDelete.activity_name}&rdquo;</span>?
                    This action can&apos;t be undone.
                  </>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => pendingDelete && deleteMutation.mutate(pendingDelete.id)}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Remove
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </TooltipProvider>
  );
};

const TypeBadge: React.FC<{ type: string }> = ({ type }) => {
  const isWitness = type === 'WITNESS';
  const label = isWitness ? 'Witness' : 'Hold';
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className={cn(
            'inline-flex items-center justify-center w-[22px] h-[22px] rounded-full text-[11px] font-medium',
            isWitness
              ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300'
              : 'bg-red-50 dark:bg-red-950/40 text-red-800 dark:text-red-300',
          )}
        >
          {isWitness ? 'W' : 'H'}
        </span>
      </TooltipTrigger>
      <TooltipContent side="top">{label}</TooltipContent>
    </Tooltip>
  );
};

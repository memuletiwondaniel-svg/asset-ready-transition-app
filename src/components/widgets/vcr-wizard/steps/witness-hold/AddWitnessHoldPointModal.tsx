import React, { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from '@/components/ui/command';
import { Check, ChevronDown, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  PartyPicker,
  DELIVERING_ROLE_CANDIDATES,
  ACCEPTING_ROLE_CANDIDATES,
  resolveDeliveringRole,
  resolveAcceptingParties,
} from './PartyPicker';

export interface AddWitnessHoldPointModalProps {
  vcrId: string;
  projectId?: string | null;
  systems?: { id: string; name: string; code: string }[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultSystemId?: string;
  editingActivityId?: string | null;
  onAdded?: () => void;
  onUpdated?: () => void;
  onClose?: () => void;
}

type InspectionType = 'WITNESS' | 'HOLD';

export const AddWitnessHoldPointModal: React.FC<AddWitnessHoldPointModalProps> = ({
  vcrId, projectId, systems = [], open, onOpenChange, defaultSystemId,
  editingActivityId, onAdded, onUpdated, onClose,
}) => {
  const queryClient = useQueryClient();
  const isEdit = !!editingActivityId;
  const dialogContentRef = useRef<HTMLDivElement | null>(null);

  const [systemId, setSystemId] = useState<string>('');
  const [systemOpen, setSystemOpen] = useState(false);
  const [activity, setActivity] = useState('');
  const [type, setType] = useState<InspectionType>('HOLD');
  const [notes, setNotes] = useState('');
  const [delivering, setDelivering] = useState<string[]>(['Commissioning Lead']);
  const [accepting, setAccepting] = useState<string[]>(['Snr ORA Engr']);
  const [saving, setSaving] = useState(false);

  // Load existing row + accepting parties when editing
  const { data: existing } = useQuery({
    queryKey: ['itp-activity', editingActivityId],
    enabled: open && !!editingActivityId,
    queryFn: async () => {
      const c = supabase as any;
      const [act, aps, roles] = await Promise.all([
        c.from('p2a_itp_activities').select('*').eq('id', editingActivityId).maybeSingle(),
        c.from('p2a_itp_accepting_parties').select('role_id').eq('itp_activity_id', editingActivityId),
        c.from('roles').select('id, name'),
      ]);
      if (act.error) throw act.error;
      const roleName = new Map<string, string>(
        ((roles.data as any[]) || []).map((r) => [r.id, r.name]),
      );
      const deliveringName = act.data?.delivering_party_role_id
        ? roleName.get(act.data.delivering_party_role_id) || null
        : null;
      const acceptingNames = Array.from(new Set(
        ((aps.data as any[]) || []).map((r) => roleName.get(r.role_id)).filter(Boolean) as string[],
      ));
      return { act: act.data, deliveringName, acceptingNames };
    },
  });

  useEffect(() => {
    if (!open) return;
    if (isEdit && existing?.act) {
      setSystemId(existing.act.system_id);
      setActivity(existing.act.activity_name || '');
      setType((existing.act.inspection_type === 'WITNESS' ? 'WITNESS' : 'HOLD') as InspectionType);
      setNotes(existing.act.notes || '');
      setDelivering(existing.deliveringName ? [existing.deliveringName] : ['Commissioning Lead']);
      setAccepting(existing.acceptingNames.length ? existing.acceptingNames : ['Snr ORA Engr']);
    } else if (!isEdit) {
      setSystemId(defaultSystemId || '');
      setActivity('');
      setType('HOLD');
      setNotes('');
      setDelivering(['Commissioning Lead']);
      setAccepting(['Snr ORA Engr']);
    }
  }, [open, isEdit, existing, defaultSystemId]);

  const noSystemsMapped = systems.length === 0;
  const selectedSystem = systems.find((s) => s.id === systemId);
  const canSubmit =
    !!systemId &&
    !!activity.trim() &&
    !!type &&
    delivering.length === 1 &&
    accepting.length > 0 &&
    !saving;

  const handleClose = () => { onOpenChange(false); onClose?.(); };

  const submit = async () => {
    if (!canSubmit) return;
    setSaving(true);
    try {
      const c = supabase as any;
      const deliveringRole = await resolveDeliveringRole(delivering[0]);
      const acceptingResolved = projectId
        ? await resolveAcceptingParties(projectId, accepting)
        : [];

      if (isEdit && editingActivityId) {
        const upd = await c
          .from('p2a_itp_activities')
          .update({
            system_id: systemId,
            activity_name: activity.trim(),
            inspection_type: type,
            notes: notes.trim() || null,
            delivering_party_role_id: deliveringRole?.role_id ?? null,
          })
          .eq('id', editingActivityId);
        if (upd.error) throw upd.error;

        // Reconcile accepting parties: delete PENDING rows not in the new set, add missing
        const existingAps = await c
          .from('p2a_itp_accepting_parties')
          .select('id, role_id, status')
          .eq('itp_activity_id', editingActivityId);
        const keepRoleIds = new Set(acceptingResolved.map((r) => r.role_id));
        for (const ap of (existingAps.data as any[]) || []) {
          if (!keepRoleIds.has(ap.role_id) && ap.status === 'PENDING') {
            await c.from('p2a_itp_accepting_parties').delete().eq('id', ap.id);
          }
        }
        const existingRoleIds = new Set(((existingAps.data as any[]) || []).map((r) => r.role_id));
        for (const ap of acceptingResolved) {
          if (!existingRoleIds.has(ap.role_id)) {
            await c.from('p2a_itp_accepting_parties').insert({
              itp_activity_id: editingActivityId,
              role_id: ap.role_id,
              user_id: ap.user_id,
              status: 'PENDING',
            });
          }
        }
        toast.success('Witness/Hold point updated');
        queryClient.invalidateQueries({ queryKey: ['itp-activities', vcrId] });
        queryClient.invalidateQueries({ queryKey: ['wh-points', vcrId] });
        onUpdated?.();
        handleClose();
      } else {
        const { data: maxRow } = await c
          .from('p2a_itp_activities')
          .select('display_order')
          .eq('handover_point_id', vcrId)
          .eq('system_id', systemId)
          .order('display_order', { ascending: false })
          .limit(1)
          .maybeSingle();
        const nextOrder = (maxRow?.display_order ?? -1) + 1;
        const newId = crypto.randomUUID();

        const ins = await c.from('p2a_itp_activities').insert({
          id: newId,
          handover_point_id: vcrId,
          system_id: systemId,
          activity_name: activity.trim(),
          inspection_type: type,
          notes: notes.trim() || null,
          display_order: nextOrder,
          delivering_party_role_id: deliveringRole?.role_id ?? null,
          status: 'NOT_STARTED',
        });
        if (ins.error) throw ins.error;

        if (acceptingResolved.length > 0) {
          const rows = acceptingResolved.map((r) => ({
            itp_activity_id: newId,
            role_id: r.role_id,
            user_id: r.user_id,
            status: 'PENDING',
          }));
          const insAp = await c.from('p2a_itp_accepting_parties').insert(rows);
          if (insAp.error) throw insAp.error;
        }
        toast.success(type === 'HOLD' ? 'Hold point added' : 'Witness point added');
        queryClient.invalidateQueries({ queryKey: ['itp-activities', vcrId] });
        queryClient.invalidateQueries({ queryKey: ['wh-points', vcrId] });
        onAdded?.();
        handleClose();
      }
    } catch (e: any) {
      toast.error(e?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); else onOpenChange(true); }}>
      <DialogContent
        ref={dialogContentRef}
        className="sm:max-w-[520px] p-0 gap-0 max-h-[85vh] overflow-hidden flex flex-col"
        overlayClassName="bg-black/80 backdrop-blur-sm"
      >
        <DialogHeader className="px-6 pt-5 pb-0 space-y-1">
          <DialogTitle className="text-base font-medium">
            {isEdit ? 'Edit witness or hold point' : 'Add witness or hold point'}
          </DialogTitle>
          <DialogDescription className="text-xs">
            Specify a commissioning activity that requires ORA attention.
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 pt-5 pb-4 space-y-4 overflow-y-auto">
          {/* System */}
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground">System</label>
            <Popover open={systemOpen} onOpenChange={(o) => !noSystemsMapped && setSystemOpen(o)}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  role="combobox"
                  aria-expanded={systemOpen}
                  disabled={noSystemsMapped}
                  className={cn(
                    'flex h-9 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm',
                    'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
                    'disabled:cursor-not-allowed disabled:opacity-50',
                  )}
                >
                  <span className="truncate text-left">
                    {selectedSystem
                      ? `${selectedSystem.code} · ${selectedSystem.name}`
                      : <span className="text-muted-foreground">Select system…</span>}
                  </span>
                  <ChevronDown className="h-4 w-4 opacity-50 shrink-0 ml-2" />
                </button>
              </PopoverTrigger>
              <PopoverContent
                container={dialogContentRef.current}
                className="p-0 w-[--radix-popover-trigger-width]"
                align="start"
              >
                <Command>
                  <CommandInput placeholder="Search systems…" className="h-9" />
                  <CommandList className="max-h-64 overflow-y-auto">
                    <CommandEmpty>No systems found.</CommandEmpty>
                    <CommandGroup>
                      {systems.filter((s) => !!s.id).map((s) => (
                        <CommandItem
                          key={s.id}
                          value={`${s.name} ${s.code}`}
                          onSelect={() => { setSystemId(s.id); setSystemOpen(false); }}
                          className="flex items-baseline gap-4"
                        >
                          <Check className={cn('h-4 w-4 shrink-0', systemId === s.id ? 'opacity-100' : 'opacity-0')} />
                          <span className="truncate flex-1">{s.name}</span>
                          {s.code && (
                            <span className="font-mono text-xs text-muted-foreground shrink-0">{s.code}</span>
                          )}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {/* Activity */}
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground">Activity</label>
            <Input
              value={activity}
              onChange={(e) => setActivity(e.target.value)}
              placeholder="e.g. 72-Hour Performance Test"
              className="h-9 text-sm"
            />
          </div>

          {/* Type */}
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground">Type</label>
            <div className="grid grid-cols-2 gap-2">
              <TypeCard title="Witness" description="Asset must be present during this activity"
                variant="witness" selected={type === 'WITNESS'} onClick={() => setType('WITNESS')} />
              <TypeCard title="Hold" description="Activity cannot start without Asset approval"
                variant="hold" selected={type === 'HOLD'} onClick={() => setType('HOLD')} />
            </div>
          </div>

          {/* Delivering party */}
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground">Delivered by</label>
            <PartyPicker
              projectId={projectId ?? undefined}
              candidateRoles={DELIVERING_ROLE_CANDIDATES}
              mode="single"
              selected={delivering}
              onChange={setDelivering}
            />
          </div>

          {/* Accepting parties */}
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground">Witnessed &amp; accepted by</label>
            <PartyPicker
              projectId={projectId ?? undefined}
              candidateRoles={ACCEPTING_ROLE_CANDIDATES}
              mode="multi"
              selected={accepting}
              onChange={setAccepting}
            />
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground">Notes (optional)</label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional context…"
              className="text-sm min-h-[44px] resize-y"
            />
          </div>
        </div>

        <div className="px-6 py-3 border-t border-border/60 flex items-center justify-end gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={handleClose}>Cancel</Button>
          <Button size="sm" disabled={!canSubmit} onClick={submit}>
            {saving && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />}
            {isEdit ? 'Save changes' : 'Add point'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const TypeCard: React.FC<{
  title: string; description: string;
  variant: 'witness' | 'hold'; selected: boolean; onClick: () => void;
}> = ({ title, description, variant, selected, onClick }) => {
  const isWitness = variant === 'witness';
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'text-left rounded-md px-3 py-2.5 border transition-colors',
        selected
          ? isWitness ? 'border-amber-400 bg-amber-50 dark:bg-amber-950/40'
                     : 'border-red-400 bg-red-50 dark:bg-red-950/40'
          : 'border-border/60 hover:bg-muted/50',
      )}
    >
      <div className="text-sm font-medium">{title}</div>
      <div className="text-[11px] text-muted-foreground leading-snug mt-0.5">{description}</div>
    </button>
  );
};

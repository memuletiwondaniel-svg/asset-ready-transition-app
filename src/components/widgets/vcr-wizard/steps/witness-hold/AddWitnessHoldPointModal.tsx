import React, { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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

export interface AddWitnessHoldPointModalProps {
  vcrId: string;
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

interface MappedSystem {
  id: string;
  name: string;
  code: string;
}

export const AddWitnessHoldPointModal: React.FC<AddWitnessHoldPointModalProps> = ({
  vcrId, systems = [], open, onOpenChange, defaultSystemId, editingActivityId, onAdded, onUpdated, onClose,
}) => {
  const queryClient = useQueryClient();
  const isEdit = !!editingActivityId;

  const [systemId, setSystemId] = useState<string>('');
  const [systemOpen, setSystemOpen] = useState(false);
  const [activity, setActivity] = useState('');
  const [type, setType] = useState<InspectionType>('HOLD');
  const [notes, setNotes] = useState('');
  
  const [saving, setSaving] = useState(false);

  // Load existing row when editing
  const { data: existing } = useQuery({
    queryKey: ['itp-activity', editingActivityId],
    enabled: open && !!editingActivityId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('p2a_itp_activities')
        .select('*')
        .eq('id', editingActivityId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  // Reset form whenever the modal opens
  useEffect(() => {
    if (!open) return;
    if (isEdit && existing) {
      setSystemId(existing.system_id);
      setActivity(existing.activity_name || '');
      setType((existing.inspection_type === 'WITNESS' ? 'WITNESS' : 'HOLD') as InspectionType);
      setNotes(existing.notes || '');
      
    } else if (!isEdit) {
      setSystemId(defaultSystemId || '');
      setActivity('');
      setType('HOLD');
      setNotes('');
    }
  }, [open, isEdit, existing, defaultSystemId]);

  const noSystemsMapped = systems.length === 0;
  const selectedSystem = systems.find((system) => system.id === systemId);

  const canSubmit = !!systemId && !!activity.trim() && !!type && !saving;

  const handleClose = () => {
    onOpenChange(false);
    onClose?.();
  };

  const submit = async () => {
    if (!canSubmit) return;
    setSaving(true);
    try {
      if (isEdit && editingActivityId) {
        const { error } = await (supabase as any)
          .from('p2a_itp_activities')
          .update({
            system_id: systemId,
            activity_name: activity.trim(),
            inspection_type: type,
            notes: notes.trim() || null,
          })
          .eq('id', editingActivityId);
        if (error) throw error;
        toast.success('Witness/Hold point updated');
        queryClient.invalidateQueries({ queryKey: ['itp-activities', vcrId] });
        onUpdated?.();
        handleClose();
      } else {
        // Compute next display_order scoped to (handover_point_id, system_id)
        const { data: maxRow } = await (supabase as any)
          .from('p2a_itp_activities')
          .select('display_order')
          .eq('handover_point_id', vcrId)
          .eq('system_id', systemId)
          .order('display_order', { ascending: false })
          .limit(1)
          .maybeSingle();
        const nextOrder = (maxRow?.display_order ?? -1) + 1;

        const { error } = await (supabase as any).from('p2a_itp_activities').insert({
          id: crypto.randomUUID(),
          handover_point_id: vcrId,
          system_id: systemId,
          activity_name: activity.trim(),
          inspection_type: type,
          notes: notes.trim() || null,
          display_order: nextOrder,
        });
        if (error) throw error;
        toast.success(type === 'HOLD' ? 'Hold point added' : 'Witness point added');
        queryClient.invalidateQueries({ queryKey: ['itp-activities', vcrId] });
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
        className="sm:max-w-[440px] p-0 gap-0 z-[200]"
        overlayClassName="z-[199] bg-black/80 backdrop-blur-sm"
      >
        <DialogHeader className="px-6 pt-5 pb-0 space-y-1">
          <DialogTitle className="text-base font-medium">
            {isEdit ? 'Edit witness or hold point' : 'Add witness or hold point'}
          </DialogTitle>
          <DialogDescription className="text-xs">
            Specify a commissioning activity that requires ORA attention.
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 pt-5 pb-4 space-y-3.5">
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
                  title={noSystemsMapped ? 'Add systems first (step 1)' : undefined}
                  className={cn(
                    'flex h-9 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background',
                    'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
                    'disabled:cursor-not-allowed disabled:opacity-50',
                  )}
                >
                  <span className="truncate text-left">
                    {selectedSystem ? selectedSystem.name : (
                      <span className="text-muted-foreground">Select system…</span>
                    )}
                  </span>
                  <ChevronDown className="h-4 w-4 opacity-50 shrink-0 ml-2" />
                </button>
              </PopoverTrigger>
              <PopoverContent
                className="p-0 z-[210] w-[--radix-popover-trigger-width]"
                align="start"
              >
                <Command>
                  <CommandInput placeholder="Search systems…" className="h-9" />
                  <CommandList>
                    <CommandEmpty>No systems found.</CommandEmpty>
                    <CommandGroup>
                      {systems.filter((s) => !!s.id).map((s) => (
                        <CommandItem
                          key={s.id}
                          value={`${s.name} ${s.code}`}
                          onSelect={() => {
                            setSystemId(s.id);
                            setSystemOpen(false);
                          }}
                          className="flex items-baseline gap-4"
                        >
                          <Check
                            className={cn(
                              'h-4 w-4 shrink-0',
                              systemId === s.id ? 'opacity-100' : 'opacity-0',
                            )}
                          />
                          <span className="truncate flex-1">{s.name}</span>
                          {s.code && (
                            <span className="font-mono text-xs text-muted-foreground shrink-0">
                              {s.code}
                            </span>
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

          {/* Type radio cards */}
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground">Type</label>
            <div className="grid grid-cols-2 gap-2">
              <TypeCard
                title="Witness"
                description="Asset must be present during this activity"
                variant="witness"
                selected={type === 'WITNESS'}
                onClick={() => setType('WITNESS')}
              />
              <TypeCard
                title="Hold"
                description="Activity cannot start without Asset approval"
                variant="hold"
                selected={type === 'HOLD'}
                onClick={() => setType('HOLD')}
              />
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground">Notes (optional)</label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional context for the witnessing party…"
              className="text-sm min-h-[44px] resize-y"
            />
          </div>

        </div>

        <div className="px-6 py-3 border-t border-border/60 flex items-center justify-end gap-2">
          <Button variant="outline" size="sm" onClick={handleClose}>
            Cancel
          </Button>
          <Button size="sm" disabled={!canSubmit} onClick={submit}>
            {saving && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />}
            {isEdit ? 'Save changes' : 'Add point'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// ─── Type radio card ─────────────────────────────────────────────────────────

const TypeCard: React.FC<{
  title: string;
  description: string;
  variant: 'witness' | 'hold';
  selected: boolean;
  onClick: () => void;
}> = ({ title, description, variant, selected, onClick }) => {
  const isWitness = variant === 'witness';
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'text-left rounded-md px-3 py-2.5 border transition-colors',
        selected
          ? isWitness
            ? 'border-amber-400 bg-amber-50 dark:bg-amber-950/40 dark:border-amber-700'
            : 'border-red-400 bg-red-50 dark:bg-red-950/40 dark:border-red-700'
          : isWitness
            ? 'border-border/60 hover:border-amber-300 hover:bg-amber-50/50 dark:hover:bg-amber-950/20'
            : 'border-border/60 hover:border-red-300 hover:bg-red-50/50 dark:hover:bg-red-950/20',
      )}
    >
      <div className={cn(
        'text-sm font-medium',
        selected && (isWitness ? 'text-amber-900 dark:text-amber-200' : 'text-red-900 dark:text-red-200'),
      )}>{title}</div>
      <div className="text-[11px] text-muted-foreground leading-snug mt-0.5">{description}</div>
    </button>
  );
};

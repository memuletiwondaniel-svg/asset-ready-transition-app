import React, { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { CalendarIcon, Plus, X } from 'lucide-react';
import { format } from 'date-fns';
import { useProfileUsers } from '@/hooks/useProfileUsers';
import { useRaiseQualification } from '@/hooks/useQualificationDetail';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { cn } from '@/lib/utils';

interface PrereqOption {
  id: string;
  code: string;
  summary: string;
}

interface Approver {
  user_id: string;
  full_name: string;
  role: string;
  avatar_url?: string;
}

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  handoverPointId: string;
  vcrCode?: string;
  vcrName?: string;
  lockedPrerequisiteId?: string;
  prereqs: PrereqOption[];
}

export const RaiseQualificationModal: React.FC<Props> = ({
  open, onOpenChange, handoverPointId, vcrCode, vcrName, lockedPrerequisiteId, prereqs,
}) => {
  const [prereqId, setPrereqId] = useState<string>(lockedPrerequisiteId || prereqs[0]?.id || '');
  const [reason, setReason] = useState('');
  const [mitigation, setMitigation] = useState('');
  const [followUp, setFollowUp] = useState('');
  const [targetDate, setTargetDate] = useState<Date | undefined>(undefined);
  const [approvers, setApprovers] = useState<Approver[]>([]);
  const [manuallyEdited, setManuallyEdited] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const { data: profiles } = useProfileUsers();
  const { raise } = useRaiseQualification();

  useEffect(() => {
    if (open) {
      setPrereqId(lockedPrerequisiteId || prereqs[0]?.id || '');
      setReason(''); setMitigation(''); setFollowUp('');
      setTargetDate(new Date(Date.now() + 14 * 86400000));
      setApprovers([]);
      setManuallyEdited(false);
    }
  }, [open, lockedPrerequisiteId, prereqs]);

  // Fetch default approvers for the selected item, resolved with profile + role name.
  const { data: defaultApprovers } = useQuery({
    queryKey: ['prereq-approvers-default-resolved', prereqId],
    enabled: !!prereqId && open,
    queryFn: async (): Promise<Approver[]> => {
      const { data: rows } = await (supabase as any)
        .from('vcr_prerequisite_approvals')
        .select('approver_user_id, approver_role_id')
        .eq('prerequisite_id', prereqId);
      const list = (rows || []) as Array<{ approver_user_id: string; approver_role_id: string | null }>;
      if (!list.length) return [];
      const userIds = Array.from(new Set(list.map(r => r.approver_user_id).filter(Boolean)));
      const roleIds = Array.from(new Set(list.map(r => r.approver_role_id).filter(Boolean) as string[]));
      const [{ data: profs }, { data: rls }] = await Promise.all([
        supabase.from('profiles').select('user_id, full_name, avatar_url').in('user_id', userIds),
        roleIds.length
          ? supabase.from('roles').select('id, name').in('id', roleIds)
          : Promise.resolve({ data: [] as any[] } as any),
      ]);
      const pMap = new Map((profs || []).map((p: any) => [p.user_id, p]));
      const rMap = new Map((rls || []).map((r: any) => [r.id, r.name]));
      const seen = new Set<string>();
      const out: Approver[] = [];
      for (const r of list) {
        if (!r.approver_user_id || seen.has(r.approver_user_id)) continue;
        seen.add(r.approver_user_id);
        const p: any = pMap.get(r.approver_user_id);
        out.push({
          user_id: r.approver_user_id,
          full_name: p?.full_name || 'Unknown',
          role: (r.approver_role_id && rMap.get(r.approver_role_id)) || '',
          avatar_url: p?.avatar_url || undefined,
        });
      }
      return out;
    },
  });

  // Reset approvers when item changes (unless user manually edited)
  useEffect(() => {
    if (!manuallyEdited && defaultApprovers) {
      setApprovers(defaultApprovers);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultApprovers, prereqId]);

  const removeApprover = (uid: string) => {
    setManuallyEdited(true);
    setApprovers(a => a.filter(x => x.user_id !== uid));
  };
  const addApprover = (p: any) => {
    setManuallyEdited(true);
    setApprovers(a => a.some(x => x.user_id === p.user_id) ? a : [...a, {
      user_id: p.user_id, full_name: p.full_name, role: p.role || p.position || '', avatar_url: p.avatar_url,
    }]);
    setPickerOpen(false);
  };

  const canSubmit =
    !!prereqId && reason.trim().length > 5 && mitigation.trim().length > 5 &&
    !!targetDate && approvers.length > 0;

  const submit = (draft: boolean) => {
    if (!targetDate) return;
    raise.mutate({
      vcr_prerequisite_id: prereqId,
      handover_point_id: handoverPointId,
      vcr_code: vcrCode,
      vcr_name: vcrName,
      reason: reason.trim(),
      mitigation: mitigation.trim(),
      follow_up_action: followUp.trim() || undefined,
      target_date: format(targetDate, 'yyyy-MM-dd'),
      approver_user_ids: approvers.map(a => a.user_id),
      approver_role_labels: Object.fromEntries(approvers.map(a => [a.user_id, a.role])),
      draft,
    }, { onSuccess: () => onOpenChange(false) });
  };

  const selectedPrereq = prereqs.find(p => p.id === prereqId);
  const eyebrow = `${vcrCode || 'VCR'}${vcrName ? ` (${vcrName})` : ''}`;
  const pickerCandidates = (profiles || []).filter(
    (p: any) => !approvers.some(a => a.user_id === p.user_id),
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl !z-modal-critical" overlayClassName="!z-overlay-critical">
        <DialogHeader className="space-y-1">
          <div className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            {eyebrow}
          </div>
          <DialogTitle className="text-lg">Raise qualification</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* VCR item */}
          <div className="space-y-1.5">
            <Label>VCR item <span className="text-red-600">*</span></Label>
            <Select value={prereqId} onValueChange={setPrereqId} disabled={!!lockedPrerequisiteId}>
              <SelectTrigger className="h-auto min-h-10 py-2">
                <SelectValue placeholder="Select item…">
                  {selectedPrereq && (
                    <span className="flex items-center gap-2 text-left">
                      {selectedPrereq.code && (
                        <span
                          className="inline-flex items-center rounded-md px-1.5 py-0.5 font-mono text-[11px] font-semibold text-slate-600"
                          style={{ background: '#EEF2F7' }}
                        >
                          {selectedPrereq.code}
                        </span>
                      )}
                      <span className="text-xs truncate">{selectedPrereq.summary}</span>
                    </span>
                  )}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {prereqs.map(p => (
                  <SelectItem key={p.id} value={p.id}>
                    <span className="flex items-center gap-2">
                      {p.code && (
                        <span
                          className="inline-flex items-center rounded-md px-1.5 py-0.5 font-mono text-[11px] font-semibold text-slate-600"
                          style={{ background: '#EEF2F7' }}
                        >
                          {p.code}
                        </span>
                      )}
                      <span className="text-xs">{p.summary.slice(0, 80)}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Approvers */}
          <div className="space-y-2">
            <Label>Qualification approvers <span className="text-red-600">*</span></Label>
            <div className="grid grid-cols-2 gap-2">
              {approvers.map(a => (
                <div
                  key={a.user_id}
                  className="group relative flex items-center gap-2 rounded-md border bg-muted/30 p-2"
                >
                  <Avatar className="h-8 w-8">
                    {a.avatar_url && <AvatarImage src={a.avatar_url} />}
                    <AvatarFallback className="text-[10px]">
                      {(a.full_name || '?').split(' ').map(s => s[0]).join('').slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-medium truncate">{a.full_name}</div>
                    <div className="text-[10px] text-muted-foreground truncate">{a.role || '—'}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeApprover(a.user_id)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity absolute top-1 right-1 rounded-full bg-background border p-0.5 hover:bg-red-50 hover:text-red-600"
                    aria-label={`Remove ${a.full_name}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
            <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  <Plus className="h-3.5 w-3.5" /> Add approver
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-0 pointer-events-auto" align="start">
                <Command>
                  <CommandInput placeholder="Search people…" />
                  <CommandList>
                    <CommandEmpty>No people found.</CommandEmpty>
                    <CommandGroup>
                      {pickerCandidates.slice(0, 50).map((p: any) => (
                        <CommandItem
                          key={p.user_id}
                          value={`${p.full_name} ${p.role || ''} ${p.email || ''}`}
                          onSelect={() => addApprover(p)}
                          className="gap-2"
                        >
                          <Avatar className="h-6 w-6">
                            {p.avatar_url && <AvatarImage src={p.avatar_url} />}
                            <AvatarFallback className="text-[9px]">
                              {(p.full_name || '?').slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 flex-1">
                            <div className="text-xs font-medium truncate">{p.full_name}</div>
                            {p.role && <div className="text-[10px] text-muted-foreground truncate">{p.role}</div>}
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            <p className="text-[11px] text-muted-foreground">
              Defaults to the VCR item's approvers · hover to remove
            </p>
          </div>

          {/* Reason */}
          <div className="space-y-1.5">
            <Label>Reason <span className="text-red-600">*</span></Label>
            <Textarea
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="Why this item cannot be fully closed at handover"
              className="min-h-[70px]"
            />
          </div>

          {/* Mitigation */}
          <div className="space-y-1.5">
            <Label>Mitigation <span className="text-red-600">*</span></Label>
            <Textarea
              value={mitigation}
              onChange={e => setMitigation(e.target.value)}
              placeholder="Interim controls in place while the item remains open"
              className="min-h-[70px]"
            />
          </div>

          {/* Follow-up */}
          <div className="space-y-1.5">
            <Label>Follow-up action</Label>
            <Textarea
              value={followUp}
              onChange={e => setFollowUp(e.target.value)}
              placeholder="What closes this out"
              className="min-h-[50px]"
            />
          </div>

          {/* Target close-out */}
          <div className="space-y-1.5">
            <Label>Target close-out</Label>
            <div>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'h-9 justify-start text-left font-normal gap-2',
                      !targetDate && 'text-muted-foreground',
                    )}
                  >
                    <CalendarIcon className="h-4 w-4" />
                    {targetDate ? format(targetDate, 'd MMM yyyy') : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 pointer-events-auto" align="start">
                  <Calendar
                    mode="single"
                    selected={targetDate}
                    onSelect={setTargetDate}
                    initialFocus
                    className={cn('p-3 pointer-events-auto')}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </div>

        <div className="pt-2 pb-1 text-[11px] text-muted-foreground">
          * required · Submit activates when required fields are filled
        </div>

        <DialogFooter className="flex-row items-center justify-between sm:justify-between">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => submit(true)} disabled={raise.isPending}>
              Save as draft
            </Button>
            <Button onClick={() => submit(false)} disabled={!canSubmit || raise.isPending}>
              Submit for approval
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

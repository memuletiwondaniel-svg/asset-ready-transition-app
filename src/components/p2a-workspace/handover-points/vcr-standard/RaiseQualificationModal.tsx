import React, { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { CalendarIcon, Check, ChevronsUpDown, Plus, X } from 'lucide-react';
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
  category?: string;
  description?: string;
}

interface Approver {
  user_id: string;
  full_name: string;
  role: string;
  avatar_url?: string;
  role_id?: string | null;
  /** Asset-side B2B partner for this seat, when applicable. */
  partner?: {
    user_id: string;
    full_name: string;
    avatar_url?: string;
    role: string;
  } | null;
  /** Set true when the seat had no project-side holder and we fell back to
   *  the asset-side holder as the face. Surfaced to the reviewer. */
  fallbackAsset?: boolean;
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

const CUSTOM_ID = '__custom__';

/** Resolve a profile avatar URL from either a full https URL or a
 *  user-avatars storage path. Mirrors the canonical VCR wizard resolver. */
const resolveAvatarUrl = (avatarUrl?: string | null): string | undefined => {
  if (!avatarUrl) return undefined;
  if (avatarUrl.startsWith('http')) return avatarUrl;
  return supabase.storage.from('user-avatars').getPublicUrl(avatarUrl).data.publicUrl;
};

const getInitials = (name?: string) =>
  (name || '?').split(' ').map(s => s[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();

export const RaiseQualificationModal: React.FC<Props> = ({
  open, onOpenChange, handoverPointId, vcrCode, vcrName, lockedPrerequisiteId, prereqs,
}) => {
  const [prereqId, setPrereqId] = useState<string>(lockedPrerequisiteId || prereqs[0]?.id || '');
  const [customTitle, setCustomTitle] = useState('');
  const [reason, setReason] = useState('');
  const [mitigation, setMitigation] = useState('');
  const [followUp, setFollowUp] = useState('');
  const [targetDate, setTargetDate] = useState<Date | undefined>(undefined);
  const [approvers, setApprovers] = useState<Approver[]>([]);
  const [manuallyEdited, setManuallyEdited] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [itemPickerOpen, setItemPickerOpen] = useState(false);
  const [flippedSeats, setFlippedSeats] = useState<Set<string>>(new Set());
  const { data: profiles } = useProfileUsers();
  const { raise } = useRaiseQualification();

  const isCustom = prereqId === CUSTOM_ID;

  useEffect(() => {
    if (open) {
      setPrereqId(lockedPrerequisiteId || prereqs[0]?.id || '');
      setCustomTitle('');
      setReason(''); setMitigation(''); setFollowUp('');
      setTargetDate(new Date(Date.now() + 14 * 86400000));
      setApprovers([]);
      setManuallyEdited(false);
      setFlippedSeats(new Set());
    }
  }, [open, lockedPrerequisiteId, prereqs]);

  // Resolve project_id from handover point — needed to determine project-side
  // (project_team_members) vs asset-side (roster) holders per seat.
  const { data: projectId } = useQuery({
    queryKey: ['hp-project-id', handoverPointId],
    enabled: !!handoverPointId && open,
    queryFn: async (): Promise<string | null> => {
      const c = supabase as any;
      const { data: hp } = await c
        .from('p2a_handover_points')
        .select('handover_plan_id')
        .eq('id', handoverPointId)
        .maybeSingle();
      if (!hp?.handover_plan_id) return null;
      const { data: plan } = await c
        .from('p2a_handover_plans')
        .select('project_id')
        .eq('id', hp.handover_plan_id)
        .maybeSingle();
      return plan?.project_id ?? null;
    },
  });

  /**
   * Fetch approver SEATS for the selected item:
   * - Group vcr_prerequisite_approvals rows by approver_role_id (the "seat")
   * - Resolve each user's profile + role name
   * - Face = project-side holder (present in project_team_members for this role)
   * - Partner = other holders (asset-side)
   * - Falls back to first holder + flag if no project-side match found
   */
  const { data: defaultSeats } = useQuery({
    queryKey: ['prereq-seats', prereqId, projectId],
    enabled: !isCustom && !!prereqId && !!projectId && open,
    queryFn: async (): Promise<Approver[]> => {
      const c = supabase as any;
      const { data: rows } = await c
        .from('vcr_prerequisite_approvals')
        .select('approver_user_id, approver_role_id')
        .eq('prerequisite_id', prereqId);
      const list = (rows || []) as Array<{ approver_user_id: string; approver_role_id: string | null }>;
      if (!list.length) return [];

      const userIds = Array.from(new Set(list.map(r => r.approver_user_id).filter(Boolean)));
      const roleIds = Array.from(new Set(list.map(r => r.approver_role_id).filter(Boolean) as string[]));

      const [{ data: profs }, { data: rls }] = await Promise.all([
        c.from('profiles').select('user_id, full_name, avatar_url').in('user_id', userIds),
        roleIds.length
          ? c.from('roles').select('id, name').in('id', roleIds)
          : Promise.resolve({ data: [] as any[] }),
      ]);
      const pMap = new Map<string, any>((profs || []).map((p: any) => [p.user_id, p]));
      const rMap = new Map<string, string>((rls || []).map((r: any) => [r.id, r.name]));

      // Project-side membership: (project_id, role_name) → set of user_ids
      const roleNames = Array.from(rMap.values());
      const { data: ptmRows } = roleNames.length
        ? await c.from('project_team_members')
            .select('user_id, role')
            .eq('project_id', projectId)
            .in('role', roleNames)
        : { data: [] as any[] };
      const projectSideByRole = new Map<string, Set<string>>();
      for (const r of ptmRows || []) {
        const set = projectSideByRole.get(r.role as string) || new Set<string>();
        set.add(r.user_id as string);
        projectSideByRole.set(r.role as string, set);
      }

      // Group approvals by role_id (the seat). Rows without a role_id become
      // their own single-seat entries keyed by user_id so we never drop them.
      const seats = new Map<string, { role_id: string | null; role_name: string; user_ids: string[] }>();
      for (const r of list) {
        const key = r.approver_role_id || `user:${r.approver_user_id}`;
        const existing = seats.get(key);
        if (existing) {
          if (!existing.user_ids.includes(r.approver_user_id)) existing.user_ids.push(r.approver_user_id);
        } else {
          seats.set(key, {
            role_id: r.approver_role_id,
            role_name: r.approver_role_id ? (rMap.get(r.approver_role_id) || '') : '',
            user_ids: [r.approver_user_id],
          });
        }
      }

      const out: Approver[] = [];
      for (const seat of seats.values()) {
        const projectSet = projectSideByRole.get(seat.role_name) || new Set<string>();
        const projectSide = seat.user_ids.find(u => projectSet.has(u));
        const faceId = projectSide || seat.user_ids[0];
        const partnerIds = seat.user_ids.filter(u => u !== faceId);
        const face = pMap.get(faceId);
        const partnerId = partnerIds[0];
        const partner = partnerId ? pMap.get(partnerId) : null;
        out.push({
          user_id: faceId,
          full_name: face?.full_name || 'Unknown',
          role: seat.role_name,
          avatar_url: face?.avatar_url || undefined,
          role_id: seat.role_id,
          partner: partner ? {
            user_id: partnerId,
            full_name: partner.full_name || 'Unknown',
            avatar_url: partner.avatar_url || undefined,
            role: seat.role_name,
          } : null,
          fallbackAsset: !projectSide && !!partnerIds.length,
        });
      }
      return out;
    },
  });

  // Reset approvers when item changes (unless user manually edited)
  useEffect(() => {
    if (isCustom) {
      if (!manuallyEdited) setApprovers([]);
      return;
    }
    if (!manuallyEdited && defaultSeats) {
      setApprovers(defaultSeats);
      setFlippedSeats(new Set());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultSeats, prereqId, isCustom]);

  const removeApprover = (uid: string) => {
    setManuallyEdited(true);
    setApprovers(a => a.filter(x => x.user_id !== uid));
  };
  const addApprover = (p: any) => {
    setManuallyEdited(true);
    setApprovers(a => a.some(x => x.user_id === p.user_id) ? a : [...a, {
      user_id: p.user_id,
      full_name: p.full_name,
      role: p.role || p.position || '',
      avatar_url: p.avatar_url,
      partner: null,
    }]);
    setPickerOpen(false);
  };
  const toggleFlip = (seatKey: string) => {
    setFlippedSeats(prev => {
      const next = new Set(prev);
      if (next.has(seatKey)) next.delete(seatKey);
      else next.add(seatKey);
      return next;
    });
  };

  const canSubmit =
    (!!prereqId && !isCustom
      ? true
      : isCustom && customTitle.trim().length > 2) &&
    reason.trim().length > 5 && mitigation.trim().length > 5 &&
    !!targetDate && approvers.length > 0;

  const submit = (draft: boolean) => {
    if (!targetDate) return;
    // For B2B seats, seed only the project-side holder (the face). Asset TA2s
    // are never qualification deciders.
    const submitUserIds = approvers.map(a => a.user_id);
    const roleLabels: Record<string, string> = {};
    for (const a of approvers) roleLabels[a.user_id] = a.role;

    raise.mutate({
      vcr_prerequisite_id: isCustom ? null : prereqId,
      handover_point_id: handoverPointId,
      custom_title: isCustom ? customTitle.trim() : undefined,
      vcr_code: vcrCode,
      vcr_name: vcrName,
      reason: reason.trim(),
      mitigation: mitigation.trim(),
      follow_up_action: followUp.trim() || undefined,
      target_date: format(targetDate, 'yyyy-MM-dd'),
      approver_user_ids: submitUserIds,
      approver_role_labels: roleLabels,
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
      <DialogContent
        className="max-w-3xl !z-modal-critical overflow-x-hidden"
        overlayClassName="!z-overlay-critical"
      >
        <DialogHeader className="space-y-1">
          <div className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            {eyebrow}
          </div>
          <DialogTitle className="text-lg">Raise qualification</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-2 overflow-x-hidden">
          {/* VCR item — searchable combobox */}
          <div className="space-y-1.5">
            <Label>VCR item <span className="text-red-600">*</span></Label>
            <Popover open={itemPickerOpen} onOpenChange={setItemPickerOpen}>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  role="combobox"
                  disabled={!!lockedPrerequisiteId}
                  className="w-full h-10 justify-between font-normal"
                >
                  <span className="flex items-center gap-2 min-w-0 flex-1">
                    {isCustom ? (
                      <span className="text-xs italic truncate">Custom qualification (no VCR item)</span>
                    ) : selectedPrereq ? (
                      <>
                        {selectedPrereq.code && (
                          <span
                            className="inline-flex items-center rounded-md px-1.5 py-0.5 font-mono text-[11px] font-semibold text-slate-600 whitespace-nowrap"
                            style={{ background: '#EEF2F7' }}
                          >
                            {selectedPrereq.code}
                          </span>
                        )}
                        <span className="text-xs truncate">{selectedPrereq.summary}</span>
                      </>
                    ) : (
                      <span className="text-xs text-muted-foreground">Select item…</span>
                    )}
                  </span>
                  <ChevronsUpDown className="h-4 w-4 opacity-50 shrink-0" />
                </Button>
              </PopoverTrigger>
              <PopoverContent
                align="start"
                className="p-0 pointer-events-auto w-[--radix-popover-trigger-width] max-w-[640px]"
              >
                <Command>
                  <CommandInput placeholder="Search by code, question, category…" />
                  <CommandList>
                    <CommandEmpty>No items found.</CommandEmpty>
                    <CommandGroup>
                      <CommandItem
                        value="custom qualification no vcr item ad-hoc"
                        onSelect={() => { setPrereqId(CUSTOM_ID); setItemPickerOpen(false); setManuallyEdited(false); }}
                        className="gap-2"
                      >
                        <Check className={cn('h-4 w-4 shrink-0', isCustom ? 'opacity-100' : 'opacity-0')} />
                        <span className="text-xs italic">Custom qualification (no VCR item)</span>
                      </CommandItem>
                    </CommandGroup>
                    <CommandGroup heading="VCR items">
                      {prereqs.map(p => (
                        <CommandItem
                          key={p.id}
                          value={`${p.code} ${p.category || ''} ${p.summary} ${p.description || ''}`}
                          onSelect={() => { setPrereqId(p.id); setItemPickerOpen(false); setManuallyEdited(false); }}
                          className="gap-2"
                        >
                          <Check className={cn('h-4 w-4 shrink-0', prereqId === p.id ? 'opacity-100' : 'opacity-0')} />
                          {p.code && (
                            <span
                              className="inline-flex items-center rounded-md px-1.5 py-0.5 font-mono text-[11px] font-semibold text-slate-600 whitespace-nowrap"
                              style={{ background: '#EEF2F7' }}
                            >
                              {p.code}
                            </span>
                          )}
                          <span className="text-xs truncate">{p.summary}</span>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {/* Custom title (custom mode only) */}
          {isCustom && (
            <div className="space-y-1.5">
              <Label>Title <span className="text-red-600">*</span></Label>
              <Input
                value={customTitle}
                onChange={e => setCustomTitle(e.target.value)}
                placeholder="Short subject for this qualification"
              />
            </div>
          )}

          {/* Approvers — one card per seat, B2B toggle reveals partner */}
          <div className="space-y-2">
            <Label>Qualification approvers <span className="text-red-600">*</span></Label>
            <TooltipProvider delayDuration={150}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {approvers.map(a => {
                  const seatKey = a.role_id || a.user_id;
                  const flipped = flippedSeats.has(seatKey);
                  const shown = flipped && a.partner ? a.partner : a;
                  return (
                    <div
                      key={a.user_id}
                      className="group relative flex items-center gap-2 rounded-md border bg-muted/30 p-2 min-w-0"
                    >
                      <Avatar className="h-9 w-9 shrink-0">
                        <AvatarImage src={resolveAvatarUrl(shown.avatar_url)} alt={shown.full_name} />
                        <AvatarFallback className="text-[10px]">
                          {getInitials(shown.full_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="text-xs font-medium truncate">{shown.full_name}</span>
                          {a.partner && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); toggleFlip(seatKey); }}
                                  className={cn(
                                    'text-[9px] font-semibold tracking-wider px-1.5 py-0.5 rounded border shrink-0 cursor-pointer transition-colors',
                                    flipped
                                      ? 'bg-amber-200 text-amber-900 border-amber-300'
                                      : 'bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-200',
                                  )}
                                  aria-label={`Toggle B2B partner ${a.partner.full_name}`}
                                >
                                  B2B
                                </button>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="text-xs max-w-[240px]">
                                Back-to-back pair — click to reveal Asset-side partner {a.partner.full_name}.
                                Only the Project-side holder is seeded as a qualification approver.
                              </TooltipContent>
                            </Tooltip>
                          )}
                          {a.fallbackAsset && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-orange-100 text-orange-800 border border-orange-200 shrink-0 cursor-help">
                                  Asset
                                </span>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="text-xs max-w-[240px]">
                                No Project-side holder for this seat — fell back to the Asset holder.
                              </TooltipContent>
                            </Tooltip>
                          )}
                        </div>
                        <div className="text-[10px] text-muted-foreground truncate">
                          {shown.role || '—'}
                        </div>
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
                  );
                })}
              </div>
            </TooltipProvider>
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
                          value={`${p.full_name} ${p.role || ''} ${p.position || ''} ${p.email || ''}`}
                          onSelect={() => addApprover(p)}
                          className="gap-2"
                        >
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={resolveAvatarUrl(p.avatar_url)} alt={p.full_name} />
                            <AvatarFallback className="text-[9px]">{getInitials(p.full_name)}</AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 flex-1">
                            <div className="text-xs font-medium truncate">{p.full_name}</div>
                            {(p.role || p.position) && (
                              <div className="text-[10px] text-muted-foreground truncate">{p.role || p.position}</div>
                            )}
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            <p className="text-[11px] text-muted-foreground">
              {isCustom
                ? 'Add approvers manually · hover to remove'
                : 'Defaults to the VCR item\'s approvers · B2B partners are toggleable · hover to remove'}
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

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
  /** Stable seat key derived from the role id (or base name for placeholders). */
  seat_key: string;
  /** Same-role shared-seat B2B partner (e.g. two holders of the SAME role.id). */
  partner?: {
    user_id: string;
    full_name: string;
    avatar_url?: string;
    role: string;
  } | null;
  /** Placeholder seat where the discipline has no Project-side holder. */
  unassigned?: boolean;
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

/** Strip " - Project" / " - Asset" (or en-/em-dash variants) from a role name. */
const stripSideSuffix = (name: string): string =>
  (name || '').replace(/\s*[-–—]\s*(Project|Asset)\s*$/i, '').trim();

/** Returns 'project' | 'asset' | null based on the role name suffix. */
const sideOfRole = (name: string): 'project' | 'asset' | null => {
  const m = (name || '').match(/\s*[-–—]\s*(Project|Asset)\s*$/i);
  return m ? (m[1].toLowerCase() as 'project' | 'asset') : null;
};


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
  const [prereqId, setPrereqId] = useState<string>(lockedPrerequisiteId || '');
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
      setPrereqId(lockedPrerequisiteId || '');
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
   * Fetch approver SEATS for the selected item — sourced from the CATALOG.
   *
   * Governance canon: the standardized VCR items catalog
   * (`vcr_items.approving_party_role_ids`, optionally overridden per HP via
   * `p2a_vcr_item_overrides`) is the single source of truth for who approves.
   * We must NOT read `vcr_prerequisite_approvals` for defaults — that ledger
   * is a fan-out artefact and can contain historical rows on terminal prereqs
   * (ACCEPTED / QUALIFICATION_APPROVED / NA) that predate later catalog
   * edits. Deriving from the ledger silently narrows or widens the seat set
   * relative to the current catalog.
   *
   * Pipeline (mirrors `public.reconcile_vcr_approvals`):
   *   1. prereq → vcr_item_id
   *   2. role_ids := override_for(hp, item) ?? vcr_items.approving_party_role_ids
   *   3. drop every role whose name ends "- Asset" (Asset-side is excluded
   *      from qualification approvals — canon).
   *   4. resolve each surviving role to its Project-side holder(s) via
   *      `resolve_project_role_users(project_id, role_name)` — same resolver
   *      the reconcile fan-out uses (PTM → scoped roster → org holders).
   *   5. group by role_id: 1 holder → single-face seat; 2+ holders on the
   *      SAME role → face + B2B partner; 0 holders → "Unassigned" placeholder.
   */
  const { data: defaultSeats } = useQuery({
    queryKey: ['prereq-seats-catalog', prereqId, projectId, handoverPointId],
    enabled: !isCustom && !!prereqId && !!projectId && open,
    queryFn: async (): Promise<Approver[]> => {
      const c = supabase as any;

      // 1. prereq → vcr_item_id
      const { data: prereqRow } = await c
        .from('p2a_vcr_prerequisites')
        .select('vcr_item_id')
        .eq('id', prereqId)
        .maybeSingle();
      const itemId: string | null = prereqRow?.vcr_item_id ?? null;
      if (!itemId) return [];

      // 2. override ?? catalog
      const [{ data: itemRow }, { data: overrideRow }] = await Promise.all([
        c.from('vcr_items').select('approving_party_role_ids').eq('id', itemId).maybeSingle(),
        c.from('p2a_vcr_item_overrides')
          .select('approving_party_role_ids_override')
          .eq('handover_point_id', handoverPointId)
          .eq('vcr_item_id', itemId)
          .maybeSingle(),
      ]);
      const roleIds: string[] =
        (overrideRow?.approving_party_role_ids_override as string[] | null)
        ?? (itemRow?.approving_party_role_ids as string[] | null)
        ?? [];
      if (!roleIds.length) return [];

      // 3. Fetch role names, drop Asset-suffixed.
      const { data: rls } = await c.from('roles').select('id, name').in('id', roleIds);
      const roles = ((rls || []) as Array<{ id: string; name: string }>)
        .filter(r => sideOfRole(r.name) !== 'asset');
      if (!roles.length) return [];

      // 4. Resolve project-side holders per role via the canonical RPC.
      const resolved = await Promise.all(roles.map(async (r) => {
        const { data: uids } = await c.rpc('resolve_project_role_users', {
          p_project_id: projectId,
          p_role_label: r.name,
        });
        const userIds = ((uids || []) as Array<string | { user_id: string }>)
          .map((x: any) => (typeof x === 'string' ? x : x?.user_id))
          .filter(Boolean) as string[];
        return { role: r, userIds };
      }));

      // 5. Load profiles for the union of resolved holders.
      const allUserIds = Array.from(new Set(resolved.flatMap(x => x.userIds)));
      const { data: profs } = allUserIds.length
        ? await c.from('profiles').select('user_id, full_name, avatar_url').in('user_id', allUserIds)
        : { data: [] as any[] };
      const pMap = new Map<string, any>((profs || []).map((p: any) => [p.user_id, p]));

      // Build seats (one per role_id). 0 holders → Unassigned placeholder.
      const out: Approver[] = [];
      for (const { role, userIds } of resolved) {
        if (userIds.length === 0) {
          out.push({
            user_id: `__unassigned__:${role.id}`,
            full_name: 'Unassigned',
            role: role.name,
            avatar_url: undefined,
            seat_key: `unassigned:${role.id}`,
            partner: null,
            unassigned: true,
          });
          continue;
        }
        const faceId = userIds[0];
        const partnerId = userIds[1];
        const face = pMap.get(faceId);
        const partner = partnerId ? pMap.get(partnerId) : null;
        out.push({
          user_id: faceId,
          full_name: face?.full_name || 'Unknown',
          role: role.name,
          avatar_url: face?.avatar_url || undefined,
          seat_key: role.id,
          partner: partner ? {
            user_id: partnerId!,
            full_name: partner.full_name || 'Unknown',
            avatar_url: partner.avatar_url || undefined,
            role: role.name,
          } : null,
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
      seat_key: `user:${p.user_id}`,
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

  // Only real (non-placeholder) approvers count toward submission.
  const realApprovers = approvers.filter(a => !a.unassigned);
  const canSubmit =
    (!!prereqId && !isCustom
      ? true
      : isCustom && customTitle.trim().length > 2) &&
    reason.trim().length > 5 && mitigation.trim().length > 5 &&
    !!targetDate && realApprovers.length > 0;

  const submit = (draft: boolean) => {
    if (!targetDate) return;
    // Placeholder "Unassigned" seats are never seeded as deciders.
    const submitUserIds = realApprovers.map(a => a.user_id);
    const roleLabels: Record<string, string> = {};
    for (const a of realApprovers) roleLabels[a.user_id] = a.role;


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
        className="max-w-3xl !z-modal-critical overflow-hidden p-0 gap-0 flex flex-col max-h-[85vh]"
        overlayClassName="!z-overlay-critical"
      >
        <DialogHeader className="space-y-1 px-6 pt-6 pb-4 border-b shrink-0">
          <div className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            {eyebrow}
          </div>
          <DialogTitle className="text-lg">Raise Qualification</DialogTitle>
        </DialogHeader>


        <div className="flex-1 overflow-y-auto overflow-x-hidden px-6 py-4 space-y-5">
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
                      <span className="text-xs text-muted-foreground">Select a VCR item or raise a custom qualification…</span>
                    )}

                  </span>
                  <ChevronsUpDown className="h-4 w-4 opacity-50 shrink-0" />
                </Button>
              </PopoverTrigger>
              <PopoverContent
                align="start"
                className="p-0 pointer-events-auto w-[--radix-popover-trigger-width] max-w-[640px]"
                onWheel={(e) => e.stopPropagation()}
              >
                <Command>
                  <CommandInput placeholder="Search by code, question, category…" />
                  <CommandList className="max-h-[320px] overflow-y-auto overscroll-contain">
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
            {approvers.length === 0 && !isCustom && !prereqId && (
              <div className="rounded-md border border-dashed bg-muted/20 p-3 text-[11px] text-muted-foreground">
                Approvers populate from the selected item.
              </div>
            )}
            {approvers.length === 0 && (isCustom || (!!prereqId && !isCustom)) && (
              <div className="rounded-md border border-dashed bg-muted/20 p-3 text-[11px] text-muted-foreground">
                {isCustom
                  ? 'No approvers yet — add one below.'
                  : 'No approvers resolved for this item yet.'}
              </div>
            )}
            <TooltipProvider delayDuration={150}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {approvers.map(a => {
                  const seatKey = a.seat_key || a.user_id;
                  const flipped = flippedSeats.has(seatKey);
                  const shown = flipped && a.partner ? a.partner : a;
                  return (
                    <div
                      key={seatKey}
                      className={cn(
                        'group relative flex items-center gap-2 rounded-md border p-2 min-w-0',
                        a.unassigned ? 'border-dashed bg-muted/10' : 'bg-muted/30',
                      )}
                    >
                      <Avatar className={cn('h-9 w-9 shrink-0', a.unassigned && 'opacity-60')}>
                        <AvatarImage src={resolveAvatarUrl(shown.avatar_url)} alt={shown.full_name} />
                        <AvatarFallback className="text-[10px]">
                          {a.unassigned ? '—' : getInitials(shown.full_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className={cn(
                            'text-xs font-medium truncate',
                            a.unassigned && 'italic text-muted-foreground',
                          )}>
                            {shown.full_name}
                          </span>
                          {a.partner && !a.unassigned && (
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
                                  aria-label={`Toggle shared-seat partner ${a.partner.full_name}`}
                                >
                                  B2B
                                </button>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="text-xs max-w-[240px]">
                                Shared seat — click to reveal partner {a.partner.full_name}.
                                Both holders are seeded as qualification approvers.
                              </TooltipContent>
                            </Tooltip>
                          )}
                        </div>
                        <div className="text-[10px] text-muted-foreground truncate">
                          {shown.role || '—'}
                        </div>
                      </div>
                      {!a.unassigned && (
                        <button
                          type="button"
                          onClick={() => removeApprover(a.user_id)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity absolute top-1 right-1 rounded-full bg-background border p-0.5 hover:bg-red-50 hover:text-red-600"
                          aria-label={`Remove ${a.full_name}`}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      )}
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
              <PopoverContent
                className="w-80 p-0 pointer-events-auto"
                align="start"
                onWheel={(e) => e.stopPropagation()}
              >
                <Command>
                  <CommandInput placeholder="Search people…" />
                  <CommandList className="max-h-[320px] overflow-y-auto overscroll-contain">
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

        <div className="border-t bg-background shrink-0 px-6 py-3">
          <DialogFooter className="flex-row items-center justify-between sm:justify-between gap-2 m-0">
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
          <div className="pt-2 text-[11px] text-muted-foreground">
            * required · Submit activates when required fields are filled
          </div>
        </div>

      </DialogContent>
    </Dialog>
  );
};

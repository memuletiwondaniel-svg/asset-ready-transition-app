import React, { useMemo, useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChevronDown, Lock, Search, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { P2AHandoverPoint } from '../../hooks/useP2AHandoverPoints';
import { useVCRPrerequisites } from '../../hooks/useVCRPrerequisites';
import { useVCRHydrocarbonStatus } from '@/hooks/useVCRHydrocarbonStatus';
import { PrereqStatus, standardPill, effectivePill, effectiveBucket, normalizeCategoryCode, CATEGORY_META } from './standardStatus';
import { PartyPerson, PartyItem, useVCRPartiesRollup } from './useVCRPartiesRollup';
import { VCRItemDetailSheet, VCRItemBasic } from '@/components/widgets/VCRItemDetailSheet';
import { formatVcrItemCode } from '@/lib/vcrItemCode';
import { useVCRDisciplineAssurance } from '@/components/widgets/hooks/useVCRDisciplineAssurance';

import type { LifecyclePhase } from './useVCRLifecycle';


interface Props {
  handoverPoint: P2AHandoverPoint;
  projectId?: string;
  lifecyclePhase?: LifecyclePhase;
}

const initials = (name: string) =>
  name
    .split(/\s+/)
    .map((n) => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase() || '?';

/** Health-token status dot for a seat. */
const statusDotClass = (assigned: number, completed: number, signed: boolean) => {
  if (signed || (assigned > 0 && completed >= assigned)) return 'bg-emerald-500';
  if (completed > 0) return 'bg-amber-500';
  return 'bg-slate-300';
};

/** Fraction chip tone: green when complete, amber while in progress, slate at zero. */
const fractionChipClass = (assigned: number, completed: number, signed: boolean) => {
  if (signed || (assigned > 0 && completed >= assigned)) return 'bg-emerald-50 text-emerald-700';
  if (completed > 0) return 'bg-amber-50 text-amber-700';
  return 'bg-slate-100 text-muted-foreground';
};

/**
 * PartyRow — one seat per canonical role. When the role has 2+ holders
 * (a B2B pair), we show the primary and expose a "B2B" chip that cycles
 * to the partner. Clicking the row opens the drawer for the currently
 * displayed holder. Root-cause fix for the previous B2B defect: pairing
 * is now grouped by role (not by profiles.position string), so two
 * holders of the same canonical role always collapse to one seat.
 */
const PartyRow: React.FC<{
  holders: PartyPerson[];
  onClick?: (p: PartyPerson) => void;
  clickable?: boolean;
  signedRoleKeys?: Set<string>;
}> = ({ holders, onClick, clickable, signedRoleKeys }) => {
  const [idx, setIdx] = useState(0);
  const safeIdx = idx % holders.length;
  const shown = holders[safeIdx];
  const isPaired = holders.length > 1;
  const partnerNames = holders
    .filter((_, i) => i !== safeIdx)
    .map((p) => p.full_name)
    .join(', ');

  // Statement-authoritative: if this seat's role has a discipline statement
  // submitted, treat the review as complete (m of m) regardless of the
  // underlying ledger. Also drives the "signed" glyph + green dot.
  const roleKey = (shown.role_name || shown.position || '').trim().toLowerCase();
  const hasStatement = !!(roleKey && signedRoleKeys?.has(roleKey));
  const isSofPacSigned = !!shown.signed;
  const displayAssigned = shown.assigned;
  const displayCompleted = hasStatement ? Math.max(shown.completed, shown.assigned) : shown.completed;
  const complete = hasStatement || isSofPacSigned || (displayAssigned > 0 && displayCompleted >= displayAssigned);

  return (
    <div
      className={cn(
        'w-full flex items-center gap-3 px-3 py-2 transition-colors',
        clickable ? 'hover:bg-muted/50' : '',
      )}
    >
      <button
        type="button"
        onClick={() => clickable && onClick?.(shown)}
        disabled={!clickable}
        className={cn(
          'flex items-center gap-3 flex-1 min-w-0 text-left',
          clickable ? 'cursor-pointer' : 'cursor-default',
        )}
      >
        <Avatar className="h-8 w-8 flex-none">
          {shown.avatar_url && <AvatarImage src={shown.avatar_url} alt={shown.full_name} />}
          <AvatarFallback className="text-[10px] font-semibold bg-slate-200 text-slate-700">
            {initials(shown.full_name)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="text-[13px] font-medium truncate leading-tight flex items-center gap-1.5">
            {shown.full_name}
            {isPaired && (
              <TooltipProvider delayDuration={150}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        setIdx((i) => (i + 1) % holders.length);
                      }}
                      className="text-[8px] font-semibold tracking-wider px-1 py-px rounded bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800 shrink-0 leading-none cursor-pointer hover:bg-amber-200 dark:hover:bg-amber-900/60 transition-colors"
                      aria-label={`Back-to-back with ${partnerNames}. Click to view partner.`}
                    >
                      B2B
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" align="start" sideOffset={4} className="text-xs">
                    Back-to-back with {partnerNames} — click to swap
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
          <div className="text-[11px] text-muted-foreground truncate">
            {shown.role_name || shown.position || '—'}
          </div>
        </div>
      </button>
      {/* Uniform-width progress label — right aligned, tabular numerals */}
      <span
        className={cn(
          'text-[11px] font-semibold rounded-full px-2 py-0.5 flex-none w-[92px] text-center tabular-nums',
          fractionChipClass(displayAssigned, displayCompleted, isSofPacSigned || hasStatement),
        )}
        title={complete ? 'Complete' : `${displayCompleted} of ${displayAssigned} items complete`}
      >
        {displayAssigned > 0
          ? `${displayCompleted} of ${displayAssigned}`
          : (isSofPacSigned ? 'Signed' : '—')}
      </span>
    </div>
  );
};

/** Group holders into role-based seats. Users sharing a canonical role
 *  collapse into ONE seat with a B2B chip; solo holders remain solo. */
function groupHoldersByRole(list: PartyPerson[]): PartyPerson[][] {
  const map = new Map<string, PartyPerson[]>();
  const order: string[] = [];
  for (const p of list) {
    const key = (p.role_name || p.position || `__solo_${p.user_id}`).trim().toLowerCase();
    if (!map.has(key)) { map.set(key, []); order.push(key); }
    map.get(key)!.push(p);
  }
  return order.map((k) =>
    map
      .get(k)!
      .slice()
      .sort((a, b) => a.full_name.localeCompare(b.full_name)),
  );
}

interface SectionProps {
  title: string;
  count: number;
  locked?: boolean;
  lockCaption?: string;
  lockTooltip?: string;
  emptyText?: string;
  people: PartyPerson[];
  onPersonClick?: (p: PartyPerson) => void;
  personClickable?: boolean;
  muted?: boolean;
  defaultOpen?: boolean;
  signedRoleKeys?: Set<string>;
}

/**
 * Section — collapsible inline labelled divider (uppercase label + count +
 * chevron + hairline) with person rows directly beneath. Default expansion
 * is driven by VCR lifecycle phase.
 */
const Section: React.FC<SectionProps> = ({
  title, count, locked, lockCaption, lockTooltip, emptyText,
  people, onPersonClick, personClickable, muted, defaultOpen = true, signedRoleKeys,
}) => {
  const seats = useMemo(() => groupHoldersByRole(people), [people]);
  const [open, setOpen] = useState(defaultOpen);
  // Sync when lifecycle-driven default changes
  React.useEffect(() => { setOpen(defaultOpen); }, [defaultOpen]);
  return (
    <section className={cn(muted && 'opacity-[0.5]')}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2 pt-1 pb-2 group text-left"
        aria-expanded={open}
      >
        <ChevronDown
          className={cn(
            'w-3.5 h-3.5 text-muted-foreground/70 flex-none transition-transform',
            open ? '' : '-rotate-90',
          )}
        />
        {locked && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Lock className="w-3 h-3 text-muted-foreground/70 flex-none" />
              </TooltipTrigger>
              {lockTooltip && (
                <TooltipContent side="top" className="max-w-xs text-[11px]">
                  {lockTooltip}
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
        )}
        <span className="text-[10.5px] font-extrabold tracking-[.14em] uppercase text-foreground shrink-0">
          {title}
        </span>
        <span className="text-[10.5px] font-medium text-muted-foreground/70 shrink-0">{count}</span>
        {locked && lockCaption && (
          <span className="text-[10.5px] text-muted-foreground/70 italic shrink-0">{lockCaption}</span>
        )}
        <div className="flex-1 h-px bg-border/60" />
      </button>
      {open && (
        seats.length === 0 ? (
          <div className="px-3 py-3 text-[12px] text-muted-foreground">
            {emptyText || 'No members yet.'}
          </div>
        ) : (
          <div className="divide-y divide-border/40">
            {seats.map((holders) => (
              <PartyRow
                key={holders.map((h) => h.user_id).join('|')}
                holders={holders}
                onClick={onPersonClick}
                clickable={personClickable}
                signedRoleKeys={signedRoleKeys}
              />
            ))}
          </div>
        )
      )}
    </section>
  );
};


/* ---------------- Party items drawer ---------------- */

const PartyItemsDrawer: React.FC<{
  party: PartyPerson | null;
  isApprover: boolean;
  vcrCode: string;
  vcrName: string;
  onOpenChange: (o: boolean) => void;
  handoverPointId: string;
  projectId?: string;
  prereqCategoryMap: Map<string, { catCode: string; displayOrder: number; topic: string | null; qualStage: 'DRAFT'|'PENDING'|'APPROVED'|'REJECTED'|null }>;
  disciplineStatement?: string | null;
  hasStatement?: boolean;
}> = ({ party, isApprover, vcrCode, vcrName, onOpenChange, handoverPointId, projectId, prereqCategoryMap, disciplineStatement, hasStatement }) => {
  const [openItem, setOpenItem] = useState<VCRItemBasic | null>(null);
  if (!party) return null;

  // Drawer sort: status group (Rework → Not started → In progress/Under review
  // → Approved), then category (TI, OI, DI, MS, HS, XX), then serial.
  // Qualification sub-states slot in per the effective bucket:
  //   qual DRAFT → Not started · qual PENDING → Under review ·
  //   qual REJECTED → Rework · qual APPROVED → Approved.
  const BUCKET_ORDER: Record<string, number> = {
    rework: 0, todeliver: 1, pipeline: 2, qualification: 2, terminal: 3,
  };
  const CAT_ORDER: Record<string, number> = { TI: 0, OI: 1, DI: 2, MS: 3, HS: 4, XX: 9, '??': 9 };
  const sortedItems = [...party.items].sort((a, b) => {
    const ma = prereqCategoryMap.get(a.prereq_id);
    const mb = prereqCategoryMap.get(b.prereq_id);
    const ba = effectiveBucket(a.status as PrereqStatus, ma?.qualStage ?? null);
    const bb = effectiveBucket(b.status as PrereqStatus, mb?.qualStage ?? null);
    const sa = BUCKET_ORDER[ba] ?? 99;
    const sb = BUCKET_ORDER[bb] ?? 99;
    if (sa !== sb) return sa - sb;
    const ca = CAT_ORDER[ma?.catCode ?? '??'] ?? 9;
    const cb = CAT_ORDER[mb?.catCode ?? '??'] ?? 9;
    if (ca !== cb) return ca - cb;
    return (ma?.displayOrder ?? 0) - (mb?.displayOrder ?? 0);
  });

  const displayAssigned = party.assigned;
  const displayCompleted = hasStatement ? Math.max(party.completed, party.assigned) : party.completed;

  return (
    <>
      <Sheet open={!!party} onOpenChange={onOpenChange}>
        <SheetContent side="right" hideClose className="!z-modal-critical w-full sm:max-w-lg p-0 flex flex-col">
          <SheetHeader className="px-5 pt-5 pb-3 border-b shrink-0">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0 flex-1">
                <Avatar className="h-10 w-10 flex-none">
                  {party.avatar_url && <AvatarImage src={party.avatar_url} alt={party.full_name} />}
                  <AvatarFallback className="text-[11px] font-semibold bg-slate-200 text-slate-700">
                    {initials(party.full_name)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <SheetTitle className="text-[15px] leading-snug truncate flex items-center gap-1.5">
                    {party.full_name}
                    {hasStatement && (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" aria-label="Discipline statement signed" />
                    )}
                  </SheetTitle>
                  <SheetDescription className="text-[12px] mt-0.5 truncate text-muted-foreground">
                    {party.role_name || party.position || '—'}
                  </SheetDescription>
                </div>
              </div>

              <span
                className={cn(
                  'flex-none text-[11px] font-semibold rounded-full px-2 py-0.5',
                  fractionChipClass(displayAssigned, displayCompleted, !!hasStatement || !!party.signed),
                )}
              >
                {displayAssigned > 0 ? `${displayCompleted} of ${displayAssigned} items` : (party.signed ? 'Signed' : '—')}
              </span>
            </div>
          </SheetHeader>

          {isApprover && disciplineStatement && (
            <div className="px-5 py-3 border-b shrink-0">
              <div className="text-[10px] font-bold tracking-[0.14em] uppercase text-muted-foreground/70 mb-1.5">
                Discipline comment
              </div>
              <div className="text-[13px] leading-relaxed whitespace-pre-wrap text-foreground/90">
                {disciplineStatement}
              </div>
            </div>
          )}
          <ScrollArea className="flex-1">
            <div className="divide-y divide-border/60">
              {sortedItems.length === 0 ? (
                <div className="p-6 text-sm text-muted-foreground text-center">
                  No VCR items assigned via this role.
                </div>
              ) : (
                sortedItems.map((it) => {
                  const meta = prereqCategoryMap.get(it.prereq_id);
                  const code = meta ? formatVcrItemCode(meta.catCode, meta.displayOrder) : '';
                  const pill = effectivePill(it.status as PrereqStatus, meta?.qualStage ?? null);
                  const catName = meta && meta.catCode in CATEGORY_META
                    ? CATEGORY_META[meta.catCode as keyof typeof CATEGORY_META].name
                    : 'Uncategorized';
                  const subtext = [catName, meta?.topic].filter(Boolean).join(' · ');
                  return (
                    <button
                      key={it.prereq_id}
                      onClick={() => {
                        setOpenItem({
                          id: it.prereq_id,
                          vcr_item: it.summary,
                          topic: meta?.topic ?? null,
                          category_name: catName,
                          category_code: meta?.catCode ?? '??',
                          status: it.status,
                          prerequisite_id: it.prereq_id,
                          itemCode: code,
                        });
                      }}
                      className="w-full flex items-start gap-3 px-4 py-2.5 text-left hover:bg-muted/40 transition"
                    >
                      <div className="w-[52px] flex-none font-mono text-[11px] text-muted-foreground leading-tight pt-0.5">
                        {code || '—'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[13px] leading-snug text-foreground">{it.summary}</div>
                        {subtext && (
                          <div className="text-[11px] text-muted-foreground/80 mt-0.5 truncate">
                            {subtext}
                          </div>
                        )}
                      </div>
                      <div className={cn('flex-none text-center text-[10.5px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap', pill.className)}>
                        {pill.label}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>
      <VCRItemDetailSheet
        item={openItem}
        open={!!openItem}
        onOpenChange={(o) => !o && setOpenItem(null)}
        vcrId={handoverPointId}
        projectIdOverride={projectId}
      />
    </>
  );
};

/* ---------------- Main tab ---------------- */

export const StandardPartiesTab: React.FC<Props> = ({
  handoverPoint, projectId, lifecyclePhase,
}) => {
  const { data: hc } = useVCRHydrocarbonStatus(handoverPoint.id);
  const { prerequisites } = useVCRPrerequisites(handoverPoint.id);
  const { data: rollup, isLoading } = useVCRPartiesRollup(handoverPoint.id, projectId || null);
  const { disciplineStatements } = useVCRDisciplineAssurance(handoverPoint.id);
  const [openParty, setOpenParty] = useState<PartyPerson | null>(null);
  const [query, setQuery] = useState('');

  const isHC = hc?.status === 'HC';

  const gateUnlocked = useMemo(() => {
    if (prerequisites.length === 0) return false;
    return prerequisites.every(
      (p) => standardPill(p.status as PrereqStatus).bucket === 'terminal',
    );
  }, [prerequisites]);

  const data = rollup || {
    delivering: [], approving: [], sof: [], pac: [],
    deliveringByPrereq: {}, approvingByPrereq: {},
  };

  const prereqCategoryMap = useMemo(() => {
    const m = new Map<string, { catCode: string; displayOrder: number; topic: string | null; qualStage: 'DRAFT'|'PENDING'|'APPROVED'|'REJECTED'|null }>();
    prerequisites.forEach((p) => {
      const code = normalizeCategoryCode(p.category);
      m.set(p.id, {
        catCode: code === 'XX' ? '??' : code,
        displayOrder: p.display_order ?? 0,
        topic: p.topic ?? null,
        qualStage: (p.qualification_stage ?? null) as any,
      });
    });
    return m;
  }, [prerequisites]);

  const prereqCodeMap = useMemo(() => {
    const m = new Map<string, string>();
    prereqCategoryMap.forEach((v, id) => m.set(id, formatVcrItemCode(v.catCode, v.displayOrder)));
    return m;
  }, [prereqCategoryMap]);

  // Default-expand rules keyed to VCR lifecycle phase.
  //   Delivery / acceptance phases → expand VCR DELIVERY + VCR APPROVERS,
  //     collapse SoF + PAC.
  //   AWAITING_SOF → expand SoF only.
  //   AWAITING_PAC / HANDOVER_COMPLETE → expand PAC only.
  const isSofPhase = lifecyclePhase === 'AWAITING_SOF';
  const isPacPhase = lifecyclePhase === 'AWAITING_PAC' || lifecyclePhase === 'HANDOVER_COMPLETE';
  const defaultOpenDelivery = !isSofPhase && !isPacPhase;
  const defaultOpenApprover = !isSofPhase && !isPacPhase;
  const defaultOpenSof = isSofPhase;
  const defaultOpenPac = isPacPhase;

  // Role-name keys of approvers with a submitted discipline statement.
  const signedRoleKeys = useMemo(() => {
    const s = new Set<string>();
    (disciplineStatements || []).forEach((st) => {
      if (st.discipline_role_name) s.add(st.discipline_role_name.trim().toLowerCase());
    });
    return s;
  }, [disciplineStatements]);




  // Search across name / role / discipline / item code / item summary
  const q = query.trim().toLowerCase();
  const filterPeople = (list: PartyPerson[]) => {
    if (!q) return list;
    return list.filter((p) => {
      if (p.full_name.toLowerCase().includes(q)) return true;
      if ((p.role_name || '').toLowerCase().includes(q)) return true;
      if ((p.position || '').toLowerCase().includes(q)) return true;
      return p.items.some((it) => {
        if (it.summary.toLowerCase().includes(q)) return true;
        const code = prereqCodeMap.get(it.prereq_id) || '';
        return code.toLowerCase().includes(q);
      });
    });
  };

  const fDelivering = filterPeople(data.delivering);
  const fApproving = filterPeople(data.approving);
  const fSof = filterPeople(data.sof);
  const fPac = filterPeople(data.pac);

  // G2 narrative summary
  const narrative = useMemo(() => {
    const totalItems = prerequisites.length;
    const completeItems = prerequisites.filter(
      (p) => standardPill(p.status as PrereqStatus).bucket === 'terminal',
    ).length;
    const parts: string[] = [];
    parts.push(
      `**${data.delivering.length}** delivering role holders and **${data.approving.length}** approvers resolved across ${totalItems} VCR item${totalItems === 1 ? '' : 's'}.`,
    );
    if (totalItems > 0) {
      parts.push(`${completeItems} of ${totalItems} items complete.`);
    }
    if (!gateUnlocked) {
      parts.push('SoF and PAC signatories unlock once every item reaches terminal status.');
    }
    return parts.join(' ');
  }, [data.delivering.length, data.approving.length, prerequisites, gateUnlocked]);

  // Discipline statement lookup for the party drawer (approvers only).
  const statementForParty = (p: PartyPerson | null): string | null => {
    if (!p) return null;
    const roleKey = (p.role_name || p.position || '').toLowerCase();
    if (!roleKey) return null;
    const match = (disciplineStatements || []).find((s) =>
      s.discipline_role_name && roleKey.includes(s.discipline_role_name.toLowerCase()),
    );
    return match?.assurance_statement ?? null;
  };
  const openPartyIsApprover =
    !!openParty && data.approving.some((a) => a.user_id === openParty.user_id);

  if (isLoading) {
    return <div className="p-6 text-sm text-muted-foreground">Loading parties…</div>;
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/70 pointer-events-none" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name, discipline, item ID or description"
          className="h-9 pl-8 text-[12.5px]"
        />
      </div>

      <div className="space-y-5">
        <Section
          title="VCR Delivery"
          count={fDelivering.length}
          emptyText={q ? 'No matches in this group.' : 'No delivering role holders resolved for this project yet.'}
          people={fDelivering}
          onPersonClick={setOpenParty}
          personClickable
          defaultOpen={defaultOpenDelivery}
          signedRoleKeys={signedRoleKeys}
        />
        <Section
          title="VCR Approvers"
          count={fApproving.length}
          emptyText={q ? 'No matches in this group.' : 'No approving parties assigned yet.'}
          people={fApproving}
          onPersonClick={setOpenParty}
          personClickable
          defaultOpen={defaultOpenApprover}
          signedRoleKeys={signedRoleKeys}
        />
        {isHC && (
          <Section
            title="SoF Approvers"
            count={fSof.length}
            locked={!gateUnlocked}
            lockCaption={!gateUnlocked ? 'unlocks at VCR approval' : undefined}
            lockTooltip="Statement of Fitness applies to hydrocarbon VCRs. Unlocks once every VCR item reaches terminal status."
            emptyText="No SoF approver role holders resolved yet."
            people={fSof}
            muted={!gateUnlocked}
            defaultOpen={defaultOpenSof}
          />
        )}
        <Section
          title="PAC Approvers"
          count={fPac.length}
          locked={!gateUnlocked}
          lockCaption={!gateUnlocked ? 'unlocks at VCR approval' : undefined}
          lockTooltip="Provisional Acceptance Certificate signature. Unlocks once every VCR item reaches terminal status."
          emptyText="No PAC approver role holders resolved yet."
          people={fPac}
          muted={!gateUnlocked}
          defaultOpen={defaultOpenPac}
        />
      </div>


      <PartyItemsDrawer
        party={openParty}
        isApprover={openPartyIsApprover}
        vcrCode={handoverPoint.vcr_code}
        vcrName={handoverPoint.name}
        onOpenChange={(o) => { if (!o) setOpenParty(null); }}
        handoverPointId={handoverPoint.id}
        projectId={projectId}
        prereqCategoryMap={prereqCategoryMap}
        disciplineStatement={statementForParty(openParty)}
        hasStatement={
          !!openParty &&
          signedRoleKeys.has(((openParty.role_name || openParty.position || '').trim().toLowerCase()))
        }
      />
    </div>
  );
};

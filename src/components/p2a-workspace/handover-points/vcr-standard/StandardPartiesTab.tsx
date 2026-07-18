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
import { Lock, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { P2AHandoverPoint } from '../../hooks/useP2AHandoverPoints';
import { useVCRPrerequisites } from '../../hooks/useVCRPrerequisites';
import { useVCRHydrocarbonStatus } from '@/hooks/useVCRHydrocarbonStatus';
import { PrereqStatus, standardPill, normalizeCategoryCode, CATEGORY_META } from './standardStatus';
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

/** Fraction chip tone: green when complete, amber while in progress, slate at zero. */
const fractionChipClass = (assigned: number, completed: number) => {
  if (assigned === 0) return 'bg-slate-100 text-muted-foreground';
  if (completed >= assigned) return 'bg-emerald-50 text-emerald-700';
  if (completed > 0) return 'bg-amber-50 text-amber-700';
  return 'bg-slate-100 text-muted-foreground';
};

const PersonRow: React.FC<{
  p: PartyPerson;
  isB2B?: boolean;
  onClick?: () => void;
  clickable?: boolean;
}> = ({ p, isB2B, onClick, clickable }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={!clickable}
    className={cn(
      'w-full flex items-center gap-3 px-3 py-2 text-left transition-colors',
      clickable ? 'hover:bg-muted/50 cursor-pointer' : 'cursor-default',
    )}
  >
    <Avatar className="h-8 w-8 flex-none">
      {p.avatar_url && <AvatarImage src={p.avatar_url} alt={p.full_name} />}
      <AvatarFallback className="text-[10px] font-semibold bg-slate-200 text-slate-700">
        {initials(p.full_name)}
      </AvatarFallback>
    </Avatar>
    <div className="min-w-0 flex-1">
      <div className="text-[13px] font-medium truncate leading-tight flex items-center gap-1.5">
        {p.full_name}
        {isB2B && (
          <span className="text-[9px] font-bold uppercase tracking-wider bg-purple-100 text-purple-700 rounded px-1.5 py-0.5">
            B2B
          </span>
        )}
      </div>
      <div className="text-[11px] text-muted-foreground truncate">
        {p.role_name || p.position || '—'}
      </div>
    </div>
    <span
      className={cn(
        'text-[10.5px] font-bold rounded-full px-2 py-0.5 flex-none',
        fractionChipClass(p.assigned, p.completed),
      )}
      title={`${p.completed} of ${p.assigned} complete`}
    >
      {p.completed}/{p.assigned}
    </span>
  </button>
);

interface GroupProps {
  title: string;
  count: number;
  defaultOpen: boolean;
  locked?: boolean;
  lockCaption?: string;
  lockTooltip?: string;
  emptyText?: string;
  people: PartyPerson[];
  b2bPositions?: Set<string>;
  onPersonClick?: (p: PartyPerson) => void;
  personClickable?: boolean;
  muted?: boolean;
}

const Group: React.FC<GroupProps> = ({
  title, count, defaultOpen, locked, lockCaption, lockTooltip, emptyText,
  people, b2bPositions, onPersonClick, personClickable, muted,
}) => {
  const [open, setOpen] = useState(defaultOpen);
  const Icon = open ? ChevronDown : ChevronRight;
  return (
    <Card className={cn('overflow-hidden', muted && 'opacity-[0.45]')}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2 px-3 py-2.5 text-left hover:bg-muted/30"
      >
        <Icon className="w-3.5 h-3.5 text-muted-foreground flex-none" />
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
        <span className="text-[10.5px] font-extrabold tracking-[.14em] uppercase text-foreground">
          {title}
        </span>
        <span className="text-[10.5px] font-medium text-muted-foreground/60">{count}</span>
        {locked && lockCaption && (
          <span className="text-[10.5px] text-muted-foreground/70 italic ml-1">{lockCaption}</span>
        )}
      </button>
      {open && (
        <div className="border-t border-border/60 divide-y divide-border/40">
          {people.length === 0 ? (
            <div className="px-3 py-4 text-[12px] text-muted-foreground text-center">
              {emptyText || 'No members yet.'}
            </div>
          ) : (
            people.map((p) => (
              <PersonRow
                key={p.user_id}
                p={p}
                isB2B={
                  !!p.position &&
                  !!b2bPositions &&
                  b2bPositions.has(p.position.trim().toLowerCase())
                }
                onClick={() => onPersonClick?.(p)}
                clickable={personClickable}
              />
            ))
          )}
        </div>
      )}
    </Card>
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
  prereqCategoryMap: Map<string, { catCode: string; displayOrder: number }>;
  disciplineStatement?: string | null;
}> = ({ party, isApprover, vcrCode, vcrName, onOpenChange, handoverPointId, projectId, prereqCategoryMap, disciplineStatement }) => {
  const [openItem, setOpenItem] = useState<VCRItemBasic | null>(null);
  if (!party) return null;

  return (
    <>
      <Sheet open={!!party} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="!z-modal-critical w-full sm:max-w-lg p-0 flex flex-col">
          {/* G1 header — title + VCR-NN · Name subtext, single pill top-right, no eyebrow, no X */}
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
                  <SheetTitle className="text-[15px] leading-snug truncate">
                    {party.full_name}
                  </SheetTitle>
                  <SheetDescription className="text-[12px] mt-0.5 truncate text-muted-foreground">
                    {party.role_name || party.position || '—'} · {vcrCode}{vcrName ? ` · ${vcrName}` : ''}
                  </SheetDescription>
                </div>
              </div>
              <span
                className={cn(
                  'flex-none text-[10.5px] font-bold rounded-full px-2 py-0.5',
                  fractionChipClass(party.assigned, party.completed),
                )}
              >
                {party.completed} of {party.assigned}
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
              {party.items.length === 0 ? (
                <div className="p-6 text-sm text-muted-foreground text-center">
                  No VCR items assigned via this role.
                </div>
              ) : (
                party.items.map((it) => {
                  const meta = prereqCategoryMap.get(it.prereq_id);
                  const code = meta ? formatVcrItemCode(meta.catCode, meta.displayOrder) : '';
                  const pill = standardPill(it.status as PrereqStatus);
                  return (
                    <button
                      key={it.prereq_id}
                      onClick={() => {
                        const catName = meta && meta.catCode in CATEGORY_META
                          ? CATEGORY_META[meta.catCode as keyof typeof CATEGORY_META].name
                          : 'Uncategorized';
                        setOpenItem({
                          id: it.prereq_id,
                          vcr_item: it.summary,
                          topic: null,
                          category_name: catName,
                          category_code: meta?.catCode ?? '??',
                          status: it.status,
                          prerequisite_id: it.prereq_id,
                          itemCode: code,
                        });
                      }}
                      className="w-full flex items-baseline gap-3 px-4 py-2.5 text-left hover:bg-muted/40 transition"
                    >
                      <div className="w-[52px] flex-none font-mono text-[11px] text-muted-foreground leading-tight">
                        {code || '—'}
                      </div>
                      <div className="flex-1 text-[13px] leading-snug">{it.summary}</div>
                      <div className={cn('w-[92px] flex-none text-center text-[10.5px] font-bold py-0.5 rounded-full', pill.className)}>
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
    const m = new Map<string, { catCode: string; displayOrder: number }>();
    prerequisites.forEach((p) => {
      const code = normalizeCategoryCode(p.category);
      m.set(p.id, { catCode: code === 'XX' ? '??' : code, displayOrder: p.display_order ?? 0 });
    });
    return m;
  }, [prerequisites]);

  const prereqCodeMap = useMemo(() => {
    const m = new Map<string, string>();
    prereqCategoryMap.forEach((v, id) => m.set(id, formatVcrItemCode(v.catCode, v.displayOrder)));
    return m;
  }, [prereqCategoryMap]);

  const openDelivery = lifecyclePhase
    ? lifecyclePhase === 'IN_EXECUTION' || lifecyclePhase === 'DRAFT' || lifecyclePhase === 'AWAITING_SUMMARY'
    : true;
  const openApprover = lifecyclePhase === 'AWAITING_SUMMARY';

  const b2bPositions = useMemo(() => {
    const posCount = new Map<string, number>();
    data.approving.forEach((p) => {
      if (!p.position) return;
      const key = p.position.trim().toLowerCase();
      posCount.set(key, (posCount.get(key) || 0) + 1);
    });
    return new Set([...posCount.entries()].filter(([, c]) => c > 1).map(([k]) => k));
  }, [data.approving]);

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
      {/* G2 tab header — title, VCR subtext, narrative summary, divider */}
      <div>
        <h2 className="text-[16px] font-bold tracking-tight text-foreground">Parties</h2>
        <div className="text-[12px] text-muted-foreground mt-0.5">
          {handoverPoint.vcr_code}{handoverPoint.name ? ` · ${handoverPoint.name}` : ''}
        </div>
      </div>
      <div className="rounded-md bg-muted/40 px-4 py-3 text-[12.5px] leading-relaxed text-foreground/85">
        {narrative.split(/(\*\*[^*]+\*\*)/g).map((chunk, i) =>
          chunk.startsWith('**') ? (
            <strong key={i} className="font-semibold text-foreground">
              {chunk.slice(2, -2)}
            </strong>
          ) : (
            <span key={i}>{chunk}</span>
          ),
        )}
      </div>
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/70 pointer-events-none" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name, discipline, item ID or description"
          className="h-9 pl-8 text-[12.5px]"
        />
      </div>
      <div className="h-px bg-border/60" />

      <div className="space-y-3">
        <Group
          title="VCR Delivery"
          count={fDelivering.length}
          defaultOpen={openDelivery}
          emptyText={q ? 'No matches in this group.' : 'No delivering role holders resolved for this project yet.'}
          people={fDelivering}
          onPersonClick={setOpenParty}
          personClickable
        />
        <Group
          title="VCR Approvers"
          count={fApproving.length}
          defaultOpen={openApprover || !!q}
          emptyText={q ? 'No matches in this group.' : 'No approving parties assigned yet.'}
          people={fApproving}
          b2bPositions={b2bPositions}
          onPersonClick={setOpenParty}
          personClickable
        />
        {isHC && (
          <Group
            title="SoF Approvers · UNLOCKS AT VCR APPROVAL"
            count={fSof.length}
            defaultOpen={false}
            locked={!gateUnlocked}
            lockTooltip="Statement of Fitness applies to hydrocarbon VCRs. Unlocks once every VCR item reaches terminal status."
            emptyText="No SoF approver role holders resolved yet."
            people={fSof}
            muted={!gateUnlocked}
          />
        )}
        <Group
          title="PAC Approvers · UNLOCKS AT VCR APPROVAL"
          count={fPac.length}
          defaultOpen={false}
          locked={!gateUnlocked}
          lockTooltip="Provisional Acceptance Certificate signature. Unlocks once every VCR item reaches terminal status."
          emptyText="No PAC approver role holders resolved yet."
          people={fPac}
          muted={!gateUnlocked}
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
      />
    </div>
  );
};

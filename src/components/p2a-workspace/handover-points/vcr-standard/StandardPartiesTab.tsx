import React, { useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
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
import { ChevronDown, ChevronRight, Lock, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { P2AHandoverPoint } from '../../hooks/useP2AHandoverPoints';
import { useVCRPrerequisites } from '../../hooks/useVCRPrerequisites';
import { useVCRHydrocarbonStatus } from '@/hooks/useVCRHydrocarbonStatus';
import { PrereqStatus, standardPill, normalizeCategoryCode, CATEGORY_META } from './standardStatus';
import { PartyPerson, PartyItem, useVCRPartiesRollup } from './useVCRPartiesRollup';
import { VCRItemDetailSheet, VCRItemBasic } from '@/components/widgets/VCRItemDetailSheet';
import { formatVcrItemCode } from '@/lib/vcrItemCode';
import { useDisciplineStatements } from '@/components/widgets/vcr-assurance/useDisciplineStatements';

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
}

const Group: React.FC<GroupProps> = ({
  title, count, defaultOpen, locked, lockCaption, lockTooltip, emptyText,
  people, b2bPositions, onPersonClick, personClickable,
}) => {
  const [open, setOpen] = useState(defaultOpen);
  const Icon = open ? ChevronDown : ChevronRight;
  return (
    <Card className="overflow-hidden">
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
          <span className="text-[10.5px] text-muted-foreground/70 italic">{lockCaption}</span>
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
  onOpenChange: (o: boolean) => void;
  handoverPointId: string;
  projectId?: string;
  prereqCategoryMap: Map<string, { catCode: string; displayOrder: number }>;
}> = ({ party, onOpenChange, handoverPointId, projectId, prereqCategoryMap }) => {
  const [openItem, setOpenItem] = useState<VCRItemBasic | null>(null);
  if (!party) return null;

  return (
    <>
      <Sheet open={!!party} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="!z-modal-critical w-full sm:max-w-lg p-0 flex flex-col">
          <SheetHeader className="px-5 pt-5 pb-3 border-b shrink-0">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10 flex-none">
                {party.avatar_url && <AvatarImage src={party.avatar_url} alt={party.full_name} />}
                <AvatarFallback className="text-[11px] font-semibold bg-slate-200 text-slate-700">
                  {initials(party.full_name)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <div className="text-[10.5px] font-bold tracking-[0.14em] uppercase text-muted-foreground">
                  Party
                </div>
                <SheetTitle className="text-[15px] leading-snug truncate">
                  {party.full_name}
                </SheetTitle>
                <SheetDescription className="text-[12px] mt-0.5 truncate">
                  {party.role_name || party.position || '—'} · {party.completed}/{party.assigned}
                </SheetDescription>
              </div>
            </div>
          </SheetHeader>
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
  const [openParty, setOpenParty] = useState<PartyPerson | null>(null);

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

  const openDelivery = lifecyclePhase
    ? lifecyclePhase === 'IN_EXECUTION' || lifecyclePhase === 'DRAFT' || lifecyclePhase === 'AWAITING_SUMMARY'
    : true;
  const openApprover = lifecyclePhase === 'AWAITING_SUMMARY';
  const openSof = lifecyclePhase === 'AWAITING_SOF';
  const openPac = lifecyclePhase === 'AWAITING_PAC';

  const b2bPositions = useMemo(() => {
    const posCount = new Map<string, number>();
    data.approving.forEach((p) => {
      if (!p.position) return;
      const key = p.position.trim().toLowerCase();
      posCount.set(key, (posCount.get(key) || 0) + 1);
    });
    return new Set([...posCount.entries()].filter(([, c]) => c > 1).map(([k]) => k));
  }, [data.approving]);

  if (isLoading) {
    return <div className="p-6 text-sm text-muted-foreground">Loading parties…</div>;
  }

  return (
    <div className="space-y-3">
      <Group
        title="VCR Delivery"
        count={data.delivering.length}
        defaultOpen={openDelivery}
        emptyText="No delivering role holders resolved for this project yet."
        people={data.delivering}
        onPersonClick={setOpenParty}
        personClickable
      />
      <Group
        title="VCR Approver"
        count={data.approving.length}
        defaultOpen={openApprover}
        emptyText="No approving parties assigned yet."
        people={data.approving}
        b2bPositions={b2bPositions}
        onPersonClick={setOpenParty}
        personClickable
      />
      {isHC && (
        <Group
          title="SoF Approver"
          count={data.sof.length}
          defaultOpen={openSof && gateUnlocked}
          locked={!gateUnlocked}
          lockCaption="— unlocks once all VCR items are approved"
          lockTooltip="Statement of Fitness applies to hydrocarbon VCRs. Unlocks once every VCR item reaches terminal status."
          emptyText="No SoF approver role holders resolved yet."
          people={data.sof}
        />
      )}
      <Group
        title="PAC Approver"
        count={data.pac.length}
        defaultOpen={openPac && gateUnlocked}
        locked={!gateUnlocked}
        lockCaption="— unlocks once all VCR items are approved"
        lockTooltip="Provisional Acceptance Certificate signature. Unlocks once every VCR item reaches terminal status."
        emptyText="No PAC approver role holders resolved yet."
        people={data.pac}
      />

      <PartyItemsDrawer
        party={openParty}
        onOpenChange={(o) => { if (!o) setOpenParty(null); }}
        handoverPointId={handoverPoint.id}
        projectId={projectId}
        prereqCategoryMap={prereqCategoryMap}
      />
    </div>
  );
};

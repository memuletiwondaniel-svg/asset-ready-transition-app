import React, { useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { ChevronDown, ChevronRight, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { P2AHandoverPoint } from '../../hooks/useP2AHandoverPoints';
import { useVCRPrerequisites } from '../../hooks/useVCRPrerequisites';
import { useVCRHydrocarbonStatus } from '@/hooks/useVCRHydrocarbonStatus';
import { PrereqStatus, standardPill } from './standardStatus';
import { PartyPerson, useVCRPartiesRollup } from './useVCRPartiesRollup';

interface Props {
  handoverPoint: P2AHandoverPoint;
}

const initials = (name: string) =>
  name
    .split(/\s+/)
    .map((n) => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase() || '?';

const PersonRow: React.FC<{ p: PartyPerson; isB2B?: boolean }> = ({ p, isB2B }) => {
  const done = p.assigned > 0 && p.completed === p.assigned;
  return (
    <div className="flex items-center gap-3 px-3 py-2 hover:bg-muted/30 transition-colors">
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
          done
            ? 'bg-emerald-50 text-emerald-700'
            : 'bg-slate-100 text-muted-foreground',
        )}
        title={`${p.completed} of ${p.assigned} complete`}
      >
        {p.completed}/{p.assigned}
      </span>
    </div>
  );
};

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
}

const Group: React.FC<GroupProps> = ({
  title,
  count,
  defaultOpen,
  locked,
  lockCaption,
  lockTooltip,
  emptyText,
  people,
  b2bPositions,
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
        <span className="text-[10.5px] font-medium text-muted-foreground/60">
          {count}
        </span>
        {locked && lockCaption && (
          <span className="text-[10.5px] text-muted-foreground/70 italic">
            {lockCaption}
          </span>
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
              />
            ))
          )}
        </div>
      )}
    </Card>
  );
};

/**
 * Parties tab (v8_1) — four groups, real data only.
 *
 *  DELIVERING PARTIES   count
 *  APPROVING PARTIES    count
 *  🔒 SOF APPROVER  — unlocks once all VCR items are approved   (HC only)
 *  🔒 PAC APPROVER  — unlocks once all VCR items are approved
 *
 * Smart-default collapse:
 *  - Delivering expanded while any delivering work remains open.
 *  - Once every delivering party is at fraction 1/1, initial state flips
 *    to Approving-only expanded (delivering collapses).
 *  - SoF/PAC collapsed while locked, default-expanded once unlocked.
 */
export const StandardPartiesTab: React.FC<Props> = ({ handoverPoint }) => {
  const { data: hc } = useVCRHydrocarbonStatus(handoverPoint.id);
  const { prerequisites } = useVCRPrerequisites(handoverPoint.id);
  const { data: rollup, isLoading } = useVCRPartiesRollup(handoverPoint.id);

  const isHC = hc?.status === 'HC';

  const gateUnlocked = useMemo(() => {
    if (prerequisites.length === 0) return false;
    return prerequisites.every(
      (p) => standardPill(p.status as PrereqStatus).bucket === 'terminal',
    );
  }, [prerequisites]);

  const data = rollup || { delivering: [], approving: [], sof: [], pac: [] };

  const deliveringAllDone =
    data.delivering.length > 0 &&
    data.delivering.every((p) => p.assigned > 0 && p.completed === p.assigned);

  // B2B pair detector — collapse when two approvers share the same normalized
  // position string (mirrors the useApprovingPartyHolders rule).
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
    return (
      <div className="p-6 text-sm text-muted-foreground">Loading parties…</div>
    );
  }

  return (
    <div className="space-y-3">
      <Group
        title="VCR Delivery"
        count={data.delivering.length}
        defaultOpen={!deliveringAllDone}
        emptyText="No delivering parties assigned yet."
        people={data.delivering}
      />
      <Group
        title="VCR Approver"
        count={data.approving.length}
        defaultOpen={deliveringAllDone}
        emptyText="No approving parties assigned yet."
        people={data.approving}
        b2bPositions={b2bPositions}
      />
      {isHC && (
        <Group
          title="SoF approver"
          count={data.sof.length}
          defaultOpen={gateUnlocked}
          locked={!gateUnlocked}
          lockCaption="— unlocks once all VCR items are approved"
          lockTooltip="Statement of Fitness applies to hydrocarbon VCRs. Unlocks once every VCR item reaches terminal status."
          emptyText="No SoF approver configured yet."
          people={data.sof}
        />
      )}
      <Group
        title="PAC approver"
        count={data.pac.length}
        defaultOpen={gateUnlocked}
        locked={!gateUnlocked}
        lockCaption="— unlocks once all VCR items are approved"
        lockTooltip="Provisional Acceptance Certificate signature. Unlocks once every VCR item reaches terminal status."
        emptyText="No PAC approver configured yet."
        people={data.pac}
      />
    </div>
  );
};

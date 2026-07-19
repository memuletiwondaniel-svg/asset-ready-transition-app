import React from 'react';
import { ProjectVCR, VCRLifecycle } from '@/hooks/useProjectVCRs';
import { cn } from '@/lib/utils';



interface VCRCardProps {
  vcr: ProjectVCR;
  onClick: (vcrId: string) => void;
  isActive?: boolean;
}

const shortCode = (code?: string) => {
  if (!code) return '';
  const match = code.match(/^VCR-[A-Z0-9]+-0*(\d+)$/);
  if (match) return `VCR-${match[1].padStart(2, '0')}`;
  return code.replace(/^VCR-[A-Z0-9]+-/, 'VCR-');
};

const LIFECYCLE_STYLE: Record<
  VCRLifecycle,
  { pillBg: string; pillText: string; label: string; barFill: string }
> = {
  not_started: {
    pillBg: 'hsl(220 14% 92%)',
    pillText: 'hsl(220 9% 40%)',
    label: 'Not started',
    barFill: '#9CA3AF',
  },
  draft: { pillBg: '#FAEEDA', pillText: '#854F0B', label: 'Draft', barFill: '#BA7517' },
  in_progress: { pillBg: '#CFFAFE', pillText: '#155E75', label: 'In progress', barFill: '#0891B2' },
  in_approval: { pillBg: '#E6F1FB', pillText: '#0C447C', label: 'In approval', barFill: '#185FA5' },
  approved: { pillBg: '#E1F5EE', pillText: '#085041', label: 'Approved', barFill: '#0E9F6E' },
  handed_over: { pillBg: '#D1FAE5', pillText: '#064E3B', label: 'Handed Over', barFill: '#059669' },
};

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTHS_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const formatShortDate = (iso: string | null) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return `${MONTHS[d.getMonth()]} ${d.getDate()}`;
};

const formatLongDate = (iso: string | null) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return `${MONTHS_LONG[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
};


const formatRelative = (iso: string | null) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const diff = Date.now() - d.getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
};

export const VCRCard: React.FC<VCRCardProps> = ({ vcr, onClick, isActive = false }) => {
  const displayCode = shortCode(vcr.vcr_code);
  const lifecycle: VCRLifecycle = vcr.lifecycle ?? 'not_started';
  const style = LIFECYCLE_STYLE[lifecycle];
  const isNotStarted = lifecycle === 'not_started';
  const closedItems = vcr.closed_items ?? 0;
  const totalItems = vcr.total_items ?? 0;
  const gate = vcr.gate ?? (vcr.has_hydrocarbon ? 'SOF' : 'PAC');
  const gateLabel = gate === 'SOF' ? 'SoF' : 'PAC';
  const systemsLabel = `${vcr.systems_count} system${vcr.systems_count === 1 ? '' : 's'}`;
  const isHandedOver = lifecycle === 'handed_over';

  // Exception-only left rail per G4:
  //   red   → stalled (non-terminal + no update in >21 days)
  //   amber → action-needed (not_started / draft)
  //   none  → healthy AND completed (handed_over/approved: no rail)
  const daysSinceUpdate = vcr.updated_at
    ? Math.floor((Date.now() - new Date(vcr.updated_at).getTime()) / 86400000)
    : null;
  const isTerminal = lifecycle === 'approved' || lifecycle === 'handed_over';
  const isStale = daysSinceUpdate !== null && daysSinceUpdate > 21 && !isTerminal;
  const isActionNeeded = lifecycle === 'not_started' || lifecycle === 'draft';
  const railColor: string | null = isStale ? '#DC2626' : (isActionNeeded ? '#D97706' : null);

  // Health-based bar fill (NO blue) — the bar owns tone:
  //   red   → stalled
  //   amber → action needed / changes requested
  //   green → moving / approved / handed over
  let barPercent = 0;
  let trailingValue = '';
  let ctxLeft: React.ReactNode = null;
  let ctxRight: React.ReactNode = '';
  let barTone: 'green' | 'amber' | 'red' = 'green';

  if (lifecycle === 'draft') {
    barPercent = Math.max(0, Math.min(100, vcr.planProgress ?? 0));
    const step = Math.max(1, Math.min(10, vcr.planStep ?? 1));
    trailingValue = `Step ${step}/10`;
    ctxLeft = 'Plan setup in progress';
    ctxRight = 'click to continue';
    barTone = 'amber';
  } else if (lifecycle === 'in_progress') {
    const checklistPct = totalItems > 0 ? Math.round((closedItems / totalItems) * 100) : 0;
    barPercent = checklistPct;
    trailingValue = `${checklistPct}%`;
    ctxLeft = `${closedItems} of ${totalItems} items closed`;
    ctxRight = vcr.updated_at ? `Updated ${formatRelative(vcr.updated_at)}` : '';
    barTone = 'green';
  } else if (lifecycle === 'in_approval') {
    const pa = vcr.planApproval;
    const approved = pa?.approvedCount ?? 0;
    const total = pa?.totalCount ?? 0;
    const pct = total > 0 ? Math.round((approved / total) * 100) : 0;
    if (pa?.anyRejected) {
      ctxLeft = 'Changes requested';
      barPercent = pct;
      trailingValue = total > 0 ? `${approved}/${total}` : '';
      barTone = 'amber';
    } else if (pa?.phase === 1) {
      ctxLeft = 'Awaiting ORA Lead approval';
      barPercent = pct;
      trailingValue = 'Phase 1';
      barTone = 'green';
    } else if (pa?.phase === 2) {
      ctxLeft = `${approved} of ${total} approvers signed`;
      barPercent = pct;
      trailingValue = `${approved}/${total}`;
      barTone = 'green';
    } else {
      ctxLeft = 'In approval';
      barPercent = pct;
      trailingValue = total > 0 ? `${approved}/${total}` : '';
      barTone = 'green';
    }
    ctxRight = vcr.submitted_at ? `Submitted ${formatShortDate(vcr.submitted_at)}` : '';
  } else if (lifecycle === 'approved') {
    barPercent = 100;
    trailingValue = '100%';
    ctxLeft = systemsLabel;
    ctxRight = vcr.approved_at ? `Approved ${formatShortDate(vcr.approved_at)}` : '';
    barTone = 'green';
  } else if (lifecycle === 'handed_over') {
    barPercent = 100;
    trailingValue = '100%';
    ctxLeft = `${systemsLabel} · ${gateLabel} signed`;
    ctxRight = vcr.gate_signed_at ? `Handed over ${formatShortDate(vcr.gate_signed_at)}` : '';
    barTone = 'green';
  }

  // Stalled overrides bar tone to red.
  if (isStale) barTone = 'red';

  const barFillColor = barTone === 'red' ? '#DC2626' : barTone === 'amber' ? '#D97706' : '#059669';

  // Stale chip replaces the plain "Updated Xd ago" line on the right when
  // the card has been idle >21 days on a non-terminal lifecycle.
  if (isStale && daysSinceUpdate !== null) {
    ctxRight = (
      <span className="inline-flex items-center gap-1 text-red-600 font-medium">
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-red-600" aria-hidden />
        Stale {daysSinceUpdate}d
      </span>
    );
  }

  const activeBorder = 'hsl(var(--primary))';
  const activeBg = 'hsl(var(--primary) / 0.08)';
  const activeText = 'hsl(var(--primary))';

  const handedOverDate = isHandedOver ? formatLongDate(vcr.gate_signed_at ?? null) : '';
  const certLineText = isHandedOver && handedOverDate ? `${gateLabel} signed on ${handedOverDate}` : '';

  // Handed-over: NO rail, green "Handed over" chip only (spec j).
  const handedOverChipStyle: React.CSSProperties = {
    padding: '2px 8px',
    backgroundColor: '#D1FAE5',
    color: '#064E3B',
  };

  // Compose the inset left-rule box-shadow. Handed-over cards get no rail.
  const insetRuleShadow = !isHandedOver && railColor ? `inset 3px 0 0 ${railColor}` : null;

  return (
    <button
      type="button"
      onClick={() => onClick(vcr.id)}
      className={cn(
        'group/vcr w-full text-left py-3',
        'transition-[background-color,border-color,box-shadow,transform] duration-150 ease-out',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30',
        'rounded-lg',
        !isActive &&
          'bg-muted dark:bg-muted/60 border border-border hover:bg-card hover:border-foreground/20 hover:shadow-md hover:-translate-y-px'
      )}
      style={{
        paddingLeft: insetRuleShadow ? 16 : 14,
        paddingRight: 14,
        ...(isActive
          ? {
              backgroundColor: activeBg,
              border: `1px solid ${activeBorder}`,
              ...(insetRuleShadow ? { boxShadow: insetRuleShadow } : {}),
            }
          : insetRuleShadow
            ? { boxShadow: insetRuleShadow }
            : {}),
      }}
    >
      {/* Row 1: "CODE · NAME" on a single line. Status pill removed except
          for handed-over (green "Handed over" chip only). */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <span
            className="text-[12px] font-medium tracking-[0.02em] shrink-0"
            style={{
              fontFamily: "'JetBrains Mono', ui-monospace, monospace",
              color: isActive ? activeText : 'hsl(var(--muted-foreground))',
            }}
          >
            {displayCode}
          </span>
          <span className="text-muted-foreground/60 shrink-0">·</span>
          <span
            className={cn(
              'text-[13px] font-medium leading-tight truncate',
              isHandedOver ? 'text-muted-foreground' : 'text-foreground',
            )}
          >
            {vcr.name}
          </span>
        </div>
        {isHandedOver && (
          <span
            className="inline-flex items-center text-[11px] font-medium rounded-full shrink-0"
            style={handedOverChipStyle}
          >
            Handed over
          </span>
        )}
      </div>

      {isNotStarted ? (
        <p
          className="text-[12px] italic leading-[1.4]"
          style={{ color: 'hsl(var(--muted-foreground))' }}
        >
          No plan yet — click to begin
        </p>
      ) : isHandedOver ? (
        <p
          className="text-[12px] leading-[1.4] truncate"
          style={{ color: 'hsl(var(--muted-foreground) / 0.75)' }}
        >
          {certLineText}
        </p>
      ) : (
        <>
          {/* Row 2: health-coloured bar + neutral trailing value */}
          <div className="flex items-center gap-2.5 mb-2">
            <div
              className="relative flex-1 rounded-full overflow-hidden"
              style={{
                height: 3,
                backgroundColor: isActive
                  ? 'rgba(255,255,255,0.5)'
                  : 'hsl(var(--foreground) / 0.12)',
              }}
            >
              <div
                className="h-full rounded-full"
                style={{
                  width: `${barPercent}%`,
                  backgroundColor: barFillColor,
                  transition: 'width 0.4s cubic-bezier(0.4, 0.0, 0.2, 1)',
                }}
              />
            </div>
            <span
              className="text-[12px] font-medium tracking-[0.02em] tabular-nums shrink-0 text-muted-foreground"
              style={{ fontFamily: "'JetBrains Mono', ui-monospace, monospace" }}
            >
              {trailingValue}
            </span>
          </div>

          {/* Row 3: context line */}
          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <span className="truncate">{ctxLeft}</span>
            {ctxRight && <span className="shrink-0 ml-2">{ctxRight}</span>}
          </div>
        </>
      )}
    </button>
  );
};



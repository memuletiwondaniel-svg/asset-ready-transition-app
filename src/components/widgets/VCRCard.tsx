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

// State-coded hex palette (authoritative per brief — do not tokenize)
const LIFECYCLE_STYLE: Record<
  VCRLifecycle,
  {
    pillBg: string;
    pillText: string;
    pillDot: string;
    label: string;
    barFill: string;
  }
> = {
  not_started: {
    pillBg: 'hsl(var(--secondary))',
    pillText: 'hsl(var(--muted-foreground))',
    pillDot: 'hsl(var(--muted-foreground))',
    label: 'Not started',
    barFill: '#9CA3AF',
  },
  draft: {
    pillBg: '#FAEEDA',
    pillText: '#854F0B',
    pillDot: '#BA7517',
    label: 'Draft',
    barFill: '#BA7517',
  },
  in_approval: {
    pillBg: '#E6F1FB',
    pillText: '#0C447C',
    pillDot: '#185FA5',
    label: 'In approval',
    barFill: '#185FA5',
  },
  approved: {
    pillBg: '#E1F5EE',
    pillText: '#085041',
    pillDot: '#0F6E56',
    label: 'Approved',
    barFill: '#0F6E56',
  },
};

const SOF_SIGNED_COLOR = '#0F6E56';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const formatShortDate = (iso: string | null) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return `${MONTHS[d.getMonth()]} ${d.getDate()}`;
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

const Dot: React.FC = () => (
  <span
    aria-hidden
    className="inline-block w-[3px] h-[3px] rounded-full mx-1.5 align-middle"
    style={{ backgroundColor: 'hsl(var(--muted-foreground) / 0.5)' }}
  />
);

export const VCRCard: React.FC<VCRCardProps> = ({ vcr, onClick, isActive = false }) => {
  const displayCode = shortCode(vcr.vcr_code);
  const lifecycle: VCRLifecycle = vcr.lifecycle ?? 'draft';
  const style = LIFECYCLE_STYLE[lifecycle];
  const isNotStarted = lifecycle === 'not_started';
  const percent = Math.max(0, Math.min(100, vcr.progress));
  const closedItems = vcr.closed_items ?? 0;
  const totalItems = vcr.total_items ?? 0;
  const sofSigned = vcr.sof_signed ?? false;

  // Summary line
  let summary: React.ReactNode = null;
  if (isNotStarted) {
    summary = (
      <p
        className="text-[12px] italic leading-[1.4] mb-1"
        style={{ color: 'hsl(var(--muted-foreground))' }}
      >
        No checklist items yet — click to begin
      </p>
    );
  } else if (lifecycle === 'draft') {
    summary = (
      <p className="text-[12px] leading-[1.4] mb-2.5 text-muted-foreground">
        {closedItems} of {totalItems} checklist items closed
      </p>
    );
  } else if (lifecycle === 'in_approval') {
    const text =
      totalItems > 0 && closedItems >= totalItems
        ? `All ${totalItems} items closed · awaiting SoF sign-off`
        : `${closedItems} of ${totalItems} items closed · submitted for approval`;
    summary = <p className="text-[12px] leading-[1.4] mb-2.5 text-muted-foreground">{text}</p>;
  } else {
    summary = (
      <p className="text-[12px] leading-[1.4] mb-2.5 text-muted-foreground">
        All items closed · SoF signed off
      </p>
    );
  }

  // Footer
  let footer: React.ReactNode = null;
  if (!isNotStarted) {
    const sysLabel = `${vcr.systems_count} system${vcr.systems_count === 1 ? '' : 's'}`;
    let left: React.ReactNode = sysLabel;
    let right = '';
    if (lifecycle === 'draft') {
      right = vcr.updated_at ? `Updated ${formatRelative(vcr.updated_at)}` : '';
    } else if (lifecycle === 'in_approval') {
      left = (
        <>
          {sysLabel}
          <Dot />
          {sofSigned ? 'SoF signed' : 'SoF pending'}
        </>
      );
      right = vcr.submitted_at ? `Submitted ${formatShortDate(vcr.submitted_at)}` : '';
    } else if (lifecycle === 'approved') {
      right = vcr.approved_at ? `Approved ${formatShortDate(vcr.approved_at)}` : '';
    }
    footer = (
      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
        <span className="truncate">{left}</span>
        {right && <span className="shrink-0 ml-2">{right}</span>}
      </div>
    );
  }

  // Interaction colours
  const activeBorder = 'hsl(var(--primary))';
  const activeBg = 'hsl(var(--primary) / 0.08)';
  const activeText = 'hsl(var(--primary))';

  return (
    <button
      type="button"
      onClick={() => onClick(vcr.id)}
      className={cn(
        'group/vcr w-full text-left rounded-lg px-3.5 py-3',
        'transition-[border-color,background-color] duration-150 ease-in-out',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30',
        // Default + hover (active overrides via inline styles below)
        !isActive && 'bg-card border-[0.5px] border-border/70 hover:bg-muted/50 hover:border-border'
      )}
      style={
        isActive
          ? {
              backgroundColor: activeBg,
              border: `0.5px solid ${activeBorder}`,
            }
          : undefined
      }
    >
      {/* Top row: code + status pill */}
      <div className="flex items-center justify-between mb-2">
        <span
          className="text-[12px] font-medium tracking-[0.02em]"
          style={{
            fontFamily: "'JetBrains Mono', ui-monospace, monospace",
            color: isActive ? activeText : 'hsl(var(--foreground))',
          }}
        >
          {displayCode}
        </span>
        <span
          className="inline-flex items-center gap-1 text-[11px] font-medium rounded-full"
          style={{
            padding: '2px 8px',
            backgroundColor: style.pillBg,
            color: style.pillText,
          }}
        >
          <span
            aria-hidden
            className="inline-block rounded-full"
            style={{ width: 6, height: 6, backgroundColor: style.pillDot }}
          />
          {style.label}
        </span>
      </div>

      {/* Title */}
      <h3 className="text-[14px] font-medium leading-[1.4] text-foreground mb-1.5 truncate">
        {vcr.name}
      </h3>

      {/* Summary */}
      {summary}

      {/* Progress block (skipped for Not started) */}
      {!isNotStarted && (
        <div className="mb-2.5">
          <div className="flex items-baseline justify-between mb-1">
            <span
              className="text-[11px] tracking-[0.02em]"
              style={{ color: 'hsl(var(--muted-foreground))' }}
            >
              VCR progress
            </span>
            <span
              className="text-[13px] font-medium tracking-[0.02em] tabular-nums"
              style={{
                fontFamily: "'JetBrains Mono', ui-monospace, monospace",
                color: isActive ? activeText : 'hsl(var(--foreground))',
              }}
            >
              {percent}%
            </span>
          </div>
          <div
            className="relative w-full rounded-full overflow-visible"
            style={{
              height: 3,
              backgroundColor: isActive
                ? 'rgba(255,255,255,0.5)'
                : 'hsl(var(--secondary))',
            }}
          >
            <div
              className="h-full rounded-full"
              style={{
                width: `${percent}%`,
                backgroundColor: style.barFill,
                transition: 'width 0.4s cubic-bezier(0.4, 0.0, 0.2, 1)',
              }}
            />
            {/* SoF marker at right edge */}
            <span
              aria-hidden
              className="absolute rounded-full"
              style={{
                top: -3,
                left: '100%',
                transform: 'translateX(-50%)',
                width: 9,
                height: 9,
                backgroundColor: sofSigned ? SOF_SIGNED_COLOR : 'hsl(var(--card))',
                border: `1.5px solid ${sofSigned ? SOF_SIGNED_COLOR : 'hsl(var(--muted-foreground))'}`,
              }}
            />
          </div>
        </div>
      )}

      {footer}
    </button>
  );
};

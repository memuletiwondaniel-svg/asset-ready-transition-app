import React from 'react';
import { Check } from 'lucide-react';
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

export const VCRCard: React.FC<VCRCardProps> = ({ vcr, onClick, isActive = false }) => {
  const displayCode = shortCode(vcr.vcr_code);
  const lifecycle: VCRLifecycle = vcr.lifecycle ?? 'not_started';
  const style = LIFECYCLE_STYLE[lifecycle];
  const isNotStarted = lifecycle === 'not_started';
  const closedItems = vcr.closed_items ?? 0;
  const totalItems = vcr.total_items ?? 0;
  const gate = vcr.gate ?? (vcr.has_hydrocarbon ? 'SOF' : 'PAC');
  const gateLabel = gate === 'SOF' ? 'SoF' : 'PAC';
  const gateSigned = vcr.gate_signed ?? vcr.sof_signed ?? false;
  const systemsLabel = `${vcr.systems_count} system${vcr.systems_count === 1 ? '' : 's'}`;

  // Derive bar percent + trailing value per state
  let barPercent = 0;
  let trailingValue = '';
  let ctxLeft: React.ReactNode = null;
  let ctxRight = '';

  if (lifecycle === 'draft') {
    barPercent = Math.max(0, Math.min(100, vcr.planProgress ?? 0));
    const step = Math.max(1, Math.min(10, vcr.planStep ?? 1));
    trailingValue = `Step ${step}/10`;
    ctxLeft = 'Plan setup in progress';
    ctxRight = 'click to continue';
  } else if (lifecycle === 'in_progress') {
    const checklistPct = totalItems > 0 ? Math.round((closedItems / totalItems) * 100) : 0;
    barPercent = checklistPct;
    trailingValue = `${checklistPct}%`;
    ctxLeft = `${closedItems} of ${totalItems} items closed`;
    ctxRight = vcr.updated_at ? `Updated ${formatRelative(vcr.updated_at)}` : '';
  } else if (lifecycle === 'in_approval') {
    barPercent = 100;
    trailingValue = '100%';
    ctxLeft = `${systemsLabel} · ${gateLabel} ${gateSigned ? 'signed' : 'pending'}`;
    ctxRight = vcr.submitted_at ? `Submitted ${formatShortDate(vcr.submitted_at)}` : '';
  } else if (lifecycle === 'approved') {
    barPercent = 100;
    trailingValue = '100%';
    ctxLeft = systemsLabel;
    ctxRight = vcr.approved_at ? `Approved ${formatShortDate(vcr.approved_at)}` : '';
  } else if (lifecycle === 'handed_over') {
    barPercent = 100;
    trailingValue = '100%';
    ctxLeft = `${systemsLabel} · ${gateLabel} signed`;
    ctxRight = vcr.gate_signed_at ? `Handed over ${formatShortDate(vcr.gate_signed_at)}` : '';
  }

  const activeBorder = 'hsl(var(--primary))';
  const activeBg = 'hsl(var(--primary) / 0.08)';
  const activeText = 'hsl(var(--primary))';

  return (
    <button
      type="button"
      onClick={() => onClick(vcr.id)}
      className={cn(
        'group/vcr w-full text-left rounded-lg px-3.5 py-3',
        'transition-[background-color,border-color,box-shadow,transform] duration-150 ease-out',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30',
        !isActive &&
          'bg-muted dark:bg-muted/60 border border-border hover:bg-card hover:border-foreground/20 hover:shadow-md hover:-translate-y-px'
      )}
      style={
        isActive
          ? { backgroundColor: activeBg, border: `1px solid ${activeBorder}` }
          : undefined
      }
    >
      {/* Row 1: ID + status pill */}
      <div className="flex items-center justify-between mb-2">
        <span
          className="text-[12px] font-medium tracking-[0.02em]"
          style={{
            fontFamily: "'JetBrains Mono', ui-monospace, monospace",
            color: isActive ? activeText : 'hsl(var(--muted-foreground))',
          }}
        >
          {displayCode}
        </span>
        <span
          className="inline-flex items-center text-[11px] font-medium rounded-full"
          style={{ padding: '2px 8px', backgroundColor: style.pillBg, color: style.pillText }}
        >
          {style.label}
        </span>
      </div>

      {/* Row 2: Title */}
      <h3 className="text-[14px] font-medium leading-[1.4] text-foreground mb-2 truncate">
        {vcr.name}
      </h3>

      {isNotStarted ? (
        <p
          className="text-[12px] italic leading-[1.4]"
          style={{ color: 'hsl(var(--muted-foreground))' }}
        >
          No plan yet — click to begin
        </p>
      ) : (
        <>
          {/* Row 3: bar + trailing value on one line */}
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
                  backgroundColor: style.barFill,
                  transition: 'width 0.4s cubic-bezier(0.4, 0.0, 0.2, 1)',
                }}
              />
            </div>
            <span
              className="text-[13px] font-medium tracking-[0.02em] tabular-nums shrink-0"
              style={{
                fontFamily: "'JetBrains Mono', ui-monospace, monospace",
                color: isActive ? activeText : 'hsl(var(--foreground))',
              }}
            >
              {trailingValue}
            </span>
          </div>

          {/* Row 4: context line */}
          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <span className="truncate">{ctxLeft}</span>
            {ctxRight && <span className="shrink-0 ml-2">{ctxRight}</span>}
          </div>
        </>
      )}
    </button>
  );
};

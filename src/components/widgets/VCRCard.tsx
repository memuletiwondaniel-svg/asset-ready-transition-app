import React from 'react';
import { ProjectVCR } from '@/hooks/useProjectVCRs';
import { getVCRColor } from '@/components/p2a-workspace/utils/vcrColors';
import { cn } from '@/lib/utils';

interface VCRCardProps {
  vcr: ProjectVCR;
  onClick: (vcrId: string) => void;
}

const shortCode = (code?: string) => {
  if (!code) return '';
  const match = code.match(/^VCR-[A-Z0-9]+-0*(\d+)$/);
  if (match) return `VCR-${match[1].padStart(2, '0')}`;
  return code.replace(/^VCR-[A-Z0-9]+-/, 'VCR-');
};

const Doughnut: React.FC<{ value: number; stroke: string; textColor: string; mutedText?: boolean }> = ({
  value,
  stroke,
  textColor,
  mutedText,
}) => {
  const c = 2 * Math.PI * 42;
  const offset = c - (value / 100) * c;
  return (
    <div className="relative shrink-0 w-[72px] h-[72px]">
      <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
        <circle
          cx="50"
          cy="50"
          r="42"
          fill="transparent"
          strokeWidth={4}
          className="text-muted/50"
          stroke="currentColor"
        />
        <circle
          cx="50"
          cy="50"
          r="42"
          fill="transparent"
          strokeWidth={6}
          strokeDasharray={c}
          strokeDashoffset={offset}
          strokeLinecap="round"
          stroke={stroke}
          style={{ transition: 'stroke-dashoffset 0.8s ease-out' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center leading-none">
        <span
          className="text-[14px] font-extrabold tabular-nums"
          style={{ color: textColor }}
        >
          {value}
        </span>
        <span
          className={cn('text-[8px] font-bold mt-0.5', mutedText ? 'text-muted-foreground/40' : 'text-muted-foreground')}
        >
          %
        </span>
      </div>
    </div>
  );
};

export const VCRCard: React.FC<VCRCardProps> = ({ vcr, onClick }) => {
  const vcrColor = getVCRColor(vcr.vcr_code);
  const progress = vcr.progress;
  const isComplete = progress === 100;
  const isInProgress = progress > 0 && progress < 100;
  const displayCode = shortCode(vcr.vcr_code);

  const accent = isComplete
    ? 'hsl(160, 84%, 39%)'
    : isInProgress
    ? vcrColor?.border ?? 'hsl(var(--primary))'
    : 'hsl(var(--muted-foreground) / 0.3)';

  const ringTextColor = isComplete
    ? 'hsl(160, 84%, 30%)'
    : isInProgress
    ? 'hsl(var(--foreground))'
    : 'hsl(var(--muted-foreground) / 0.5)';

  const status = isComplete ? 'Finalized' : isInProgress ? 'In Progress' : 'Draft';

  const statusPillClass = isComplete
    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
    : isInProgress
    ? 'text-foreground'
    : 'bg-muted/60 text-muted-foreground italic';

  const statusPillStyle: React.CSSProperties = isInProgress
    ? { backgroundColor: `${accent}14`, color: accent }
    : {};

  return (
    <button
      onClick={() => onClick(vcr.id)}
      className={cn(
        'group/vcr w-full text-left bg-card border border-border/60 rounded-2xl px-4 py-2.5',
        'shadow-[0_1px_2px_rgba(0,0,0,0.03)] hover:shadow-[0_12px_30px_-12px_rgba(0,0,0,0.12)]',
        'hover:-translate-y-0.5 transition-all duration-300 cursor-pointer'
      )}
      onMouseEnter={(e) => {
        if (!isComplete && !isInProgress) return;
        e.currentTarget.style.borderColor = `${accent}59`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = '';
      }}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-col min-w-0 flex-1">
          <span
            className="block text-[9px] uppercase tracking-[0.18em] font-extrabold text-muted-foreground/70 mb-0.5"
            style={{ fontFamily: "'JetBrains Mono', ui-monospace, monospace" }}
          >
            {displayCode}
          </span>
          <h3 className="text-[14px] font-bold text-foreground leading-tight truncate mb-1.5">
            {vcr.name}
          </h3>
          <div className="flex items-center gap-1.5 flex-wrap">
            <span
              className={cn(
                'px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wide',
                statusPillClass
              )}
              style={statusPillStyle}
            >
              {status}
            </span>
            {vcr.has_hydrocarbon && (
              <span className="text-[9px] font-bold text-muted-foreground/60 tracking-[0.15em] uppercase">
                SoF
              </span>
            )}
            <span className="text-[9px] font-bold text-muted-foreground/60 tracking-[0.15em] uppercase">
              PAC
            </span>
          </div>
        </div>

        <Doughnut
          value={progress}
          stroke={accent}
          textColor={ringTextColor}
          mutedText={!isInProgress && !isComplete}
        />
      </div>
    </button>
  );
};

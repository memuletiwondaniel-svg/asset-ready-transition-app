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

const Doughnut: React.FC<{ value: number; stroke: string; textColor: string }> = ({
  value,
  stroke,
  textColor,
}) => {
  const size = 44;
  const strokeWidth = 4;
  const r = (size - strokeWidth) / 2 - 1;
  const c = 2 * Math.PI * r;
  const offset = c - (value / 100) * c;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={strokeWidth}
          className="text-muted/60"
          stroke="currentColor"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={strokeWidth}
          strokeDasharray={c}
          strokeDashoffset={offset}
          strokeLinecap="round"
          stroke={stroke}
          style={{ transition: 'stroke-dashoffset 0.6s ease-out' }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span
          className="text-[10px] font-bold tabular-nums"
          style={{ fontFamily: "'JetBrains Mono', ui-monospace, monospace", color: textColor }}
        >
          {value}%
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

  // Color tokens — emerald takes over when complete
  const accent = isComplete ? 'hsl(160, 84%, 39%)' : vcrColor?.border ?? 'hsl(var(--primary))';
  const accentSoft = isComplete
    ? 'hsl(160, 84%, 39%, 0.06)'
    : vcrColor
    ? `hsl(${vcrColor.hue}, ${vcrColor.saturation}%, 50%, 0.05)`
    : 'hsl(var(--muted) / 0.4)';
  const ringTextColor = isComplete
    ? 'hsl(160, 84%, 30%)'
    : isInProgress
    ? accent
    : 'hsl(var(--muted-foreground))';

  const status = isComplete ? 'Finalized' : isInProgress ? 'In Progress' : 'Draft';

  return (
    <button
      onClick={() => onClick(vcr.id)}
      className={cn(
        'group/vcr w-full text-left bg-card border border-border rounded-2xl overflow-hidden',
        'shadow-sm hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 cursor-pointer'
      )}
      style={
        {
          // accent border on hover via CSS var
          ['--vcr-accent' as any]: accent,
        } as React.CSSProperties
      }
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = accent;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = '';
      }}
    >
      {/* Header: title + doughnut */}
      <div className="px-3 py-2.5 flex justify-between items-center gap-3">
        <div className="min-w-0 flex flex-col gap-0.5">
          <span
            className="text-[9px] uppercase tracking-widest font-bold text-muted-foreground"
            style={{ fontFamily: "'JetBrains Mono', ui-monospace, monospace" }}
          >
            {displayCode}
          </span>
          <h3 className="text-sm font-semibold text-foreground leading-tight truncate">
            {vcr.name}
          </h3>
        </div>
        <Doughnut value={progress} stroke={accent} textColor={ringTextColor} />
      </div>

      {/* Footer: separator + metadata */}
      <div
        className="px-3 py-2 flex items-center gap-2 border-t border-border"
        style={{ backgroundColor: accentSoft }}
      >
        {isComplete ? (
          <span className="px-2.5 py-0.5 rounded-md bg-emerald-600 text-[10px] font-bold text-white uppercase tracking-wider shadow-sm">
            {status}
          </span>
        ) : isInProgress ? (
          <span
            className="px-2.5 py-0.5 rounded-md border bg-card text-[10px] font-bold uppercase tracking-wider"
            style={{ borderColor: accent, color: accent }}
          >
            {status}
          </span>
        ) : (
          <span className="px-2.5 py-0.5 rounded-md border border-border bg-card text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
            {status}
          </span>
        )}

        <div className="flex gap-1 ml-auto">
          {vcr.has_hydrocarbon && (
            <span
              className={cn(
                'px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-tighter border',
                isComplete
                  ? 'bg-white border-emerald-200 text-emerald-700 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-400'
                  : 'bg-card border-border text-muted-foreground'
              )}
            >
              SoF
            </span>
          )}
          <span
            className={cn(
              'px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-tighter border',
              isComplete
                ? 'bg-white border-emerald-200 text-emerald-700 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-400'
                : 'bg-card border-border text-muted-foreground'
            )}
          >
            PAC
          </span>
        </div>
      </div>
    </button>
  );
};

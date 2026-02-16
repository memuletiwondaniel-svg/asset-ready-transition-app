import React from 'react';
import { Badge } from '@/components/ui/badge';
import { ChevronRight, Shield, Flame } from 'lucide-react';
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

const MiniProgressWheel: React.FC<{ value: number; color?: string }> = ({ value, color }) => {
  const size = 28;
  const strokeWidth = 3;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (value / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          className="text-foreground/[0.06] dark:text-foreground/[0.12]"
          stroke="currentColor"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          stroke={color || 'currentColor'}
          className={cn(!color && 'text-primary')}
          style={{ transition: 'stroke-dashoffset 0.5s ease-out' }}
        />
      </svg>
      <span className="vcr-progress-text absolute text-[8px] font-bold tabular-nums">
        {value}
      </span>
    </div>
  );
};

export const VCRCard: React.FC<VCRCardProps> = ({ vcr, onClick }) => {
  const vcrColor = getVCRColor(vcr.vcr_code);
  const progress = vcr.progress;
  const displayCode = shortCode(vcr.vcr_code);

  const cardStyle: React.CSSProperties = vcrColor
    ? ({
        '--vcr-bg-light': vcrColor.background,
        '--vcr-bg-dark': vcrColor.backgroundDark,
        '--vcr-border-light': vcrColor.accent,
        '--vcr-border-dark': vcrColor.accentDark,
        '--vcr-accent-light': vcrColor.accent,
        '--vcr-accent-dark': vcrColor.accentDark,
        '--vcr-color-light': vcrColor.border,
        '--vcr-color-dark': vcrColor.borderDark,
        '--vcr-bar-light': vcrColor.border,
        '--vcr-bar-dark': vcrColor.borderDark,
      } as React.CSSProperties)
    : {};

  return (
    <button
      onClick={() => onClick(vcr.id)}
      className={cn(
        "vcr-card w-full text-left rounded-xl border px-3 py-2.5 transition-all duration-300",
        "hover:shadow-md hover:-translate-y-0.5 active:translate-y-0",
        "group/vcr cursor-pointer relative overflow-hidden"
      )}
      style={cardStyle}
    >
      <div className="relative z-10 flex items-center gap-3">
        {/* Progress wheel */}
        <MiniProgressWheel value={progress} color={vcrColor?.border} />

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Top row: ID badge + status */}
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className="vcr-id-badge text-[9px] font-bold font-mono tracking-widest px-1.5 py-px rounded">
              {displayCode}
            </span>
            <Badge
              variant="outline"
              className="text-[8px] px-1 py-0 h-3.5 border-border bg-background/60 text-muted-foreground"
            >
              {vcr.status === 'PENDING' ? 'Draft' : vcr.status}
            </Badge>
          </div>

          {/* VCR Name */}
          <div className="text-[13px] font-semibold text-foreground leading-tight truncate">
            {vcr.name}
          </div>
        </div>

        {/* Right side: cert badges + arrow */}
        <div className="flex items-center gap-1.5 shrink-0">
          <div className="flex items-center gap-1">
            {vcr.has_hydrocarbon && (
              <span className="vcr-cert-badge inline-flex items-center gap-0.5 text-[8px] font-semibold px-1.5 py-0.5 rounded-full">
                <Flame className="h-2 w-2" />
                SoF
              </span>
            )}
            <span className="vcr-cert-badge inline-flex items-center gap-0.5 text-[8px] font-semibold px-1.5 py-0.5 rounded-full">
              <Shield className="h-2 w-2" />
              PAC
            </span>
          </div>
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover/vcr:opacity-100 transition-all duration-200" />
        </div>
      </div>
    </button>
  );
};

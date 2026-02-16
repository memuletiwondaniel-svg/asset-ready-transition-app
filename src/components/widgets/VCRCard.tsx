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
        "vcr-card w-full text-left rounded-2xl border p-3.5 transition-all duration-300",
        "hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0",
        "group/vcr cursor-pointer relative overflow-hidden"
      )}
      style={cardStyle}
    >
      <div className="relative z-10">
        {/* Top row: ID badge + status */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="vcr-id-badge text-[10px] font-bold font-mono tracking-widest px-2 py-0.5 rounded-md">
              {displayCode}
            </span>
            <Badge
              variant="outline"
              className="text-[9px] px-1.5 py-0 h-4 border-border bg-background/60 text-muted-foreground"
            >
              {vcr.status === 'PENDING' ? 'Draft' : vcr.status}
            </Badge>
          </div>
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover/vcr:opacity-100 transition-all duration-200 group-hover/vcr:translate-x-0.5" />
        </div>

        {/* VCR Name — always uses foreground for readability */}
        <div className="text-sm font-semibold text-foreground mb-3 leading-snug pr-4 line-clamp-2">
          {vcr.name}
        </div>

        {/* Progress bar */}
        <div className="mb-2.5">
          <div className="h-1.5 rounded-full bg-foreground/[0.08] dark:bg-foreground/[0.12] overflow-hidden">
            <div
              className="vcr-progress-bar h-full rounded-full transition-all duration-500 ease-out"
              style={{ width: `${Math.max(progress, 2)}%` }}
            />
          </div>
        </div>

        {/* Bottom row: Progress % + certificate badges */}
        <div className="flex items-center justify-between">
          <span className="vcr-progress-text text-xs font-bold tabular-nums">
            {progress}%
          </span>

          <div className="flex items-center gap-1.5">
            {vcr.has_hydrocarbon && (
              <span className="vcr-cert-badge inline-flex items-center gap-0.5 text-[9px] font-semibold px-2 py-0.5 rounded-full">
                <Flame className="h-2.5 w-2.5" />
                RFSU
              </span>
            )}
            <span className="vcr-cert-badge inline-flex items-center gap-0.5 text-[9px] font-semibold px-2 py-0.5 rounded-full">
              <Shield className="h-2.5 w-2.5" />
              PAC
            </span>
          </div>
        </div>
      </div>
    </button>
  );
};

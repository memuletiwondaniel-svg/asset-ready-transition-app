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

  return (
    <button
      onClick={() => onClick(vcr.id)}
      className={cn(
        "w-full text-left rounded-2xl border p-3.5 transition-all duration-300",
        "hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0",
        "group/vcr cursor-pointer relative overflow-hidden"
      )}
      style={{
        backgroundColor: vcrColor?.background || 'hsl(var(--muted) / 0.3)',
        borderColor: vcrColor?.accent || 'hsl(var(--border))',
      }}
    >
      {/* Subtle inner glow */}
      <div
        className="absolute inset-0 opacity-40 rounded-2xl pointer-events-none"
        style={{
          background: vcrColor
            ? `radial-gradient(ellipse at top right, ${vcrColor.accent}, transparent 70%)`
            : 'none',
        }}
      />

      <div className="relative z-10">
        {/* Top row: ID badge + status */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span
              className="text-[10px] font-bold font-mono tracking-widest px-2 py-0.5 rounded-md"
              style={{
                backgroundColor: vcrColor?.accent || 'hsl(var(--muted))',
                color: vcrColor?.border || 'hsl(var(--foreground))',
              }}
            >
              {displayCode}
            </span>
            <Badge
              variant="outline"
              className="text-[9px] px-1.5 py-0 h-4 border-foreground/10 bg-background/60 text-muted-foreground backdrop-blur-sm"
            >
              {vcr.status === 'PENDING' ? 'Draft' : vcr.status}
            </Badge>
          </div>
          <ChevronRight className="h-3.5 w-3.5 text-foreground/20 opacity-0 group-hover/vcr:opacity-100 transition-all duration-200 group-hover/vcr:translate-x-0.5" />
        </div>

        {/* VCR Name */}
        <div className="text-sm font-semibold text-foreground/90 mb-3 leading-snug pr-4 line-clamp-2">
          {vcr.name}
        </div>

        {/* Progress bar */}
        <div className="mb-2.5">
          <div className="h-1.5 rounded-full bg-foreground/[0.06] overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500 ease-out"
              style={{
                width: `${Math.max(progress, 2)}%`,
                backgroundColor: vcrColor?.border || 'hsl(var(--primary))',
              }}
            />
          </div>
        </div>

        {/* Bottom row: Progress % + certificate badges */}
        <div className="flex items-center justify-between">
          <span
            className="text-xs font-bold tabular-nums"
            style={{ color: vcrColor?.border || 'hsl(var(--primary))' }}
          >
            {progress}%
          </span>

          <div className="flex items-center gap-1.5">
            {vcr.has_hydrocarbon && (
              <span
                className="inline-flex items-center gap-0.5 text-[9px] font-semibold px-2 py-0.5 rounded-full backdrop-blur-sm"
                style={{
                  backgroundColor: vcrColor?.accent || 'hsl(var(--muted) / 0.6)',
                  color: vcrColor?.border || 'hsl(var(--muted-foreground))',
                }}
              >
                <Flame className="h-2.5 w-2.5" />
                RFSU
              </span>
            )}
            <span
              className="inline-flex items-center gap-0.5 text-[9px] font-semibold px-2 py-0.5 rounded-full backdrop-blur-sm"
              style={{
                backgroundColor: vcrColor?.accent || 'hsl(var(--muted) / 0.6)',
                color: vcrColor?.border || 'hsl(var(--muted-foreground))',
              }}
            >
              <Shield className="h-2.5 w-2.5" />
              PAC
            </span>
          </div>
        </div>
      </div>
    </button>
  );
};

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Flame, Award, ChevronRight } from 'lucide-react';
import { ProjectVCR } from '@/hooks/useProjectVCRs';
import { getVCRColor } from '@/components/p2a-workspace/utils/vcrColors';
import { cn } from '@/lib/utils';

interface VCRCardProps {
  vcr: ProjectVCR;
  onClick: (vcrId: string) => void;
}

const shortCode = (code?: string) => code?.replace(/^VCR-[A-Z0-9]+-/, 'VCR-') || '';

export const VCRCard: React.FC<VCRCardProps> = ({ vcr, onClick }) => {
  const vcrColor = getVCRColor(vcr.vcr_code);
  const progress = vcr.progress;
  const displayCode = shortCode(vcr.vcr_code);

  return (
    <button
      onClick={() => onClick(vcr.id)}
      className={cn(
        "w-full text-left rounded-xl border p-3.5 transition-all duration-200",
        "hover:shadow-md hover:scale-[1.02] active:scale-100",
        "group/vcr cursor-pointer relative overflow-hidden"
      )}
      style={{
        backgroundColor: vcrColor?.background || 'hsl(var(--muted) / 0.3)',
        borderColor: vcrColor?.accent || 'hsl(var(--border))',
      }}
    >
      {/* Progress rail at the bottom */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/5 rounded-b-xl">
        <div
          className="h-full rounded-b-xl transition-all duration-500"
          style={{
            width: `${progress}%`,
            backgroundColor: vcrColor?.border || 'hsl(var(--primary))',
          }}
        />
      </div>

      {/* Top row: ID badge + status + arrow */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span
            className="text-[10px] font-mono font-bold tracking-wider px-1.5 py-0.5 rounded"
            style={{
              backgroundColor: vcrColor?.accent || 'hsl(var(--muted))',
              color: vcrColor?.border || 'hsl(var(--foreground))',
            }}
          >
            {displayCode}
          </span>
          <Badge
            variant="outline"
            className="text-[9px] px-1.5 py-0 border-black/10 bg-white/50 text-foreground/60"
          >
            {vcr.status === 'PENDING' ? 'Draft' : vcr.status}
          </Badge>
        </div>
        <ChevronRight className="h-3.5 w-3.5 text-foreground/30 opacity-0 group-hover/vcr:opacity-100 transition-opacity" />
      </div>

      {/* VCR Name */}
      <div className="text-sm font-semibold text-foreground mb-2 leading-tight pr-4">
        {vcr.name}
      </div>

      {/* Bottom row: Progress + labels */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          {/* Compact progress indicator */}
          <span
            className="text-xs font-bold tabular-nums"
            style={{ color: vcrColor?.border || 'hsl(var(--primary))' }}
          >
            {progress}%
          </span>
          <span className="text-[10px] text-foreground/40">complete</span>
        </div>

        <div className="flex items-center gap-1.5">
          {vcr.has_hydrocarbon && (
            <span className="flex items-center gap-0.5 text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200/60">
              <Flame className="h-2.5 w-2.5" />
              SoF
            </span>
          )}
          <span className="flex items-center gap-0.5 text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 border border-blue-200/60">
            <Award className="h-2.5 w-2.5" />
            PAC
          </span>
        </div>
      </div>
    </button>
  );
};

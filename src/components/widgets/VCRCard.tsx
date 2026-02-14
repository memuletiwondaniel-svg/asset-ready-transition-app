import React from 'react';
import { Badge } from '@/components/ui/badge';
import { ChevronRight } from 'lucide-react';
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
        "w-full text-left rounded-xl border p-3 transition-all duration-200",
        "hover:shadow-md hover:scale-[1.01] active:scale-100",
        "group/vcr cursor-pointer"
      )}
      style={{
        backgroundColor: vcrColor?.background || 'hsl(var(--muted) / 0.3)',
        borderColor: vcrColor?.accent || 'hsl(var(--border))',
      }}
    >
      {/* Top row: ID badge + status + arrow */}
      <div className="flex items-center justify-between mb-1.5">
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
          <span
            className="text-xs font-bold tabular-nums"
            style={{ color: vcrColor?.border || 'hsl(var(--primary))' }}
          >
            {progress}%
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {vcr.has_hydrocarbon && (
            <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-muted/60 text-muted-foreground/50 border border-border/40">
              SoF
            </span>
          )}
          <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-muted/60 text-muted-foreground/50 border border-border/40">
            PAC
          </span>
        </div>
      </div>
    </button>
  );
};

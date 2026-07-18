import React from 'react';
import { cn } from '@/lib/utils';

/**
 * G2 surface header used at the top of every VCR tab surface:
 *   - Title
 *   - "VCR-NN · Name" subtext
 *   - Narrative summary panel (muted bg, 1-3 sentences, bold lead stat)
 *   - Divider before the list
 * Narrative may include **bold** markers for computed key figures.
 */
export interface SurfaceHeaderProps {
  title: string;
  vcrCode?: string | null;
  vcrName?: string | null;
  narrative?: React.ReactNode | string | null;
  right?: React.ReactNode;
  className?: string;
}

export const SurfaceHeader: React.FC<SurfaceHeaderProps> = ({
  title, vcrCode, vcrName, narrative, right, className,
}) => {
  const subtext = [vcrCode, vcrName].filter(Boolean).join(' · ');
  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-[16px] font-bold tracking-tight text-foreground">{title}</h2>
          {subtext && (
            <div className="text-[12px] text-muted-foreground mt-0.5 truncate">{subtext}</div>
          )}
        </div>
        {right}
      </div>
      {narrative && (
        <div className="rounded-md bg-muted/40 px-4 py-3 text-[12.5px] leading-relaxed text-foreground/85">
          {typeof narrative === 'string' ? renderInlineBold(narrative) : narrative}
        </div>
      )}
      <div className="h-px bg-border/60" />
    </div>
  );
};

/** Renders **bold** segments inline for narrative summary strings. */
export const renderInlineBold = (text: string): React.ReactNode =>
  text.split(/(\*\*[^*]+\*\*)/g).map((chunk, i) =>
    chunk.startsWith('**') && chunk.endsWith('**') ? (
      <strong key={i} className="font-semibold text-foreground">
        {chunk.slice(2, -2)}
      </strong>
    ) : (
      <span key={i}>{chunk}</span>
    ),
  );

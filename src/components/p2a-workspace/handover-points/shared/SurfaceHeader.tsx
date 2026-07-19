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
  narrative, right, className,
}) => {
  // In-body tab title removed app-wide — the left nav is the single source of
  // the tab name. Each tab surface now leads with its narrative summary panel
  // followed by content. `title` + `subtext` are retained on the props for
  // back-compat but no longer render. `right` slot stays for tab-level actions.
  return (
    <div className={cn('space-y-4', className)}>
      {right && (
        <div className="flex items-center justify-end">{right}</div>
      )}
      {narrative && (
        <div className="rounded-md bg-muted/40 px-4 py-3 text-[12.5px] leading-relaxed text-foreground/85">
          {typeof narrative === 'string' ? renderInlineBold(narrative) : narrative}
        </div>
      )}
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

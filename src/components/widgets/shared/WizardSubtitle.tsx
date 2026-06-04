import React from 'react';
import { cn } from '@/lib/utils';

interface WizardSubtitleProps {
  /** Prefix text e.g. "Create VCR Plan" or "Develop P2A Plan" */
  prefix: string;
  /** Optional short project/code chip (rendered monospaced, muted) */
  code?: string;
  /** Optional plain-text project name (normal sans, normal case) */
  name?: string;
  className?: string;
}

/**
 * Shared subtitle rendering used by every wizard top header so they all
 * follow the same format: "{prefix} · `CODE` Name".
 * Intentionally does NOT include a step counter — the sidebar, footer, and
 * step content header already carry that signal.
 */
export const WizardSubtitle: React.FC<WizardSubtitleProps> = ({
  prefix,
  code,
  name,
  className,
}) => {
  const prettyName = name && name !== code
    ? name.replace(/\b\w+/g, (w) =>
        /^[A-Z0-9-]+$/.test(w) && w.length <= 4
          ? w
          : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
      )
    : '';

  return (
    <p className={cn('text-[11px] text-muted-foreground mt-1 flex items-center gap-1.5 flex-wrap', className)}>
      <span>{prefix}</span>
      {(code || prettyName) && <span aria-hidden>·</span>}
      {code && (
        <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground/90 leading-none">
          {code}
        </span>
      )}
      {prettyName && <span className="font-normal text-foreground/80">{prettyName}</span>}
    </p>
  );
};

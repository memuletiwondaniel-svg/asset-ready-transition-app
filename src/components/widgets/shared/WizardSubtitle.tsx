import React from 'react';
import { cn } from '@/lib/utils';

interface WizardSubtitleProps {
  /** Prefix text e.g. "Create VCR Plan". Omit/empty to show only project context. */
  prefix?: string;
  /** Optional short project/code chip (rendered monospaced, muted) */
  code?: string;
  /** Optional plain-text project name (normal sans, normal case) */
  name?: string;
  className?: string;
}

/**
 * Shared subtitle rendering used by every wizard top header.
 * Standard format: "{prefix} · `CODE` Name". When `prefix` is omitted
 * (e.g. review mode where the title + status pill already convey intent),
 * only the project context is rendered.
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

  const hasPrefix = !!prefix && prefix.trim().length > 0;
  const hasContext = !!(code || prettyName);

  return (
    <p className={cn('text-[11px] text-muted-foreground mt-1 flex items-center gap-1.5 flex-wrap', className)}>
      {hasPrefix && <span>{prefix}</span>}
      {hasPrefix && hasContext && <span aria-hidden>·</span>}
      {code && (
        <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground/90 leading-none">
          {code}
        </span>
      )}
      {prettyName && <span className="font-normal text-foreground/80">{prettyName}</span>}
    </p>
  );
};

import React from 'react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { getGlossaryDefinition } from '@/data/glossary';
import { Info } from 'lucide-react';

interface GlossaryTermProps {
  /** The domain term to look up (e.g. "PSSR", "VCR"). */
  term: string;
  /** Override the tooltip text instead of using the glossary. */
  definition?: string;
  /** Content to render as the trigger. Defaults to the term itself. */
  children?: React.ReactNode;
  /** Show a small info icon next to the text. */
  showIcon?: boolean;
}

/**
 * Wraps any domain term in a hover tooltip that explains it.
 * Pulls definitions from the central glossary unless overridden.
 * Renders as inline text — no layout shift.
 */
export const GlossaryTerm: React.FC<GlossaryTermProps> = ({
  term,
  definition,
  children,
  showIcon = false,
}) => {
  const text = definition || getGlossaryDefinition(term);

  // If no definition found, just render children without tooltip
  if (!text) return <>{children ?? term}</>;

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex items-center gap-1 cursor-help border-b border-dotted border-muted-foreground/30 hover:border-primary/50 transition-colors">
            {children ?? term}
            {showIcon && (
              <Info className="w-3 h-3 text-muted-foreground/50 flex-shrink-0" />
            )}
          </span>
        </TooltipTrigger>
        <TooltipContent
          side="right"
          className="max-w-xs text-sm leading-relaxed"
          sideOffset={8}
        >
          <p className="font-semibold text-foreground mb-1">{term}</p>
          <p className="text-muted-foreground">{text}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

import React from 'react';

interface GlossaryTermProps {
  term: string;
  definition?: string;
  children?: React.ReactNode;
  showIcon?: boolean;
}

/**
 * Glossary tooltips were removed app-wide (per user request — distracting).
 * This component now renders its children (or the term) as plain inline text,
 * with no dotted underline, no info icon, and no hover popover.
 * Kept as a pass-through so existing call sites continue to compile.
 */
export const GlossaryTerm: React.FC<GlossaryTermProps> = ({ term, children }) => {
  return <>{children ?? term}</>;
};

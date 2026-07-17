import React from 'react';
import { cn } from '@/lib/utils';

/**
 * Shared modal chrome for Procedure modals — mirrors the Training modal
 * primitives so both surfaces get the same 18px section rhythm and title
 * treatment.
 */

export const ModalTitleBlock: React.FC<{
  title: string;
  procedureTitle: string;
  documentNumber?: string | null;
}> = ({ title, procedureTitle, documentNumber }) => (
  <div className="space-y-1">
    <div className="text-[15px] font-semibold leading-tight">{title}</div>
    <div className="text-[12px] text-muted-foreground truncate">
      {procedureTitle}
      {documentNumber ? <> · <span className="font-mono">{documentNumber}</span></> : null}
    </div>
  </div>
);

export const ModalSection: React.FC<{
  label?: string;
  children: React.ReactNode;
  className?: string;
}> = ({ label, children, className }) => (
  <div className={cn('space-y-1.5', className)} style={{ marginTop: '18px' }}>
    {label && (
      <div className="text-[10.5px] font-bold tracking-[0.14em] uppercase text-muted-foreground/80">
        {label}
      </div>
    )}
    {children}
  </div>
);

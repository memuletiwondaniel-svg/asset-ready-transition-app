import React from 'react';
import { P2AHandoverPoint } from '../../../hooks/useP2AHandoverPoints';
import { EmptyDeliverable } from './DeliverableRow';

/**
 * Critical documents are sourced from p2a_vcr_critical_docs. Until the
 * discipline-owned document register is wired into the standard view, we
 * render an honest empty state rather than the fabricated tier list.
 */
export const StandardCritDocsTab: React.FC<{ handoverPoint: P2AHandoverPoint }> = () => (
  <EmptyDeliverable
    label="No critical documents attached yet."
    hint="Populates from RLMU / AFC / ASB catalogues once discipline leads publish this VCR's document set."
  />
);

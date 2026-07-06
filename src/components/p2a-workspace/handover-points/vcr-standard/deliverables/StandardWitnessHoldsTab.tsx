import React from 'react';
import { P2AHandoverPoint } from '../../../hooks/useP2AHandoverPoints';
import { EmptyDeliverable } from './DeliverableRow';

/**
 * Witness & Holds points feed from the INT-1 OWL 3.1 upstream ingestion which
 * is not live in DP-300 yet. Show an honest empty state until wired.
 */
export const StandardWitnessHoldsTab: React.FC<{ handoverPoint: P2AHandoverPoint }> = () => (
  <EmptyDeliverable
    label="No witness or hold points recorded yet."
    hint="Populates from OWL 3.1 (INT-1) once outstanding-work integration goes live."
  />
);

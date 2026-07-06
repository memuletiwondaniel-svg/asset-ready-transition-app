import React from 'react';
import { Card } from '@/components/ui/card';
import { Lock } from 'lucide-react';
import PACCertificate from '@/components/handover/PACCertificate';
import { P2AHandoverPoint } from '../../hooks/useP2AHandoverPoints';
import { useVCRPrerequisites } from '../../hooks/useVCRPrerequisites';
import { PrereqStatus, standardPill } from './standardStatus';

interface Props { handoverPoint: P2AHandoverPoint; projectCode?: string }

/**
 * PAC tab wrapper.
 * Locked state until all VCR items are approved (terminal). Once unlocked,
 * re-parents the existing PACCertificate component unchanged.
 *
 * FAC/PAC naming drift: PACCertificate lives under src/components/handover/
 * alongside FACCertificate (a genuinely separate Final Acceptance component).
 * Not renamed in this build — logged for cleanup.
 */
export const StandardPACTab: React.FC<Props> = ({ handoverPoint, projectCode }) => {
  const { prerequisites } = useVCRPrerequisites(handoverPoint.id);

  const total = prerequisites.length;
  const terminal = prerequisites.filter(p =>
    standardPill(p.status as PrereqStatus).bucket === 'terminal'
  ).length;
  const allApproved = total > 0 && terminal === total;

  return (
    <div className="space-y-3">
      {!allApproved && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground bg-slate-100 border border-border rounded-lg px-3 py-2">
          <Lock className="w-3.5 h-3.5" />
          <span>Read-only preview · signing unlocks at VCR approval ({terminal}/{total} items closed)</span>
        </div>
      )}
      <div className={!allApproved ? 'pointer-events-none opacity-90' : undefined} aria-disabled={!allApproved}>
        <PACCertificate
          certificateNumber={`PAC-${projectCode || 'DP-300'}-${handoverPoint.vcr_code}`}
          projectCode={projectCode}
          handoverPointId={handoverPoint.id}
          vcrCode={handoverPoint.vcr_code}
        />
      </div>
    </div>
  );
};

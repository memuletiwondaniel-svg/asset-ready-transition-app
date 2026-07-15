import React, { useState } from 'react';
import { Lock, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import SOFCertificate from '@/components/handover/SOFCertificate';
import { P2AHandoverPoint } from '../../hooks/useP2AHandoverPoints';
import { useVCRPrerequisites } from '../../hooks/useVCRPrerequisites';
import { useVCRSoFApprovers } from '@/hooks/useVCRSoFApprovers';
import { PrereqStatus, standardPill } from './standardStatus';
import { useVCRCertContext } from './useVCRCertContext';
import { vcrCertNumber } from '@/lib/vcrCertNumber';
import { useCurrentUserRole } from '@/hooks/useCurrentUserRole';
import { ScheduleSofMeetingModal } from '@/components/widgets/ScheduleSofMeetingModal';

interface Props { handoverPoint: P2AHandoverPoint; projectCode?: string; onNavigateOverview?: () => void }

/**
 * SoF tab — rendered only for hydrocarbon VCRs (guarded by caller).
 * Toolbar surfaces a "Schedule SoF meeting" CTA for the Snr ORA Engr once
 * VCR items are terminal (mirrors PAC gate for non-HC path).
 */
export const StandardSOFTab: React.FC<Props> = ({ handoverPoint, projectCode, onNavigateOverview }) => {
  const { prerequisites } = useVCRPrerequisites(handoverPoint.id);
  const { data: sofRows = [] } = useVCRSoFApprovers(handoverPoint.id);
  const { data: ctx } = useVCRCertContext(handoverPoint.handover_plan_id);
  const { data: currentUser } = useCurrentUserRole();
  const [scheduleOpen, setScheduleOpen] = useState(false);

  const total = prerequisites.length;
  const terminal = prerequisites.filter(p =>
    standardPill(p.status as PrereqStatus).bucket === 'terminal'
  ).length;
  const allApproved = total > 0 && terminal === total;

  // Ledger-driven CTA gate: the discipline-assurance trigger seeds L1 once the
  // interdisciplinary summary is complete; don't show the CTA earlier.
  const totalSofSeats = sofRows.length;
  const anySofPending = sofRows.some(r => r.status === 'PENDING' || r.status === 'SIGNED');
  const sofLedgerUnlocked = totalSofSeats > 0 && anySofPending;

  const isSnrOra = (currentUser?.role || '').toLowerCase().includes('snr ora engr');

  const projectPrefix = ctx?.projectPrefix || projectCode || '';
  const certNo = vcrCertNumber('SOF', projectPrefix, handoverPoint.vcr_code);

  return (
    <div className="space-y-3">
      {!allApproved ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground bg-slate-100 border border-border rounded-lg px-3 py-2">
          <Lock className="w-3.5 h-3.5" />
          <span>Read-only preview · signing unlocks at VCR approval ({terminal}/{total} items closed)</span>
        </div>
      ) : sofLedgerUnlocked ? (
        <div className="flex items-center justify-between gap-2 text-sm bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-lg px-3 py-2">
          <span>Unlocked · SoF ledger seeded ({totalSofSeats} approvers).</span>
          {isSnrOra && (
            <Button size="sm" variant="outline" onClick={() => setScheduleOpen(true)}>
              <Calendar className="w-3.5 h-3.5 mr-1.5" />
              Schedule SoF meeting
            </Button>
          )}
        </div>
      ) : null}
      {/* Edit / Print always usable; per-row Sign is gated by ledger status. */}
      <div aria-disabled={!allApproved}>
        <SOFCertificate
          certificateNumber={certNo}
          plantName={ctx?.plantName || ''}
          facilityName={handoverPoint.name}
          projectName={ctx?.projectName || ''}
          projectDisplay={
            projectPrefix && ctx?.projectName
              ? `${projectPrefix} - ${ctx.projectName}`
              : (projectPrefix || ctx?.projectName || '')
          }
          scope={handoverPoint.description || handoverPoint.name}
          pssrNumber={handoverPoint.vcr_code}
          sourceType="VCR"
          handoverPointId={handoverPoint.id}
          onNavigateVcrOverview={onNavigateOverview}
        />

      </div>
      <ScheduleSofMeetingModal
        open={scheduleOpen}
        onOpenChange={setScheduleOpen}
        handoverPointId={handoverPoint.id}
        projectId={ctx?.projectId || undefined}
        vcrCode={handoverPoint.vcr_code}
        vcrName={handoverPoint.name}
        projectPrefix={projectPrefix}
      />
    </div>
  );
};

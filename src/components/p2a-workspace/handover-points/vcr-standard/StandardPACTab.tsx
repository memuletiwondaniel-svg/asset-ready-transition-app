import React, { useState } from 'react';
import { Lock, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import PACCertificate from '@/components/handover/PACCertificate';
import { P2AHandoverPoint } from '../../hooks/useP2AHandoverPoints';
import { useVCRPACApprovers } from '@/hooks/useVCRPACApprovers';
import { useVCRCertContext } from './useVCRCertContext';
import { vcrCertNumber } from '@/lib/vcrCertNumber';
import { useCurrentUserRole } from '@/hooks/useCurrentUserRole';
import { SchedulePacMeetingModal } from '@/components/widgets/SchedulePacMeetingModal';

interface Props { handoverPoint: P2AHandoverPoint; projectCode?: string; onNavigateOverview?: () => void }

/**
 * PAC tab wrapper.
 * Ledger-driven lock: locked while every `vcr_pac_approvers` row is LOCKED,
 * unlocked once at least one row is PENDING (i.e. the cascade lifted level 1
 * after all VCR items closed via the discipline-assurance trigger).
 * The Snr ORA Engr sees a "Schedule PAC meeting" CTA once unlocked.
 */
export const StandardPACTab: React.FC<Props> = ({ handoverPoint, projectCode, onNavigateOverview }) => {
  const { data: pacRows = [] } = useVCRPACApprovers(handoverPoint.id);
  const { data: ctx } = useVCRCertContext(handoverPoint.handover_plan_id);
  const { data: currentUser } = useCurrentUserRole();
  const [scheduleOpen, setScheduleOpen] = useState(false);

  const totalSeats = pacRows.length;
  const anyPending = pacRows.some(r => r.status === 'PENDING' || r.status === 'SIGNED');
  const locked = totalSeats === 0 || !anyPending;
  const isSnrOra = (currentUser?.role || '').toLowerCase().includes('snr ora engr');

  const projectPrefix = ctx?.projectPrefix || projectCode || '';
  const certNo = vcrCertNumber('PAC', projectPrefix, handoverPoint.vcr_code);

  return (
    <div className="space-y-3">
      {locked ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground bg-slate-100 border border-border rounded-lg px-3 py-2">
          <Lock className="w-3.5 h-3.5" />
          <span>Read-only preview · signing unlocks once VCR items close and the PAC ledger is seeded.</span>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-2 text-sm bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-lg px-3 py-2">
          <span>Unlocked · PAC ledger seeded ({totalSeats} approvers).</span>
          {isSnrOra && (
            <Button size="sm" variant="outline" onClick={() => setScheduleOpen(true)}>
              <Calendar className="w-3.5 h-3.5 mr-1.5" />
              Schedule PAC meeting
            </Button>
          )}
        </div>
      )}
      {/* Edit / Print always usable; per-row Sign is gated by ledger status. */}
      <div aria-disabled={locked}>
        <PACCertificate
          certificateNumber={certNo}
          projectCode={projectPrefix}
          projectName={ctx?.projectName || ''}
          facilityName={handoverPoint.name}
          handoverPointId={handoverPoint.id}
          vcrCode={handoverPoint.vcr_code}
        />
      </div>
      <SchedulePacMeetingModal
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

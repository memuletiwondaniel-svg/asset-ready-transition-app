import React from 'react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { useVCRQualifications, VCRQualification } from '../../hooks/useVCRQualifications';
import { formatVcrItemCode } from '@/lib/vcrItemCode';
import { normalizeCategoryCode } from './standardStatus';

interface Props { handoverPointId: string }

const lifecycle = (status: VCRQualification['status']): { label: string; className: string } => {
  switch (status) {
    case 'APPROVED':
      return { label: 'Approved', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
    case 'REJECTED':
      return { label: 'Rejected', className: 'bg-red-50 text-red-700 border-red-200' };
    case 'PENDING':
    default:
      return { label: 'Under review', className: 'bg-amber-50 text-amber-700 border-amber-200' };
  }
};

export const StandardQualificationsTab: React.FC<Props> = ({ handoverPointId }) => {
  const { qualifications, isLoading } = useVCRQualifications(handoverPointId);

  const openCount = qualifications.filter(q => q.status === 'PENDING').length;
  const approvedCount = qualifications.filter(q => q.status === 'APPROVED').length;

  const summary = [
    openCount ? `${openCount} open` : null,
    approvedCount ? `${approvedCount} approved` : null,
  ].filter(Boolean).join(' · ') || 'None raised';

  return (
    <div className="space-y-3">
      <div className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
        Qualifications · {summary}
      </div>

      {isLoading && <div className="text-sm text-muted-foreground">Loading…</div>}

      {!isLoading && qualifications.length === 0 && (
        <Card className="p-6 text-sm text-muted-foreground text-center">
          No qualifications raised for this VCR.
        </Card>
      )}

      {qualifications.map((q, idx) => {
        const chip = lifecycle(q.status);
        const qId = `Q-${String(idx + 1).padStart(3, '0')}`;
        // Item code from linked prerequisite (advisory: we don't have per-item order here,
        // so surface whatever the prereq summary was; VCRItemDetailSheet path handled by
        // the ruling sheet — this card is display-only for Phase 1)
        const itemLabel = q.prerequisite
          ? formatVcrItemCode(normalizeCategoryCode((q.prerequisite as any).category), 0).replace('-00', '')
          : '';

        return (
          <Card key={q.id} className="p-4">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className={cn('text-[10.5px] font-bold px-2 py-0.5 rounded-full border', chip.className)}>
                {chip.label}
              </span>
              <span className="font-mono text-[11px] text-muted-foreground">{qId}</span>
              {itemLabel && <span className="font-mono text-[11px] text-muted-foreground">· {itemLabel}</span>}
            </div>
            <div className="text-sm font-semibold mb-1">
              <span className="text-muted-foreground font-normal">Reason: </span>
              {q.reason}
            </div>
            {q.mitigation && (
              <div className="text-xs text-muted-foreground mb-2">
                <span className="font-semibold">Mitigation: </span>{q.mitigation}
              </div>
            )}
            <div className="text-[11px] text-muted-foreground flex gap-3 flex-wrap">
              {q.action_owner_name && <span>{q.action_owner_name}</span>}
              {q.submitted_at && <span>raised {format(new Date(q.submitted_at), 'dd-MMM')}</span>}
              {q.follow_up_action && <span>· follow-up: {q.follow_up_action}</span>}
              {q.target_date && <span>· target {format(new Date(q.target_date), 'dd-MMM-yyyy')}</span>}
              {q.reviewed_by && <span>· ruling: {q.reviewed_by}</span>}
            </div>
          </Card>
        );
      })}
    </div>
  );
};

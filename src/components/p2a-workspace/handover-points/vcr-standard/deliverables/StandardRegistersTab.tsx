import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { P2AHandoverPoint } from '../../../hooks/useP2AHandoverPoints';
import { useVCRRegisterDeliverables } from '../../../hooks/useVCRDeliverables';
import { EmptyDeliverable } from './DeliverableRow';
import { SurfaceHeader } from '../../shared/SurfaceHeader';
import { RegisterDrawer } from '../../registers/RegisterDrawer';
import { RegisterOwnerCTA } from '../../registers/RegisterOwnerCTA';
import { RegisterStatusChip, registerStatusMeta, REGISTER_STATUS_ORDER } from '../../registers/RegisterStatusChip';
import { cn } from '@/lib/utils';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const orderRank = (r: any): number => {
  const s = (r.workflow_status || 'NOT_STARTED').toString().toUpperCase();
  const i = REGISTER_STATUS_ORDER.indexOf(s as typeof REGISTER_STATUS_ORDER[number]);
  return i === -1 ? REGISTER_STATUS_ORDER.length : i;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const isTerminal = (r: any) => (r.workflow_status || '').toString().toUpperCase() === 'APPROVED';

const RegisterCard: React.FC<{
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  r: any;
  onClick: () => void;
}> = ({ r, onClick }) => {
  const kind = r.register_kind
    ? String(r.register_kind).charAt(0).toUpperCase() + String(r.register_kind).slice(1).toLowerCase()
    : 'Register';
  const activity = r.activity_kind
    ? (String(r.activity_kind).toUpperCase() === 'NEW' ? 'New' : 'Update existing')
    : null;
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-start gap-3 px-4 py-3.5 text-left transition-colors hover:bg-blue-50/60 border-b border-border/60 last:border-0"
    >
      <div className="flex-1 min-w-0 space-y-1">
        <div className="text-[13px] font-medium leading-snug truncate">{r.title}</div>
        <div className="text-[11px] text-muted-foreground truncate">
          {kind}{activity ? ` · ${activity}` : ''}
        </div>
      </div>
      <div className="shrink-0 mt-0.5">
        <RegisterStatusChip status={r.workflow_status} />
      </div>
    </button>
  );
};

export const StandardRegistersTab: React.FC<{ handoverPoint: P2AHandoverPoint }> = ({ handoverPoint }) => {
  const { data, isLoading } = useVCRRegisterDeliverables(handoverPoint.id);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [uid, setUid] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUid(data.user?.id ?? null));
  }, []);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const raw: any[] = data || [];

  const rows = useMemo(() => {
    return [...raw].sort((a, b) => {
      const ta = isTerminal(a) ? 1 : 0;
      const tb = isTerminal(b) ? 1 : 0;
      if (ta !== tb) return ta - tb;
      const ra = orderRank(a);
      const rb = orderRank(b);
      if (ra !== rb) return ra - rb;
      return (a.display_order ?? 0) - (b.display_order ?? 0);
    });
  }, [raw]);

  const narrative = useMemo(() => {
    if (raw.length === 0) return null;
    const approved = raw.filter(isTerminal).length;
    const review = raw.filter((r) => (r.workflow_status || '').toUpperCase() === 'UNDER_REVIEW').length;
    const rework = raw.filter((r) => (r.workflow_status || '').toUpperCase() === 'REWORK_REQUESTED').length;
    const parts: string[] = [];
    parts.push(`**${approved} of ${raw.length}** registers and logsheets are approved.`);
    if (review > 0) parts.push(`**${review}** under review.`);
    if (rework > 0) parts.push(`**${rework}** returned for rework.`);
    return parts.join(' ');
  }, [raw]);

  if (isLoading) return <div className="p-6 text-sm text-muted-foreground">Loading registers…</div>;

  return (
    <div className="space-y-4">
      <SurfaceHeader
        title="Registers & Logsheets"
        vcrCode={handoverPoint.vcr_code}
        vcrName={handoverPoint.name}
        narrative={narrative}
      />

      {rows.length === 0 ? (
        <EmptyDeliverable label="No registers or logsheets configured yet." hint="Register selections are made during plan definition." />
      ) : (
        <div className={cn('rounded-lg border bg-background overflow-hidden')}>
          {rows.map((r) => (
            <RegisterCard key={r.id} r={r} onClick={() => setSelectedId(r.id)} />
          ))}
        </div>
      )}

      <RegisterDrawer
        registerId={selectedId}
        open={!!selectedId}
        onOpenChange={(o) => !o && setSelectedId(null)}
        currentUserId={uid}
        vcrCode={handoverPoint.vcr_code}
        vcrName={handoverPoint.name}
        footerSlot={({ data: rd, currentUserId }) => (
          <RegisterOwnerCTA data={rd} currentUserId={currentUserId} />
        )}
      />
    </div>
  );
};

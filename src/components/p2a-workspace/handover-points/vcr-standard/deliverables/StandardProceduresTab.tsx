import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { P2AHandoverPoint } from '../../../hooks/useP2AHandoverPoints';
import { useVCRProcedureDeliverables } from '../../../hooks/useVCRDeliverables';
import { DeliverableList, DeliverableRow, EmptyDeliverable, procedureStatusChip } from './DeliverableRow';
import { ProcedureDrawer } from '../../procedures/ProcedureDrawer';
import { ProcedureOwnerCTA } from '../../procedures/ProcedureOwnerCTA';
import { PROCEDURE_STATUS_ORDER } from '../../procedures/ProcedureStatusChip';

const orderRank = (s: string | null | undefined): number => {
  const i = PROCEDURE_STATUS_ORDER.indexOf(
    (s || 'NOT_STARTED').toString().toUpperCase() as typeof PROCEDURE_STATUS_ORDER[number],
  );
  return i === -1 ? PROCEDURE_STATUS_ORDER.length : i;
};

export const StandardProceduresTab: React.FC<{ handoverPoint: P2AHandoverPoint }> = ({ handoverPoint }) => {
  const { data, isLoading } = useVCRProcedureDeliverables(handoverPoint.id);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [uid, setUid] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUid(data.user?.id ?? null));
  }, []);

  const rows = useMemo(() => {
    const list = data || [];
    return [...list].sort((a, b) => {
      const ra = orderRank(a.status);
      const rb = orderRank(b.status);
      if (ra !== rb) return ra - rb;
      return (a.display_order ?? 0) - (b.display_order ?? 0);
    });
  }, [data]);

  if (isLoading) return <div className="p-6 text-sm text-muted-foreground">Loading procedures…</div>;
  if (!rows.length)
    return <EmptyDeliverable label="No procedures planned yet." hint="Add procedures during plan definition." />;

  return (
    <>
      <DeliverableList>
        {rows.map((r) => {
          const c = procedureStatusChip(r.status);
          const ctx = [r.procedure_type, r.document_number, r.responsible_person].filter(Boolean).join(' · ');
          return (
            <DeliverableRow
              key={r.id}
              name={r.title}
              context={ctx || null}
              chipLabel={c.label}
              chipTone={c.tone}
              onClick={() => setSelectedId(r.id)}
            />
          );
        })}
      </DeliverableList>

      <ProcedureDrawer
        procedureId={selectedId}
        open={!!selectedId}
        onOpenChange={(o) => !o && setSelectedId(null)}
        currentUserId={uid}
        vcrCode={handoverPoint.vcr_code}
        vcrName={handoverPoint.name}
        footerSlot={({ data: pd, currentUserId }) => (
          <ProcedureOwnerCTA data={pd} currentUserId={currentUserId} />
        )}
      />
    </>
  );
};

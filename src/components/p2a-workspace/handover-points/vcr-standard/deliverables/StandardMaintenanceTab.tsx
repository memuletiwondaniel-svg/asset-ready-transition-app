import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { P2AHandoverPoint } from '../../../hooks/useP2AHandoverPoints';
import { DeliverableList, DeliverableRow, EmptyDeliverable, ChipTone } from './DeliverableRow';
import {
  DeliverableDetailShell,
  Section,
  FieldGrid,
  LabeledField,
  InlineChip,
  PartyCell,
  BatchList,
  DrawerDivider,
} from '../../shared/deliverableDrawer';

interface MtceRow {
  id: string;
  deliverable_type: string;
  is_applicable: boolean;
  comments: string | null;
}

interface Batch { code: string; title: string; assets: number; status: string; }
interface MtceMeta {
  s4hana_ref?: string;
  central_mtce_lead?: { name: string; user_id: string; role?: string };
  approval_status?: string;
  approved_at?: string | null;
  summary?: string;
  batches?: Batch[];
  evidence_url?: string;
}

const DELIVERABLE_LABEL: Record<string, string> = {
  ARB: 'Asset Register Build (ARB)',
  PM_ROUTINES: 'PM Routines',
  BOM: 'Bill of Materials (BOM)',
  SPARES: '2Y Operating Spares',
  RISKPOYNT: 'RiskPoynt Update',
  IMS: 'Integrity Management System (IMS) Update',
};

const parseMeta = (comments: string | null): MtceMeta => {
  if (!comments) return {};
  try { return JSON.parse(comments); } catch { return { summary: comments }; }
};

const approvalTone = (status?: string): ChipTone => {
  const s = (status || '').toLowerCase();
  if (s === 'approved') return 'emerald';
  if (s.includes('review')) return 'blue';
  if (s.includes('draft')) return 'slate';
  return 'amber';
};

const resolveAvatar = (url: string | null | undefined) => {
  if (!url) return null;
  if (url.startsWith('http')) return url;
  return supabase.storage.from('user-avatars').getPublicUrl(url).data.publicUrl;
};

export const StandardMaintenanceTab: React.FC<{ handoverPoint: P2AHandoverPoint }> = ({ handoverPoint }) => {
  const { data, isLoading } = useQuery({
    queryKey: ['vcr-maintenance-deliverables', handoverPoint.id],
    enabled: !!handoverPoint.id,
    queryFn: async (): Promise<MtceRow[]> => {
      const { data: rows, error } = await (supabase as any)
        .from('p2a_vcr_maintenance_deliverables')
        .select('id, deliverable_type, is_applicable, comments')
        .eq('handover_point_id', handoverPoint.id)
        .eq('is_applicable', true);
      if (error) throw error;
      return rows || [];
    },
  });

  const [selected, setSelected] = useState<MtceRow | null>(null);
  const selectedMeta: MtceMeta = selected ? parseMeta(selected.comments) : {};
  const leadUserId = selectedMeta.central_mtce_lead?.user_id;

  const { data: leadAvatar = null } = useQuery({
    queryKey: ['profile-avatar', leadUserId],
    enabled: !!leadUserId,
    queryFn: async () => {
      const { data } = await supabase.from('profiles').select('avatar_url').eq('user_id', leadUserId).maybeSingle();
      return resolveAvatar(data?.avatar_url ?? null);
    },
  });

  if (isLoading) return <div className="p-6 text-sm text-muted-foreground">Loading maintenance systems…</div>;
  const rows = data || [];
  if (!rows.length)
    return (
      <EmptyDeliverable
        label="No maintenance-system deliverables marked applicable yet."
        hint="ARB, PMs, spares and criticality items are flagged during plan definition."
      />
    );

  const tone = approvalTone(selectedMeta.approval_status);
  const label = selectedMeta.approval_status || 'Applicable';

  return (
    <>
      <DeliverableList>
        {rows.map((r) => {
          const m = parseMeta(r.comments);
          const status = m.approval_status || 'Applicable';
          return (
            <DeliverableRow
              key={r.id}
              name={DELIVERABLE_LABEL[r.deliverable_type] || r.deliverable_type}
              context={m.s4hana_ref ? `S/4HANA · ${m.s4hana_ref}` : null}
              chipLabel={status}
              chipTone={approvalTone(m.approval_status)}
              onClick={() => setSelected(r)}
            />
          );
        })}
      </DeliverableList>
      {selected && (
        <DeliverableDetailShell
          open={!!selected}
          onOpenChange={(o) => !o && setSelected(null)}
          kind="Maintenance system"
          title={DELIVERABLE_LABEL[selected.deliverable_type] || selected.deliverable_type}
          subtitle={selectedMeta.summary || null}
          chipLabel={label}
          chipTone={tone}
        >
          <Section title="System">
            <FieldGrid>
              <LabeledField
                label="S/4HANA evidence"
                value={
                  selectedMeta.s4hana_ref ? (
                    <span className="font-mono text-[12px]">{selectedMeta.s4hana_ref}</span>
                  ) : null
                }
              />
              <LabeledField
                label="Approval status"
                value={<InlineChip tone={tone}>{label}</InlineChip>}
              />
              {selectedMeta.approved_at && (
                <LabeledField label="Approved at" value={selectedMeta.approved_at} />
              )}
              <LabeledField
                label="Download evidence"
                value={
                  selectedMeta.evidence_url ? (
                    <Button
                      asChild
                      size="sm"
                      variant="ghost"
                      className="h-7 gap-1 text-[11px] -ml-2"
                    >
                      <a href={selectedMeta.evidence_url} target="_blank" rel="noopener noreferrer">
                        <Download className="w-3 h-3" /> S/4HANA export
                      </a>
                    </Button>
                  ) : null
                }
              />
            </FieldGrid>
          </Section>

          <DrawerDivider />

          <Section title="Central Maintenance Lead">
            {selectedMeta.central_mtce_lead ? (
              <PartyCell
                name={selectedMeta.central_mtce_lead.name}
                role={selectedMeta.central_mtce_lead.role}
                avatarUrl={leadAvatar}
              />
            ) : (
              <span className="text-[12.5px] text-muted-foreground/60">Not assigned</span>
            )}
          </Section>

          {selectedMeta.batches && selectedMeta.batches.length > 0 && (
            <>
              <DrawerDivider />
              <Section title="Batch breakdown">
                <BatchList batches={selectedMeta.batches} />
              </Section>
            </>
          )}
        </DeliverableDetailShell>
      )}
    </>
  );
};

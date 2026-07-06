import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { P2AHandoverPoint } from '../../../hooks/useP2AHandoverPoints';
import { DeliverableList, DeliverableRow, EmptyDeliverable, ChipTone } from './DeliverableRow';
import { StandardDeliverableSheet } from './StandardDeliverableSheet';

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

const initials = (name: string) =>
  name.split(/\s+/).map((n) => n[0]).filter(Boolean).slice(0, 2).join('').toUpperCase() || '?';

const resolveAvatar = (url: string | null | undefined) => {
  if (!url) return null;
  if (url.startsWith('http')) return url;
  return supabase.storage.from('user-avatars').getPublicUrl(url).data.publicUrl;
};

const BatchList: React.FC<{ batches: Batch[] }> = ({ batches }) => (
  <div className="rounded-md border border-border/60 divide-y divide-border/40 overflow-hidden">
    {batches.map((b) => (
      <div key={b.code} className="flex items-center justify-between gap-2 px-3 py-2 text-[12px]">
        <div className="min-w-0">
          <div className="font-mono font-semibold text-foreground">{b.code}</div>
          <div className="text-muted-foreground truncate">{b.title}</div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[10.5px] font-medium text-muted-foreground">{b.assets} assets</span>
          <span
            className={cn(
              'text-[10px] font-semibold rounded-full px-2 py-0.5',
              b.status.toLowerCase() === 'approved'
                ? 'bg-emerald-50 text-emerald-700'
                : b.status.toLowerCase().includes('review')
                ? 'bg-blue-50 text-blue-700'
                : b.status.toLowerCase().includes('load')
                ? 'bg-blue-50 text-blue-700'
                : 'bg-slate-100 text-muted-foreground',
            )}
          >
            {b.status}
          </span>
        </div>
      </div>
    ))}
  </div>
);

const LeadCell: React.FC<{ name: string; role?: string; avatarUrl: string | null }> = ({ name, role, avatarUrl }) => (
  <div className="flex items-center gap-2">
    <Avatar className="h-7 w-7">
      {avatarUrl && <AvatarImage src={avatarUrl} alt={name} />}
      <AvatarFallback className="text-[10px] bg-slate-200 text-slate-700">{initials(name)}</AvatarFallback>
    </Avatar>
    <div className="min-w-0">
      <div className="text-[12.5px] font-medium leading-tight truncate">{name}</div>
      {role && <div className="text-[10.5px] text-muted-foreground truncate">{role}</div>}
    </div>
  </div>
);

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
        <StandardDeliverableSheet
          open={!!selected}
          onOpenChange={(o) => !o && setSelected(null)}
          kind="Maintenance system"
          title={DELIVERABLE_LABEL[selected.deliverable_type] || selected.deliverable_type}
          subtitle={selectedMeta.summary || null}
          chipLabel={selectedMeta.approval_status || 'Applicable'}
          chipTone={approvalTone(selectedMeta.approval_status)}
          fields={[
            {
              label: 'S/4HANA evidence',
              value: selectedMeta.s4hana_ref ? (
                <span className="font-mono text-[12px]">{selectedMeta.s4hana_ref}</span>
              ) : '—',
            },
            {
              label: 'Approval status',
              value: (
                <span className={cn(
                  'inline-flex text-[10.5px] font-bold rounded-full border px-2 py-0.5',
                  approvalTone(selectedMeta.approval_status) === 'emerald' && 'bg-emerald-50 text-emerald-700 border-emerald-200',
                  approvalTone(selectedMeta.approval_status) === 'blue' && 'bg-blue-50 text-blue-700 border-blue-200',
                  approvalTone(selectedMeta.approval_status) === 'slate' && 'bg-slate-100 text-muted-foreground border-slate-200',
                  approvalTone(selectedMeta.approval_status) === 'amber' && 'bg-amber-50 text-amber-700 border-amber-200',
                )}>
                  {selectedMeta.approval_status || 'Applicable'}
                </span>
              ),
            },
            {
              label: 'Central Mtce Lead',
              full: true,
              value: selectedMeta.central_mtce_lead ? (
                <LeadCell
                  name={selectedMeta.central_mtce_lead.name}
                  role={selectedMeta.central_mtce_lead.role}
                  avatarUrl={leadAvatar}
                />
              ) : '—',
            },
            ...(selectedMeta.batches && selectedMeta.batches.length > 0
              ? [{
                  label: 'Batch breakdown',
                  full: true,
                  value: <BatchList batches={selectedMeta.batches} />,
                } as const]
              : []),
            ...(selectedMeta.approved_at
              ? [{ label: 'Approved at', value: selectedMeta.approved_at } as const]
              : []),
          ]}
          notes={null}
        />
      )}
    </>
  );
};

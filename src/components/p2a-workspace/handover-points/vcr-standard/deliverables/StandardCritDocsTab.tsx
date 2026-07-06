import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ExternalLink } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { P2AHandoverPoint } from '../../../hooks/useP2AHandoverPoints';
import { DeliverableList, DeliverableRow, EmptyDeliverable, ChipTone } from './DeliverableRow';
import { StandardDeliverableSheet } from './StandardDeliverableSheet';

interface CritDoc {
  id: string;
  doc_code: string | null;
  title: string;
  tier: string | null;
  discipline: string | null;
  status: string;
  responsible_person: string | null;
  rlmu_required: boolean;
  rlmu_status: string | null;
  target_date: string | null;
  notes: string | null;
}

// Build a deep link into Assai for a given document number.
// Matches the Assai instance URL pattern used elsewhere in Admin Tools.
const assaiDeepLink = (docCode: string | null) => {
  if (!docCode) return null;
  return `https://client.assaisoftware.com/documents/${encodeURIComponent(docCode)}`;
};

const statusChip = (status: string): { label: string; tone: ChipTone } => {
  if (status === 'complete')     return { label: 'Complete',    tone: 'emerald' };
  if (status === 'in_progress')  return { label: 'In progress', tone: 'blue' };
  return { label: 'Not started', tone: 'slate' };
};

const rlmuChip = (required: boolean, status: string | null): { label: string; tone: ChipTone } | null => {
  if (!required) return null;
  if (status === 'approved')  return { label: 'RLMU approved',  tone: 'emerald' };
  if (status === 'submitted') return { label: 'RLMU submitted', tone: 'blue' };
  if (status === 'pending')   return { label: 'RLMU pending',   tone: 'amber' };
  return { label: 'RLMU required', tone: 'amber' };
};

export const StandardCritDocsTab: React.FC<{ handoverPoint: P2AHandoverPoint }> = ({ handoverPoint }) => {
  const [selected, setSelected] = useState<CritDoc | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['p2a-vcr-critical-docs', handoverPoint.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('p2a_vcr_critical_docs')
        .select('id, doc_code, title, tier, discipline, status, responsible_person, rlmu_required, rlmu_status, target_date, notes')
        .eq('handover_point_id', handoverPoint.id)
        .order('display_order');
      if (error) throw error;
      return (data || []) as CritDoc[];
    },
  });

  if (isLoading) return <div className="p-6 text-sm text-muted-foreground">Loading documentation…</div>;
  const rows = data || [];
  if (!rows.length) {
    return (
      <EmptyDeliverable
        label="No critical documents attached yet."
        hint="Populates from RLMU / AFC / ASB catalogues once discipline leads publish this VCR's document set."
      />
    );
  }

  const selChip = selected ? statusChip(selected.status) : null;
  const selAssai = selected ? assaiDeepLink(selected.doc_code) : null;

  return (
    <>
      <DeliverableList>
        {rows.map((d) => {
          const chip = statusChip(d.status);
          const rlmu = rlmuChip(d.rlmu_required, d.rlmu_status);
          const context = [d.doc_code, d.discipline].filter(Boolean).join(' · ');
          return (
            <DeliverableRow
              key={d.id}
              name={d.title}
              context={context || d.responsible_person}
              chipLabel={rlmu ? `${chip.label} · ${rlmu.label}` : chip.label}
              chipTone={rlmu ? rlmu.tone : chip.tone}
              onClick={() => setSelected(d)}
            />
          );
        })}
      </DeliverableList>

      {selected && selChip && (
        <StandardDeliverableSheet
          open={!!selected}
          onOpenChange={(o) => !o && setSelected(null)}
          kind="Document"
          title={selected.title}
          subtitle={selected.doc_code || selected.discipline}
          chipLabel={selChip.label}
          chipTone={selChip.tone}
          fields={[
            { label: 'Document no.', value: selected.doc_code || null },
            { label: 'Discipline',   value: selected.discipline || null },
            { label: 'Tier',         value: selected.tier ? selected.tier.replace('_', ' ') : null },
            { label: 'Responsible',  value: selected.responsible_person || null },
            { label: 'Target date',  value: selected.target_date || null },
            { label: 'RLMU required', value: selected.rlmu_required ? (selected.rlmu_status || 'pending').replace('_', ' ') : 'No' },
            { label: 'Notes',        value: selected.notes || null, full: true },
            selAssai
              ? {
                  label: 'Assai',
                  full: true,
                  value: (
                    <a
                      href={selAssai}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-[12px] font-medium text-primary hover:underline"
                    >
                      Open in Assai <ExternalLink className="w-3 h-3" />
                    </a>
                  ),
                }
              : { label: 'Assai', value: 'Not linked' },
          ]}
        />
      )}
    </>
  );
};

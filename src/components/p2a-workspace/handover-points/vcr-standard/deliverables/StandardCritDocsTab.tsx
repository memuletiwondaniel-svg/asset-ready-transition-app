import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { P2AHandoverPoint } from '../../../hooks/useP2AHandoverPoints';
import { EmptyDeliverable, ChipTone } from './DeliverableRow';
import {
  DeliverableDetailShell,
  Section,
  FieldGrid,
  LabeledField,
  InlineChip,
  DrawerDivider,
} from '../../shared/deliverableDrawer';
import { SurfaceHeader } from '../../shared/SurfaceHeader';
import { cn } from '@/lib/utils';
import { ExternalLink, Paperclip } from 'lucide-react';

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
  assai_status_code: string | null;
  assai_revision: string | null;
}

/* -----------------------------------------------------------
 * Chip rules (spec):
 *  - RLMU-required + rlmu_status='approved' → GREEN "RLMU"
 *  - Not RLMU-required + assai_status_code in (AFU, ASB) → GREEN Assai code
 *  - Everything else → GREY Assai status code (or "—")
 *  - When rlmu_required && rlmu_status !== 'approved' → muted subtext
 *    "RLMU required" below chip
 *  - Finals sort to the bottom (G4)
 * ----------------------------------------------------------- */

const FINAL_ASSAI = new Set(['AFU', 'ASB']);

interface DocChip {
  label: string;
  tone: ChipTone;
  isFinal: boolean;
  rlmuHint: string | null;
}

const resolveChip = (d: CritDoc): DocChip => {
  const code = (d.assai_status_code || '').toUpperCase();
  const rev = d.assai_revision ? ` · ${d.assai_revision}` : '';
  const rlmuApproved = d.rlmu_required && d.rlmu_status === 'approved';
  if (rlmuApproved) {
    return { label: 'RLMU', tone: 'emerald', isFinal: true, rlmuHint: null };
  }
  if (!d.rlmu_required && FINAL_ASSAI.has(code)) {
    return { label: `${code}${rev}`, tone: 'emerald', isFinal: true, rlmuHint: null };
  }
  const label = code ? `${code}${rev}` : '—';
  const hint =
    d.rlmu_required && d.rlmu_status !== 'approved' ? 'RLMU required' : null;
  return { label, tone: 'slate', isFinal: false, rlmuHint: hint };
};

const rlmuValueText = (d: CritDoc): string | null => {
  if (!d.rlmu_required) return 'Not required';
  if (d.rlmu_status === 'approved') return 'Approved';
  const label =
    d.rlmu_status === 'pending' ? 'Required · pending with Operations' :
    d.rlmu_status === 'under_review' ? 'Required · under review with Operations' :
    d.rlmu_status === 'rejected' ? 'Required · rejected — needs rework' :
    'Required';
  return label;
};

const CHIP_TONES: Record<ChipTone, string> = {
  emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  blue: 'bg-blue-50 text-blue-700 border-blue-200',
  amber: 'bg-amber-50 text-amber-700 border-amber-200',
  red: 'bg-red-50 text-red-700 border-red-200',
  slate: 'bg-slate-100 text-muted-foreground border-slate-200',
};

const assaiHref = (code: string | null | undefined) =>
  code ? `https://client.assaisoftware.com/documents/${encodeURIComponent(code)}` : null;

const DocRow: React.FC<{ d: CritDoc; onClick: () => void }> = ({ d, onClick }) => {
  const chip = resolveChip(d);
  const meta = [d.tier ? `Tier ${d.tier.replace(/^tier_/i, '')}` : null, d.discipline].filter(Boolean).join(' · ');
  const href = assaiHref(d.doc_code);
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-start gap-3 px-4 py-3.5 text-left transition-colors hover:bg-blue-50/60 border-b border-border/60 last:border-0"
    >
      <div className="flex-1 min-w-0 space-y-1">
        <div className="text-[13px] font-medium leading-snug truncate">{d.title}</div>
        {d.doc_code && (
          href ? (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="font-mono text-[11px] text-foreground/80 hover:text-primary hover:underline truncate block"
            >
              {d.doc_code}
            </a>
          ) : (
            <div className="font-mono text-[11px] text-muted-foreground truncate">{d.doc_code}</div>
          )
        )}
        {meta && (
          <div className="text-[11px] text-muted-foreground truncate">{meta}</div>
        )}
      </div>
      <div className="flex flex-col items-end gap-1 shrink-0 mt-0.5">
        <span className={cn(
          'text-[10.5px] font-bold rounded-full border px-2 py-0.5',
          CHIP_TONES[chip.tone],
        )}>
          {chip.label}
        </span>
        {chip.rlmuHint && (
          <span className="text-[10px] text-muted-foreground">{chip.rlmuHint}</span>
        )}
      </div>
    </button>
  );
};

export const StandardCritDocsTab: React.FC<{ handoverPoint: P2AHandoverPoint }> = ({ handoverPoint }) => {
  const [selected, setSelected] = useState<CritDoc | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['p2a-vcr-critical-docs', handoverPoint.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('p2a_vcr_critical_docs')
        .select('id, doc_code, title, tier, discipline, status, responsible_person, rlmu_required, rlmu_status, target_date, notes, assai_status_code, assai_revision')
        .eq('handover_point_id', handoverPoint.id)
        .order('display_order');
      if (error) throw error;
      return (data || []) as CritDoc[];
    },
  });

  const rows = useMemo(() => {
    const list = data || [];
    // G4 sort: non-final first, terminals at bottom.
    return [...list].sort((a, b) => {
      const af = resolveChip(a).isFinal;
      const bf = resolveChip(b).isFinal;
      if (af !== bf) return af ? 1 : -1;
      return (a.title || '').localeCompare(b.title || '');
    });
  }, [data]);

  const narrative = useMemo(() => {
    const list = data || [];
    if (list.length === 0) return null;
    const chips = list.map(resolveChip);
    const finals = chips.filter((c) => c.isFinal).length;
    const rlmuOutstanding = list.filter((d) => d.rlmu_required && d.rlmu_status !== 'approved').length;
    const tier1Outstanding = list.filter(
      (d) => (d.tier || '').toLowerCase() === 'tier_1' && !resolveChip(d).isFinal,
    ).length;
    const parts: string[] = [];
    parts.push(`**${finals} of ${list.length}** critical documents are at their final Assai / RLMU state.`);
    if (rlmuOutstanding > 0) parts.push(`**${rlmuOutstanding}** still awaiting RLMU approval.`);
    if (tier1Outstanding > 0) parts.push(`**${tier1Outstanding}** Tier 1 documents remain outstanding.`);
    return parts.join(' ');
  }, [data]);

  if (isLoading) return <div className="p-6 text-sm text-muted-foreground">Loading documentation…</div>;
  if (!rows.length) {
    return (
      <div className="space-y-4">
        <SurfaceHeader title="Critical Documents" vcrCode={handoverPoint.vcr_code} vcrName={handoverPoint.name} />
        <EmptyDeliverable
          label="No critical documents attached yet."
          hint="Populates once discipline leads publish this VCR's document set."
        />
      </div>
    );
  }

  const selChip = selected ? resolveChip(selected) : null;
  const selHref = assaiHref(selected?.doc_code);

  return (
    <div className="space-y-4">
      <SurfaceHeader
        title="Critical Documents"
        vcrCode={handoverPoint.vcr_code}
        vcrName={handoverPoint.name}
        narrative={narrative}
      />

      <div className="rounded-lg border bg-background overflow-hidden">
        {rows.map((d) => (
          <DocRow key={d.id} d={d} onClick={() => setSelected(d)} />
        ))}
      </div>

      {selected && selChip && (
        <DeliverableDetailShell
          open={!!selected}
          onOpenChange={(o) => !o && setSelected(null)}
          kind={''}
          title={selected.title}
          subtitle={handoverPoint.vcr_code ? `${handoverPoint.vcr_code}${handoverPoint.name ? ` · ${handoverPoint.name}` : ''}` : null}
          chipLabel={selChip.label}
          chipTone={selChip.tone}
        >
          <Section title="Document">
            <FieldGrid>
              <LabeledField
                label="Doc no."
                full
                value={
                  selected.doc_code ? (
                    selHref ? (
                      <a
                        href={selHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono hover:text-primary hover:underline inline-flex items-center gap-1"
                      >
                        {selected.doc_code}
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    ) : (
                      <span className="font-mono">{selected.doc_code}</span>
                    )
                  ) : null
                }
              />
              <LabeledField label="Discipline" value={selected.discipline || null} />
              <LabeledField
                label="Tier"
                value={selected.tier ? selected.tier.replace(/^tier_/i, 'Tier ') : null}
              />
              <LabeledField
                label="Status"
                value={
                  <div className="flex flex-col gap-1">
                    <InlineChip tone={selChip.tone}>{selChip.label}</InlineChip>
                    {selChip.rlmuHint && (
                      <span className="text-[10.5px] text-muted-foreground">{selChip.rlmuHint}</span>
                    )}
                  </div>
                }
              />
              <LabeledField
                label="RLMU"
                value={
                  <span>
                    <span>{rlmuValueText(selected) || '—'}</span>
                  </span>
                }
              />
              <LabeledField label="Responsible" value={selected.responsible_person || null} />
              <LabeledField label="Target date" value={selected.target_date || null} />
              {selected.notes && (
                <LabeledField label="Notes" value={selected.notes} full />
              )}
            </FieldGrid>
          </Section>

          <DrawerDivider />

          <Section title="Attachments">
            <div className="flex items-center gap-2 text-[12.5px]">
              <Paperclip className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              {selHref ? (
                <a
                  href={selHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-primary hover:underline font-medium truncate"
                >
                  Open in Assai
                </a>
              ) : (
                <span className="text-muted-foreground/60">Not linked</span>
              )}
            </div>
          </Section>
        </DeliverableDetailShell>
      )}
    </div>
  );
};

import React, { useState, useMemo } from 'react';
import { P2AHandoverPoint } from '../../../hooks/useP2AHandoverPoints';
import { useVCRTrainingDeliverables } from '../../../hooks/useVCRDeliverables';
import { DeliverableList, EmptyDeliverable, trainingStatusChip, ChipTone } from './DeliverableRow';
import {
  DeliverableDetailShell,
  Section,
  FieldGrid,
  LabeledField,
  InlineChip,
  TagList,
  EvidenceList,
  DrawerDivider,
} from '../../shared/deliverableDrawer';
import {
  trainingStatusMeta,
  normalizeTrainingStatus,
  TRAINING_TOTAL_STEPS,
} from '../../training/TrainingStatusChip';
import { cn } from '@/lib/utils';
import { AlertTriangle } from 'lucide-react';
import { format, isBefore, startOfDay } from 'date-fns';

const CHIP_TONES: Record<ChipTone, string> = {
  emerald: 'bg-emerald-50 text-emerald-700',
  blue: 'bg-blue-50 text-blue-700',
  amber: 'bg-amber-50 text-amber-700',
  red: 'bg-red-50 text-red-700',
  slate: 'bg-slate-100 text-muted-foreground',
};

const PROGRESS_TONES: Record<ChipTone, string> = {
  emerald: 'bg-emerald-500',
  blue: 'bg-blue-500',
  amber: 'bg-amber-500',
  red: 'bg-red-500',
  slate: 'bg-slate-400',
};

const isCompleted = (status?: string) => normalizeTrainingStatus(status) === 'COMPLETED';

// Prefer scheduled_date, then target_date, then tentative_date for the "when" line.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const effectiveTargetDate = (r: any): string | null =>
  r?.scheduled_date || r?.target_date || r?.tentative_date || null;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const isOverdue = (r: any): boolean => {
  const status = normalizeTrainingStatus(r?.status);
  if (status === 'COMPLETED') return false;
  const d = effectiveTargetDate(r);
  if (!d) return false;
  try {
    return isBefore(startOfDay(new Date(d)), startOfDay(new Date()));
  } catch {
    return false;
  }
};

interface TrainingRowProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  row: any;
  onClick: () => void;
}

const TrainingListRow: React.FC<TrainingRowProps> = ({ row, onClick }) => {
  const chip = trainingStatusChip(row.status);
  const meta = trainingStatusMeta(row.status);
  const stepPct = Math.round((meta.step / TRAINING_TOTAL_STEPS) * 100);

  const contextParts = [
    row.training_provider || null,
    row.duration_hours ? `${row.duration_hours} h` : null,
  ].filter(Boolean) as string[];
  const context = contextParts.join(' · ');

  const overdue = isOverdue(row);
  const targetDate = effectiveTargetDate(row);
  const dateLabel = targetDate ? format(new Date(targetDate), 'd MMM yyyy') : null;

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex flex-col gap-1.5 px-4 py-3.5 text-left transition-colors hover:bg-blue-50/60 cursor-pointer"
    >
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="text-[13px] font-medium leading-snug truncate">{row.title}</div>
          {context && (
            <div className="text-[11px] text-muted-foreground truncate mt-1">{context}</div>
          )}
        </div>
        <span
          className={cn(
            'flex-none text-[10.5px] font-bold rounded-full px-2 py-0.5 mt-0.5',
            CHIP_TONES[chip.tone],
          )}
        >
          {chip.label}
        </span>
      </div>

      {/* Mini progress + step caption + optional overdue flag */}
      <div className="flex items-center gap-2 pl-0">
        <div className="h-1 w-24 rounded-full bg-muted overflow-hidden">
          <div
            className={cn('h-full transition-all', PROGRESS_TONES[chip.tone])}
            style={{ width: `${stepPct}%` }}
          />
        </div>
        <span className="text-[10.5px] text-muted-foreground whitespace-nowrap">
          Step {meta.step} of {TRAINING_TOTAL_STEPS}
        </span>

        {dateLabel && (
          <span
            className={cn(
              'ml-auto text-[10.5px] whitespace-nowrap',
              overdue ? 'text-red-600 dark:text-red-400 font-medium flex items-center gap-1' : 'text-muted-foreground',
            )}
          >
            {overdue && <AlertTriangle className="h-3 w-3" />}
            {overdue ? 'Overdue · ' : ''}
            {dateLabel}
          </span>
        )}
      </div>
    </button>
  );
};

export const StandardTrainingTab: React.FC<{ handoverPoint: P2AHandoverPoint }> = ({ handoverPoint }) => {
  const { data, isLoading } = useVCRTrainingDeliverables(handoverPoint.id);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [selected, setSelected] = useState<any | null>(null);

  const rows = useMemo(() => {
    const list = data || [];
    return [...list].sort((a, b) => {
      const aOrder = trainingStatusMeta(a.status).order;
      const bOrder = trainingStatusMeta(b.status).order;
      if (aOrder !== bOrder) return aOrder - bOrder;
      return (a.display_order ?? 0) - (b.display_order ?? 0);
    });
  }, [data]);

  if (isLoading) return <div className="p-6 text-sm text-muted-foreground">Loading training…</div>;
  if (!rows.length)
    return <EmptyDeliverable label="No training deliverables planned yet." hint="Add training items during plan definition." />;

  const chip = selected ? trainingStatusChip(selected.status) : null;
  const completed = selected && isCompleted(selected.status);

  return (
    <>
      <DeliverableList>
        {rows.map((r) => (
          <div key={r.id} className="border-b border-border/60 last:border-0">
            <TrainingListRow row={r} onClick={() => setSelected(r)} />
          </div>
        ))}
      </DeliverableList>

      {selected && chip && (
        <DeliverableDetailShell
          open={!!selected}
          onOpenChange={(o) => !o && setSelected(null)}
          kind="Training"
          title={selected.title}
          subtitle={selected.training_provider || null}
          chipLabel={chip.label}
          chipTone={chip.tone}
        >
          <Section title="Overview">
            <FieldGrid>
              <LabeledField label="Title" value={selected.title} full />
              <LabeledField
                label="Objective & justification"
                value={selected.description || null}
                full
              />
              <LabeledField label="Provider" value={selected.training_provider || null} />
              <LabeledField
                label="Delivery format"
                value={<TagList items={selected.delivery_method} />}
              />
              <LabeledField
                label="Target audience"
                value={<TagList items={selected.target_audience} />}
                full
              />
              <LabeledField
                label="Applicable systems"
                value={
                  selected.system_ids?.length
                    ? `${selected.system_ids.length} system${selected.system_ids.length === 1 ? '' : 's'} mapped`
                    : null
                }
              />
              <LabeledField
                label="Duration"
                value={selected.duration_hours ? `${selected.duration_hours} h` : null}
              />
              <LabeledField
                label="Status"
                value={<InlineChip tone={chip.tone}>{chip.label}</InlineChip>}
              />
              <LabeledField
                label={completed ? 'Delivered' : 'Target date'}
                value={effectiveTargetDate(selected)}
              />
            </FieldGrid>
          </Section>

          {completed && (
            <>
              <DrawerDivider />
              <Section title="Supporting evidence">
                <EvidenceList
                  items={selected.evidence || null}
                  emptyLabel="Attendance, materials & photos not yet uploaded."
                />
              </Section>
            </>
          )}
        </DeliverableDetailShell>
      )}
    </>
  );
};

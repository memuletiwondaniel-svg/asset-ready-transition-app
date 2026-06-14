import React, { useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, Loader2, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useVcrPlanDiff, type DiffMode } from '@/hooks/useVcrPlanDiff';
import type { SectionDiff, RosterDiff } from '@/lib/vcrPlanDiff';

interface Props {
  handoverPointId: string;
  mode?: DiffMode;
}

interface Row {
  key: string;
  label: string;
  section: SectionDiff | null;
  /** Optional id → human label resolver */
  labelFor?: (id: string) => string;
  /** For roster section: provide its own renderer */
  roster?: RosterDiff;
}

const Chip: React.FC<{ kind: 'add' | 'rem' | 'flat'; children: React.ReactNode }> = ({ kind, children }) => (
  <span
    className={cn(
      'inline-flex items-center rounded-md px-1.5 py-0.5 text-[11px] font-mono tabular-nums',
      kind === 'add' && 'bg-emerald-500/10 text-emerald-700',
      kind === 'rem' && 'bg-red-500/10 text-red-700',
      kind === 'flat' && 'text-muted-foreground',
    )}
  >
    {children}
  </span>
);

const SectionRow: React.FC<{ row: Row }> = ({ row }) => {
  const [open, setOpen] = useState(false);
  const sec = row.section;
  const rost = row.roster;
  const addCount = sec ? sec.added.length : rost!.added.length;
  const remCount = sec ? sec.removed.length : rost!.removed.length;
  const changed = addCount + remCount > 0;

  return (
    <div className="border-b last:border-b-0">
      <button
        type="button"
        onClick={() => changed && setOpen((o) => !o)}
        className={cn(
          'w-full flex items-center justify-between gap-3 px-3 py-2 text-left text-sm',
          changed ? 'hover:bg-muted/30' : 'cursor-default',
        )}
        disabled={!changed}
      >
        <div className="flex items-center gap-2 min-w-0">
          {changed ? (
            open ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
          ) : (
            <span className="w-3.5" />
          )}
          <span className="font-medium">{row.label}</span>
        </div>
        <div className="flex items-center gap-2">
          {changed ? (
            <>
              {addCount > 0 && <Chip kind="add">+{addCount}</Chip>}
              {remCount > 0 && (
                <Chip kind="rem">
                  −{remCount}
                  {row.key === 'checklist' ? ' removed / N/A’d' : ''}
                </Chip>
              )}
            </>
          ) : (
            <Chip kind="flat">unchanged</Chip>
          )}
        </div>
      </button>
      {open && changed && (
        <div className="px-8 pb-3 pt-1 space-y-2 text-xs">
          {sec && sec.added.length > 0 && (
            <div>
              <div className="text-emerald-700 font-semibold uppercase tracking-wider text-[10px] mb-1">Added</div>
              <ul className="space-y-0.5">
                {sec.added.map((id) => (
                  <li key={id} className="text-foreground/80">+ {row.labelFor ? row.labelFor(id) : id}</li>
                ))}
              </ul>
            </div>
          )}
          {sec && sec.removed.length > 0 && (
            <div>
              <div className="text-red-700 font-semibold uppercase tracking-wider text-[10px] mb-1">Removed</div>
              <ul className="space-y-0.5">
                {sec.removed.map((id) => (
                  <li key={id} className="text-foreground/80">− {row.labelFor ? row.labelFor(id) : id}</li>
                ))}
              </ul>
            </div>
          )}
          {rost && rost.added.length > 0 && (
            <div>
              <div className="text-emerald-700 font-semibold uppercase tracking-wider text-[10px] mb-1">Added approvers</div>
              <ul className="space-y-0.5">
                {rost.added.map((m) => (
                  <li key={m.id} className="text-foreground/80">+ {m.role_label || '(unnamed role)'}</li>
                ))}
              </ul>
            </div>
          )}
          {rost && rost.removed.length > 0 && (
            <div>
              <div className="text-red-700 font-semibold uppercase tracking-wider text-[10px] mb-1">Removed approvers</div>
              <ul className="space-y-0.5">
                {rost.removed.map((m) => (
                  <li key={m.id} className="text-foreground/80">− {m.role_label || '(unnamed role)'}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export const VCRPlanDiffSummary: React.FC<Props> = ({ handoverPointId, mode = 'live' }) => {
  const { diff, fromMissing, loading, itemNames } = useVcrPlanDiff(handoverPointId, { mode });

  const labelForItem = useMemo(
    () => (id: string) => itemNames[id] || id,
    [itemNames],
  );

  const rows = useMemo<Row[] | null>(() => {
    if (!diff) return null;
    return [
      { key: 'checklist', label: 'Checklist items', section: diff.checklist, labelFor: labelForItem },
      { key: 'documents', label: 'Documents', section: diff.documents },
      { key: 'training', label: 'Training', section: diff.training },
      { key: 'procedures', label: 'Procedures', section: diff.procedures },
      { key: 'registers', label: 'Registers', section: diff.registers },
      { key: 'logsheets', label: 'Logsheets', section: diff.logsheets },
      { key: 'maintenance', label: 'Maintenance', section: diff.maintenance },
      { key: 'roster', label: 'Approver roster', section: null, roster: diff.roster },
    ];
  }, [diff, labelForItem]);

  if (loading) {
    return (
      <div className="rounded-lg border bg-muted/20 px-3 py-3 text-xs text-muted-foreground flex items-center gap-2">
        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Computing diff…
      </div>
    );
  }

  if (fromMissing) {
    return (
      <div className="rounded-lg border bg-muted/20 px-3 py-3 text-xs text-muted-foreground flex items-start gap-2">
        <Info className="h-3.5 w-3.5 mt-0.5" />
        <span>No submitted baseline to compare against.</span>
      </div>
    );
  }

  if (!diff || diff.totalChanged === 0) {
    return (
      <div className="rounded-lg border bg-muted/20 px-3 py-3 text-xs text-muted-foreground flex items-start gap-2">
        <Info className="h-3.5 w-3.5 mt-0.5" />
        <span>No changes from the submitted plan.</span>
      </div>
    );
  }

  return (
    <section className="space-y-2">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {mode === 'live' ? 'Your changes vs the submitted plan' : 'Baseline changes vs submitted plan'}
      </div>
      <div className="rounded-lg border bg-card/30">
        {rows!.map((r) => (
          <SectionRow key={r.key} row={r} />
        ))}
      </div>
    </section>
  );
};

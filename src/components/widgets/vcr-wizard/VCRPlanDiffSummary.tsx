import React, { useMemo } from 'react';
import { Loader2, Info, Plus, Minus, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useVcrPlanDiff, type DiffMode } from '@/hooks/useVcrPlanDiff';
import type { SectionDiff } from '@/lib/vcrPlanDiff';

interface Props {
  handoverPointId: string;
  mode?: DiffMode;
}

interface RenderSection {
  key: string;
  label: string;
  noun: string;
  section: SectionDiff;
}

const SectionBlock: React.FC<{
  label: string;
  noun: string;
  added: string[];
  removed: string[];
  labelFor: (id: string) => string;
}> = ({ label, noun, added, removed, labelFor }) => (
  <div className="space-y-1.5">
    <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
      {label}
    </div>
    <ul className="space-y-1 text-sm">
      {added.map((id) => (
        <li key={`a-${id}`} className="flex items-start gap-2 text-foreground/90">
          <Plus className="h-3.5 w-3.5 mt-0.5 text-emerald-600 shrink-0" />
          <span className="text-foreground/90">
            Added {noun} — <span className="font-medium">{labelFor(id)}</span>
          </span>
        </li>
      ))}
      {removed.map((id) => (
        <li key={`r-${id}`} className="flex items-start gap-2 text-foreground/90">
          <Minus className="h-3.5 w-3.5 mt-0.5 text-red-600 shrink-0" />
          <span className="text-foreground/90">
            Removed {noun} — <span className="font-medium line-through opacity-80">{labelFor(id)}</span>
          </span>
        </li>
      ))}
    </ul>
  </div>
);

export const VCRPlanDiffSummary: React.FC<Props> = ({ handoverPointId, mode = 'live' }) => {
  const { diff, fromMissing, loading, itemNames } = useVcrPlanDiff(handoverPointId, { mode });

  const labelFor = useMemo(
    () => (id: string) => itemNames[id] || diff?.labels[id] || id,
    [itemNames, diff],
  );

  const sections = useMemo<RenderSection[] | null>(() => {
    if (!diff) return null;
    return [
      { key: 'checklist',   label: 'Checklist items',          noun: 'checklist item',        section: diff.checklist },
      { key: 'documents',   label: 'Critical documents',       noun: 'critical document',     section: diff.documents },
      { key: 'training',    label: 'Training',                 noun: 'training',              section: diff.training },
      { key: 'procedures',  label: 'Procedures',               noun: 'procedure',             section: diff.procedures },
      { key: 'registers',   label: 'Registers',                noun: 'register',              section: diff.registers },
      { key: 'logsheets',   label: 'Logsheets',                noun: 'logsheet',              section: diff.logsheets },
      { key: 'maintenance', label: 'Maintenance deliverables', noun: 'maintenance item',      section: diff.maintenance },
    ].filter((s) => s.section.added.length + s.section.removed.length > 0);
  }, [diff]);

  if (loading) {
    return (
      <div className="rounded-lg border bg-muted/20 px-3 py-3 text-xs text-muted-foreground flex items-center gap-2">
        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Computing changes…
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
      <div className="rounded-lg border bg-muted/20 px-3 py-3 text-sm text-muted-foreground flex items-start gap-2">
        <Info className="h-4 w-4 mt-0.5" />
        <span>No changes from the submitted plan.</span>
      </div>
    );
  }

  const rosterChanged = diff.roster.added.length + diff.roster.removed.length > 0;

  return (
    <section className="space-y-3">
      <div className="space-y-1">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {mode === 'live' ? 'Your changes vs the submitted plan' : 'Approved baseline vs submitted plan'}
        </div>
        {mode === 'live' && (
          <p className="text-xs text-muted-foreground/80">
            These are the edits you've made to the submitted plan. Approving locks this version as the baseline the Phase-2 approvers review.
          </p>
        )}
      </div>
      <div className={cn('rounded-lg border bg-card/30 p-4 space-y-4')}>
        {sections!.map((s) => (
          <SectionBlock
            key={s.key}
            label={s.label}
            noun={s.noun}
            added={s.section.added}
            removed={s.section.removed}
            labelFor={labelFor}
          />
        ))}
        {rosterChanged && (
          <div className="space-y-1.5">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5" /> Approvers
            </div>
            <ul className="space-y-1 text-sm">
              {diff.roster.added.map((m) => (
                <li key={`ra-${m.id}`} className="flex items-start gap-2">
                  <Plus className="h-3.5 w-3.5 mt-0.5 text-emerald-600 shrink-0" />
                  <span>
                    Added approver — <span className="font-medium">{m.role_label || '(unnamed role)'}</span>
                  </span>
                </li>
              ))}
              {diff.roster.removed.map((m) => (
                <li key={`rr-${m.id}`} className="flex items-start gap-2">
                  <Minus className="h-3.5 w-3.5 mt-0.5 text-red-600 shrink-0" />
                  <span>
                    Removed approver — <span className="font-medium line-through opacity-80">{m.role_label || '(unnamed role)'}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
};

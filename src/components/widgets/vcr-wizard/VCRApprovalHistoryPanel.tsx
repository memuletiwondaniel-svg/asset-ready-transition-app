import React, { useState } from 'react';
import { format } from 'date-fns';
import {
  CheckCircle2, XCircle, Send, Pencil, Anchor, AlertTriangle,
  ChevronDown, ChevronRight, Loader2, Plus, Minus,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useVCRPlanApprovalEvents, type VCRPlanApprovalEvent } from '@/hooks/useVCRPlanApprovalEvents';
import { VCRPlanDiffSummary } from './VCRPlanDiffSummary';

interface Props {
  handoverPointId: string;
  defaultOpen?: boolean;
}

const ITEM_TYPE_LABEL: Record<string, string> = {
  training: 'Training',
  procedure: 'Procedure',
  critical_doc: 'Critical doc',
  cmms: 'CMMS',
  spare: 'Spare',
  maintenance: 'Maintenance deliverable',
  logsheet: 'Logsheet',
  register: 'Register',
  documentation: 'Documentation',
  prerequisite: 'Prerequisite',
};

const eventStyle: Record<VCRPlanApprovalEvent['event_type'], { icon: React.ElementType; tone: string; label: string }> = {
  SUBMITTED:    { icon: Send,           tone: 'text-sky-600',    label: 'Submitted' },
  EDIT:         { icon: Pencil,         tone: 'text-muted-foreground', label: 'Plan saved' },
  APPROVED:     { icon: CheckCircle2,   tone: 'text-emerald-600',label: 'Approved' },
  REJECTED:     { icon: XCircle,        tone: 'text-red-600',    label: 'Changes requested' },
  BASELINED:    { icon: Anchor,         tone: 'text-violet-600', label: 'Baseline captured' },
  SCOPE_VOIDED: { icon: AlertTriangle,  tone: 'text-orange-600', label: 'Scope changed — approvals reset' },
  ITEM_ADDED:   { icon: Plus,           tone: 'text-emerald-600',label: 'Item added' },
  ITEM_REMOVED: { icon: Minus,          tone: 'text-red-600',    label: 'Item removed' },
};

export const VCRApprovalHistoryPanel: React.FC<Props> = ({ handoverPointId, defaultOpen = false }) => {
  const [open, setOpen] = useState(defaultOpen);
  const [baselineOpen, setBaselineOpen] = useState(false);
  const { data: events, isLoading } = useVCRPlanApprovalEvents(handoverPointId);

  return (
    <section className="space-y-2">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        data-rm-safe
        data-rm-nav
        className="w-full flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
      >
        {open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
        <span>
          Activity log
          {events && events.length > 0 && (
            <span className="ml-1 font-mono normal-case tracking-normal text-muted-foreground/80">· {events.length}</span>
          )}
        </span>
      </button>

      {open && (
        <div className="pl-1">
          {isLoading ? (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading…
            </div>
          ) : !events || events.length === 0 ? (
            <div className="text-xs text-muted-foreground italic">No events recorded yet.</div>
          ) : (
            <ol className="space-y-2">
              {events.map((e) => {
                const meta = eventStyle[e.event_type];
                const Icon = meta.icon;
                const role = e.payload?.role_label || e.payload?.role_key;
                const phase = e.payload?.phase;
                const comment = e.payload?.comment;
                const isBaselined = e.event_type === 'BASELINED';
                return (
                  <li
                    key={e.id}
                    className="rounded-md border bg-card/30 px-3 py-2 text-xs flex gap-3"
                  >
                    <Icon className={cn('h-4 w-4 mt-0.5 shrink-0', meta.tone)} />
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium flex items-center gap-1">
                          {isBaselined && (
                            <button
                              type="button"
                              onClick={() => setBaselineOpen((o) => !o)}
                              aria-expanded={baselineOpen}
                              aria-label={baselineOpen ? 'Hide baseline changes' : 'Show baseline changes'}
                              data-rm-safe
                              data-rm-nav
                              className="inline-flex items-center text-muted-foreground hover:text-foreground transition-colors"
                            >
                              {baselineOpen
                                ? <ChevronDown className="h-3.5 w-3.5" />
                                : <ChevronRight className="h-3.5 w-3.5" />}
                            </button>
                          )}
                          {meta.label}
                          {role && <span className="text-muted-foreground font-normal"> · {role}</span>}
                          {phase != null && <span className="text-muted-foreground font-normal"> · Phase {phase}</span>}
                        </span>
                        <span className="text-[10px] text-muted-foreground tabular-nums">
                          {format(new Date(e.created_at), 'd MMM yyyy, HH:mm')}
                        </span>
                      </div>
                      <div className="text-muted-foreground">
                        {e.actor_name || (e.actor_id ? 'User' : 'System')}
                      </div>
                      {comment && (
                        <div className="border-l-2 border-border pl-2 italic text-foreground/80">
                          "{comment}"
                        </div>
                      )}
                      {isBaselined && baselineOpen && (
                        <div className="pt-2">
                          <VCRPlanDiffSummary
                            handoverPointId={handoverPointId}
                            mode="baseline"
                            title="Changes the ORA Lead made before locking the baseline"
                          />
                        </div>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </div>
      )}
    </section>
  );
};

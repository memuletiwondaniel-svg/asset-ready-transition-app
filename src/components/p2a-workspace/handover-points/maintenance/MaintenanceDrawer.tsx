import React, { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ChevronDown, Paperclip } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { MaintDeliverable, MaintBatch, KIND_META } from './useMaintenanceDeliverables';

const initialsOf = (name: string | null | undefined) =>
  (name || '?').split(/\s+/).map((n) => n[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();
const resolveAvatar = (u: string | null | undefined): string | null => {
  if (!u) return null;
  if (u.startsWith('http')) return u;
  return supabase.storage.from('user-avatars').getPublicUrl(u).data.publicUrl;
};

const Eyebrow: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="text-[10.5px] font-bold tracking-[0.14em] uppercase text-muted-foreground/80">{children}</div>
);
const SectionRule: React.FC = () => <div className="h-px bg-border/50 my-[18px]" />;

const PctPill: React.FC<{ percent: number; complete: boolean }> = ({ percent, complete }) => {
  if (complete) {
    return <span className="text-[10.5px] font-bold rounded-full border px-2.5 py-0.5 bg-emerald-50 text-emerald-700 border-emerald-200">Complete</span>;
  }
  const tone = percent >= 80 ? 'emerald' : percent >= 40 ? 'amber' : 'red';
  const cls =
    tone === 'emerald' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
    tone === 'amber' ? 'bg-amber-50 text-amber-700 border-amber-200' :
    'bg-red-50 text-red-700 border-red-200';
  return <span className={cn('text-[10.5px] font-bold rounded-full border px-2.5 py-0.5', cls)}>{percent}%</span>;
};

const PartyCol: React.FC<{ label: string; person: { full_name: string | null; avatar_url: string | null } | null; role: string }> = ({ label, person, role }) => {
  const av = resolveAvatar(person?.avatar_url);
  return (
    <div className="flex-1 min-w-0">
      <div className="text-[10.5px] font-bold tracking-[0.14em] uppercase text-muted-foreground/80 mb-1.5">{label}</div>
      <div className="flex items-center gap-2.5">
        <Avatar className="h-8 w-8">
          {av && <AvatarImage src={av} alt={person?.full_name || ''} />}
          <AvatarFallback className="text-[10px] bg-muted">{initialsOf(person?.full_name)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <div className="text-[12.5px] font-medium leading-tight truncate">
            {person?.full_name || <span className="text-muted-foreground/60">Unassigned</span>}
          </div>
          <div className="text-[10.5px] text-muted-foreground truncate">{role}</div>
        </div>
      </div>
    </div>
  );
};

const BatchCard: React.FC<{ b: MaintBatch }> = ({ b }) => {
  const [open, setOpen] = useState(false);
  const complete = b.status === 'COMPLETE';
  const statusLabel =
    b.status === 'COMPLETE' ? 'Complete' :
    b.status === 'UPLOAD_IN_PROGRESS' ? 'Uploading' :
    b.status === 'QAQC_IN_PROGRESS' ? 'QAQC' :
    b.status === 'DRAFT' ? 'Draft' :
    'Not started';
  const tone =
    complete ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
    b.status === 'NOT_STARTED' ? 'bg-slate-100 text-muted-foreground border-slate-200' :
    'bg-amber-50 text-amber-700 border-amber-200';
  const av = resolveAvatar(b.approver_avatar_url);
  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="w-full text-left rounded-md border bg-background hover:bg-blue-50/40 px-3 py-2.5">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="text-[12.5px] font-medium truncate">{b.name}</div>
            <div className="text-[11px] text-muted-foreground mt-0.5">{b.item_count} items</div>
          </div>
          <div className="flex items-center gap-2">
            <span className={cn('text-[10.5px] font-bold rounded-full border px-2 py-0.5', tone)}>
              {statusLabel}
            </span>
            <ChevronDown className={cn('h-3.5 w-3.5 text-muted-foreground transition-transform', open && 'rotate-180')} />
          </div>
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="border border-t-0 rounded-b-md bg-muted/20 px-3 py-3 space-y-2 -mt-px">
          {complete && b.approver_name && (
            <div className="flex items-center gap-2">
              <Avatar className="h-6 w-6">
                {av && <AvatarImage src={av} alt={b.approver_name} />}
                <AvatarFallback className="text-[9px] bg-muted">{initialsOf(b.approver_name)}</AvatarFallback>
              </Avatar>
              <div className="text-[11.5px]">
                <span className="font-medium">Approved by {b.approver_name}</span>
                <span className="text-muted-foreground"> · Asset Lead{b.approved_at ? ` · ${format(new Date(b.approved_at), 'd MMM yyyy')}` : ''}</span>
              </div>
            </div>
          )}
          <div className="space-y-1 text-[12px]">
            {b.load_file_url && (
              <div className="flex items-center gap-2">
                <Paperclip className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <a href={b.load_file_url} target="_blank" rel="noopener noreferrer" className="hover:text-primary hover:underline">
                  Load file
                </a>
              </div>
            )}
            {b.upload_confirmation_url && (
              <div className="flex items-center gap-2">
                <Paperclip className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <a href={b.upload_confirmation_url} target="_blank" rel="noopener noreferrer" className="hover:text-primary hover:underline">
                  Upload confirmation
                </a>
              </div>
            )}
            {!b.load_file_url && !b.upload_confirmation_url && (
              <div className="text-muted-foreground/60">No files attached.</div>
            )}
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};

export interface MaintenanceDrawerProps {
  deliverable: MaintDeliverable | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vcrCode?: string;
  vcrName?: string;
}

export const MaintenanceDrawer: React.FC<MaintenanceDrawerProps> = ({ deliverable, open, onOpenChange, vcrCode, vcrName }) => {
  const isSpares = deliverable ? KIND_META[deliverable.deliverable_key]?.isSpares : false;
  const wideClass = isSpares ? 'sm:max-w-3xl' : 'sm:max-w-lg';

  const [q, setQ] = useState('');
  const filteredSpares = useMemo(() => {
    if (!deliverable) return [];
    const t = q.trim().toLowerCase();
    if (!t) return deliverable.spares;
    return deliverable.spares.filter((s) =>
      [s.material_no, s.material_name, s.pr_no, s.po_no]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(t)),
    );
  }, [deliverable, q]);

  const complete = deliverable ? deliverable.percent >= 100 : false;

  const batchesDoneCount = deliverable ? deliverable.batches.filter((b) => b.status === 'COMPLETE').length : 0;
  const summary = deliverable
    ? isSpares
      ? `${deliverable.spares.filter((s) => s.delivered).length} of ${deliverable.spares.length} materials delivered.`
      : `${batchesDoneCount} of ${deliverable.batches.length} batches complete · ${deliverable.batches.reduce((s, b) => s + b.item_count, 0)} items total.`
    : '';

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" hideClose className={cn('!z-modal-critical w-full p-0 flex flex-col', wideClass)}>
        <SheetHeader className="px-5 pt-5 pb-4 border-b shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <SheetTitle className="text-[15px] leading-snug">
                {deliverable?.display_name || KIND_META[deliverable?.deliverable_key || '']?.label || '—'}
              </SheetTitle>
              {vcrCode && (
                <SheetDescription className="text-[12px] mt-0.5 truncate text-muted-foreground">
                  {vcrCode}{vcrName ? ` · ${vcrName}` : ''}
                </SheetDescription>
              )}
            </div>
            {deliverable && <PctPill percent={deliverable.percent} complete={complete} />}
          </div>
        </SheetHeader>

        <ScrollArea className="flex-1">
          <div className="px-5 py-4">
            {!deliverable ? null : (
              <>
                <div className="rounded-md bg-muted/40 px-4 py-3 text-[12.5px] leading-relaxed">
                  {summary}
                </div>

                <SectionRule />

                <div className="flex gap-6">
                  <PartyCol label="Delivering party" person={deliverable.cmms_lead || null} role="CMMS Lead" />
                  <PartyCol label="Accepting party" person={deliverable.central_mtce_lead || null} role="Central Maintenance Lead" />
                </div>

                <SectionRule />

                {isSpares ? (
                  <>
                    <div className="flex items-center justify-between mb-2 gap-3">
                      <Eyebrow>Materials · {filteredSpares.length}</Eyebrow>
                      <input
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                        placeholder="Search material no / name / PR# / PO#…"
                        className="h-8 text-[12px] rounded-md border bg-background px-2 flex-1 max-w-sm"
                      />
                    </div>
                    <div className="rounded-md border overflow-hidden">
                      <table className="w-full text-[12px]">
                        <thead className="bg-muted/40 text-muted-foreground">
                          <tr className="text-left">
                            <th className="px-3 py-2 font-semibold text-[10.5px] uppercase tracking-wider">Mat. no.</th>
                            <th className="px-3 py-2 font-semibold text-[10.5px] uppercase tracking-wider">Material name</th>
                            <th className="px-3 py-2 font-semibold text-[10.5px] uppercase tracking-wider text-right">Qty</th>
                            <th className="px-3 py-2 font-semibold text-[10.5px] uppercase tracking-wider">PR#</th>
                            <th className="px-3 py-2 font-semibold text-[10.5px] uppercase tracking-wider">PO#</th>
                            <th className="px-3 py-2 font-semibold text-[10.5px] uppercase tracking-wider">Delivered</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredSpares.map((s) => (
                            <tr key={s.id} className="border-t border-border/60 hover:bg-blue-50/40">
                              <td className="px-3 py-2 font-mono text-[11px] align-top">{s.material_no}</td>
                              <td className="px-3 py-2 align-top max-w-[280px]">
                                <div className="line-clamp-2" title={s.material_name}>{s.material_name}</div>
                              </td>
                              <td className="px-3 py-2 text-right align-top">{s.qty_ordered}</td>
                              <td className="px-3 py-2 font-mono text-[11px] align-top">{s.pr_no || '—'}</td>
                              <td className="px-3 py-2 font-mono text-[11px] align-top">{s.po_no || '—'}</td>
                              <td className="px-3 py-2 align-top">
                                {s.delivered
                                  ? <span className="text-[10.5px] font-bold rounded-full border px-2 py-0.5 bg-emerald-50 text-emerald-700 border-emerald-200">Yes</span>
                                  : <span className="text-[10.5px] font-bold rounded-full border px-2 py-0.5 bg-transparent text-muted-foreground border-border">No</span>
                                }
                              </td>
                            </tr>
                          ))}
                          {filteredSpares.length === 0 && (
                            <tr><td colSpan={6} className="px-3 py-6 text-center text-muted-foreground text-[11.5px]">No materials match.</td></tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </>
                ) : (
                  <>
                    <Eyebrow>Batches · {batchesDoneCount} of {deliverable.batches.length} complete</Eyebrow>
                    <div className="mt-2 space-y-2">
                      {deliverable.batches.map((b) => (
                        <BatchCard key={b.id} b={b} />
                      ))}
                      {deliverable.batches.length === 0 && (
                        <div className="text-[11.5px] text-muted-foreground/70">No batches configured.</div>
                      )}
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
};

import React, { useMemo, useState } from 'react';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { X, Search } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import type { P2AHandoverPoint } from '../../../hooks/useP2AHandoverPoints';
import { useSystemDetail, computeSystemMilestone, Subsystem, ITRRow, PunchRow } from './useSystemDetail';
import { useWHPoints, WHPoint, WH_STATUS_PRESENTATION, typeLabel } from './useWHPoints';
import { WitnessHoldDrawer } from './WitnessHoldDrawer';

const TONE = {
  emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  blue: 'bg-blue-50 text-blue-700 border-blue-200',
  amber: 'bg-amber-50 text-amber-700 border-amber-200',
  red: 'bg-red-50 text-red-700 border-red-200',
  slate: 'bg-slate-100 text-muted-foreground border-slate-200',
} as const;

const Chip: React.FC<{ tone: keyof typeof TONE; children: React.ReactNode }> = ({ tone, children }) => (
  <span className={cn('inline-flex text-[10.5px] font-bold rounded-full border px-2 py-0.5 uppercase tracking-wider whitespace-nowrap', TONE[tone])}>
    {children}
  </span>
);

const TabBtn: React.FC<{ active: boolean; onClick: () => void; children: React.ReactNode }> = ({ active, onClick, children }) => (
  <button
    type="button"
    onClick={onClick}
    className={cn(
      'px-3 py-2 text-[12px] font-medium border-b-2 transition-colors',
      active ? 'border-foreground text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground',
    )}
  >
    {children}
  </button>
);

const FilterChip: React.FC<{ label: string; onRemove: () => void }> = ({ label, onRemove }) => (
  <button
    type="button"
    onClick={onRemove}
    className="inline-flex items-center gap-1 rounded-full bg-slate-100 hover:bg-slate-200 text-foreground text-[11px] px-2 py-0.5"
  >
    {label}
    <X className="h-3 w-3" />
  </button>
);

interface Props {
  system: any | null;
  handoverPoint: P2AHandoverPoint;
  projectId: string | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}

export const SystemDrawer: React.FC<Props> = ({ system, handoverPoint, projectId, open, onOpenChange }) => {
  const [tab, setTab] = useState<'overview' | 'itrs' | 'punchlist' | 'wh'>('overview');
  const [phaseFilter, setPhaseFilter] = useState<'A' | 'B' | null>(null);
  const [statusFilter, setStatusFilter] = useState<'Outstanding' | 'Completed' | null>(null);
  const [subFilter, setSubFilter] = useState<string | null>(null);
  const [subSearch, setSubSearch] = useState('');
  const [punchSearch, setPunchSearch] = useState('');
  const [selectedWH, setSelectedWH] = useState<WHPoint | null>(null);

  const { data, isLoading } = useSystemDetail(system?.id);
  const whCtx = useWHPoints(handoverPoint.id);
  const whPointsForSystem = useMemo(
    () => (whCtx.data?.points || []).filter((p) => p.system?.id === system?.id),
    [whCtx.data, system],
  );

  const subs = data?.subsystems || [];
  const itrs = data?.itrs || [];
  const punches = data?.punches || [];

  const milestone = system
    ? computeSystemMilestone(system.completion_status, system.is_hydrocarbon, subs)
    : { label: '—', tone: 'slate' as const };

  const itrComplete = itrs.filter((i) => i.status === 'Completed').length;
  const itrOverall = itrs.length ? Math.round((itrComplete / itrs.length) * 100) : 0;
  const itrA = itrs.filter((i) => i.phase === 'A');
  const itrB = itrs.filter((i) => i.phase === 'B');
  const itrAOut = itrA.filter((i) => i.status === 'Outstanding').length;
  const itrBOut = itrB.filter((i) => i.status === 'Outstanding').length;

  const filteredItrs = useMemo(() => {
    return itrs.filter((i) => {
      if (phaseFilter && i.phase !== phaseFilter) return false;
      if (statusFilter && i.status !== statusFilter) return false;
      if (subFilter && i.subsystem_code !== subFilter) return false;
      return true;
    });
  }, [itrs, phaseFilter, statusFilter, subFilter]);

  const openPunch = punches.filter((p) => p.status === 'Open');
  const closedPunch = punches.filter((p) => p.status === 'Closed');
  const punchFilter = (list: PunchRow[]) =>
    !punchSearch.trim()
      ? list
      : list.filter(
          (p) =>
            p.ref.toLowerCase().includes(punchSearch.toLowerCase()) ||
            p.description.toLowerCase().includes(punchSearch.toLowerCase()) ||
            p.subsystem_code.toLowerCase().includes(punchSearch.toLowerCase()),
        );

  const subDropdown = useMemo(() => {
    if (!subSearch.trim()) return [];
    const q = subSearch.toLowerCase();
    return subs.filter((s) => s.subsystem_id.toLowerCase().includes(q) || s.name.toLowerCase().includes(q)).slice(0, 6);
  }, [subs, subSearch]);

  if (!system) return null;

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="!z-modal-critical w-full sm:max-w-2xl p-0 flex flex-col [&>button]:hidden">
          {/* G1 header */}
          <div className="px-5 pt-5 pb-3 border-b shrink-0 bg-background">
            <div className="text-[10px] font-bold tracking-[0.16em] uppercase text-muted-foreground/70 mb-1">SYSTEM</div>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <h2 className="text-[16px] leading-tight font-bold tracking-tight text-foreground truncate">{system.name}</h2>
                <div className="text-[12px] text-muted-foreground mt-0.5">
                  <span className="font-mono">{system.system_id}</span>
                  {' · '}
                  {system.is_hydrocarbon ? 'Hydrocarbon' : 'Non-hydrocarbon'}
                </div>
              </div>
              <Chip tone={milestone.tone}>{milestone.label}</Chip>
            </div>
          </div>

          {/* Inner tabs */}
          <div className="border-b bg-background shrink-0 flex items-center gap-2 px-5">
            <TabBtn active={tab === 'overview'} onClick={() => setTab('overview')}>Overview</TabBtn>
            <TabBtn active={tab === 'itrs'} onClick={() => setTab('itrs')}>ITRs</TabBtn>
            <TabBtn active={tab === 'punchlist'} onClick={() => setTab('punchlist')}>Punchlist</TabBtn>
            <TabBtn active={tab === 'wh'} onClick={() => setTab('wh')}>W&amp;H Points</TabBtn>
          </div>

          <ScrollArea className="flex-1">
            <div className="px-5 py-4 text-sm">
              {isLoading && <div className="text-muted-foreground">Loading…</div>}

              {/* OVERVIEW */}
              {!isLoading && tab === 'overview' && (
                <div className="space-y-5">
                  <div>
                    <div className="flex items-baseline justify-between">
                      <div className="text-[10.5px] font-bold tracking-[0.14em] uppercase text-muted-foreground/80">Overall completion</div>
                      <div className="text-[14px] font-semibold">{itrOverall}%</div>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden mt-2">
                      <div className="h-full bg-blue-500" style={{ width: `${itrOverall}%` }} />
                    </div>
                    <div className="text-[11px] text-muted-foreground mt-1.5">
                      {itrComplete} of {itrs.length} ITRs complete
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <div className="text-[10.5px] font-bold tracking-[0.14em] uppercase text-muted-foreground/80 mb-2">Subsystems</div>
                    <div className="rounded-md border overflow-hidden">
                      <table className="w-full text-[12px]">
                        <thead className="bg-muted/40 text-[10px] uppercase tracking-wider text-muted-foreground">
                          <tr>
                            <th className="text-left px-3 py-1.5">ID</th>
                            <th className="text-left px-3 py-1.5">Name</th>
                            <th className="text-right px-3 py-1.5 w-16">Compl.</th>
                            <th className="text-right px-3 py-1.5 w-28">Milestones</th>
                          </tr>
                        </thead>
                        <tbody>
                          {subs.map((s) => (
                            <tr
                              key={s.id}
                              className="border-t border-border/50 hover:bg-blue-50/50 cursor-pointer"
                              onClick={() => {
                                setSubFilter(s.subsystem_id);
                                setTab('itrs');
                              }}
                            >
                              <td className="px-3 py-2 font-mono text-[11px] text-muted-foreground">{s.subsystem_id}</td>
                              <td className="px-3 py-2">{s.name}</td>
                              <td className="px-3 py-2 text-right">{s.completion_percentage}%</td>
                              <td className="px-3 py-2 text-right">
                                <span className="inline-flex gap-2 text-[10.5px] font-medium">
                                  <span className={s.mcc_achieved ? 'text-emerald-600' : 'text-muted-foreground/50'}>MCC</span>
                                  <span className={s.pcc_achieved ? 'text-emerald-600' : 'text-muted-foreground/50'}>PCC</span>
                                </span>
                              </td>
                            </tr>
                          ))}
                          {!subs.length && (
                            <tr>
                              <td colSpan={4} className="px-3 py-6 text-center text-muted-foreground">No subsystems</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* ITRs */}
              {!isLoading && tab === 'itrs' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setPhaseFilter(phaseFilter === 'A' ? null : 'A')}
                      className={cn(
                        'rounded-md border p-3 text-left transition-colors',
                        phaseFilter === 'A' ? 'border-foreground bg-slate-50' : 'hover:bg-slate-50',
                      )}
                    >
                      <div className="text-[10.5px] font-bold uppercase tracking-wider text-muted-foreground">ITR-A</div>
                      <div className="text-[16px] font-semibold mt-0.5">{itrA.length}</div>
                      <div className="h-1 w-full rounded-full bg-slate-100 mt-2 overflow-hidden">
                        <div className="h-full bg-blue-500" style={{ width: `${itrA.length ? ((itrA.length - itrAOut) / itrA.length) * 100 : 0}%` }} />
                      </div>
                      <div className="text-[10.5px] text-muted-foreground mt-1">{itrAOut} outstanding</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPhaseFilter(phaseFilter === 'B' ? null : 'B')}
                      className={cn(
                        'rounded-md border p-3 text-left transition-colors',
                        phaseFilter === 'B' ? 'border-foreground bg-slate-50' : 'hover:bg-slate-50',
                      )}
                    >
                      <div className="text-[10.5px] font-bold uppercase tracking-wider text-muted-foreground">ITR-B</div>
                      <div className="text-[16px] font-semibold mt-0.5">{itrB.length}</div>
                      <div className="h-1 w-full rounded-full bg-slate-100 mt-2 overflow-hidden">
                        <div className="h-full bg-blue-500" style={{ width: `${itrB.length ? ((itrB.length - itrBOut) / itrB.length) * 100 : 0}%` }} />
                      </div>
                      <div className="text-[10.5px] text-muted-foreground mt-1">{itrBOut} outstanding</div>
                    </button>
                  </div>

                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      value={subSearch}
                      onChange={(e) => setSubSearch(e.target.value)}
                      placeholder="Filter by subsystem ID or name"
                      className="pl-8 h-8 text-[12px]"
                    />
                    {subDropdown.length > 0 && (
                      <div className="absolute top-full left-0 right-0 z-10 mt-1 rounded-md border bg-popover shadow-md max-h-52 overflow-y-auto">
                        {subDropdown.map((s) => (
                          <button
                            key={s.id}
                            type="button"
                            className="w-full text-left px-3 py-1.5 text-[12px] hover:bg-blue-50/60"
                            onClick={() => {
                              setSubFilter(s.subsystem_id);
                              setSubSearch('');
                            }}
                          >
                            <span className="font-mono text-muted-foreground">{s.subsystem_id}</span>
                            <span className="ml-2">{s.name}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {(phaseFilter || statusFilter || subFilter) && (
                    <div className="flex flex-wrap gap-1.5">
                      {phaseFilter && <FilterChip label={`ITR-${phaseFilter}`} onRemove={() => setPhaseFilter(null)} />}
                      {statusFilter && <FilterChip label={statusFilter} onRemove={() => setStatusFilter(null)} />}
                      {subFilter && <FilterChip label={subFilter} onRemove={() => setSubFilter(null)} />}
                    </div>
                  )}

                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => setStatusFilter(statusFilter === 'Outstanding' ? null : 'Outstanding')}
                      className={cn(
                        'rounded-full border px-2 py-0.5 text-[11px]',
                        statusFilter === 'Outstanding' ? 'bg-amber-50 border-amber-200 text-amber-700' : 'text-muted-foreground hover:bg-slate-50',
                      )}
                    >Outstanding</button>
                    <button
                      type="button"
                      onClick={() => setStatusFilter(statusFilter === 'Completed' ? null : 'Completed')}
                      className={cn(
                        'rounded-full border px-2 py-0.5 text-[11px]',
                        statusFilter === 'Completed' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'text-muted-foreground hover:bg-slate-50',
                      )}
                    >Completed</button>
                  </div>

                  <div className="rounded-md border divide-y">
                    {filteredItrs.slice(0, 200).map((i) => (
                      <div key={i.id} className="flex items-start gap-3 px-3 py-2">
                        <div className="flex-1 min-w-0">
                          <div className="text-[12.5px] leading-snug truncate">
                            {i.description}
                            {i.tag && <span className="text-muted-foreground"> — {i.tag}</span>}
                          </div>
                          <div className="text-[11px] text-muted-foreground font-mono mt-0.5">{i.ref}</div>
                        </div>
                        <Chip tone={i.status === 'Completed' ? 'emerald' : 'amber'}>{i.status}</Chip>
                      </div>
                    ))}
                    {!filteredItrs.length && (
                      <div className="px-3 py-6 text-center text-muted-foreground text-[12px]">No ITRs match filters</div>
                    )}
                  </div>
                  {filteredItrs.length > 200 && (
                    <div className="text-[11px] text-muted-foreground text-center">Showing first 200 of {filteredItrs.length}</div>
                  )}
                </div>
              )}

              {/* PUNCHLIST */}
              {!isLoading && tab === 'punchlist' && (
                <div className="space-y-4">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      value={punchSearch}
                      onChange={(e) => setPunchSearch(e.target.value)}
                      placeholder="Search punch items"
                      className="pl-8 h-8 text-[12px]"
                    />
                  </div>

                  <div>
                    <div className="text-[10.5px] font-bold tracking-[0.14em] uppercase text-muted-foreground/80 mb-2">
                      Open · {punchFilter(openPunch).length}
                    </div>
                    <div className="rounded-md border divide-y">
                      {punchFilter(openPunch).map((p) => (
                        <div key={p.id} className="flex items-start gap-3 px-3 py-2">
                          <Chip tone={p.category === 'A' ? 'red' : 'amber'}>{p.category}</Chip>
                          <div className="flex-1 min-w-0">
                            <div className="text-[12.5px] leading-snug">{p.description}</div>
                            <div className="text-[11px] text-muted-foreground font-mono mt-0.5">{p.ref} · {p.subsystem_code}</div>
                          </div>
                        </div>
                      ))}
                      {!punchFilter(openPunch).length && (
                        <div className="px-3 py-4 text-center text-muted-foreground text-[12px]">No open items</div>
                      )}
                    </div>
                  </div>

                  <div>
                    <div className="text-[10.5px] font-bold tracking-[0.14em] uppercase text-muted-foreground/80 mb-2">
                      Closed history · {punchFilter(closedPunch).length}
                    </div>
                    <div className="space-y-2">
                      {punchFilter(closedPunch).map((p) => (
                        <div key={p.id} className="rounded-md border bg-muted/20 px-3 py-2 text-[12px] opacity-80">
                          <div className="flex items-start gap-2">
                            <Chip tone="slate">{p.category}</Chip>
                            <div className="flex-1 min-w-0">
                              <div className="leading-snug">{p.description}</div>
                              <div className="text-[10.5px] text-muted-foreground mt-1 space-y-0.5">
                                <div><span className="font-mono">{p.ref}</span>{p.linked_itr_ref && <> · linked ITR <span className="font-mono">{p.linked_itr_ref}</span></>}</div>
                                {p.raised_at && <div>Raised {format(new Date(p.raised_at), 'd MMM yyyy')}</div>}
                                {p.cleared_at && <div>Cleared {format(new Date(p.cleared_at), 'd MMM yyyy')}</div>}
                                {p.closure_note && <div className="italic">{p.closure_note}</div>}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* W&H POINTS */}
              {!isLoading && tab === 'wh' && (
                <div className="space-y-2">
                  {whPointsForSystem.length === 0 && (
                    <div className="text-muted-foreground text-[12px] py-6 text-center">No W&amp;H points linked to this system</div>
                  )}
                  {whPointsForSystem.map((p) => {
                    const pres = WH_STATUS_PRESENTATION[p.status];
                    const isHold = p.inspection_type === 'HOLD';
                    const isReview = p.inspection_type === 'REVIEW';
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => !isReview && setSelectedWH(p)}
                        disabled={isReview}
                        className={cn(
                          'w-full flex items-start gap-3 rounded-md border px-3 py-2 text-left',
                          isReview ? 'opacity-70 cursor-default' : 'hover:bg-blue-50/60',
                        )}
                      >
                        <Chip tone={isHold ? 'amber' : isReview ? 'slate' : 'blue'}>{isHold ? 'H' : isReview ? 'R' : 'W'}</Chip>
                        <div className="flex-1 min-w-0">
                          <div className="text-[12.5px] leading-snug truncate">{p.activity_name}</div>
                          <div className="text-[11px] text-muted-foreground mt-0.5">{typeLabel(p.inspection_type)}{p.delivering_party_role_name ? ` · ${p.delivering_party_role_name}` : ''}</div>
                        </div>
                        <Chip tone={pres.tone as any}>{pres.label}</Chip>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>

      <WitnessHoldDrawer
        point={selectedWH}
        vcrCode={handoverPoint.vcr_code}
        vcrName={handoverPoint.name}
        projectId={projectId}
        open={!!selectedWH}
        onOpenChange={(o) => !o && setSelectedWH(null)}
      />
    </>
  );
};

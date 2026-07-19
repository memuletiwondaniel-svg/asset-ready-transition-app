import React, { useMemo, useState } from 'react';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { X, Search, ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { P2AHandoverPoint } from '../../../hooks/useP2AHandoverPoints';
import {
  useSystemDetail,
  computeSystemMilestone,
  formatItrDisplayCode,
  DISCIPLINE_LABEL,
  ItrDiscipline,
  ITRRow,
  PunchRow,
} from './useSystemDetail';
import { OverviewProgressSection } from './system-drawer/OverviewProgressSection';
import { PunchRowItem, PUNCH_GRID_CLASS } from './system-drawer/PunchRowItem';
import { useWHPoints, WH_STATUS_PRESENTATION, sortByStatusBucket, typeLabel } from './useWHPoints';
import { DeliverableList, DeliverableRow, EmptyDeliverable, ChipTone } from './DeliverableRow';
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

// Toggle chip: exclusive within its group, no X
const ToggleChip: React.FC<{ active: boolean; onClick: () => void; tone: 'amber' | 'emerald' | 'slate'; children: React.ReactNode }> = ({
  active, onClick, tone, children,
}) => {
  const activeCls =
    tone === 'amber' ? 'bg-amber-50 border-amber-200 text-amber-700'
    : tone === 'emerald' ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
    : 'bg-slate-100 border-slate-300 text-foreground';
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-full border px-2.5 py-0.5 text-[11px] transition-colors',
        active ? activeCls : 'text-muted-foreground hover:bg-slate-50',
      )}
    >
      {children}
    </button>
  );
};

// Removable chip (only for injected subsystem filter from deep-link)
const RemovableChip: React.FC<{ label: string; onRemove: () => void }> = ({ label, onRemove }) => (
  <button
    type="button"
    onClick={onRemove}
    className="inline-flex items-center gap-1 rounded-full bg-slate-100 hover:bg-slate-200 text-foreground text-[11px] px-2 py-0.5"
  >
    {label}
    <X className="h-3 w-3" />
  </button>
);

// Section header with chevron
const SectionHeader: React.FC<{ open: boolean; onClick: () => void; label: string; right?: React.ReactNode }> = ({
  open, onClick, label, right,
}) => (
  <button
    type="button"
    onClick={onClick}
    className="w-full flex items-center gap-2 py-1.5 group"
  >
    {open ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
    <span className="text-[10.5px] font-bold tracking-[0.14em] uppercase text-muted-foreground/80">{label}</span>
    <div className="flex-1 h-px bg-border" />
    {right}
  </button>
);

interface Props {
  system: any | null;
  handoverPoint: P2AHandoverPoint;
  projectId: string | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}

type Tab = 'overview' | 'itrs' | 'punchlist' | 'whpoints';

export const SystemDrawer: React.FC<Props> = ({ system, handoverPoint, projectId: _projectId, open, onOpenChange }) => {
  const [tab, setTab] = useState<Tab>('overview');
  const [progressOpen, setProgressOpen] = useState(true);
  const [subsOpen, setSubsOpen] = useState(true);
  const [whSelected, setWhSelected] = useState<any>(null);

  // ITR filters
  const [itrSearch, setItrSearch] = useState('');
  const [itrDiscipline, setItrDiscipline] = useState<ItrDiscipline | ''>('');
  const [itrSubFilter, setItrSubFilter] = useState<string | null>(null); // injected chip
  const [itrSubSearch, setItrSubSearch] = useState('');
  const [itrStatus, setItrStatus] = useState<'Outstanding' | 'Completed' | null>(null);
  const [itrType, setItrType] = useState<'A' | 'B' | null>(null);
  const [itrSortKey, setItrSortKey] = useState<'subsystem' | 'tag' | 'itr' | 'discipline' | 'status'>('subsystem');
  const [itrSortAsc, setItrSortAsc] = useState(true);

  // Punch filters
  const [punchSearch, setPunchSearch] = useState('');
  const [punchSubFilter, setPunchSubFilter] = useState<string | null>(null);
  const [punchSubSearch, setPunchSubSearch] = useState('');
  const [punchStatus, setPunchStatus] = useState<'Outstanding' | 'Completed' | null>(null);
  const [punchCategory, setPunchCategory] = useState<'A' | 'B' | null>(null);

  const { data, isLoading } = useSystemDetail(system?.id);
  const { data: whData } = useWHPoints(handoverPoint?.id);
  const systemWhPoints = useMemo(
    () => (whData?.points ?? []).filter((p) => p.system?.id === system?.id),
    [whData, system?.id],
  );
  const sortedWh = useMemo(() => [...systemWhPoints].sort(sortByStatusBucket), [systemWhPoints]);

  const subs = data?.subsystems || [];
  const itrs = data?.itrs || [];
  const punches = data?.punches || [];

  const milestone = system
    ? computeSystemMilestone(system.completion_status, system.is_hydrocarbon, subs)
    : { label: '—', tone: 'slate' as const };

  // ── Aggregates ─────────────────────────────────────────────────
  const itrA = itrs.filter((i) => i.phase === 'A');
  const itrB = itrs.filter((i) => i.phase === 'B');
  const itrACompletePct = itrA.length ? (itrA.filter((i) => i.status === 'Completed').length / itrA.length) * 100 : 0;
  const itrBCompletePct = itrB.length ? (itrB.filter((i) => i.status === 'Completed').length / itrB.length) * 100 : 0;
  const itrCompleted = itrs.filter((i) => i.status === 'Completed').length;
  const overallPct = itrs.length ? (itrCompleted / itrs.length) * 100 : 0;

  // Per-subsystem aggregates
  const subAgg = useMemo(() => {
    const m = new Map<string, { outstandingItrs: number; openPunch: number }>();
    for (const s of subs) m.set(s.id, { outstandingItrs: 0, openPunch: 0 });
    for (const i of itrs) {
      const row = m.get(i.subsystem_id);
      if (row && i.status === 'Outstanding') row.outstandingItrs++;
    }
    for (const p of punches) {
      const row = m.get(p.subsystem_id);
      if (row && p.status === 'Open') row.openPunch++;
    }
    return m;
  }, [subs, itrs, punches]);

  // Originator from the current system's ref (first segment of any ITR ref); default "6529"
  const originator = useMemo(() => {
    const firstRef = itrs[0]?.ref || '';
    return firstRef.split('-')[0] || '6529';
  }, [itrs]);

  // ── ITR filtering + sort ───────────────────────────────────────
  const filteredItrs = useMemo(() => {
    const q = itrSearch.trim().toLowerCase();
    let rows = itrs.filter((i) => {
      if (itrDiscipline && i.discipline !== itrDiscipline) return false;
      if (itrSubFilter && i.subsystem_code !== itrSubFilter) return false;
      if (itrStatus && i.status !== itrStatus) return false;
      if (itrType && i.phase !== itrType) return false;
      if (q) {
        const short = formatItrDisplayCode(i, originator).toLowerCase();
        const disc = i.discipline ? DISCIPLINE_LABEL[i.discipline].toLowerCase() : '';
        if (
          !i.subsystem_code.toLowerCase().includes(q) &&
          !(i.tag || '').toLowerCase().includes(q) &&
          !short.includes(q) &&
          !i.ref.toLowerCase().includes(q) &&
          !disc.includes(q) &&
          !(i.description || '').toLowerCase().includes(q)
        ) return false;
      }
      return true;
    });
    const dir = itrSortAsc ? 1 : -1;
    rows.sort((a, b) => {
      switch (itrSortKey) {
        case 'tag': return dir * (a.tag || '').localeCompare(b.tag || '');
        case 'itr': return dir * formatItrDisplayCode(a, originator).localeCompare(formatItrDisplayCode(b, originator));
        case 'discipline': return dir * (a.discipline || '').localeCompare(b.discipline || '');
        case 'status': return dir * a.status.localeCompare(b.status);
        default:
          return dir * (a.subsystem_code.localeCompare(b.subsystem_code) || a.ref.localeCompare(b.ref));
      }
    });
    return rows;
  }, [itrs, itrSearch, itrDiscipline, itrSubFilter, itrStatus, itrType, itrSortKey, itrSortAsc, originator]);

  // ── Punch filtering ────────────────────────────────────────────
  const filteredPunches = useMemo(() => {
    const q = punchSearch.trim().toLowerCase();
    return punches.filter((p) => {
      if (punchSubFilter && p.subsystem_code !== punchSubFilter) return false;
      const wantStatus = punchStatus === 'Outstanding' ? 'Open' : punchStatus === 'Completed' ? 'Closed' : null;
      if (wantStatus && p.status !== wantStatus) return false;
      if (punchCategory && p.category !== punchCategory) return false;
      if (q) {
        if (
          !p.subsystem_code.toLowerCase().includes(q) &&
          !p.ref.toLowerCase().includes(q) &&
          !p.category.toLowerCase().includes(q) &&
          !(p.description || '').toLowerCase().includes(q)
        ) return false;
      }
      return true;
    }).sort((a, b) => a.subsystem_code.localeCompare(b.subsystem_code) || a.ref.localeCompare(b.ref));
  }, [punches, punchSearch, punchSubFilter, punchStatus, punchCategory]);

  // ── Subsystem search dropdowns ─────────────────────────────────
  const itrSubDropdown = useMemo(() => {
    const q = itrSubSearch.trim().toLowerCase();
    if (!q) return [];
    return subs.filter((s) => s.subsystem_id.toLowerCase().includes(q) || s.name.toLowerCase().includes(q)).slice(0, 6);
  }, [subs, itrSubSearch]);

  const punchSubDropdown = useMemo(() => {
    const q = punchSubSearch.trim().toLowerCase();
    if (!q) return [];
    return subs.filter((s) => s.subsystem_id.toLowerCase().includes(q) || s.name.toLowerCase().includes(q)).slice(0, 6);
  }, [subs, punchSubSearch]);

  // ── Deep-link handlers ─────────────────────────────────────────
  const deepLinkOutstandingItrs = (subsystemCode: string) => {
    setItrSubFilter(subsystemCode);
    setItrStatus('Outstanding');
    setItrType(null);
    setTab('itrs');
  };
  const deepLinkOpenPunch = (subsystemCode: string) => {
    setPunchSubFilter(subsystemCode);
    setPunchStatus('Outstanding');
    setPunchCategory(null);
    setTab('punchlist');
  };

  if (!system) return null;

  const AccentLink: React.FC<{ children: React.ReactNode; onClick: () => void; disabled?: boolean }> = ({ children, onClick, disabled }) =>
    disabled ? (
      <span className="text-muted-foreground/60 tabular-nums">{children}</span>
    ) : (
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onClick(); }}
        className="text-blue-600 tabular-nums underline decoration-dotted underline-offset-2 hover:text-blue-700"
      >
        {children}
      </button>
    );

  const SortableTh: React.FC<{ label: string; k: typeof itrSortKey; align?: 'left' | 'right' }> = ({ label, k, align = 'left' }) => (
    <th className={cn('px-3 py-1.5', align === 'right' ? 'text-right' : 'text-left')}>
      <button
        type="button"
        onClick={() => {
          if (itrSortKey === k) setItrSortAsc((a) => !a);
          else { setItrSortKey(k); setItrSortAsc(true); }
        }}
        className="inline-flex items-center gap-1 text-inherit hover:text-foreground"
      >
        {label}
        {itrSortKey === k && <span>{itrSortAsc ? '↑' : '↓'}</span>}
      </button>
    </th>
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" hideClose className="!z-modal-critical w-full sm:max-w-3xl p-0 flex flex-col">
        {/* G1 header */}
        <div className="px-5 pt-5 pb-3 border-b shrink-0 bg-background">
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
          <TabBtn active={tab === 'whpoints'} onClick={() => setTab('whpoints')}>W&amp;H Points</TabBtn>
        </div>

        <ScrollArea className="flex-1">
          <div className="px-5 py-4 text-sm">
            {isLoading && <div className="text-muted-foreground">Loading…</div>}

            {/* OVERVIEW */}
            {!isLoading && tab === 'overview' && (
              <div className="space-y-5">
                <div>
                  <SectionHeader open={progressOpen} onClick={() => setProgressOpen((v) => !v)} label="Progress" />
                  {progressOpen && (
                    <div className="pt-2">
                      <OverviewProgressSection
                        overallPct={overallPct}
                        itrACompletePct={itrACompletePct}
                        itrBCompletePct={itrBCompletePct}
                        itrTotal={itrs.length}
                        itrCompleted={itrCompleted}
                      />
                    </div>
                  )}
                </div>

                <div>
                  <SectionHeader
                    open={subsOpen}
                    onClick={() => setSubsOpen((v) => !v)}
                    label="Subsystems"
                    right={<span className="text-[10.5px] text-muted-foreground tabular-nums">{subs.length}</span>}
                  />
                  {subsOpen && (
                    <div className="mt-2 rounded-md border overflow-hidden">
                      <table className="w-full text-[12px] table-fixed">
                        <colgroup>
                          <col style={{ width: '150px' }} />
                          <col style={{ width: '68px' }} />
                          <col style={{ width: '52px' }} />
                          <col style={{ width: '68px' }} />
                          <col />
                        </colgroup>
                        <thead className="bg-muted/40 text-[10px] uppercase tracking-wider text-muted-foreground">
                          <tr>
                            <th className="text-left px-3 py-1">Subsystem</th>
                            <th className="text-right px-2 py-1">Progress</th>
                            <th className="text-center px-2 py-1">ITR</th>
                            <th className="text-center px-2 py-1">Punchlist</th>
                            <th className="text-left px-3 py-1 pl-6">Milestone</th>
                          </tr>
                        </thead>
                        <tbody>
                          {subs.map((s) => {
                            const agg = subAgg.get(s.id) || { outstandingItrs: 0, openPunch: 0 };
                            const milestoneLabel = s.pcc_achieved ? 'PCC' : s.mcc_achieved ? 'MCC' : '';
                            return (
                              <tr key={s.id} className="border-t border-border/50">
                                <td className="px-3 py-1.5 min-w-0">
                                  <div className="truncate leading-tight">{s.name}</div>
                                  <div className="font-mono text-[10.5px] text-muted-foreground truncate leading-tight">{s.subsystem_id}</div>
                                </td>
                                <td className="px-2 py-1.5 text-right tabular-nums">{s.completion_percentage}%</td>
                                <td className="px-2 py-1.5 text-center">
                                  <AccentLink onClick={() => deepLinkOutstandingItrs(s.subsystem_id)} disabled={agg.outstandingItrs === 0}>
                                    {agg.outstandingItrs}
                                  </AccentLink>
                                </td>
                                <td className="px-2 py-1.5 text-center">
                                  <AccentLink onClick={() => deepLinkOpenPunch(s.subsystem_id)} disabled={agg.openPunch === 0}>
                                    {agg.openPunch}
                                  </AccentLink>
                                </td>
                                <td className="px-3 py-1.5 pl-6 text-left text-[11.5px] font-semibold text-emerald-600 tabular-nums">
                                  {milestoneLabel}
                                </td>
                              </tr>
                            );
                          })}
                          {!subs.length && (
                            <tr><td colSpan={5} className="px-3 py-6 text-center text-muted-foreground">No subsystems</td></tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ITRs */}
            {!isLoading && tab === 'itrs' && (
              <div className="space-y-3">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    value={itrSearch}
                    onChange={(e) => setItrSearch(e.target.value)}
                    placeholder="Search subsystem, tag, ITR code, discipline, description…"
                    className="pl-8 h-8 text-[12px]"
                  />
                </div>

                {/* Filters row */}
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={itrDiscipline}
                    onChange={(e) => setItrDiscipline((e.target.value as ItrDiscipline) || '')}
                    className="h-7 text-[11.5px] rounded-md border bg-background px-2"
                  >
                    <option value="">All disciplines</option>
                    {(Object.keys(DISCIPLINE_LABEL) as ItrDiscipline[]).map((d) => (
                      <option key={d} value={d}>{DISCIPLINE_LABEL[d]}</option>
                    ))}
                  </select>

                  {/* Subsystem search */}
                  <div className="relative">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                    <input
                      value={itrSubSearch}
                      onChange={(e) => setItrSubSearch(e.target.value)}
                      placeholder="Subsystem…"
                      className="h-7 text-[11.5px] rounded-md border bg-background pl-6 pr-2 w-40"
                    />
                    {itrSubDropdown.length > 0 && (
                      <div className="absolute top-full left-0 z-10 mt-1 rounded-md border bg-popover shadow-md w-64 max-h-52 overflow-y-auto">
                        {itrSubDropdown.map((s) => (
                          <button
                            key={s.id}
                            type="button"
                            className="w-full text-left px-3 py-1.5 text-[12px] hover:bg-blue-50/60"
                            onClick={() => { setItrSubFilter(s.subsystem_id); setItrSubSearch(''); }}
                          >
                            <span className="font-mono text-muted-foreground">{s.subsystem_id}</span>
                            <span className="ml-2">{s.name}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Status toggle group (exclusive) */}
                  <div className="inline-flex items-center gap-1 rounded-full bg-muted/40 p-0.5">
                    <ToggleChip active={itrStatus === 'Outstanding'} tone="amber" onClick={() => setItrStatus(itrStatus === 'Outstanding' ? null : 'Outstanding')}>Outstanding</ToggleChip>
                    <ToggleChip active={itrStatus === 'Completed'} tone="emerald" onClick={() => setItrStatus(itrStatus === 'Completed' ? null : 'Completed')}>Completed</ToggleChip>
                  </div>

                  {/* Type toggle group (exclusive) */}
                  <div className="inline-flex items-center gap-1 rounded-full bg-muted/40 p-0.5">
                    <ToggleChip active={itrType === 'A'} tone="slate" onClick={() => setItrType(itrType === 'A' ? null : 'A')}>ITR-A</ToggleChip>
                    <ToggleChip active={itrType === 'B'} tone="slate" onClick={() => setItrType(itrType === 'B' ? null : 'B')}>ITR-B</ToggleChip>
                  </div>

                  {/* Injected subsystem chip only — has × */}
                  {itrSubFilter && (
                    <RemovableChip label={itrSubFilter} onRemove={() => setItrSubFilter(null)} />
                  )}
                </div>

                {/* Table */}
                <div className="rounded-md border overflow-hidden">
                  <table className="w-full text-[12px]">
                    <thead className="bg-muted/40 text-[10px] uppercase tracking-wider text-muted-foreground">
                      <tr>
                        <SortableTh label="Subsystem" k="subsystem" />
                        <SortableTh label="Tag" k="tag" />
                        <SortableTh label="ITR" k="itr" />
                        <SortableTh label="Discipline" k="discipline" />
                        <SortableTh label="Status" k="status" align="right" />
                      </tr>
                    </thead>
                    <tbody>
                      {filteredItrs.slice(0, 400).map((i) => (
                        <tr key={i.id} className="border-t border-border/50">
                          <td className="px-3 py-2">
                            <div className="font-mono text-[11px]">{i.subsystem_code}</div>
                          </td>
                          <td className="px-3 py-2 font-mono text-[11px]">{i.tag || '—'}</td>
                          <td className="px-3 py-2">
                            <div className="font-mono text-[12px]" title={i.ref}>
                              {formatItrDisplayCode(i, originator)}
                            </div>
                            <div className="text-[11px] text-muted-foreground truncate max-w-[220px]">{i.description}</div>
                          </td>
                          <td className="px-3 py-2">{i.discipline ? DISCIPLINE_LABEL[i.discipline] : '—'}</td>
                          <td className="px-3 py-2 text-right">
                            {i.status === 'Completed' ? (
                              <Chip tone="emerald">Completed</Chip>
                            ) : (
                              <span className="text-[11.5px] text-muted-foreground">Outstanding</span>
                            )}
                          </td>
                        </tr>
                      ))}
                      {!filteredItrs.length && (
                        <tr><td colSpan={5} className="px-3 py-6 text-center text-muted-foreground text-[12px]">No ITRs match filters</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
                {filteredItrs.length > 400 && (
                  <div className="text-[11px] text-muted-foreground text-center">Showing first 400 of {filteredItrs.length}</div>
                )}
              </div>
            )}

            {/* PUNCHLIST */}
            {!isLoading && tab === 'punchlist' && (
              <div className="space-y-3">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    value={punchSearch}
                    onChange={(e) => setPunchSearch(e.target.value)}
                    placeholder="Search subsystem, punch id, category, description…"
                    className="pl-8 h-8 text-[12px]"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {/* Subsystem search */}
                  <div className="relative">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                    <input
                      value={punchSubSearch}
                      onChange={(e) => setPunchSubSearch(e.target.value)}
                      placeholder="Subsystem…"
                      className="h-7 text-[11.5px] rounded-md border bg-background pl-6 pr-2 w-40"
                    />
                    {punchSubDropdown.length > 0 && (
                      <div className="absolute top-full left-0 z-10 mt-1 rounded-md border bg-popover shadow-md w-64 max-h-52 overflow-y-auto">
                        {punchSubDropdown.map((s) => (
                          <button
                            key={s.id}
                            type="button"
                            className="w-full text-left px-3 py-1.5 text-[12px] hover:bg-blue-50/60"
                            onClick={() => { setPunchSubFilter(s.subsystem_id); setPunchSubSearch(''); }}
                          >
                            <span className="font-mono text-muted-foreground">{s.subsystem_id}</span>
                            <span className="ml-2">{s.name}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="inline-flex items-center gap-1 rounded-full bg-muted/40 p-0.5">
                    <ToggleChip active={punchStatus === 'Outstanding'} tone="amber" onClick={() => setPunchStatus(punchStatus === 'Outstanding' ? null : 'Outstanding')}>Outstanding</ToggleChip>
                    <ToggleChip active={punchStatus === 'Completed'} tone="emerald" onClick={() => setPunchStatus(punchStatus === 'Completed' ? null : 'Completed')}>Completed</ToggleChip>
                  </div>

                  <div className="inline-flex items-center gap-1 rounded-full bg-muted/40 p-0.5">
                    <ToggleChip active={punchCategory === 'A'} tone="slate" onClick={() => setPunchCategory(punchCategory === 'A' ? null : 'A')}>PL-A</ToggleChip>
                    <ToggleChip active={punchCategory === 'B'} tone="slate" onClick={() => setPunchCategory(punchCategory === 'B' ? null : 'B')}>PL-B</ToggleChip>
                  </div>

                  {punchSubFilter && (
                    <RemovableChip label={punchSubFilter} onRemove={() => setPunchSubFilter(null)} />
                  )}
                </div>

                <div className="rounded-md border overflow-hidden">
                  <div className={cn(PUNCH_GRID_CLASS, 'px-3 py-1.5 bg-muted/40 text-[10px] uppercase tracking-wider text-muted-foreground')}>
                    <div>Subsystem</div>
                    <div>Punch ID</div>
                    <div>Description</div>
                    <div className="text-center">Cat</div>
                    <div className="text-right">Status</div>
                    <div />
                  </div>
                  {filteredPunches.map((p) => (
                    <PunchRowItem key={p.id} p={p} />
                  ))}
                  {!filteredPunches.length && (
                    <div className="px-3 py-6 text-center text-muted-foreground text-[12px] border-t">No punch items match filters</div>
                  )}
                </div>
              </div>
            )}

            {/* W&H POINTS */}
            {!isLoading && tab === 'whpoints' && (
              <div className="space-y-3">
                {sortedWh.length === 0 ? (
                  <EmptyDeliverable
                    label="No witness or hold points for this system."
                    hint="Points added on the VCR plan Inspection & Test Plan step will appear here."
                  />
                ) : (
                  <DeliverableList>
                    {sortedWh.map((p) => {
                      const pres = WH_STATUS_PRESENTATION[p.status];
                      const contextParts = [
                        typeLabel(p.inspection_type),
                        p.system ? `${p.system.system_id} · ${p.system.name}` : null,
                      ].filter(Boolean);
                      return (
                        <DeliverableRow
                          key={p.id}
                          name={p.activity_name}
                          context={contextParts.join(' · ')}
                          chipLabel={pres.label}
                          chipTone={pres.tone as ChipTone}
                          onClick={() => setWhSelected(p)}
                        />
                      );
                    })}
                  </DeliverableList>
                )}

                <WitnessHoldDrawer
                  point={whSelected}
                  vcrCode={handoverPoint.vcr_code}
                  vcrName={handoverPoint.name}
                  projectId={whData?.projectId ?? null}
                  open={!!whSelected}
                  onOpenChange={(o) => !o && setWhSelected(null)}
                  onSchedule={() => {}}
                  onComplete={() => {}}
                  onReview={() => {}}
                  onEditParties={() => {}}
                />
              </div>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
};

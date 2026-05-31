import React, { useState, useMemo, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, Check, X, BookOpen, PenLine, Calendar as CalendarIcon, ArrowLeft, ArrowRight, Lightbulb, Trash2 } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format, parseISO } from 'date-fns';
import { WizardActivity, catalogToWizardActivity } from './types';
import { useORAActivityCatalog, useORPPhases } from '@/hooks/useORAActivityCatalog';
import { cn } from '@/lib/utils';

const formatGanttDate = (iso?: string | null) => {
  if (!iso) return '';
  try { return format(parseISO(iso), 'd-MMM-yyyy'); } catch { return iso; }
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Catalog activity IDs already present (legacy) */
  existingIds?: string[];
  /** Activity codes already present in the plan — preferred for dedupe */
  existingCodes?: string[];
  onAdd: (activities: WizardActivity[]) => void;
  /** Called when dialog closes without anything being added */
  onCancelEmpty?: () => void;
  phase?: string;
}

const PHASE_FILTERS = [
  { key: 'ALL', label: 'All', letter: null as string | null, active: 'bg-slate-600 text-white border-slate-600' },
  { key: 'ASSESS', label: 'Assess', letter: 'A', active: 'bg-amber-500 text-white border-amber-500' },
  { key: 'SELECT', label: 'Select', letter: 'S', active: 'bg-purple-500 text-white border-purple-500' },
  { key: 'DEFINE', label: 'Define', letter: 'D', active: 'bg-teal-500 text-white border-teal-500' },
  { key: 'EXECUTE', label: 'Execute', letter: 'E', active: 'bg-emerald-500 text-white border-emerald-500' },
];

const LETTER_COLOR: Record<string, string> = {
  A: 'text-amber-600 bg-amber-50 dark:bg-amber-950/30',
  S: 'text-purple-600 bg-purple-50 dark:bg-purple-950/30',
  D: 'text-teal-600 bg-teal-50 dark:bg-teal-950/30',
  E: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30',
  C: 'text-rose-600 bg-rose-50 dark:bg-rose-950/30',
};

const LETTER_TO_PHASE_LABEL: Record<string, string> = {
  A: 'Assess', S: 'Select', D: 'Define', E: 'Execute', I: 'Identify', O: 'Operate',
};

const PREFIX_TO_LETTER: Record<string, string> = { IDN: 'I', ASS: 'A', SEL: 'S', DEF: 'D', EXE: 'E', OPR: 'O', CUSTOM: 'C' };
function getLetter(code: string): string {
  const prefix = code.split(/[.\-]/)[0].toUpperCase();
  return PREFIX_TO_LETTER[prefix] || prefix.charAt(0);
}
function formatActivityCode(code: string): string {
  const m = code.match(/^([A-Za-z]+)[-.](.+)$/);
  if (!m) return code;
  const letter = PREFIX_TO_LETTER[m[1].toUpperCase()] || m[1];
  return `${letter}.${m[2]}`;
}

type Step = 'select' | 'schedule';
type Tab = 'catalog' | 'custom';

export const AddFromCatalogDialog: React.FC<Props> = ({ open, onOpenChange, existingIds = [], existingCodes = [], onAdd, onCancelEmpty }) => {
  const { activities: catalogActivities } = useORAActivityCatalog();
  const { phases } = useORPPhases();
  const [step, setStep] = useState<Step>('select');
  const [tab, setTab] = useState<Tab>('catalog');
  const [selected, setSelected] = useState<Map<string, WizardActivity>>(new Map());
  const [search, setSearch] = useState('');
  const [phaseFilter, setPhaseFilter] = useState<string>('ALL');
  const addedRef = React.useRef(false);

  // Custom form state
  const [customName, setCustomName] = useState('');
  const [customDesc, setCustomDesc] = useState('');
  const [customDuration, setCustomDuration] = useState<number | ''>('');

  useEffect(() => {
    if (open) {
      setStep('select');
      setTab('catalog');
      setSelected(new Map());
      setSearch('');
      setPhaseFilter('ALL');
      setCustomName('');
      setCustomDesc('');
      setCustomDuration('');
      addedRef.current = false;
    }
  }, [open]);

  const phaseById = useMemo(() => {
    const m = new Map<string, string>();
    phases.forEach(p => m.set(p.id, p.label));
    return m;
  }, [phases]);

  const existingCodeSet = useMemo(() => new Set(existingCodes.map(c => c.toLowerCase())), [existingCodes]);

  const filtered = useMemo(() => {
    const available = catalogActivities.filter(a => {
      if (existingIds.includes(a.id)) return false;
      if (existingCodeSet.has(a.activity_code.toLowerCase())) return false;
      return true;
    });
    const q = search.trim().toLowerCase();
    return available.filter(a => {
      const letter = getLetter(a.activity_code);
      if (phaseFilter !== 'ALL') {
        const wantLetter = PHASE_FILTERS.find(p => p.key === phaseFilter)?.letter;
        if (wantLetter && letter !== wantLetter) return false;
      }
      if (!q) return true;
      const phaseLabel = (a.phase_id && phaseById.get(a.phase_id)) || LETTER_TO_PHASE_LABEL[letter] || '';
      return (
        a.activity.toLowerCase().includes(q) ||
        a.activity_code.toLowerCase().includes(q) ||
        (a.pcap_control_point_number?.toLowerCase().includes(q) ?? false) ||
        phaseLabel.toLowerCase().includes(q)
      );
    });
  }, [catalogActivities, existingIds, existingCodeSet, search, phaseFilter, phaseById]);

  const toggleCatalog = (id: string) => {
    setSelected(prev => {
      const next = new Map(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        const cat = catalogActivities.find(c => c.id === id);
        if (cat) next.set(id, catalogToWizardActivity(cat));
      }
      return next;
    });
  };

  const addCustomToSelection = () => {
    if (!customName.trim()) return;
    const id = `custom-${Date.now()}`;
    // Generate a friendly code prefix
    const existingCustomCount = Array.from(selected.values()).filter(a => a.activityCode.startsWith('CUSTOM-')).length;
    const code = `CUSTOM-${String(existingCustomCount + 1).padStart(2, '0')}`;
    setSelected(prev => {
      const next = new Map(prev);
      next.set(id, {
        id,
        activityCode: code,
        activity: customName.trim(),
        description: customDesc.trim() || null,
        phaseId: null,
        parentActivityId: null,
        durationHigh: null,
        durationMed: typeof customDuration === 'number' ? customDuration : null,
        durationLow: null,
        selected: true,
        durationDays: typeof customDuration === 'number' ? customDuration : null,
        startDate: '',
        endDate: '',
        predecessorIds: [],
      });
      return next;
    });
    setCustomName('');
    setCustomDesc('');
    setCustomDuration('');
    setTab('catalog');
  };

  const removeFromSelection = (id: string) => {
    setSelected(prev => {
      const next = new Map(prev);
      next.delete(id);
      return next;
    });
  };

  const updateScheduleField = (id: string, patch: Partial<WizardActivity>) => {
    setSelected(prev => {
      const next = new Map(prev);
      const cur = next.get(id);
      if (cur) {
        const merged = { ...cur, ...patch };
        // Auto-compute end from start + duration
        if ((patch.startDate !== undefined || patch.durationDays !== undefined) && merged.startDate && merged.durationDays) {
          const d = new Date(merged.startDate);
          d.setDate(d.getDate() + Number(merged.durationDays));
          merged.endDate = d.toISOString().slice(0, 10);
        }
        next.set(id, merged);
      }
      return next;
    });
  };

  const handleNext = () => {
    if (selected.size === 0) return;
    setStep('schedule');
  };

  const handleFinish = (skipSchedule = false) => {
    const list = Array.from(selected.values()).map(a => skipSchedule
      ? { ...a, startDate: '', endDate: '' }
      : a
    );
    addedRef.current = true;
    onAdd(list);
  };

  const handleOpenChange = (val: boolean) => {
    if (!val && !addedRef.current) {
      onCancelEmpty?.();
    }
    onOpenChange(val);
  };

  const selectedList = Array.from(selected.values());

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl flex flex-col gap-0 p-0 sm:h-[680px] sm:max-h-[88vh] overflow-hidden">
        {/* Header with step indicator */}
        <DialogHeader className="px-6 pt-6 pb-3 border-b">
          {step === 'select' ? (
            <div className="flex items-center justify-between gap-4">
              <div>
                <DialogTitle className="text-base">Add Activity</DialogTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Pick from the catalog or define a custom activity
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <StepDot index={1} label="Select" active={step === 'select'} done={false} />
                <div className="h-px w-6 bg-border" />
                <StepDot index={2} label="Schedule" active={false} done={false} />
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <DialogTitle className="text-base">Schedule Activities</DialogTitle>
                <p className="text-xs text-muted-foreground mt-0.5 truncate">
                  Set start date and duration, or skip to add now.
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <StepDot index={1} label="Select" active={false} done={true} />
                <div className="h-px w-6 bg-primary" />
                <StepDot index={2} label="Schedule" active={true} done={false} />
              </div>
            </div>
          )}
        </DialogHeader>


        {/* Body */}
        {step === 'select' ? (
          <div className="flex-1 min-h-0 flex flex-col">
            {/* Tabs */}
            <div className="px-6 pt-4 pb-3">
              <div className="inline-flex p-1 bg-muted/50 rounded-lg">
                <button
                  type="button"
                  onClick={() => setTab('catalog')}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all',
                    tab === 'catalog' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  <BookOpen className="w-3.5 h-3.5" /> From Catalog
                </button>
                <button
                  type="button"
                  onClick={() => setTab('custom')}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all',
                    tab === 'custom' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  <PenLine className="w-3.5 h-3.5" /> Custom
                </button>
              </div>
            </div>

            {/* Tab content */}
            {tab === 'catalog' ? (
              <div className="flex-1 min-h-0 flex flex-col px-6">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search by name, code, PCAP #, or phase..."
                    className="pl-9 h-10 rounded-lg"
                  />
                </div>
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {PHASE_FILTERS.map(p => {
                    const active = phaseFilter === p.key;
                    return (
                      <button
                        key={p.key}
                        type="button"
                        onClick={() => setPhaseFilter(p.key)}
                        className={cn(
                          'px-3 py-1 rounded-full text-xs font-medium border transition-colors',
                          active ? p.active : 'bg-background text-muted-foreground border-border hover:bg-muted'
                        )}
                      >
                        {p.label}
                      </button>
                    );
                  })}
                </div>
                <ScrollArea className="flex-1 min-h-0 mt-3 -mx-1">
                  <div className="space-y-1.5 px-1 pb-2">
                    {filtered.length === 0 && (
                      <div className="text-center text-sm text-muted-foreground py-12">
                        {existingCodeSet.size > 0 ? 'No more catalog activities available — all are already in the plan.' : 'No activities found'}
                      </div>
                    )}
                    {filtered.map(a => {
                      const isSel = selected.has(a.id);
                      const letter = getLetter(a.activity_code);
                      const codeColor = LETTER_COLOR[letter] || 'text-muted-foreground bg-muted';
                      return (
                        <button
                          key={a.id}
                          type="button"
                          onClick={() => toggleCatalog(a.id)}
                          className={cn(
                            'group w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border text-left transition-all',
                            isSel
                              ? 'border-primary bg-primary/5 shadow-sm'
                              : 'border-border bg-background hover:border-primary/40 hover:bg-muted/40'
                          )}
                        >
                          <div className={cn(
                            'flex items-center justify-center w-5 h-5 rounded-md border-2 shrink-0 transition-colors',
                            isSel
                              ? 'bg-primary border-primary text-primary-foreground'
                              : 'border-muted-foreground/30 group-hover:border-primary/60'
                          )}>
                            {isSel && <Check className="w-3.5 h-3.5" strokeWidth={3} />}
                          </div>
                          <span className={cn(
                            'text-[11px] font-mono font-semibold tabular-nums px-2 py-0.5 rounded shrink-0',
                            codeColor
                          )}>
                            {formatActivityCode(a.activity_code)}
                          </span>
                          <span className="text-sm font-medium flex-1 min-w-0">
                            {a.activity}
                            {a.pcap_control_point_number && (
                              <span className="ml-1.5 text-destructive font-semibold">
                                ({a.pcap_control_point_number})
                              </span>
                            )}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </ScrollArea>
              </div>
            ) : (
              <div className="flex-1 min-h-0 overflow-y-auto px-6 pb-3 space-y-3">
                <div>
                  <div className="flex items-center gap-1.5">
                    <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Activity Name *</Label>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button type="button" className="text-muted-foreground hover:text-foreground transition-colors">
                            <Lightbulb className="w-3.5 h-3.5" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="right" className="text-xs max-w-[260px]">
                          Define an activity that isn't in the catalogue — schedule it in the next step.
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <Input
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    placeholder="e.g. Alarm Rationalization Workshop"
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Description</Label>
                  <Textarea
                    value={customDesc}
                    onChange={(e) => setCustomDesc(e.target.value)}
                    placeholder="Briefly describe the scope and objectives..."
                    rows={3}
                    className="mt-1.5 resize-none"
                  />
                </div>
                <div>
                  <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Duration (days)</Label>
                  <Input
                    type="number"
                    min={1}
                    value={customDuration}
                    onChange={(e) => setCustomDuration(e.target.value ? parseInt(e.target.value) : '')}
                    placeholder="Optional"
                    className="mt-1.5 max-w-[160px]"
                  />
                </div>
                <Button
                  type="button"
                  onClick={addCustomToSelection}
                  disabled={!customName.trim()}
                  variant="secondary"
                  className="w-full"
                >
                  <PenLine className="w-3.5 h-3.5 mr-1.5" /> Add to selection
                </Button>
              </div>
            )}

            {/* Selection tray */}
            {selectedList.length > 0 && (
              <div className="border-t bg-muted/20 px-6 py-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Selected ({selectedList.length})
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                  {selectedList.map(a => {
                    const letter = getLetter(a.activityCode);
                    const codeColor = LETTER_COLOR[letter] || 'text-muted-foreground bg-muted';
                    return (
                      <span
                        key={a.id}
                        className="group/chip inline-flex items-center gap-1.5 pl-1 pr-2 py-1 rounded-full bg-background border text-xs hover:border-foreground/30 transition-colors"
                      >
                        <span className={cn('font-mono text-[10px] font-semibold px-1.5 py-0.5 rounded', codeColor)}>
                          {formatActivityCode(a.activityCode)}
                        </span>
                        <span className="max-w-[180px] truncate">{a.activity}</span>
                        <button
                          type="button"
                          onClick={() => removeFromSelection(a.id)}
                          className="opacity-0 group-hover/chip:opacity-100 text-destructive hover:bg-destructive/10 rounded-full p-0.5 transition-all"
                          aria-label="Remove"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 min-h-0 flex flex-col">
            <ScrollArea className="flex-1 min-h-0">
              <div className="px-6 py-4 space-y-1.5">
                {selectedList.map(a => (
                  <div
                    key={a.id}
                    className="group/card relative rounded-xl border bg-card px-3.5 py-2.5 transition-all hover:border-primary/40 hover:shadow-sm hover:bg-accent/20"
                  >
                    {/* Row 1: Code + activity name (full width) */}
                    <div className="flex items-center gap-2.5">
                      <span className={cn(
                        'text-[10px] font-mono font-semibold tabular-nums px-2 py-0.5 rounded shrink-0',
                        LETTER_COLOR[getLetter(a.activityCode)] || 'text-muted-foreground bg-muted'
                      )}>
                        {formatActivityCode(a.activityCode)}
                      </span>
                      <span className="text-sm font-medium flex-1 min-w-0 truncate" title={a.activity}>
                        {a.activity}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeFromSelection(a.id)}
                        className="opacity-0 group-hover/card:opacity-100 text-destructive hover:bg-destructive/10 rounded p-1 transition-all shrink-0"
                        aria-label="Remove"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Row 2: Start date + duration */}
                    <div className="mt-2 flex items-center gap-2 pl-[52px]">
                      <div className="flex items-center gap-1.5">
                        <Label className="text-[10px] uppercase tracking-wide text-muted-foreground/70">Start</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className={cn(
                                'h-7 px-2 text-xs font-normal justify-start gap-1.5 w-[140px]',
                                !a.startDate && 'text-muted-foreground'
                              )}
                            >
                              <CalendarIcon className="w-3 h-3 opacity-60" />
                              {a.startDate ? formatGanttDate(a.startDate) : 'Pick date'}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={a.startDate ? parseISO(a.startDate) : undefined}
                              onSelect={(d) => updateScheduleField(a.id, { startDate: d ? format(d, 'yyyy-MM-dd') : '' })}
                              initialFocus
                              className="p-3 pointer-events-auto"
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Label className="text-[10px] uppercase tracking-wide text-muted-foreground/70">Days</Label>
                        <Input
                          type="number"
                          min={1}
                          value={a.durationDays ?? ''}
                          onChange={(e) => updateScheduleField(a.id, { durationDays: e.target.value ? parseInt(e.target.value) : null })}
                          placeholder="—"
                          className="h-7 w-[72px] text-xs px-2"
                        />
                      </div>
                      {a.startDate && a.durationDays && a.endDate && (
                        <span className="text-[10px] text-muted-foreground ml-auto">
                          Ends <span className="font-medium text-foreground">{formatGanttDate(a.endDate)}</span>
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

            </ScrollArea>
          </div>
        )}

        {/* Footer */}
        <DialogFooter className="border-t px-6 py-3 flex sm:justify-between gap-2">
          {step === 'select' ? (
            <>
              <Button variant="ghost" onClick={() => handleOpenChange(false)}>Cancel</Button>
              <Button onClick={handleNext} disabled={selectedList.length === 0}>
                Next: Schedule
                <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" onClick={() => setStep('select')}>
                <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Back
              </Button>
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={() => handleFinish(true)}>Skip & add</Button>
                <Button onClick={() => handleFinish(false)}>
                  Add {selectedList.length} {selectedList.length === 1 ? 'activity' : 'activities'}
                </Button>
              </div>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const StepDot: React.FC<{ index: number; label: string; active: boolean; done: boolean }> = ({ index, label, active, done }) => (
  <div className="flex items-center gap-1.5">
    <div className={cn(
      'flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-semibold transition-colors',
      done && 'bg-primary text-primary-foreground',
      active && 'bg-primary text-primary-foreground ring-4 ring-primary/15',
      !done && !active && 'bg-muted text-muted-foreground'
    )}>
      {done ? <Check className="w-3 h-3" strokeWidth={3} /> : index}
    </div>
    <span className={cn(
      'text-[11px] font-medium',
      active || done ? 'text-foreground' : 'text-muted-foreground'
    )}>
      {label}
    </span>
  </div>
);

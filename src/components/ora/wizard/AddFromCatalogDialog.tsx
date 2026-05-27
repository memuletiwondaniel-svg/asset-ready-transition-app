import React, { useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, Check } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { WizardActivity, catalogToWizardActivity } from './types';
import { useORAActivityCatalog, useORPPhases } from '@/hooks/useORAActivityCatalog';
import { cn } from '@/lib/utils';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingIds: string[];
  onAdd: (activities: WizardActivity[]) => void;
  phase?: string;
}

const PHASE_FILTERS = [
  { key: 'ALL', label: 'All', letter: null as string | null, active: 'bg-slate-600 text-white border-slate-600', dot: 'bg-slate-400' },
  { key: 'ASSESS', label: 'Assess', letter: 'A', active: 'bg-amber-500 text-white border-amber-500', dot: 'bg-amber-500' },
  { key: 'SELECT', label: 'Select', letter: 'S', active: 'bg-purple-500 text-white border-purple-500', dot: 'bg-purple-500' },
  { key: 'DEFINE', label: 'Define', letter: 'D', active: 'bg-teal-500 text-white border-teal-500', dot: 'bg-teal-500' },
  { key: 'EXECUTE', label: 'Execute', letter: 'E', active: 'bg-emerald-500 text-white border-emerald-500', dot: 'bg-emerald-500' },
];

const LETTER_COLOR: Record<string, string> = {
  A: 'text-amber-600 bg-amber-50 dark:bg-amber-950/30',
  S: 'text-purple-600 bg-purple-50 dark:bg-purple-950/30',
  D: 'text-teal-600 bg-teal-50 dark:bg-teal-950/30',
  E: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30',
};

const LETTER_TO_PHASE_LABEL: Record<string, string> = {
  A: 'Assess', S: 'Select', D: 'Define', E: 'Execute', I: 'Identify', O: 'Operate',
};

export const AddFromCatalogDialog: React.FC<Props> = ({ open, onOpenChange, existingIds, onAdd, phase = '' }) => {
  const { activities: catalogActivities } = useORAActivityCatalog();
  const { phases } = useORPPhases();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [phaseFilter, setPhaseFilter] = useState<string>('ALL');
  const [showCustom, setShowCustom] = useState(false);

  const phaseById = useMemo(() => {
    const m = new Map<string, string>();
    phases.forEach(p => m.set(p.id, p.label));
    return m;
  }, [phases]);

  const filtered = useMemo(() => {
    const available = catalogActivities.filter(a => !existingIds.includes(a.id));
    const q = search.trim().toLowerCase();
    return available.filter(a => {
      const letter = a.activity_code.split(/[.\-]/)[0];
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
  }, [catalogActivities, existingIds, search, phaseFilter, phaseById]);

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleAdd = () => {
    const toAdd = catalogActivities.filter(a => selected.has(a.id)).map(catalogToWizardActivity);
    onAdd(toAdd);
    setSelected(new Set());
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-xl flex flex-col gap-3 sm:h-[640px] sm:max-h-[85vh]">
          <DialogHeader>
            <DialogTitle>Add Activity</DialogTitle>
          </DialogHeader>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, code, PCAP #, or phase..."
              className="pl-9 h-10 rounded-lg"
            />
          </div>

          {/* Phase filter chips */}
          <div className="flex flex-wrap gap-1.5">
            {PHASE_FILTERS.map(p => {
              const active = phaseFilter === p.key;
              return (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => setPhaseFilter(p.key)}
                  className={cn(
                    'px-3 py-1 rounded-full text-xs font-medium border transition-colors',
                    active
                      ? p.active
                      : 'bg-background text-muted-foreground border-border hover:bg-muted'
                  )}
                >
                  {p.label}
                </button>
              );
            })}
          </div>

          <ScrollArea className="flex-1 min-h-0 -mx-1">
            <div className="space-y-1.5 px-1">
              {filtered.length === 0 && (
                <div className="text-center text-sm text-muted-foreground py-8">
                  No activities found
                </div>
              )}
              {filtered.map(a => {
                const isSel = selected.has(a.id);
                const letter = a.activity_code.split(/[.\-]/)[0];
                const codeColor = LETTER_COLOR[letter] || 'text-muted-foreground bg-muted';
                return (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => toggleSelect(a.id)}
                    className={cn(
                      'group w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border text-left transition-all',
                      isSel
                        ? 'border-primary bg-primary/5 shadow-sm'
                        : 'border-border bg-background hover:border-primary/40 hover:bg-muted/40'
                    )}
                  >
                    <div
                      className={cn(
                        'flex items-center justify-center w-5 h-5 rounded-md border-2 shrink-0 transition-colors',
                        isSel
                          ? 'bg-primary border-primary text-primary-foreground'
                          : 'border-muted-foreground/30 group-hover:border-primary/60'
                      )}
                    >
                      {isSel && <Check className="w-3.5 h-3.5" strokeWidth={3} />}
                    </div>
                    <span className={cn(
                      'text-[11px] font-mono font-semibold tabular-nums px-2 py-0.5 rounded shrink-0',
                      codeColor
                    )}>
                      {a.activity_code}
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

          <DialogFooter className="flex sm:justify-end gap-2 pt-1">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={handleAdd} disabled={selected.size === 0}>
              Add {selected.size} {selected.size === 1 ? 'Activity' : 'Activities'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

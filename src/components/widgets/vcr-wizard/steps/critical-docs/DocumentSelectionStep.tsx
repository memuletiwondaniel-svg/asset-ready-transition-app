import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, X, ArrowUp, ArrowDown, Layers } from 'lucide-react';
import { cn } from '@/lib/utils';

export type SystemDocSelections = Record<string, string[]>; // systemId -> docTypeIds

interface DocumentSelectionStepProps {
  vcrId: string;
  selections: SystemDocSelections;
  onSelectionsChange: (selections: SystemDocSelections) => void;
}

interface DocTypeRow {
  id: string;
  code: string;
  document_name: string;
  document_description: string | null;
  tier: string | null;
  rlmu: string | null;
  discipline_code: string | null;
  discipline_name: string | null;
  is_active: boolean;
}

interface SecondaryDiscipline {
  id: string;
  document_type_id: string;
  discipline_code: string;
  discipline_name: string | null;
}

const isVendorDiscipline = (code: string | null): boolean => {
  if (!code) return false;
  return code === 'ZV' || /^[A-Z0-9]{3,}$/.test(code);
};

type FilterKey = 'tier1' | 'tier2' | 'rlmu' | 'process' | 'elect' | 'static' | 'rotating' | 'inst';

interface FilterChip {
  key: FilterKey;
  label: string;
  category: 'tier' | 'discipline';
  activeClass: string;
  dotColor: string;
  match: (d: DocTypeRow, sm?: Map<string, SecondaryDiscipline[]>) => boolean;
}

const FILTER_CHIPS: FilterChip[] = [
  { key: 'tier1', label: 'Tier 1', category: 'tier', activeClass: 'bg-orange-100 text-orange-700 border-orange-300 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-700', dotColor: 'bg-orange-500', match: d => d.tier === 'Tier 1' },
  { key: 'tier2', label: 'Tier 2', category: 'tier', activeClass: 'bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-700', dotColor: 'bg-blue-500', match: d => d.tier === 'Tier 2' },
  { key: 'rlmu', label: 'RLMU', category: 'tier', activeClass: 'bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-700', dotColor: 'bg-amber-600', match: d => d.rlmu === 'RLMU' },
  { key: 'process', label: 'Process', category: 'discipline', activeClass: 'bg-indigo-100 text-indigo-700 border-indigo-300 dark:bg-indigo-900/30 dark:text-indigo-400 dark:border-indigo-700', dotColor: 'bg-indigo-500', match: (d, sm) => d.discipline_code === 'PX' || (sm?.get(d.id)?.some(s => s.discipline_code === 'PX') ?? false) },
  { key: 'elect', label: 'Elect', category: 'discipline', activeClass: 'bg-yellow-100 text-yellow-700 border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-700', dotColor: 'bg-yellow-500', match: (d, sm) => d.discipline_name === 'Electrical' || (sm?.get(d.id)?.some(s => s.discipline_code === 'EA') ?? false) },
  { key: 'inst', label: 'Inst', category: 'discipline', activeClass: 'bg-purple-100 text-purple-700 border-purple-300 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-700', dotColor: 'bg-purple-500', match: (d, sm) => d.discipline_name === 'Instrumentation' || (sm?.get(d.id)?.some(s => s.discipline_code === 'IN') ?? false) },
  { key: 'static', label: 'Static', category: 'discipline', activeClass: 'bg-teal-100 text-teal-700 border-teal-300 dark:bg-teal-900/30 dark:text-teal-400 dark:border-teal-700', dotColor: 'bg-teal-500', match: (d, sm) => d.discipline_name === 'Mechanical - Static' || (sm?.get(d.id)?.some(s => s.discipline_code === 'MS') ?? false) },
  { key: 'rotating', label: 'Rotating', category: 'discipline', activeClass: 'bg-cyan-100 text-cyan-700 border-cyan-300 dark:bg-cyan-900/30 dark:text-cyan-400 dark:border-cyan-700', dotColor: 'bg-cyan-500', match: (d, sm) => d.discipline_name === 'Rotating Equipment' || (sm?.get(d.id)?.some(s => s.discipline_code === 'MR') ?? false) },
];

// Default ON filters
const DEFAULT_FILTERS = new Set<FilterKey>(['tier1', 'tier2', 'process', 'elect', 'inst', 'static', 'rotating']);

const CATEGORY_ORDER = ['tier', 'discipline'] as const;
const CATEGORY_LABELS: Record<string, string> = { tier: 'Tier', discipline: 'Discipline' };

export const DocumentSelectionStep: React.FC<DocumentSelectionStepProps> = ({
  vcrId, selections, onSelectionsChange,
}) => {
  const [activeFilters, setActiveFilters] = useState<Set<FilterKey>>(new Set(DEFAULT_FILTERS));
  const [search, setSearch] = useState('');
  const [activeSystemId, setActiveSystemId] = useState<string>('__all__');
  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  // Fetch systems for this VCR
  const { data: systems = [] } = useQuery({
    queryKey: ['vcr-systems', vcrId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('p2a_handover_point_systems')
        .select('system_id, p2a_systems(id, name, system_id, is_hydrocarbon)')
        .eq('handover_point_id', vcrId);
      if (error) throw error;
      return (data || []).map((r: any) => r.p2a_systems).filter(Boolean);
    },
  });

  // Fetch all document types
  const { data: docTypes = [] } = useQuery({
    queryKey: ['dms-document-types'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('dms_document_types')
        .select('id, code, document_name, document_description, tier, rlmu, discipline_code, discipline_name, is_active')
        .eq('is_active', true)
        .order('display_order');
      if (error) throw error;
      return data as DocTypeRow[];
    },
  });

  const { data: secondaryDisciplines = [] } = useQuery({
    queryKey: ['dms-secondary-disciplines'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('dms_document_type_secondary_disciplines')
        .select('*');
      if (error) throw error;
      return data as SecondaryDiscipline[];
    },
  });

  const secondaryMap = useMemo(() => {
    const map = new Map<string, SecondaryDiscipline[]>();
    secondaryDisciplines.forEach(sd => {
      const existing = map.get(sd.document_type_id) || [];
      existing.push(sd);
      map.set(sd.document_type_id, existing);
    });
    return map;
  }, [secondaryDisciplines]);

  // Filter + sort
  const filtered = useMemo(() => {
    let result = docTypes.filter(d => {
      // Search
      if (search.trim()) {
        const q = search.toLowerCase();
        if (!d.code.toLowerCase().includes(q) && !d.document_name.toLowerCase().includes(q) &&
            !(d.discipline_name || '').toLowerCase().includes(q)) return false;
      }
      // Category filters (OR within, AND between)
      if (activeFilters.size === 0) return true;
      const groupedByCategory = new Map<string, FilterChip[]>();
      activeFilters.forEach(key => {
        const chip = FILTER_CHIPS.find(c => c.key === key);
        if (chip) {
          const existing = groupedByCategory.get(chip.category) || [];
          existing.push(chip);
          groupedByCategory.set(chip.category, existing);
        }
      });
      for (const [, chips] of groupedByCategory) {
        if (!chips.some(chip => chip.match(d, secondaryMap))) return false;
      }
      return true;
    });

    // Sort
    if (sortCol) {
      result = [...result].sort((a, b) => {
        const aVal = (a as any)[sortCol] || '';
        const bVal = (b as any)[sortCol] || '';
        const cmp = String(aVal).localeCompare(String(bVal));
        return sortDir === 'asc' ? cmp : -cmp;
      });
    }
    return result;
  }, [docTypes, search, activeFilters, secondaryMap, sortCol, sortDir]);

  const toggleFilter = (key: FilterKey) => {
    const next = new Set(activeFilters);
    next.has(key) ? next.delete(key) : next.add(key);
    setActiveFilters(next);
  };

  const currentSelections = selections[activeSystemId] || [];
  const isSelected = (docId: string) => currentSelections.includes(docId);

  const toggleDoc = (docId: string) => {
    const current = selections[activeSystemId] || [];
    const next = current.includes(docId)
      ? current.filter(id => id !== docId)
      : [...current, docId];
    onSelectionsChange({ ...selections, [activeSystemId]: next });
  };

  const toggleAll = () => {
    const allIds = filtered.map(d => d.id);
    const allSelected = allIds.every(id => currentSelections.includes(id));
    if (allSelected) {
      onSelectionsChange({ ...selections, [activeSystemId]: currentSelections.filter(id => !allIds.includes(id)) });
    } else {
      const merged = [...new Set([...currentSelections, ...allIds])];
      onSelectionsChange({ ...selections, [activeSystemId]: merged });
    }
  };

  const allVisibleSelected = filtered.length > 0 && filtered.every(d => isSelected(d.id));

  const toggleSort = (col: string) => {
    if (sortCol === col) { if (sortDir === 'asc') setSortDir('desc'); else { setSortCol(null); setSortDir('asc'); } }
    else { setSortCol(col); setSortDir('asc'); }
  };

  const SortIcon = ({ col }: { col: string }) => {
    if (sortCol !== col) return null;
    return sortDir === 'asc' ? <ArrowUp className="h-3 w-3 inline ml-0.5" /> : <ArrowDown className="h-3 w-3 inline ml-0.5" />;
  };

  const systemTabs = [
    { id: '__all__', label: 'All Systems', count: (selections['__all__'] || []).length },
    ...systems.map((s: any) => ({
      id: s.id,
      label: s.name || s.system_id,
      count: (selections[s.id] || []).length,
      isHydrocarbon: s.is_hydrocarbon,
    })),
  ];

  return (
    <div className="flex h-full min-h-0">
      {/* System Sidebar */}
      <div className="w-[140px] shrink-0 border-r bg-muted/20 flex flex-col">
        <div className="px-2 py-2 border-b">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">Systems</p>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-1 space-y-0.5">
            {systemTabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveSystemId(tab.id)}
                className={cn(
                  'w-full text-left px-2 py-1.5 rounded-md text-xs transition-all flex items-center justify-between gap-1',
                  activeSystemId === tab.id
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                )}
              >
                <span className="truncate flex items-center gap-1">
                  {tab.id === '__all__' && <Layers className="w-3 h-3 shrink-0" />}
                  {tab.label}
                </span>
                {tab.count > 0 && (
                  <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4 shrink-0">
                    {tab.count}
                  </Badge>
                )}
              </button>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Filter Bar */}
        <div className="px-4 py-3 border-b space-y-2.5">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by code, name or discipline…"
              className="pl-9 pr-8 h-8 text-xs"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Category-label-above-chips */}
          <div className="flex items-start gap-6">
            {CATEGORY_ORDER.map(cat => {
              const chips = FILTER_CHIPS.filter(c => c.category === cat);
              const hasActive = chips.some(c => activeFilters.has(c.key));
              return (
                <div key={cat} className="space-y-1">
                  <p className={cn(
                    'text-[10px] font-semibold uppercase tracking-wider transition-colors',
                    hasActive ? 'text-foreground/70' : 'text-muted-foreground/40'
                  )}>
                    {CATEGORY_LABELS[cat]}
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {chips.map(chip => {
                      const isOn = activeFilters.has(chip.key);
                      return (
                        <button
                          key={chip.key}
                          onClick={() => toggleFilter(chip.key)}
                          className={cn(
                            'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border transition-all',
                            isOn ? chip.activeClass : 'border-border text-muted-foreground hover:border-muted-foreground/40'
                          )}
                        >
                          <span className={cn('w-1.5 h-1.5 rounded-full', isOn ? chip.dotColor : 'bg-muted-foreground/30')} />
                          {chip.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Document Table */}
        <ScrollArea className="flex-1">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox checked={allVisibleSelected} onCheckedChange={toggleAll} />
                </TableHead>
                <TableHead className="cursor-pointer select-none w-24" onClick={() => toggleSort('code')}>
                  Code <SortIcon col="code" />
                </TableHead>
                <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('document_name')}>
                  Document Name <SortIcon col="document_name" />
                </TableHead>
                <TableHead className="cursor-pointer select-none w-20" onClick={() => toggleSort('tier')}>
                  Tier <SortIcon col="tier" />
                </TableHead>
                <TableHead className="cursor-pointer select-none w-28" onClick={() => toggleSort('discipline_code')}>
                  Discipline <SortIcon col="discipline_code" />
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12 text-sm text-muted-foreground">
                    No documents match your filters. Try adjusting the filter criteria.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map(doc => {
                  const checked = isSelected(doc.id);
                  return (
                    <TableRow
                      key={doc.id}
                      className={cn('cursor-pointer', checked && 'bg-primary/5')}
                      onClick={() => toggleDoc(doc.id)}
                    >
                      <TableCell onClick={e => e.stopPropagation()}>
                        <Checkbox checked={checked} onCheckedChange={() => toggleDoc(doc.id)} />
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">{doc.code}</TableCell>
                      <TableCell className="text-sm">{doc.document_name}</TableCell>
                      <TableCell>
                        {doc.tier && (
                          <Badge variant="outline" className={cn(
                            'text-[10px]',
                            doc.tier === 'Tier 1' ? 'border-orange-300 text-orange-600' : 'border-blue-300 text-blue-600'
                          )}>
                            {doc.tier}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {doc.discipline_code && (
                          <span className="font-mono">{doc.discipline_code}</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </ScrollArea>

        {/* Selection Summary */}
        <div className="px-4 py-2 border-t bg-muted/20 flex items-center justify-between text-xs text-muted-foreground">
          <span>{filtered.length} documents shown</span>
          <span className="font-medium text-foreground">
            {currentSelections.length} selected for {activeSystemId === '__all__' ? 'all systems' : (systems.find((s: any) => s.id === activeSystemId)?.name || 'system')}
          </span>
        </div>
      </div>
    </div>
  );
};

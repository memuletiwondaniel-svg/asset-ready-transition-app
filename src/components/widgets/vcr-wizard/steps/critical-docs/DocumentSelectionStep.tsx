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
  inactiveClass?: string;
  match: (d: DocTypeRow, sm?: Map<string, SecondaryDiscipline[]>) => boolean;
}

const FILTER_CHIPS: FilterChip[] = [
  { key: 'tier1', label: 'Tier 1', category: 'tier', activeClass: 'bg-orange-100 text-orange-700 border-orange-300 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-700', dotColor: '', inactiveClass: 'border-orange-200 text-orange-500 dark:border-orange-800 dark:text-orange-600', match: d => d.tier === 'Tier 1' },
  { key: 'tier2', label: 'Tier 2', category: 'tier', activeClass: 'bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-700', dotColor: '', inactiveClass: 'border-blue-200 text-blue-500 dark:border-blue-800 dark:text-blue-600', match: d => d.tier === 'Tier 2' },
  { key: 'rlmu', label: 'RLMU', category: 'tier', activeClass: 'bg-muted text-foreground border-border', dotColor: '', inactiveClass: 'border-border text-muted-foreground', match: d => d.rlmu === 'RLMU' },
  { key: 'process', label: 'Process', category: 'discipline', activeClass: 'bg-indigo-100 text-indigo-700 border-indigo-300 dark:bg-indigo-900/30 dark:text-indigo-400 dark:border-indigo-700', dotColor: '', inactiveClass: 'border-indigo-200 text-indigo-500 dark:border-indigo-800 dark:text-indigo-600', match: (d, sm) => d.discipline_code === 'PX' || (sm?.get(d.id)?.some(s => s.discipline_code === 'PX') ?? false) },
  { key: 'elect', label: 'Elect', category: 'discipline', activeClass: 'bg-yellow-100 text-yellow-700 border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-700', dotColor: '', inactiveClass: 'border-yellow-200 text-yellow-500 dark:border-yellow-800 dark:text-yellow-600', match: (d, sm) => d.discipline_name === 'Electrical' || (sm?.get(d.id)?.some(s => s.discipline_code === 'EA') ?? false) },
  { key: 'inst', label: 'Inst', category: 'discipline', activeClass: 'bg-purple-100 text-purple-700 border-purple-300 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-700', dotColor: '', inactiveClass: 'border-purple-200 text-purple-500 dark:border-purple-800 dark:text-purple-600', match: (d, sm) => d.discipline_name === 'Instrumentation' || (sm?.get(d.id)?.some(s => s.discipline_code === 'IN') ?? false) },
  { key: 'static', label: 'Static', category: 'discipline', activeClass: 'bg-teal-100 text-teal-700 border-teal-300 dark:bg-teal-900/30 dark:text-teal-400 dark:border-teal-700', dotColor: '', inactiveClass: 'border-teal-200 text-teal-500 dark:border-teal-800 dark:text-teal-600', match: (d, sm) => d.discipline_name === 'Mechanical - Static' || (sm?.get(d.id)?.some(s => s.discipline_code === 'MS') ?? false) },
  { key: 'rotating', label: 'Rotating', category: 'discipline', activeClass: 'bg-cyan-100 text-cyan-700 border-cyan-300 dark:bg-cyan-900/30 dark:text-cyan-400 dark:border-cyan-700', dotColor: '', inactiveClass: 'border-cyan-200 text-cyan-500 dark:border-cyan-800 dark:text-cyan-600', match: (d, sm) => d.discipline_name === 'Rotating Equipment' || (sm?.get(d.id)?.some(s => s.discipline_code === 'MR') ?? false) },
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

  // Fetch systems for this VCR (parent-level only, with child aggregation)
  const { data: systems = [] } = useQuery({
    queryKey: ['vcr-systems', vcrId],
    queryFn: async () => {
      const { data: assignments, error: assignmentsError } = await (supabase as any)
        .from('p2a_handover_point_systems')
        .select('system_id, subsystem_id')
        .eq('handover_point_id', vcrId);
      if (assignmentsError) throw assignmentsError;

      const assignedIds = Array.from(new Set<string>(
        (assignments || [])
          .flatMap((row: any) => [row.system_id, row.subsystem_id])
          .filter((id: string | null | undefined): id is string => Boolean(id))
      ));

      if (!assignedIds.length) return [];

      const [systemsResult, parentLinksResult, childLinksResult] = await Promise.all([
        (supabase as any)
          .from('p2a_systems')
          .select('id, name, system_id, is_hydrocarbon')
          .in('id', assignedIds),
        (supabase as any)
          .from('p2a_subsystems')
          .select('system_id, subsystem_id')
          .in('system_id', assignedIds),
        (supabase as any)
          .from('p2a_subsystems')
          .select('system_id, subsystem_id')
          .in('subsystem_id', assignedIds),
      ]);

      if (systemsResult.error) throw systemsResult.error;
      if (parentLinksResult.error) throw parentLinksResult.error;
      if (childLinksResult.error) throw childLinksResult.error;

      const subsystemLinks = [
        ...(parentLinksResult.data || []),
        ...(childLinksResult.data || []),
      ];

      const parentByChild = new Map<string, string>();
      subsystemLinks.forEach((link: any) => {
        if (link.subsystem_id && link.system_id) {
          parentByChild.set(link.subsystem_id, link.system_id);
        }
      });

      const rootIds = Array.from(new Set(assignedIds.map(id => parentByChild.get(id) || id)));
      const loadedSystems = systemsResult.data || [];
      const loadedIds = new Set(loadedSystems.map((system: any) => system.id));
      const missingRootIds = rootIds.filter(id => !loadedIds.has(id));

      let missingRoots: any[] = [];
      if (missingRootIds.length > 0) {
        const { data: rootsData, error: rootsError } = await (supabase as any)
          .from('p2a_systems')
          .select('id, name, system_id, is_hydrocarbon')
          .in('id', missingRootIds);
        if (rootsError) throw rootsError;
        missingRoots = rootsData || [];
      }

      const systemsById = new Map<string, any>(
        [...loadedSystems, ...missingRoots].map((system: any) => [system.id, system])
      );

      const groupedByRoot = new Map<string, {
        id: string;
        name: string;
        system_id: string;
        is_hydrocarbon: boolean;
        memberIds: Set<string>;
      }>();

      assignedIds.forEach((id) => {
        const rootId = parentByChild.get(id) || id;
        const rootSystem = systemsById.get(rootId) || systemsById.get(id);
        if (!rootSystem) return;

        const existing = groupedByRoot.get(rootSystem.id) || {
          id: rootSystem.id,
          name: rootSystem.name || rootSystem.system_id,
          system_id: rootSystem.system_id,
          is_hydrocarbon: !!rootSystem.is_hydrocarbon,
          memberIds: new Set<string>(),
        };

        existing.memberIds.add(id);
        existing.memberIds.add(rootSystem.id);
        groupedByRoot.set(rootSystem.id, existing);
      });

      // Fallback dedupe by name if hierarchy data is incomplete
      const dedupedByName = new Map<string, {
        id: string;
        name: string;
        system_id: string;
        is_hydrocarbon: boolean;
        memberIds: Set<string>;
      }>();

      groupedByRoot.forEach((system) => {
        const nameKey = (system.name || '').trim().toLowerCase();
        if (!nameKey) return;
        const existing = dedupedByName.get(nameKey);
        if (existing) {
          system.memberIds.forEach((memberId) => existing.memberIds.add(memberId));
          return;
        }
        dedupedByName.set(nameKey, system);
      });

      return Array.from(dedupedByName.values())
        .map(system => ({
          ...system,
          memberIds: Array.from(system.memberIds),
        }))
        .sort((a, b) => a.name.localeCompare(b.name));
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

  // Pre-filter by search only (used for filter chip availability)
  const searchFiltered = useMemo(() => {
    if (!search.trim()) return docTypes;
    const q = search.toLowerCase();
    return docTypes.filter(d =>
      d.code.toLowerCase().includes(q) ||
      d.document_name.toLowerCase().includes(q) ||
      (d.discipline_name || '').toLowerCase().includes(q)
    );
  }, [docTypes, search]);

  // Which filter chips have matching docs in the current search results?
  const availableFilters = useMemo(() => {
    const available = new Set<FilterKey>();
    FILTER_CHIPS.forEach(chip => {
      if (searchFiltered.some(d => chip.match(d, secondaryMap))) {
        available.add(chip.key);
      }
    });
    return available;
  }, [searchFiltered, secondaryMap]);

  // Filter + sort
  const filtered = useMemo(() => {
    let result = searchFiltered.filter(d => {
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
  }, [searchFiltered, activeFilters, secondaryMap, sortCol, sortDir]);

  const toggleFilter = (key: FilterKey) => {
    const next = new Set(activeFilters);
    next.has(key) ? next.delete(key) : next.add(key);
    setActiveFilters(next);
  };

  const activeSystemMemberIds = useMemo(() => {
    if (activeSystemId === '__all__') return ['__all__'];
    const activeSystem = systems.find((system: any) => system.id === activeSystemId);
    const members = activeSystem?.memberIds as string[] | undefined;
    return members && members.length > 0 ? members : [activeSystemId];
  }, [activeSystemId, systems]);

  const currentSelections = useMemo(() => {
    const merged = new Set<string>();
    activeSystemMemberIds.forEach((systemId) => {
      (selections[systemId] || []).forEach((docId) => merged.add(docId));
    });
    return Array.from(merged);
  }, [activeSystemMemberIds, selections]);

  const isSelected = (docId: string) => currentSelections.includes(docId);

  const toggleDoc = (docId: string) => {
    const next = currentSelections.includes(docId)
      ? currentSelections.filter(id => id !== docId)
      : [...currentSelections, docId];

    if (activeSystemId === '__all__') {
      onSelectionsChange({ ...selections, [activeSystemId]: next });
      return;
    }

    const nextSelections: SystemDocSelections = { ...selections, [activeSystemId]: next };
    activeSystemMemberIds.forEach((memberId) => {
      if (memberId !== activeSystemId) delete nextSelections[memberId];
    });

    onSelectionsChange(nextSelections);
  };

  const toggleAll = () => {
    const allIds = filtered.map(d => d.id);
    const allSelected = allIds.every(id => currentSelections.includes(id));
    const next = allSelected
      ? currentSelections.filter(id => !allIds.includes(id))
      : [...new Set([...currentSelections, ...allIds])];

    if (activeSystemId === '__all__') {
      onSelectionsChange({ ...selections, [activeSystemId]: next });
      return;
    }

    const nextSelections: SystemDocSelections = { ...selections, [activeSystemId]: next };
    activeSystemMemberIds.forEach((memberId) => {
      if (memberId !== activeSystemId) delete nextSelections[memberId];
    });

    onSelectionsChange(nextSelections);
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

  const getSelectionCount = (memberIds: string[]) => {
    const merged = new Set<string>();
    memberIds.forEach((memberId) => {
      (selections[memberId] || []).forEach((docId) => merged.add(docId));
    });
    return merged.size;
  };

  const systemTabs = [
    { id: '__all__', label: 'All Systems', count: (selections['__all__'] || []).length, memberIds: ['__all__'] },
    ...systems.map((system: any) => {
      const memberIds = (system.memberIds as string[] | undefined)?.length
        ? system.memberIds
        : [system.id];

      return {
        id: system.id,
        label: system.name || system.system_id,
        count: getSelectionCount(memberIds),
        memberIds,
        isHydrocarbon: system.is_hydrocarbon,
      };
    }),
  ];

  return (
    <div className="flex h-[420px] min-h-0">
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
        <div className="px-3 py-2 border-b space-y-1.5">
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

          {/* Compact filter chips — two rows */}
          <div className="flex flex-col gap-1.5">
            {CATEGORY_ORDER.map(cat => {
              const chips = FILTER_CHIPS.filter(c => c.category === cat);
              const hasActive = chips.some(c => activeFilters.has(c.key));
              return (
                <div key={cat} className="flex items-center gap-2">
                  <span className={cn(
                    'text-[10px] font-semibold uppercase tracking-wider shrink-0 w-[52px]',
                    hasActive ? 'text-foreground/70' : 'text-muted-foreground/40'
                  )}>
                    {CATEGORY_LABELS[cat]}
                  </span>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {chips.map(chip => {
                      const isOn = activeFilters.has(chip.key);
                      const hasResults = availableFilters.has(chip.key);
                      return (
                        <button
                          key={chip.key}
                          onClick={() => toggleFilter(chip.key)}
                          className={cn(
                            'inline-flex items-center justify-center h-6 px-2.5 rounded-[12px] text-[11px] font-medium border transition-all',
                            !hasResults && 'opacity-30 cursor-default',
                            isOn && hasResults ? chip.activeClass : (chip.inactiveClass || 'border-border text-muted-foreground hover:border-muted-foreground/40')
                          )}
                        >
                          {chip.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
          {/* Divider before table */}
          <div className="h-px bg-border -mx-3 mt-1" />
        </div>

        {/* Document Table */}
        <ScrollArea className="flex-1">
          <Table className="table-fixed w-full">
            <TableHeader>
              <TableRow className="h-9">
                <TableHead className="w-8 px-2 py-1.5">
                  <Checkbox checked={allVisibleSelected} onCheckedChange={toggleAll} />
                </TableHead>
                <TableHead className="w-[60px] px-2 py-1.5 text-[11px] uppercase tracking-wider text-muted-foreground cursor-pointer select-none" onClick={() => toggleSort('code')}>
                  Code <SortIcon col="code" />
                </TableHead>
                <TableHead className="px-2 py-1.5 text-[11px] uppercase tracking-wider text-muted-foreground cursor-pointer select-none" onClick={() => toggleSort('document_name')}>
                  Document Name <SortIcon col="document_name" />
                </TableHead>
                <TableHead className="w-[60px] px-2 py-1.5 text-[11px] uppercase tracking-wider text-muted-foreground cursor-pointer select-none" onClick={() => toggleSort('tier')}>
                  Tier <SortIcon col="tier" />
                </TableHead>
                <TableHead className="w-[80px] px-2 py-1.5 text-[11px] uppercase tracking-wider text-muted-foreground cursor-pointer select-none" onClick={() => toggleSort('discipline_code')}>
                  DISC <SortIcon col="discipline_code" />
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12 text-xs text-muted-foreground">
                    No documents match your filters. Try adjusting the filter criteria.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map(doc => {
                  const checked = isSelected(doc.id);
                  return (
                    <TableRow
                      key={doc.id}
                      className={cn('cursor-pointer h-10', checked && 'bg-primary/5')}
                      onClick={() => toggleDoc(doc.id)}
                    >
                      <TableCell className="px-2 py-1.5" onClick={e => e.stopPropagation()}>
                        <Checkbox checked={checked} onCheckedChange={() => toggleDoc(doc.id)} />
                      </TableCell>
                      <TableCell className="px-2 py-1.5 font-mono text-[11px] text-muted-foreground">{doc.code}</TableCell>
                      <TableCell className="px-2 py-1.5 text-xs whitespace-nowrap overflow-hidden text-ellipsis max-w-0" title={doc.document_name}>
                        {doc.document_name}
                      </TableCell>
                      <TableCell className="px-2 py-1.5">
                        {doc.tier && (
                          <span className={cn(
                            'inline-flex items-center justify-center w-[28px] h-[18px] rounded-[4px] text-[11px] font-medium',
                            doc.tier === 'Tier 1'
                              ? 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400'
                              : 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
                          )}>
                            {doc.tier === 'Tier 1' ? 'T1' : 'T2'}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="px-2 py-1.5 text-[11px] text-muted-foreground">
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

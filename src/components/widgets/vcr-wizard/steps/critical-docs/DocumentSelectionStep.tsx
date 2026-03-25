import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Search, X, ChevronDown, ChevronRight, FileText, Package } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export type SystemDocSelections = Record<string, string[]>;

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
  document_scope: string | null;
  is_mdr: boolean | null;
  is_vendor_document: boolean | null;
  package_tag: string | null;
  is_active: boolean;
}

interface PackageRow {
  id: string;
  package_name: string;
  package_tag: string;
  po_number: string | null;
  vendor_name: string | null;
}

type TierFilter = 'tier1' | 'tier2' | 'rlmu';
type DisciplineTab = 'all' | 'process' | 'electrical' | 'instrument' | 'static' | 'rotating' | 'civil' | 'documentation';

const DISCIPLINE_MAP: Record<DisciplineTab, { label: string; codes: string[]; names: string[] }> = {
  all: { label: 'All', codes: [], names: [] },
  process: { label: 'Process', codes: ['PX'], names: ['Process'] },
  electrical: { label: 'Electrical', codes: ['EA', 'EX'], names: ['Electrical'] },
  instrument: { label: 'Instrument', codes: ['IN'], names: ['Instrumentation'] },
  static: { label: 'Static', codes: ['MS'], names: ['Mechanical - Static'] },
  rotating: { label: 'Rotating', codes: ['MR'], names: ['Rotating Equipment'] },
  civil: { label: 'Civil', codes: ['CV', 'CS'], names: ['Civil', 'Structural'] },
  documentation: { label: 'Documentation', codes: ['DC', 'GN'], names: ['Documentation', 'General'] },
};

const DISCIPLINE_TABS: DisciplineTab[] = ['all', 'process', 'electrical', 'instrument', 'static', 'rotating', 'civil', 'documentation'];

const isScopeDoc = (doc: DocTypeRow): boolean => {
  const name = (doc.document_name || '').toLowerCase();
  return name.includes('basis of design') || name.includes('bdep') || name.includes('feed') || doc.code?.toUpperCase().includes('BOD');
};

export const DocumentSelectionStep: React.FC<DocumentSelectionStepProps> = ({
  vcrId, selections, onSelectionsChange,
}) => {
  const [search, setSearch] = useState('');
  const [tierFilters, setTierFilters] = useState<Set<TierFilter>>(new Set());
  const [activeDiscipline, setActiveDiscipline] = useState<DisciplineTab>('all');
  const [projectWideOpen, setProjectWideOpen] = useState(true);
  const [mainTab, setMainTab] = useState<'discipline' | 'package'>('discipline');
  const [packageSearch, setPackageSearch] = useState('');

  // Current flat selection set (stored under '__all__' key for compat)
  const selectedIds = useMemo(() => new Set(selections['__all__'] || []), [selections]);

  const toggleDoc = (docId: string) => {
    const current = selections['__all__'] || [];
    const next = current.includes(docId)
      ? current.filter(id => id !== docId)
      : [...current, docId];
    onSelectionsChange({ '__all__': next });
  };

  const isSelected = (docId: string) => selectedIds.has(docId);

  // Fetch document types with new columns
  const { data: allDocTypes = [] } = useQuery({
    queryKey: ['dms-document-types-full'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('dms_document_types')
        .select('id, code, document_name, document_description, tier, rlmu, discipline_code, discipline_name, document_scope, is_mdr, is_vendor_document, package_tag, is_active')
        .eq('is_active', true)
        .order('display_order');
      if (error) throw error;
      return (data || []) as DocTypeRow[];
    },
  });

  // Fetch packages
  const { data: packages = [] } = useQuery({
    queryKey: ['document-packages'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('document_packages')
        .select('id, package_name, package_tag, po_number, vendor_name');
      if (error) throw error;
      return (data || []) as PackageRow[];
    },
  });

  // Split into project-wide vs discipline/package docs
  const projectWideDocs = useMemo(() =>
    allDocTypes.filter(d => d.document_scope === 'project'),
    [allDocTypes]
  );

  const nonProjectDocs = useMemo(() =>
    allDocTypes.filter(d => d.document_scope !== 'project'),
    [allDocTypes]
  );

  // Apply tier filters
  const applyTierFilter = (docs: DocTypeRow[]) => {
    if (tierFilters.size === 0) return docs;
    return docs.filter(d => {
      if (tierFilters.has('tier1') && d.tier === 'Tier 1') return true;
      if (tierFilters.has('tier2') && d.tier === 'Tier 2') return true;
      if (tierFilters.has('rlmu') && d.rlmu === 'RLMU') return true;
      return false;
    });
  };

  const applySearch = (docs: DocTypeRow[], query: string) => {
    if (!query.trim()) return docs;
    const q = query.toLowerCase();
    return docs.filter(d =>
      d.code.toLowerCase().includes(q) ||
      d.document_name.toLowerCase().includes(q) ||
      (d.discipline_name || '').toLowerCase().includes(q) ||
      (d.discipline_code || '').toLowerCase().includes(q)
    );
  };

  // Filtered project-wide docs
  const filteredProjectDocs = useMemo(() =>
    applySearch(applyTierFilter(projectWideDocs), search),
    [projectWideDocs, tierFilters, search]
  );

  // Filtered discipline docs
  const filteredDisciplineDocs = useMemo(() => {
    let docs = applyTierFilter(nonProjectDocs);
    docs = applySearch(docs, search);

    if (activeDiscipline !== 'all') {
      const config = DISCIPLINE_MAP[activeDiscipline];
      docs = docs.filter(d =>
        config.codes.includes(d.discipline_code || '') ||
        config.names.includes(d.discipline_name || '')
      );
    }
    return docs;
  }, [nonProjectDocs, tierFilters, search, activeDiscipline]);

  // Discipline counts
  const disciplineCounts = useMemo(() => {
    const baseFiltered = applySearch(applyTierFilter(nonProjectDocs), search);
    const counts: Record<DisciplineTab, number> = {} as any;
    DISCIPLINE_TABS.forEach(tab => {
      if (tab === 'all') {
        counts[tab] = baseFiltered.length;
      } else {
        const config = DISCIPLINE_MAP[tab];
        counts[tab] = baseFiltered.filter(d =>
          config.codes.includes(d.discipline_code || '') ||
          config.names.includes(d.discipline_name || '')
        ).length;
      }
    });
    return counts;
  }, [nonProjectDocs, tierFilters, search]);

  // Package docs
  const packageDocsMap = useMemo(() => {
    const map = new Map<string, DocTypeRow[]>();
    packages.forEach((pkg: PackageRow) => {
      const docs = nonProjectDocs.filter(d => d.package_tag === pkg.package_tag);
      map.set(pkg.package_tag, docs);
    });
    return map;
  }, [packages, nonProjectDocs]);

  const filteredPackages = useMemo(() => {
    let pkgs = packages;
    if (packageSearch.trim()) {
      const q = packageSearch.toLowerCase();
      pkgs = pkgs.filter((p: PackageRow) =>
        p.package_name.toLowerCase().includes(q) ||
        (p.po_number || '').toLowerCase().includes(q) ||
        (p.vendor_name || '').toLowerCase().includes(q) ||
        p.package_tag.toLowerCase().includes(q)
      );
    }
    return pkgs;
  }, [packages, packageSearch]);

  // Tier filter availability
  const tierAvailability = useMemo(() => {
    const searchedDocs = applySearch(allDocTypes, search);
    return {
      tier1: searchedDocs.some(d => d.tier === 'Tier 1'),
      tier2: searchedDocs.some(d => d.tier === 'Tier 2'),
      rlmu: searchedDocs.some(d => d.rlmu === 'RLMU'),
    };
  }, [allDocTypes, search]);

  const toggleTierFilter = (key: TierFilter) => {
    const next = new Set(tierFilters);
    next.has(key) ? next.delete(key) : next.add(key);
    setTierFilters(next);
  };

  // Selection stats
  const selectionStats = useMemo(() => {
    const selected = selections['__all__'] || [];
    const disciplines = new Set<string>();
    const pkgs = new Set<string>();
    selected.forEach(id => {
      const doc = allDocTypes.find(d => d.id === id);
      if (doc?.discipline_code) disciplines.add(doc.discipline_code);
      if (doc?.package_tag) pkgs.add(doc.package_tag);
    });
    return { count: selected.length, disciplines: disciplines.size, packages: pkgs.size };
  }, [selections, allDocTypes]);

  const toggleAllInList = (docs: DocTypeRow[]) => {
    const allIds = docs.map(d => d.id);
    const allSelected = allIds.every(id => selectedIds.has(id));
    const current = selections['__all__'] || [];
    let next: string[];
    if (allSelected) {
      next = current.filter(id => !allIds.includes(id));
    } else {
      next = [...new Set([...current, ...allIds])];
    }
    onSelectionsChange({ '__all__': next });
  };

  return (
    <div className="flex flex-col h-[420px] min-h-0">
      {/* Tier filter pills + search */}
      <div className="px-4 pt-3 pb-2 space-y-2 border-b">
        <div className="flex items-center gap-2">
          {/* Tier pills */}
          <div className="flex items-center gap-1.5">
            {([
              { key: 'tier1' as TierFilter, label: 'Tier 1', activeClass: 'bg-orange-100 text-orange-700 border-orange-300 dark:bg-orange-900/30 dark:text-orange-400', inactiveClass: 'border-orange-200 text-orange-500 dark:border-orange-800' },
              { key: 'tier2' as TierFilter, label: 'Tier 2', activeClass: 'bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900/30 dark:text-blue-400', inactiveClass: 'border-blue-200 text-blue-500 dark:border-blue-800' },
              { key: 'rlmu' as TierFilter, label: 'RLMU', activeClass: 'bg-muted text-foreground border-border', inactiveClass: 'border-border text-muted-foreground' },
            ]).map(pill => {
              const isActive = tierFilters.has(pill.key);
              const hasResults = tierAvailability[pill.key];
              return (
                <button
                  key={pill.key}
                  onClick={() => hasResults && toggleTierFilter(pill.key)}
                  className={cn(
                    'inline-flex items-center h-6 px-2.5 rounded-full text-[11px] font-medium border transition-all',
                    !hasResults && 'opacity-30 cursor-default',
                    isActive && hasResults ? pill.activeClass : pill.inactiveClass,
                    hasResults && !isActive && 'hover:opacity-80 cursor-pointer'
                  )}
                >
                  {pill.label}
                </button>
              );
            })}
          </div>
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search documents…"
              className="pl-8 pr-7 h-7 text-xs"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      </div>

      <ScrollArea className="flex-1 min-h-0">
        <div className="px-4 py-3 space-y-3">
          {/* Project-Wide Documents Section */}
          <Collapsible open={projectWideOpen} onOpenChange={setProjectWideOpen}>
            <CollapsibleTrigger className="flex items-center gap-2 w-full py-1.5 group">
              {projectWideOpen
                ? <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                : <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
              }
              <FileText className="w-3.5 h-3.5 text-amber-500" />
              <span className="text-xs font-semibold text-foreground">Project-Wide Documents</span>
              <Badge variant="secondary" className="text-[10px] px-1.5 h-4">{filteredProjectDocs.length}</Badge>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <p className="text-[10px] text-muted-foreground mb-2 ml-7">
                Required for all systems in this VCR
              </p>
              {filteredProjectDocs.length === 0 ? (
                <p className="text-[10px] text-muted-foreground ml-7 py-2">No project-wide documents match filters.</p>
              ) : (
                <div className="space-y-0">
                  {/* Select all for project-wide */}
                  <div className="flex items-center gap-2 px-2 py-1 ml-5 mb-0.5">
                    <Checkbox
                      checked={filteredProjectDocs.length > 0 && filteredProjectDocs.every(d => isSelected(d.id))}
                      onCheckedChange={() => toggleAllInList(filteredProjectDocs)}
                      className="h-3.5 w-3.5"
                    />
                    <span className="text-[10px] text-muted-foreground font-medium">Select all</span>
                  </div>
                  {filteredProjectDocs.map(doc => (
                    <DocRow
                      key={doc.id}
                      doc={doc}
                      checked={isSelected(doc.id)}
                      onToggle={() => toggleDoc(doc.id)}
                      showBadges
                    />
                  ))}
                </div>
              )}
            </CollapsibleContent>
          </Collapsible>

          <div className="h-px bg-border" />

          {/* Main Tabs: By Discipline / By Package */}
          <Tabs value={mainTab} onValueChange={v => setMainTab(v as any)}>
            <TabsList className="h-8 w-auto">
              <TabsTrigger value="discipline" className="text-xs px-3 h-7 gap-1.5">
                By Discipline
              </TabsTrigger>
              <TabsTrigger value="package" className="text-xs px-3 h-7 gap-1.5">
                <Package className="w-3 h-3" />
                By Package
              </TabsTrigger>
            </TabsList>

            <TabsContent value="discipline" className="mt-2 space-y-2">
              {/* Discipline selector row */}
              <div className="flex items-center gap-1 flex-wrap">
                {DISCIPLINE_TABS.map(tab => {
                  const count = disciplineCounts[tab] || 0;
                  const isActive = activeDiscipline === tab;
                  return (
                    <button
                      key={tab}
                      onClick={() => setActiveDiscipline(tab)}
                      className={cn(
                        'inline-flex items-center gap-1 h-7 px-2.5 rounded-md text-[11px] font-medium border transition-all',
                        isActive
                          ? 'bg-primary/10 text-primary border-primary/30'
                          : 'border-border text-muted-foreground hover:text-foreground hover:border-muted-foreground/40',
                        count === 0 && !isActive && 'opacity-40'
                      )}
                    >
                      {DISCIPLINE_MAP[tab].label}
                      <Badge variant="secondary" className="text-[9px] px-1 h-3.5 min-w-[16px] justify-center">
                        {count}
                      </Badge>
                    </button>
                  );
                })}
              </div>

              {/* Discipline document list */}
              {filteredDisciplineDocs.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-6">No documents match your filters.</p>
              ) : (
                <div className="space-y-0">
                  <div className="flex items-center gap-2 px-2 py-1 mb-0.5">
                    <Checkbox
                      checked={filteredDisciplineDocs.length > 0 && filteredDisciplineDocs.every(d => isSelected(d.id))}
                      onCheckedChange={() => toggleAllInList(filteredDisciplineDocs)}
                      className="h-3.5 w-3.5"
                    />
                    <span className="text-[10px] text-muted-foreground font-medium">Select all ({filteredDisciplineDocs.length})</span>
                  </div>
                  {filteredDisciplineDocs.map(doc => (
                    <DocRow
                      key={doc.id}
                      doc={doc}
                      checked={isSelected(doc.id)}
                      onToggle={() => toggleDoc(doc.id)}
                    />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="package" className="mt-2 space-y-2">
              {/* Package search */}
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input
                  value={packageSearch}
                  onChange={e => setPackageSearch(e.target.value)}
                  placeholder="Search packages…"
                  className="pl-8 pr-7 h-7 text-xs"
                />
                {packageSearch && (
                  <button onClick={() => setPackageSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              {filteredPackages.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-6">
                  {packages.length === 0 ? 'No packages configured for this project.' : 'No packages match your search.'}
                </p>
              ) : (
                <Accordion type="multiple" className="space-y-1">
                  {filteredPackages.map((pkg: PackageRow) => {
                    const pkgDocs = applySearch(applyTierFilter(packageDocsMap.get(pkg.package_tag) || []), search);
                    const selectedCount = pkgDocs.filter(d => isSelected(d.id)).length;
                    return (
                      <AccordionItem key={pkg.id} value={pkg.id} className="border rounded-lg">
                        <AccordionTrigger className="px-3 py-2 hover:no-underline">
                          <div className="flex items-center gap-2 flex-1 min-w-0 text-left">
                            <Package className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                            <span className="text-xs font-medium truncate">{pkg.package_name}</span>
                            {pkg.po_number && (
                              <span className="text-[10px] text-muted-foreground font-mono shrink-0">PO: {pkg.po_number}</span>
                            )}
                            {pkg.vendor_name && (
                              <span className="text-[10px] text-muted-foreground shrink-0">— {pkg.vendor_name}</span>
                            )}
                            <Badge variant="secondary" className="text-[9px] px-1 h-4 shrink-0">
                              {pkgDocs.length}
                            </Badge>
                            {selectedCount > 0 && (
                              <Badge className="text-[9px] px-1 h-4 shrink-0 bg-primary/10 text-primary border-0">
                                {selectedCount} ✓
                              </Badge>
                            )}
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="px-1 pb-2">
                          {pkgDocs.length === 0 ? (
                            <p className="text-[10px] text-muted-foreground text-center py-3">No documents in this package.</p>
                          ) : (
                            <div className="space-y-0">
                              {pkgDocs.map(doc => (
                                <DocRow
                                  key={doc.id}
                                  doc={doc}
                                  checked={isSelected(doc.id)}
                                  onToggle={() => toggleDoc(doc.id)}
                                  showVendor
                                />
                              ))}
                            </div>
                          )}
                        </AccordionContent>
                      </AccordionItem>
                    );
                  })}
                </Accordion>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </ScrollArea>

      {/* Bottom status bar */}
      <div className="px-4 py-2 border-t bg-muted/20 flex items-center justify-between text-xs text-muted-foreground">
        <span>
          {selectionStats.count > 0
            ? `${selectionStats.count} document${selectionStats.count !== 1 ? 's' : ''} selected across ${selectionStats.disciplines} discipline${selectionStats.disciplines !== 1 ? 's' : ''} / ${selectionStats.packages} package${selectionStats.packages !== 1 ? 's' : ''}`
            : 'No documents selected'
          }
        </span>
      </div>
    </div>
  );
};

// ─── Document Row Component ───────────────────────────────────────────────────

const DocRow: React.FC<{
  doc: DocTypeRow;
  checked: boolean;
  onToggle: () => void;
  showBadges?: boolean;
  showVendor?: boolean;
}> = ({ doc, checked, onToggle, showBadges, showVendor }) => {
  const isMdr = doc.is_mdr;
  const isScope = isScopeDoc(doc);
  const isVendor = doc.is_vendor_document;

  return (
    <TooltipProvider delayDuration={300}>
      <div
        onClick={onToggle}
        className={cn(
          'flex items-center gap-2 px-2 py-[7px] rounded cursor-pointer transition-colors group',
          'hover:bg-muted/50',
          checked && 'bg-primary/5'
        )}
        style={{ height: 36 }}
      >
        <Checkbox
          checked={checked}
          onCheckedChange={onToggle}
          className="h-3.5 w-3.5 shrink-0"
          onClick={e => e.stopPropagation()}
        />
        <span className="font-mono text-[11px] text-muted-foreground shrink-0 w-[56px]">{doc.code}</span>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="text-xs truncate flex-1 min-w-0">{doc.document_name}</span>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs">
            <p className="text-xs">{doc.document_name}</p>
            {doc.document_description && <p className="text-[10px] text-muted-foreground mt-0.5">{doc.document_description}</p>}
          </TooltipContent>
        </Tooltip>
        {/* Tier pill */}
        {doc.tier && (
          <span className={cn(
            'inline-flex items-center justify-center w-[28px] h-[18px] rounded-[4px] text-[11px] font-medium shrink-0',
            doc.tier === 'Tier 1'
              ? 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400'
              : 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
          )}>
            {doc.tier === 'Tier 1' ? 'T1' : 'T2'}
          </span>
        )}
        {/* Special badges */}
        {(showBadges || isMdr) && isMdr && (
          <Badge variant="outline" className="text-[9px] h-4 px-1 border-amber-300 text-amber-600 bg-amber-50 dark:bg-amber-900/20 shrink-0">
            MDR
          </Badge>
        )}
        {(showBadges || isScope) && isScope && (
          <Badge variant="outline" className="text-[9px] h-4 px-1 border-blue-300 text-blue-600 bg-blue-50 dark:bg-blue-900/20 shrink-0">
            Scope
          </Badge>
        )}
        {showVendor && isVendor && (
          <Badge variant="outline" className="text-[9px] h-4 px-1 border-border text-muted-foreground shrink-0">
            Vendor
          </Badge>
        )}
        {/* Discipline code */}
        {doc.discipline_code && (
          <span className="text-[10px] text-muted-foreground font-mono shrink-0 w-[24px] text-right">{doc.discipline_code}</span>
        )}
      </div>
    </TooltipProvider>
  );
};

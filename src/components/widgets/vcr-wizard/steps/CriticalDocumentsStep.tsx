import React, { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Popover, PopoverContent, PopoverTrigger,
} from '@/components/ui/popover';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Search, X, Loader2, ChevronDown, FileStack, Plus, Check,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { CheckAssaiModal } from './critical-docs/CheckAssaiModal';
import assaiIcon from '@/assets/assai-icon.png';

interface CriticalDocumentsStepProps {
  vcrId: string;
  projectCode?: string;
  plantCode?: string;
  handoverPlanId?: string;
}

type TierFilter = 'all' | 'Tier 1' | 'Tier 2' | 'RLMU';

interface DocType {
  id: string;
  code: string;
  document_name: string;
  tier: string | null;
  rlmu: string | null;
  discipline_code: string | null;
  discipline_name: string | null;
  document_scope: string | null;
  package_tag: string | null;
  is_mdr: boolean | null;
}

interface RequirementRow {
  id: string;
  document_type_id: string | null;
  assigned_document_number: string | null;
  status: string | null;
}

export const CriticalDocumentsStep: React.FC<CriticalDocumentsStepProps> = ({
  vcrId, projectCode, plantCode, handoverPlanId,
}) => {
  const queryClient = useQueryClient();
  const [tier, setTier] = useState<TierFilter>('all');
  const [disciplines, setDisciplines] = useState<string[]>([]);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [assaiOpen, setAssaiOpen] = useState(false);
  const [confirmRemoveBound, setConfirmRemoveBound] = useState<{ typeId: string; reqId: string } | null>(null);
  const [confirmClearAll, setConfirmClearAll] = useState(false);
  const [browseCatalog, setBrowseCatalog] = useState(false);
  // Whether the Available section (filters + 986-row list) is expanded. When the
  // user returns to step 5 with selections, default to collapsed so the page
  // reads as "what did I pick?" first.
  const [availableOpen, setAvailableOpen] = useState(false);
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set());
  const [justSaved, setJustSaved] = useState(false);
  const savedTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => {
    const id = setTimeout(() => setSearch(searchInput), 200);
    return () => clearTimeout(id);
  }, [searchInput]);

  const { data: planContext } = useQuery({
    queryKey: ['vcr-handover-plan-context', vcrId],
    queryFn: async () => {
      const { data: hp } = await (supabase as any)
        .from('p2a_handover_points')
        .select('handover_plan_id')
        .eq('id', vcrId)
        .maybeSingle();
      if (!hp?.handover_plan_id) return null;
      const { data: plan } = await (supabase as any)
        .from('p2a_handover_plans')
        .select('id, project_code, plant_code')
        .eq('id', hp.handover_plan_id)
        .maybeSingle();
      return plan;
    },
    enabled: !handoverPlanId || !projectCode,
  });

  const effectiveProjectCode = projectCode || planContext?.project_code || null;
  const effectivePlantCode = plantCode || planContext?.plant_code || null;

  const { data: docTypes = [], isLoading: typesLoading } = useQuery<DocType[]>({
    queryKey: ['dms-document-types-catalog'],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const all: DocType[] = [];
      let from = 0;
      const pageSize = 1000;
      while (true) {
        const { data, error } = await (supabase as any)
          .from('dms_document_types')
          .select('id, code, document_name, tier, rlmu, discipline_code, discipline_name, document_scope, package_tag, is_mdr')
          .eq('is_active', true)
          .order('display_order', { ascending: true })
          .range(from, from + pageSize - 1);
        if (error) throw error;
        all.push(...(data || []));
        if (!data || data.length < pageSize) break;
        from += pageSize;
      }
      return all;
    },
  });

  const { data: requirements = [], isLoading: requirementsLoading } = useQuery<RequirementRow[]>({
    queryKey: ['vcr-doc-requirements', vcrId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('vcr_document_requirements')
        .select('id, document_type_id, assigned_document_number, status')
        .eq('vcr_id', vcrId);
      if (error) throw error;
      return data || [];
    },
  });

  const savedTypeIds = useMemo(() => {
    const m = new Map<string, RequirementRow>();
    requirements.forEach((r) => { if (r.document_type_id) m.set(r.document_type_id, r); });
    return m;
  }, [requirements]);

  const isSelected = (typeId: string): boolean => savedTypeIds.has(typeId);

  const persistToggle = async (typeId: string) => {
    if (savingIds.has(typeId)) return;
    setSavingIds((s) => new Set(s).add(typeId));
    try {
      const existing = savedTypeIds.get(typeId);
      if (existing) {
        const { error } = await (supabase as any)
          .from('vcr_document_requirements').delete().eq('id', existing.id);
        if (error) throw error;
        const { error: cErr } = await (supabase as any)
          .from('p2a_vcr_critical_docs')
          .delete()
          .eq('handover_point_id', vcrId)
          .eq('dms_document_type_id', typeId);
        if (cErr) console.warn('shadow p2a_vcr_critical_docs delete warning:', cErr.message);
      } else {
        const doc = docTypes.find((d) => d.id === typeId);
        if (!doc) return;
        const { data: { user } } = await supabase.auth.getUser();
        const userId = user?.id;
        const { error } = await (supabase as any)
          .from('vcr_document_requirements')
          .insert({
            vcr_id: vcrId,
            document_type_id: doc.id,
            document_scope: doc.document_scope || 'discipline',
            package_tag: doc.package_tag || null,
            discipline_code: doc.discipline_code || null,
            is_mdr: doc.is_mdr || false,
            status: 'required',
            identified_by: userId || null,
            identified_at: new Date().toISOString(),
          });
        if (error) throw error;

        const { error: cErr } = await (supabase as any)
          .from('p2a_vcr_critical_docs').insert({
            handover_point_id: vcrId,
            dms_document_type_id: doc.id,
            status: 'not_started',
            rlmu_status: 'not_required',
          });
        if (cErr) console.warn('shadow p2a_vcr_critical_docs insert warning:', cErr.message);
      }
      await queryClient.invalidateQueries({ queryKey: ['vcr-doc-requirements', vcrId] });
      queryClient.invalidateQueries({ queryKey: ['vcr-critical-docs', vcrId] });
      queryClient.invalidateQueries({ queryKey: ['vcr-wizard-step-counts', vcrId] });
      setJustSaved(true);
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
      savedTimerRef.current = setTimeout(() => setJustSaved(false), 1500);
    } catch (e: any) {
      toast.error(e?.message || 'Failed to save selection');
    } finally {
      setSavingIds((s) => { const n = new Set(s); n.delete(typeId); return n; });
    }
  };

  const toggleType = (typeId: string) => {
    const req = savedTypeIds.get(typeId);
    if (req?.status === 'bound' && req.assigned_document_number) {
      setConfirmRemoveBound({ typeId, reqId: req.id });
      return;
    }
    persistToggle(typeId);
  };

  const disciplineOptions = useMemo(() => {
    const m = new Map<string, string>();
    docTypes.forEach((d) => {
      if (d.discipline_code) m.set(d.discipline_code, d.discipline_name || d.discipline_code);
    });
    return Array.from(m.entries()).map(([code, name]) => ({ code, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [docTypes]);

  const disciplineNameByCode = useMemo(() => {
    const m = new Map<string, string>();
    disciplineOptions.forEach((d) => m.set(d.code, d.name));
    return m;
  }, [disciplineOptions]);

  // Selected list — unfiltered (the user's picks never disappear because of a filter).
  const selectedItems = useMemo(
    () => docTypes.filter((d) => savedTypeIds.has(d.id)),
    [docTypes, savedTypeIds],
  );

  // Available items — exclude selected, then apply tier+discipline+search.
  const availableItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    return docTypes.filter((d) => {
      if (savedTypeIds.has(d.id)) return false;
      if (tier === 'Tier 1' && d.tier !== 'Tier 1') return false;
      if (tier === 'Tier 2' && d.tier !== 'Tier 2') return false;
      if (tier === 'RLMU' && d.rlmu !== 'RLMU') return false;
      if (disciplines.length > 0 && !disciplines.includes(d.discipline_code || '')) return false;
      if (q && !d.document_name.toLowerCase().includes(q) && !d.code.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [docTypes, savedTypeIds, tier, disciplines, search]);

  // Tier counts — over available pool (selected excluded) with discipline+search applied,
  // so each tab shows how many would match if the user switched to it.
  const tierCounts = useMemo(() => {
    const q = search.trim().toLowerCase();
    const base = docTypes.filter((d) => {
      if (savedTypeIds.has(d.id)) return false;
      if (disciplines.length > 0 && !disciplines.includes(d.discipline_code || '')) return false;
      if (q && !d.document_name.toLowerCase().includes(q) && !d.code.toLowerCase().includes(q)) return false;
      return true;
    });
    return {
      all: base.length,
      t1: base.filter((d) => d.tier === 'Tier 1').length,
      t2: base.filter((d) => d.tier === 'Tier 2').length,
      rlmu: base.filter((d) => d.rlmu === 'RLMU').length,
    };
  }, [docTypes, savedTypeIds, disciplines, search]);

  const typeCount = requirements.filter((r) => r.document_type_id && !r.assigned_document_number).length;
  const boundCount = requirements.filter((r) => r.assigned_document_number).length;
  const totalCount = requirements.length;

  React.useEffect(() => {
    if (requirements.length > 0) {
      setBrowseCatalog(true);
    }
  }, [requirements.length]);

  // Default availableOpen: collapsed when selections exist, expanded when none.
  // Only initializes once per mount of catalog view.
  const initRef = React.useRef(false);
  React.useEffect(() => {
    if (initRef.current) return;
    if (typesLoading || requirementsLoading) return;
    initRef.current = true;
    setAvailableOpen(selectedItems.length === 0);
  }, [typesLoading, requirementsLoading, selectedItems.length]);

  const showCatalog = browseCatalog || totalCount > 0 || typesLoading || requirementsLoading;

  const handleConfirmRemoveBound = async () => {
    if (!confirmRemoveBound) return;
    try {
      const { error } = await (supabase as any)
        .from('vcr_document_requirements')
        .delete().eq('id', confirmRemoveBound.reqId);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['vcr-doc-requirements', vcrId] });
      queryClient.invalidateQueries({ queryKey: ['vcr-wizard-step-counts', vcrId] });
      toast.success('Binding removed');
    } catch (e: any) {
      toast.error(e?.message || 'Failed to remove');
    } finally {
      setConfirmRemoveBound(null);
    }
  };

  const clearAllMutation = useMutation({
    mutationFn: async () => {
      const { error } = await (supabase as any)
        .from('vcr_document_requirements')
        .delete()
        .eq('vcr_id', vcrId);
      if (error) throw error;
      const { error: cErr } = await (supabase as any)
        .from('p2a_vcr_critical_docs')
        .delete()
        .eq('handover_point_id', vcrId);
      if (cErr) console.warn('shadow p2a_vcr_critical_docs clear warning:', cErr.message);
    },
    onSuccess: () => {
      setTier('all');
      setDisciplines([]);
      setSearchInput('');
      setSearch('');
      setBrowseCatalog(false);
      setAvailableOpen(true);
      initRef.current = false;
      queryClient.setQueryData(['vcr-doc-requirements', vcrId], []);
      queryClient.invalidateQueries({ queryKey: ['vcr-doc-requirements', vcrId] });
      queryClient.invalidateQueries({ queryKey: ['vcr-critical-docs', vcrId] });
      queryClient.invalidateQueries({ queryKey: ['vcr-wizard-step-counts', vcrId] });
      toast.success('All critical documents cleared');
      setConfirmClearAll(false);
    },
    onError: (e: any) => {
      toast.error(e?.message || 'Failed to clear');
    },
  });

  const clearSearch = () => { setSearchInput(''); setSearch(''); };
  const hasActiveFilters = tier !== 'all' || disciplines.length > 0 || search.length > 0;

  return (
    <TooltipProvider>
      <div className="flex flex-col h-full min-h-0 space-y-3">
        {showCatalog ? (
          <>
            {/* Header */}
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <h2 className="text-base font-semibold">Critical Documents</h2>
              <div className="flex items-center gap-2">
                {totalCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 text-muted-foreground hover:text-destructive"
                    onClick={() => setConfirmClearAll(true)}
                  >
                    Clear all
                  </Button>
                )}
                {browseCatalog && totalCount === 0 && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                        onClick={() => setBrowseCatalog(false)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">Back to empty state</TooltipContent>
                  </Tooltip>
                )}
                <Button variant="outline" size="sm" onClick={() => setAssaiOpen(true)} className="gap-1.5">
                  <img src={assaiIcon} alt="" className="w-4 h-4 object-contain" /> Check Assai
                </Button>
              </div>
            </div>

            {/* Scroll surface */}
            <div className="border border-border/60 rounded-md flex-1 min-h-0 overflow-y-auto relative">
              {typesLoading || requirementsLoading ? (
                <div className="flex items-center justify-center py-12 text-muted-foreground gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" /> <span className="text-sm">Loading catalog…</span>
                </div>
              ) : (
                <div>
                  {/* Selected group — always visible regardless of filters */}
                  {selectedItems.length > 0 && (
                    <>
                      <div className="sticky top-0 z-[5] flex items-center justify-between bg-muted/60 backdrop-blur px-3 py-1.5 border-b border-border/40">
                        <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                          Selected ({selectedItems.length})
                        </span>
                        {justSaved && (
                          <span className="text-[11px] text-muted-foreground inline-flex items-center gap-1 animate-in fade-in">
                            <Check className="w-3 h-3" /> Saved
                          </span>
                        )}
                      </div>
                      <SelectedList
                        items={selectedItems}
                        savedTypeIds={savedTypeIds}
                        savingIds={savingIds}
                        onRemove={toggleType}
                      />
                    </>
                  )}

                  {/* Add documents toggle / Available section */}
                  {!availableOpen ? (
                    <div className="px-3 py-3 border-t border-border/40 bg-background">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setAvailableOpen(true)}
                        className="gap-1.5"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Add documents
                      </Button>
                    </div>
                  ) : (
                    <>
                      {/* Sticky filter row — top of Available section */}
                      <div className={cn(
                        "sticky z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-b border-border/60 px-3 py-2",
                        selectedItems.length > 0 ? "top-0 border-t" : "top-0",
                      )}>
                        <div className="flex items-center gap-2 flex-wrap">
                          <Tabs value={tier} onValueChange={(v) => setTier(v as TierFilter)}>
                            <TabsList className="h-8">
                              <TierTab value="all" label="All" count={tierCounts.all} />
                              <TierTab value="Tier 1" label="Tier 1" count={tierCounts.t1} />
                              <TierTab value="Tier 2" label="Tier 2" count={tierCounts.t2} />
                              <TierTab value="RLMU" label="RLMU" count={tierCounts.rlmu} />
                            </TabsList>
                          </Tabs>

                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                size="sm"
                                variant={disciplines.length > 0 ? 'secondary' : 'outline'}
                                className="h-8 text-xs gap-1.5"
                              >
                                Discipline
                                {disciplines.length > 0 && (
                                  <Badge variant="outline" className="text-[10px] h-4 px-1.5 bg-background">
                                    {disciplines.length}
                                  </Badge>
                                )}
                                <ChevronDown className="w-3 h-3" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-72 p-2 max-h-80 overflow-auto" align="start">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-xs font-medium">Discipline</span>
                                {disciplines.length > 0 && (
                                  <button onClick={() => setDisciplines([])} className="text-[11px] text-muted-foreground hover:text-foreground">Clear</button>
                                )}
                              </div>
                              <div className="space-y-1">
                                {disciplineOptions.map((d) => (
                                  <label key={d.code} className="flex items-center gap-2 px-1.5 py-1 rounded hover:bg-muted cursor-pointer">
                                    <Checkbox
                                      checked={disciplines.includes(d.code)}
                                      onCheckedChange={() => setDisciplines((arr) => arr.includes(d.code) ? arr.filter((c) => c !== d.code) : [...arr, d.code])}
                                    />
                                    <span className="text-xs">{d.name}</span>
                                  </label>
                                ))}
                              </div>
                            </PopoverContent>
                          </Popover>

                          <div className="relative ml-auto w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                            <Input
                              value={searchInput}
                              onChange={(e) => setSearchInput(e.target.value)}
                              placeholder="Search by code or name…"
                              className="pl-9 pr-8 h-8 text-xs"
                            />
                            {searchInput && (
                              <button onClick={clearSearch} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                                <X className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>

                          {disciplines.length > 0 && (
                            <>
                              {disciplines.map((code) => (
                                <button
                                  key={code}
                                  onClick={() => setDisciplines((arr) => arr.filter((c) => c !== code))}
                                  className="inline-flex items-center gap-1 h-7 pl-2.5 pr-1 rounded-full bg-secondary text-secondary-foreground text-[11px] hover:bg-secondary/80 transition-colors"
                                >
                                  {disciplineNameByCode.get(code) || code}
                                  <span className="inline-flex items-center justify-center w-5 h-5 rounded-full hover:bg-secondary-foreground/10 transition-colors">
                                    <X className="w-3 h-3 opacity-70" />
                                  </span>
                                </button>
                              ))}
                              <button
                                onClick={() => setDisciplines([])}
                                className="text-[11px] text-muted-foreground hover:text-foreground underline-offset-2 hover:underline"
                              >
                                Clear
                              </button>
                            </>
                          )}
                        </div>

                        {disciplines.length > 0 && (
                          <>
                            {disciplines.map((code) => (
                              <button
                                key={code}
                                onClick={() => setDisciplines((arr) => arr.filter((c) => c !== code))}
                                className="inline-flex items-center gap-1 h-7 pl-2.5 pr-1 rounded-full bg-secondary text-secondary-foreground text-[11px] hover:bg-secondary/80 transition-colors"
                              >
                                {disciplineNameByCode.get(code) || code}
                                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full hover:bg-secondary-foreground/10 transition-colors">
                                  <X className="w-3 h-3 opacity-70" />
                                </span>
                              </button>
                            ))}
                            <button
                              onClick={() => setDisciplines([])}
                              className="text-[11px] text-muted-foreground hover:text-foreground underline-offset-2 hover:underline"
                            >
                              Clear
                            </button>
                          </>
                        )}
                      </div>

                      {/* Available list / empty states */}
                      {availableItems.length === 0 ? (
                        search ? (
                          <div className="py-10 text-center text-sm text-muted-foreground space-y-3">
                            <div>No documents match "<span className="font-medium text-foreground">{search}</span>"</div>
                            <Button variant="outline" size="sm" onClick={clearSearch} className="gap-1.5">
                              <X className="w-3.5 h-3.5" /> Clear search
                            </Button>
                          </div>
                        ) : hasActiveFilters ? (
                          <div className="py-10 text-center text-sm text-muted-foreground space-y-3">
                            <div>No documents match these filters.</div>
                            <Button variant="outline" size="sm" onClick={() => { setTier('all'); setDisciplines([]); clearSearch(); }}>
                              Reset filters
                            </Button>
                          </div>
                        ) : (
                          <div className="py-10 text-center text-sm text-muted-foreground">
                            All available documents are already selected.
                          </div>
                        )
                      ) : (
                        <>
                          <GroupHeader label={`Available (${availableItems.length})`} sticky={false} />
                          <DocTypeList
                            items={availableItems}
                            isSelected={isSelected}
                            onToggle={toggleType}
                            savedTypeIds={savedTypeIds}
                            savingIds={savingIds}
                          />
                        </>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>

          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center py-16 text-center">
            <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
              <FileStack className="h-7 w-7 text-primary" />
            </div>
            <h2 className="text-lg font-semibold">No critical documents yet</h2>
            <p className="mt-2 max-w-[460px] text-sm leading-relaxed text-muted-foreground">
              Select the Tier 1 and Tier 2 document types required for this VCR.
            </p>
            <div className="mt-6 flex items-center gap-3">
              <Button size="lg" className="gap-2 shadow-sm" onClick={() => { setBrowseCatalog(true); setAvailableOpen(true); }}>
                <Plus className="h-4 w-4" /> Click to start
              </Button>
              <Button variant="outline" size="lg" onClick={() => setAssaiOpen(true)} className="gap-2">
                <img src={assaiIcon} alt="" className="h-4 w-4 object-contain" /> Check Assai
              </Button>
            </div>
          </div>
        )}

        <CheckAssaiModal
          open={assaiOpen}
          onOpenChange={setAssaiOpen}
          vcrId={vcrId}
          projectCode={effectiveProjectCode}
          plantCode={effectivePlantCode}
        />

        <AlertDialog open={!!confirmRemoveBound} onOpenChange={(o) => !o && setConfirmRemoveBound(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remove bound document?</AlertDialogTitle>
              <AlertDialogDescription>
                This type has a specific document bound to it. Unchecking will remove the binding. Continue?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleConfirmRemoveBound} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Remove
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={confirmClearAll} onOpenChange={setConfirmClearAll}>
          <AlertDialogContent className="" overlayClassName="bg-black/80 backdrop-blur-sm">
            <AlertDialogHeader>
              <AlertDialogTitle>Clear all critical documents?</AlertDialogTitle>
              <AlertDialogDescription>
                This will remove all {totalCount} document type{totalCount === 1 ? '' : 's'} (including any bound specific documents) from this VCR. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={clearAllMutation.isPending}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={(e) => { e.preventDefault(); clearAllMutation.mutate(); }}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                disabled={clearAllMutation.isPending}
              >
                {clearAllMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Clear all'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </TooltipProvider>
  );
};

// ─── Tier tab with count chip ────────────────────────────────────────────────

const TierTab: React.FC<{ value: string; label: string; count: number }> = ({ value, label, count }) => (
  <TabsTrigger
    value={value}
    className="text-xs px-3 h-7 gap-1.5 data-[state=active]:bg-foreground data-[state=active]:text-background"
  >
    {label}
    <span className="text-[10px] opacity-70 tabular-nums">· {count}</span>
  </TabsTrigger>
);

// ─── Group sub-heading ───────────────────────────────────────────────────────

const GroupHeader: React.FC<{ label: string; sticky?: boolean }> = ({ label, sticky }) => (
  <div
    className={cn(
      "bg-muted/60 backdrop-blur px-3 py-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground border-b border-border/40",
      sticky && "sticky top-0 z-[5]",
    )}
  >
    {label}
  </div>
);

// ─── Selected row (no checkbox, hover ×) ─────────────────────────────────────

const SelectedList: React.FC<{
  items: DocType[];
  savedTypeIds: Map<string, RequirementRow>;
  savingIds: Set<string>;
  onRemove: (id: string) => void;
}> = ({ items, savedTypeIds, savingIds, onRemove }) => {
  // Grid: code | name | tier | discipline | bound | remove-×
  const gridCols =
    'grid grid-cols-[76px_minmax(0,1fr)_56px_140px_72px_28px] gap-x-3 items-center';
  return (
    <ul className="divide-y divide-border/40">
      {items.map((d) => {
        const saved = savedTypeIds.get(d.id);
        const bound = saved?.status === 'bound' && !!saved.assigned_document_number;
        const saving = savingIds.has(d.id);
        return (
          <li
            key={d.id}
            className={cn(
              gridCols,
              'group/sel px-3 py-2 bg-muted/30 hover:bg-muted/50 transition-colors text-sm relative',
              saving && 'opacity-60 pointer-events-none',
            )}
          >
            <span className="font-mono text-[11px] text-muted-foreground truncate">{d.code}</span>
            <span className="truncate text-xs text-foreground">{d.document_name}</span>
            <div className="flex justify-center">
              <TierBadge tier={d.tier} />
            </div>
            <div className="min-w-0">
              <DisciplineTag name={d.discipline_name} />
            </div>
            <div className="flex justify-end">
              {bound && (
                <Badge variant="outline" className="text-[10px] border-emerald-500/40 text-emerald-700 dark:text-emerald-400">Bound</Badge>
              )}
            </div>
            <div className="flex justify-end">
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    aria-label={`Remove ${d.code}`}
                    disabled={saving}
                    onClick={(e) => { e.stopPropagation(); onRemove(d.id); }}
                    className={cn(
                      "h-6 w-6 inline-flex items-center justify-center rounded-md text-muted-foreground transition-opacity",
                      "opacity-30 sm:opacity-0 group-hover/sel:opacity-100 focus-visible:opacity-100",
                      "hover:bg-destructive/10 hover:text-destructive",
                    )}
                  >
                    {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5" />}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="left">Remove</TooltipContent>
              </Tooltip>
            </div>
          </li>
        );
      })}
    </ul>
  );
};

// ─── Available list row (with outline checkbox) ──────────────────────────────

const DocTypeList: React.FC<{
  items: DocType[];
  isSelected: (id: string) => boolean;
  onToggle: (id: string) => void;
  savedTypeIds: Map<string, RequirementRow>;
  savingIds: Set<string>;
}> = ({ items, isSelected, onToggle, savedTypeIds, savingIds }) => {
  const gridCols =
    'grid grid-cols-[28px_76px_minmax(0,1fr)_56px_140px_72px] gap-x-3 items-center';
  return (
    <ul className="divide-y divide-border/40">
      {items.map((d) => {
        const sel = isSelected(d.id);
        const saved = savedTypeIds.get(d.id);
        const bound = saved?.status === 'bound' && !!saved.assigned_document_number;
        const saving = savingIds.has(d.id);
        return (
          <li
            key={d.id}
            onClick={() => !saving && onToggle(d.id)}
            className={cn(
              gridCols,
              'px-3 py-2 cursor-pointer hover:bg-muted/40 transition-colors text-sm',
              saving && 'opacity-60 pointer-events-none',
            )}
          >
            <Checkbox checked={sel} onCheckedChange={() => onToggle(d.id)} onClick={(e) => e.stopPropagation()} disabled={saving} />
            <span className="font-mono text-[11px] text-muted-foreground truncate">{d.code}</span>
            <span className="truncate text-xs">{d.document_name}</span>
            <div className="flex justify-center">
              <TierBadge tier={d.tier} />
            </div>
            <div className="min-w-0">
              <DisciplineTag name={d.discipline_name} />
            </div>
            <div className="flex justify-end">
              {bound && (
                <Badge variant="outline" className="text-[10px] border-emerald-500/40 text-emerald-700 dark:text-emerald-400">Bound</Badge>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
};

// ─── Tier badge (outline ring, compact) — visually distinct from discipline tag ──

const TierBadge: React.FC<{ tier: string | null }> = ({ tier }) => {
  if (!tier) return null;
  const short = tier === 'Tier 1' ? 'T1' : tier === 'Tier 2' ? 'T2' : tier;
  return (
    <span className="inline-flex items-center justify-center min-w-[28px] h-5 px-1.5 rounded border border-border text-[10px] font-semibold tabular-nums text-muted-foreground">
      {short}
    </span>
  );
};

// ─── Discipline tag (ghost text, no fill) — distinct from tier badge ─────────

const DisciplineTag: React.FC<{ name: string | null }> = ({ name }) => {
  if (!name) return null;
  return (
    <span className="inline-block max-w-full truncate text-[11px] text-muted-foreground">
      {name}
    </span>
  );
};

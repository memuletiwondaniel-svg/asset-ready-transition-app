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
  Search, X, Loader2, ChevronDown, Trash2, FileStack, Plus,
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
  // Per-row in-flight markers (typeId) — to disable repeated toggles while a save is pending.
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set());

  // Debounce search
  React.useEffect(() => {
    const id = setTimeout(() => setSearch(searchInput), 200);
    return () => clearTimeout(id);
  }, [searchInput]);

  // Resolve plan context if needed
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

  // Fetch all active document types (paginated to avoid 1000-row cap).
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

  // Fetch existing requirements for this VCR
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

  // Currently-saved type ids
  const savedTypeIds = useMemo(() => {
    const m = new Map<string, RequirementRow>();
    requirements.forEach((r) => { if (r.document_type_id) m.set(r.document_type_id, r); });
    return m;
  }, [requirements]);

  const isSelected = (typeId: string): boolean => savedTypeIds.has(typeId);

  // ── Auto-save toggle: writes directly to vcr_document_requirements ──
  // This is intentional — the previous "queue then click Save" model lost selections
  // when the user clicked Next without first clicking Save. Now every toggle persists
  // immediately, so navigating away (or refreshing) preserves state, and the wizard's
  // step-counts query reflects truth.
  const persistToggle = async (typeId: string) => {
    if (savingIds.has(typeId)) return;
    setSavingIds((s) => new Set(s).add(typeId));
    try {
      const existing = savedTypeIds.get(typeId);
      if (existing) {
        // Removing — check for bound binding first (handled by caller via confirm dialog).
        const { error } = await (supabase as any)
          .from('vcr_document_requirements').delete().eq('id', existing.id);
        if (error) throw error;
        // Shadow clear on legacy table (best-effort)
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
            // tenant_id set by BEFORE INSERT trigger
          });
        if (error) throw error;

        // Shadow write (best-effort)
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

  // Distinct disciplines from the catalog
  const disciplineOptions = useMemo(() => {
    const m = new Map<string, string>();
    docTypes.forEach((d) => {
      if (d.discipline_code) m.set(d.discipline_code, d.discipline_name || d.discipline_code);
    });
    return Array.from(m.entries()).map(([code, name]) => ({ code, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [docTypes]);

  // Apply filters
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return docTypes.filter((d) => {
      if (tier === 'Tier 1' && d.tier !== 'Tier 1') return false;
      if (tier === 'Tier 2' && d.tier !== 'Tier 2') return false;
      if (tier === 'RLMU' && d.rlmu !== 'RLMU') return false;
      if (disciplines.length > 0 && !disciplines.includes(d.discipline_code || '')) return false;
      if (q && !d.document_name.toLowerCase().includes(q) && !d.code.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [docTypes, tier, disciplines, search]);

  // Split filtered list into Selected (top) + Available (bottom), preserving order.
  const { selectedItems, availableItems } = useMemo(() => {
    const sel: DocType[] = [];
    const avail: DocType[] = [];
    for (const d of filtered) {
      if (savedTypeIds.has(d.id)) sel.push(d); else avail.push(d);
    }
    return { selectedItems: sel, availableItems: avail };
  }, [filtered, savedTypeIds]);

  // Counts
  const typeCount = requirements.filter((r) => r.document_type_id && !r.assigned_document_number).length;
  const boundCount = requirements.filter((r) => r.assigned_document_number).length;
  const totalCount = requirements.length;

  React.useEffect(() => {
    if (requirements.length > 0) {
      setBrowseCatalog(true);
    }
  }, [requirements.length]);

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

  return (
    <TooltipProvider>
      <div className="flex flex-col h-full min-h-0 space-y-3">
        {showCatalog ? (
          <>
            {/* Header row */}
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="space-y-0.5">
                <h2 className="text-base font-semibold">Critical Documents</h2>
                <p className="text-xs text-muted-foreground">
                  Select the Tier 1 and Tier 2 document types required for this VCR.
                </p>
              </div>
              <div className="flex items-center gap-2">
                {totalCount > 0 && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge variant="outline" className="cursor-default">
                        {totalCount} required
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                      {totalCount - boundCount} type{totalCount - boundCount === 1 ? '' : 's'}, {boundCount} specific document{boundCount === 1 ? '' : 's'}
                    </TooltipContent>
                  </Tooltip>
                )}
                {totalCount > 0 ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                        onClick={() => setConfirmClearAll(true)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">Clear all selections</TooltipContent>
                  </Tooltip>
                ) : browseCatalog ? (
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
                ) : null}
                <Button variant="outline" size="sm" onClick={() => setAssaiOpen(true)} className="gap-1.5">
                  <img src={assaiIcon} alt="" className="w-4 h-4 object-contain" /> Check Assai
                </Button>
              </div>
            </div>

            {/* List body — scroll surface contains a sticky filter row at the top so it
                stays visible while the list scrolls beneath it. */}
            <div className="border border-border/60 rounded-md flex-1 min-h-0 overflow-y-auto relative">
              {/* Sticky filter row */}
              <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-b border-border/60 px-3 py-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <Tabs value={tier} onValueChange={(v) => setTier(v as TierFilter)}>
                    <TabsList className="h-8">
                      <TabsTrigger value="all" className="text-xs px-3 h-7">All</TabsTrigger>
                      <TabsTrigger value="Tier 1" className="text-xs px-3 h-7">Tier 1</TabsTrigger>
                      <TabsTrigger value="Tier 2" className="text-xs px-3 h-7">Tier 2</TabsTrigger>
                      <TabsTrigger value="RLMU" className="text-xs px-3 h-7">RLMU</TabsTrigger>
                    </TabsList>
                  </Tabs>

                  <Popover>
                    <PopoverTrigger asChild>
                      <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5">
                        Discipline
                        {disciplines.length > 0 && (
                          <Badge variant="secondary" className="text-[10px] h-4 px-1.5">{disciplines.length}</Badge>
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
                      <button onClick={() => setSearchInput('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {typesLoading || requirementsLoading ? (
                <div className="flex items-center justify-center py-12 text-muted-foreground gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" /> <span className="text-sm">Loading catalog…</span>
                </div>
              ) : filtered.length === 0 ? (
                <div className="py-12 text-center text-sm text-muted-foreground">
                  No document types match these filters.
                </div>
              ) : (
                <div>
                  {selectedItems.length > 0 && (
                    <>
                      <GroupHeader label={`Selected (${selectedItems.length})`} />
                      <DocTypeList
                        items={selectedItems}
                        isSelected={isSelected}
                        onToggle={toggleType}
                        savedTypeIds={savedTypeIds}
                        savingIds={savingIds}
                      />
                    </>
                  )}
                  {availableItems.length > 0 && (
                    <>
                      <GroupHeader label={`Available (${availableItems.length})`} />
                      <DocTypeList
                        items={availableItems}
                        isSelected={isSelected}
                        onToggle={toggleType}
                        savedTypeIds={savedTypeIds}
                        savingIds={savingIds}
                      />
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Footer — selections auto-save, so no Save button is needed. */}
            <div className="flex items-center justify-between gap-3 pt-2 border-t border-border/60">
              <span className="text-xs text-muted-foreground">
                {totalCount} document type{totalCount === 1 ? '' : 's'} selected
                {savingIds.size > 0 && (
                  <span className="ml-2 inline-flex items-center gap-1 text-muted-foreground">
                    <Loader2 className="w-3 h-3 animate-spin" /> saving…
                  </span>
                )}
              </span>
              <span className="text-[11px] text-muted-foreground">Changes save automatically</span>
            </div>
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center py-16 text-center">
            <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
              <FileStack className="h-7 w-7 text-primary" />
            </div>
            <h2 className="text-lg font-semibold">No critical documents yet</h2>
            <p className="mt-2 max-w-[460px] text-sm leading-relaxed text-muted-foreground">
              Start by selecting the Tier 1 and Tier 2 document types required for this VCR, or check Assai to review mapped source documents first.
            </p>
            <div className="mt-6 flex items-center gap-3">
              <Button size="lg" className="gap-2 shadow-sm" onClick={() => setBrowseCatalog(true)}>
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

// ─── Group sub-heading ───────────────────────────────────────────────────────

const GroupHeader: React.FC<{ label: string }> = ({ label }) => (
  <div className="sticky top-[52px] z-[5] bg-muted/60 backdrop-blur px-3 py-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground border-b border-border/40">
    {label}
  </div>
);

// ─── List row ────────────────────────────────────────────────────────────────

const DocTypeList: React.FC<{
  items: DocType[];
  isSelected: (id: string) => boolean;
  onToggle: (id: string) => void;
  savedTypeIds: Map<string, RequirementRow>;
  savingIds: Set<string>;
}> = ({ items, isSelected, onToggle, savedTypeIds, savingIds }) => {
  // Grid: checkbox | code | name | tier | discipline | bound
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
              sel && 'bg-primary/5',
              saving && 'opacity-60 pointer-events-none',
            )}
          >
            <Checkbox checked={sel} onCheckedChange={() => onToggle(d.id)} onClick={(e) => e.stopPropagation()} disabled={saving} />
            <span className="font-mono text-[11px] text-muted-foreground truncate">{d.code}</span>
            <span className="truncate text-xs">{d.document_name}</span>
            <div className="flex justify-center">
              {d.tier ? (
                <Badge variant="outline" className="text-[10px]">
                  {d.tier === 'Tier 1' ? 'T1' : d.tier === 'Tier 2' ? 'T2' : d.tier}
                </Badge>
              ) : null}
            </div>
            <div className="min-w-0">
              {d.discipline_name && (
                <Badge variant="secondary" className="text-[10px] max-w-full truncate">{d.discipline_name}</Badge>
              )}
            </div>
            <div className="flex justify-end">
              {bound && (
                <Badge className="text-[10px] bg-emerald-500/20 text-emerald-700 hover:bg-emerald-500/30 border-transparent">Bound</Badge>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
};

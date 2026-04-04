import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from '@/components/ui/sheet';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  FileText, Plus, Trash2, User, Calendar, Search, X, Stamp, Wand2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { CriticalDocsWizard } from './critical-docs/CriticalDocsWizard';
import { RlmuStatusBadge, DmsStatusBadge, DocumentNumberChip, RlmuUploadButton } from './shared/DmsStatusBadges';

interface CriticalDocumentsStepProps {
  vcrId: string;
  projectCode?: string;
  plantCode?: string;
  handoverPlanId?: string;
}

const TIER_COLORS: Record<string, string> = {
  tier_1: 'border-red-300 text-red-600',
  tier_2: 'border-blue-300 text-blue-600',
};

export const CriticalDocumentsStep: React.FC<CriticalDocumentsStepProps> = ({ vcrId, projectCode, plantCode, handoverPlanId }) => {
  const queryClient = useQueryClient();
  const [wizardOpen, setWizardOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [tierFilter, setTierFilter] = useState<'all' | 'tier_1' | 'tier_2'>('all');
  const [search, setSearch] = useState('');

  // Fetch handover plan context for the wizard if not passed
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
    enabled: !handoverPlanId,
  });

  const { data: items = [] } = useQuery({
    queryKey: ['vcr-critical-docs', vcrId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('p2a_vcr_critical_docs')
        .select('*, catalog:p2a_vcr_doc_catalog(*)')
        .eq('handover_point_id', vcrId)
        .order('display_order');
      if (error) throw error;
      return data || [];
    },
  });

  const { data: catalog = [] } = useQuery({
    queryKey: ['vcr-doc-catalog'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('p2a_vcr_doc_catalog')
        .select('*')
        .eq('is_active', true)
        .order('display_order');
      if (error) throw error;
      return data || [];
    },
  });

  const deleteItem = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from('p2a_vcr_critical_docs').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vcr-critical-docs', vcrId] });
      setDeleteTarget(null);
      toast.success('Document removed');
    },
  });

  const updateItem = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: any }) => {
      const { error } = await (supabase as any).from('p2a_vcr_critical_docs').update(updates).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vcr-critical-docs', vcrId] });
    },
  });

  const tier1Count = items.filter((i: any) => (i.catalog?.tier || i.tier) === 'tier_1').length;
  const tier2Count = items.filter((i: any) => (i.catalog?.tier || i.tier) === 'tier_2').length;
  const showSearch = items.length > 5;

  const filtered = items.filter((i: any) => {
    const tier = i.catalog?.tier || i.tier;
    if (tierFilter !== 'all' && tier !== tierFilter) return false;
    if (showSearch && search.trim()) {
      const q = search.toLowerCase();
      const title = (i.catalog?.title || i.title || '').toLowerCase();
      const code = (i.catalog?.doc_code || i.doc_code || '').toLowerCase();
      const disc = (i.catalog?.discipline || i.discipline || '').toLowerCase();
      return title.includes(q) || code.includes(q) || disc.includes(q);
    }
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3 flex-wrap">
          <Badge variant="outline">{items.length} documents</Badge>
          <Tabs value={tierFilter} onValueChange={(v) => setTierFilter(v as any)}>
            <TabsList className="h-8">
              <TabsTrigger value="all" className="text-xs px-3 h-7">All</TabsTrigger>
              <TabsTrigger value="tier_1" className="text-xs px-3 h-7">Tier 1 ({tier1Count})</TabsTrigger>
              <TabsTrigger value="tier_2" className="text-xs px-3 h-7">Tier 2 ({tier2Count})</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        {items.length > 0 && (
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => setAddOpen(true)} className="gap-1.5">
              <Plus className="w-4 h-4" /> Quick Add
            </Button>
            <Button size="sm" onClick={() => setWizardOpen(true)} className="gap-1.5">
              <Wand2 className="w-4 h-4" /> Document Wizard
            </Button>
          </div>
        )}
      </div>

      {showSearch && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by code, title or discipline…"
            className="pl-9 pr-8 h-8 text-xs"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}

      {items.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="w-14 h-14 rounded-full bg-amber-500/10 flex items-center justify-center mb-3">
              <FileText className="w-7 h-7 text-amber-500" />
            </div>
            <h3 className="font-medium">No Critical Documents</h3>
            <p className="text-xs text-muted-foreground mt-1 text-center max-w-xs">
              Use the Document Wizard to intelligently identify required Tier 1 & Tier 2 documents, system by system.
            </p>
            <Button size="sm" onClick={() => setWizardOpen(true)} className="mt-3 gap-1.5">
              <Wand2 className="w-4 h-4" /> Launch Document Wizard
            </Button>
          </CardContent>
        </Card>
      ) : filtered.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-8">
            <p className="text-sm text-muted-foreground">No documents match your filter.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((item: any) => {
            const tier = item.catalog?.tier || item.tier;
            const docCode = item.catalog?.doc_code || item.doc_code;
            const title = item.catalog?.title || item.title;
            const discipline = item.catalog?.discipline || item.discipline;
            const rlmuRequired = item.rlmu_required ?? item.catalog?.rlmu_required;

            return (
              <Card key={item.id} className="group hover:border-amber-500/40 transition-colors">
                <CardContent className="p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0 space-y-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        {docCode && (
                          <span className="font-mono text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground shrink-0">
                            {docCode}
                          </span>
                        )}
                        <h4 className="font-medium text-sm truncate">{title}</h4>
                        {tier && (
                          <Badge variant="outline" className={cn('text-[10px] shrink-0', TIER_COLORS[tier] || '')}>
                            {tier === 'tier_1' ? 'Tier 1' : 'Tier 2'}
                          </Badge>
                        )}
                        {discipline && (
                          <Badge variant="secondary" className="text-[10px] shrink-0">{discipline}</Badge>
                        )}
                      </div>

                      <div className="flex items-center gap-2 flex-wrap text-[10px] text-muted-foreground">
                        {item.assigned_document_number && (
                          <DocumentNumberChip number={item.assigned_document_number} />
                        )}
                        {item.responsible_person && (
                          <span className="flex items-center gap-1"><User className="w-3 h-3" />{item.responsible_person}</span>
                        )}
                        {item.target_date && (
                          <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{item.target_date}</span>
                        )}
                        <select
                          value={item.status}
                          onChange={(e) => updateItem.mutate({ id: item.id, updates: { status: e.target.value } })}
                          className="text-[10px] bg-background border border-border rounded px-1.5 py-0.5 cursor-pointer"
                        >
                          <option value="not_started">Not Started</option>
                          <option value="in_progress">In Progress</option>
                          <option value="complete">Complete</option>
                        </select>
                        {item.dms_status && <DmsStatusBadge status={item.dms_status} />}
                        {rlmuRequired ? (
                          <>
                            <RlmuStatusBadge status={item.rlmu_status} />
                            <RlmuUploadButton
                              sourceTable="vcr_document_requirements"
                              sourceId={item.id}
                              documentNumber={item.assigned_document_number}
                              rlmuStatus={item.rlmu_status}
                              onUploadComplete={() => queryClient.invalidateQueries({ queryKey: ['vcr-critical-docs', vcrId] })}
                            />
                          </>
                        ) : (
                          <span className="flex items-center gap-0.5 opacity-40">
                            <Stamp className="w-3 h-3" /> No RLMU
                          </span>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={() => setDeleteTarget(item.id)}
                      className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity p-1.5 rounded-md hover:bg-destructive/10 text-destructive shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Sheet open={addOpen} onOpenChange={setAddOpen}>
        <SheetContent className="w-[520px] sm:max-w-[520px] z-[150]" overlayClassName="z-[150]">
          <SheetHeader><SheetTitle>Add Critical Document</SheetTitle></SheetHeader>
          <AddDocumentForm
            vcrId={vcrId}
            catalog={catalog}
            onSuccess={() => {
              queryClient.invalidateQueries({ queryKey: ['vcr-critical-docs', vcrId] });
              setAddOpen(false);
            }}
          />
        </SheetContent>
      </Sheet>

      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent className="z-[150]">
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Document</AlertDialogTitle>
            <AlertDialogDescription>This will remove the document from this VCR's delivery plan.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTarget && deleteItem.mutate(deleteTarget)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <CriticalDocsWizard
        open={wizardOpen}
        onOpenChange={setWizardOpen}
        vcrId={vcrId}
        projectCode={projectCode || planContext?.project_code}
        plantCode={plantCode || planContext?.plant_code}
        handoverPlanId={handoverPlanId || planContext?.id}
      />
    </div>
  );
};

// ─── Add Document Form ───────────────────────────────────────────────────────

const AddDocumentForm: React.FC<{
  vcrId: string;
  catalog: any[];
  onSuccess: () => void;
}> = ({ vcrId, catalog, onSuccess }) => {
  const [mode, setMode] = useState<'catalog' | 'custom'>('catalog');
  const [selectedId, setSelectedId] = useState<string>('');
  const [tierFilter, setTierFilter] = useState<'all' | 'tier_1' | 'tier_2'>('all');
  const [search, setSearch] = useState('');
  const [responsible, setResponsible] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [customCode, setCustomCode] = useState('');
  const [customTitle, setCustomTitle] = useState('');
  const [customTier, setCustomTier] = useState('tier_1');
  const [customDisc, setCustomDisc] = useState('');
  const [customRlmu, setCustomRlmu] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const selectedCatalogItem = catalog.find((c: any) => c.id === selectedId);

  const filteredCatalog = catalog.filter((c: any) => {
    if (tierFilter !== 'all' && c.tier !== tierFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        c.title?.toLowerCase().includes(q) ||
        c.doc_code?.toLowerCase().includes(q) ||
        c.discipline?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleSubmit = async () => {
    setIsSaving(true);
    try {
      if (mode === 'catalog' && selectedCatalogItem) {
        const { error } = await (supabase as any).from('p2a_vcr_critical_docs').insert({
          handover_point_id: vcrId,
          catalog_id: selectedCatalogItem.id,
          rlmu_required: selectedCatalogItem.rlmu_required,
          rlmu_status: selectedCatalogItem.rlmu_required ? 'pending' : 'not_required',
          responsible_person: responsible || null,
          target_date: targetDate || null,
        });
        if (error) throw error;
      } else {
        if (!customTitle) return;
        const { error } = await (supabase as any).from('p2a_vcr_critical_docs').insert({
          handover_point_id: vcrId,
          doc_code: customCode || null,
          title: customTitle,
          tier: customTier,
          discipline: customDisc || null,
          rlmu_required: customRlmu,
          rlmu_status: customRlmu ? 'pending' : 'not_required',
          responsible_person: responsible || null,
          target_date: targetDate || null,
        });
        if (error) throw error;
      }
      toast.success('Document added');
      onSuccess();
    } catch (e: any) {
      toast.error(e.message || 'Failed to add document');
    } finally {
      setIsSaving(false);
    }
  };

  const canSubmit = mode === 'catalog' ? !!selectedId : !!customTitle;

  return (
    <div className="space-y-4 mt-4">
      <Tabs value={mode} onValueChange={(v) => setMode(v as any)}>
        <TabsList className="w-full">
          <TabsTrigger value="catalog" className="flex-1 text-xs">From Standard List</TabsTrigger>
          <TabsTrigger value="custom" className="flex-1 text-xs">Custom Entry</TabsTrigger>
        </TabsList>
      </Tabs>

      {mode === 'catalog' && (
        <>
          <div className="flex gap-2">
            <Tabs value={tierFilter} onValueChange={(v) => setTierFilter(v as any)}>
              <TabsList className="h-8">
                <TabsTrigger value="all" className="text-xs px-2 h-7">All</TabsTrigger>
                <TabsTrigger value="tier_1" className="text-xs px-2 h-7">Tier 1</TabsTrigger>
                <TabsTrigger value="tier_2" className="text-xs px-2 h-7">Tier 2</TabsTrigger>
              </TabsList>
            </Tabs>
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search…" className="pl-7 h-8 text-xs" />
            </div>
          </div>

          {catalog.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">
              <FileText className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p>No standard documents in the catalog yet.</p>
              <p className="text-xs mt-1">Upload the standard list to populate this catalog.</p>
            </div>
          ) : (
            <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
              {filteredCatalog.length === 0 ? (
                <p className="text-center text-xs text-muted-foreground py-4">No documents match your search.</p>
              ) : (
                filteredCatalog.map((c: any) => (
                  <button
                    key={c.id}
                    onClick={() => setSelectedId(c.id)}
                    className={cn(
                      'w-full text-left p-2.5 rounded-lg border text-sm transition-all',
                      selectedId === c.id
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:bg-muted/40'
                    )}
                  >
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground">{c.doc_code}</span>
                      <span className="font-medium text-xs flex-1 truncate">{c.title}</span>
                      <Badge variant="outline" className={cn('text-[10px]', TIER_COLORS[c.tier] || '')}>
                        {c.tier === 'tier_1' ? 'T1' : 'T2'}
                      </Badge>
                      {c.rlmu_required && (
                        <Badge variant="outline" className="text-[10px] border-orange-300 text-orange-600">RLMU</Badge>
                      )}
                    </div>
                    {c.discipline && <p className="text-[10px] text-muted-foreground mt-0.5">{c.discipline}</p>}
                  </button>
                ))
              )}
            </div>
          )}
        </>
      )}

      {mode === 'custom' && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Doc Code</Label>
              <Input value={customCode} onChange={(e) => setCustomCode(e.target.value)} placeholder="e.g. E-001" className="mt-1" />
            </div>
            <div>
              <Label>Tier</Label>
              <Select value={customTier} onValueChange={setCustomTier}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="tier_1">Tier 1 (Critical)</SelectItem>
                  <SelectItem value="tier_2">Tier 2 (Important)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Document Title *</Label>
            <Input value={customTitle} onChange={(e) => setCustomTitle(e.target.value)} className="mt-1" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Discipline</Label>
              <Input value={customDisc} onChange={(e) => setCustomDisc(e.target.value)} placeholder="e.g. ELECT, PACO" className="mt-1" />
            </div>
            <div className="flex items-end gap-2 pb-1">
              <input type="checkbox" id="rlmu" checked={customRlmu} onChange={(e) => setCustomRlmu(e.target.checked)} className="h-4 w-4" />
              <label htmlFor="rlmu" className="text-sm cursor-pointer">RLMU Required</label>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 border-t border-border pt-3">
        <div>
          <Label>Responsible Person</Label>
          <Input value={responsible} onChange={(e) => setResponsible(e.target.value)} className="mt-1" />
        </div>
        <div>
          <Label>Target Date</Label>
          <Input type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} className="mt-1" />
        </div>
      </div>

      <Button onClick={handleSubmit} disabled={!canSubmit || isSaving} className="w-full">
        {isSaving ? 'Adding…' : 'Add to VCR Plan'}
      </Button>
    </div>
  );
};

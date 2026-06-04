import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Plus,
  Pencil,
  Search,
  ChevronDown,
  ChevronRight,
  Users,
  X,
  Ban,
  Undo2,
  Info,
  HelpCircle,
  Trash2,
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

/**
 * Detect a B2B-paired role: exactly two active holders whose normalized
 * `position` strings match byte-for-byte. Mirrors the rule in
 * `useB2BPartner` / ApprovalSetupStep — do NOT re-derive elsewhere.
 *
 * Display-only: the underlying approval semantics are unchanged — both
 * holders remain assigned; either one closing the task completes it.
 */
const isB2BPairUsers = (users: Array<{ position?: string | null }>): boolean => {
  if (!users || users.length !== 2) return false;
  const norm = (p?: string | null) => (p || '').toLowerCase().replace(/\s+/g, ' ').trim();
  const a = norm(users[0]?.position);
  const b = norm(users[1]?.position);
  return !!a && a === b;
};
import { cn } from '@/lib/utils';
import { getVCRCategoryConfig, VCR_CATEGORY_ORDER } from '@/lib/vcrCategoryConfig';
import { toast } from 'sonner';
import { useParams } from 'react-router-dom';
import { useVCRItemDeliveringParties } from '@/hooks/useVCRItemDeliveringParties';
import { getRegionKeywords, getPortfolio, profileMatchesProjectLocation, getRoleFamilyNames, type ProjectLocationContext } from '@/utils/hubRegionMapping';
import { requiresPortfolio, requiresHub } from '@/utils/roleAssignmentConfig';
import { useApprovingPartyHoldersByIds } from '@/hooks/useApprovingPartyHolders';
import { useVCRHydrocarbonStatus } from '@/hooks/useVCRHydrocarbonStatus';

interface VCRItemsStepProps {
  vcrId: string;
}

interface VCRItem {
  id: string;
  vcr_item: string;
  topic: string | null;
  category_id: string | null;
  delivering_party_role_id: string | null;
  approving_party_role_ids: string[] | null;
  display_order: number;
  guidance_notes: string | null;
  supporting_evidence: string | null;
  category?: { id: string; name: string; code: string };
}

interface VCRItemOverride {
  id: string;
  vcr_item_id: string;
  vcr_item_override: string | null;
  topic_override: string | null;
  delivering_party_role_id_override: string | null;
  approving_party_role_ids_override: string[] | null;
  guidance_notes_override: string | null;
  is_na: boolean;
  na_reason: string | null;
}

interface MergedVCRItem extends VCRItem {
  // Effective values (override or original)
  effective_vcr_item: string;
  effective_topic: string | null;
  effective_delivering_party_role_id: string | null;
  effective_approving_party_role_ids: string[] | null;
  effective_guidance_notes: string | null;
  has_overrides: boolean;
  override_id?: string;
  is_na: boolean;
}

interface Role {
  id: string;
  name: string;
}

export const VCRItemsStep: React.FC<VCRItemsStepProps> = ({ vcrId }) => {
  const { id: routeProjectId } = useParams<{ id: string }>();
  const queryClient = useQueryClient();

  // Resolve projectId: prefer route param, fallback to VCR → handover plan → project
  const { data: resolvedProjectId } = useQuery({
    queryKey: ['vcr-resolve-project', vcrId, routeProjectId],
    queryFn: async () => {
      if (routeProjectId) return routeProjectId;
      const { data: hp } = await supabase
        .from('p2a_handover_points')
        .select('handover_plan_id')
        .eq('id', vcrId)
        .maybeSingle();
      if (!hp?.handover_plan_id) return null;
      const { data: plan } = await supabase
        .from('p2a_handover_plans')
        .select('project_id')
        .eq('id', hp.handover_plan_id)
        .maybeSingle();
      return plan?.project_id || null;
    },
    staleTime: 300000,
  });

  const projectId = resolvedProjectId || routeProjectId;

  // Fetch project location context once for all child forms
  const { data: projectLocationCtx } = useQuery({
    queryKey: ['project-location-ctx', projectId],
    queryFn: async (): Promise<ProjectLocationContext | null> => {
      if (!projectId) return null;
      const { data: project } = await supabase
        .from('projects')
        .select('hub_id, plant_id, region_id')
        .eq('id', projectId)
        .maybeSingle();
      if (!project?.hub_id) return null;

      const { data: hub } = await supabase.from('hubs').select('name').eq('id', project.hub_id).maybeSingle();
      const hubName = hub?.name || '';
      if (!hubName) return null;

      return {
        hubId: project.hub_id,
        hubName,
        portfolio: getPortfolio(hubName),
        hubKeywords: getRegionKeywords(hubName),
      };
    },
    enabled: !!projectId,
    staleTime: 300000,
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string> | null>(null);
  const [editingItem, setEditingItem] = useState<MergedVCRItem | null>(null);
  const [editSheetOpen, setEditSheetOpen] = useState(false);
  const [addSheetOpen, setAddSheetOpen] = useState(false);
  const [naItem, setNaItem] = useState<MergedVCRItem | null>(null);

  // Hydrocarbon status — shared hook (single source of truth for header + step)
  const { data: hcStatus, isLoading: isLoadingHydrocarbon } = useVCRHydrocarbonStatus(vcrId);
  const hasHydrocarbon = hcStatus?.hasHydrocarbon;
  const linkedSystemsCount = hcStatus?.systemCount ?? 0;

  // Hydrocarbon template: 363a831c-edb3-4224-a97f-2e8b11fac2dc
  // Non-Hydrocarbon template: 2ebe8392-e404-4655-b9eb-46e4e3cb39e8
  const HYDROCARBON_TEMPLATE_ID = '363a831c-edb3-4224-a97f-2e8b11fac2dc';
  const NON_HYDROCARBON_TEMPLATE_ID = '2ebe8392-e404-4655-b9eb-46e4e3cb39e8';

  const activeTemplateId = hasHydrocarbon ? HYDROCARBON_TEMPLATE_ID : NON_HYDROCARBON_TEMPLATE_ID;

  // Fetch VCR items based on the resolved template
  const { data: items = [], isLoading } = useQuery({
    queryKey: ['vcr-exec-items', vcrId, activeTemplateId],
    queryFn: async () => {
      // Get item IDs from the template
      const { data: templateItems, error: tiError } = await supabase
        .from('vcr_template_items')
        .select('vcr_item_id')
        .eq('template_id', activeTemplateId);
      if (tiError) throw tiError;
      if (!templateItems || templateItems.length === 0) return [];

      const itemIds = templateItems.map(ti => ti.vcr_item_id);

      const { data, error } = await supabase
        .from('vcr_items')
        .select('*, vcr_item_categories!vcr_items_category_id_fkey(id, name, code)')
        .in('id', itemIds)
        .eq('is_active', true)
        .order('display_order');
      if (error) throw error;
      return (data || []).map((item: any) => ({
        ...item,
        category: item.vcr_item_categories,
      })) as VCRItem[];
    },
    enabled: hasHydrocarbon !== undefined,
  });

  // Fetch per-VCR overrides
  const { data: overrides = [] } = useQuery({
    queryKey: ['vcr-item-overrides', vcrId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('p2a_vcr_item_overrides')
        .select('*')
        .eq('handover_point_id', vcrId);
      if (error) throw error;
      return (data || []) as VCRItemOverride[];
    },
  });

  // Merge items with overrides
  const mergedItems: MergedVCRItem[] = items.map(item => {
    const override = overrides.find(o => o.vcr_item_id === item.id);
    return {
      ...item,
      effective_vcr_item: override?.vcr_item_override ?? item.vcr_item,
      effective_topic: override?.topic_override !== undefined ? override.topic_override : item.topic,
      effective_delivering_party_role_id: override?.delivering_party_role_id_override !== undefined ? override.delivering_party_role_id_override : item.delivering_party_role_id,
      effective_approving_party_role_ids: override?.approving_party_role_ids_override !== undefined ? override.approving_party_role_ids_override : item.approving_party_role_ids,
      effective_guidance_notes: override?.guidance_notes_override !== undefined ? override.guidance_notes_override : item.guidance_notes,
      has_overrides: !!override,
      override_id: override?.id,
      is_na: override?.is_na || false,
    };
  });

  // Fetch roles
  const { data: roles = [] } = useQuery({
    queryKey: ['roles-list'],
    queryFn: async () => {
      const { data } = await supabase
        .from('roles')
        .select('id, name')
        .eq('is_active', true)
        .order('name');
      return (data || []) as Role[];
    },
  });

  // Fetch categories for the add form
  const { data: categories = [] } = useQuery({
    queryKey: ['vcr-item-categories'],
    queryFn: async () => {
      const { data } = await supabase
        .from('vcr_item_categories')
        .select('id, name, code')
        .eq('is_active', true)
        .order('display_order');
      return (data || []) as Array<{ id: string; name: string; code: string }>;
    },
  });

  // Save override mutation (upsert to overrides table, NOT the master vcr_items)
  const updateItem = useMutation({
    mutationFn: async (payload: { vcr_item_id: string; vcr_item_override: string | null; topic_override: string | null; delivering_party_role_id_override: string | null; approving_party_role_ids_override: string[] | null; guidance_notes_override: string | null }) => {
      const { error } = await supabase
        .from('p2a_vcr_item_overrides')
        .upsert({
          handover_point_id: vcrId,
          vcr_item_id: payload.vcr_item_id,
          vcr_item_override: payload.vcr_item_override,
          topic_override: payload.topic_override,
          delivering_party_role_id_override: payload.delivering_party_role_id_override,
          approving_party_role_ids_override: payload.approving_party_role_ids_override,
          guidance_notes_override: payload.guidance_notes_override,
        }, { onConflict: 'handover_point_id,vcr_item_id' });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vcr-item-overrides', vcrId] });
      queryClient.invalidateQueries({ queryKey: ['vcr-exec-items'] });
      toast.success('Item updated (local to this VCR)');
      setEditSheetOpen(false);
      setEditingItem(null);
    },
  });

  // Toggle N/A mutation (marks item as not applicable for this VCR)
  const toggleNAItem = useMutation({
    mutationFn: async ({ item, markNA }: { item: MergedVCRItem; markNA: boolean }) => {
      const { error } = await supabase
        .from('p2a_vcr_item_overrides')
        .upsert({
          handover_point_id: vcrId,
          vcr_item_id: item.id,
          is_na: markNA,
        }, { onConflict: 'handover_point_id,vcr_item_id' });
      if (error) throw error;
    },
    onSuccess: (_, { markNA }) => {
      queryClient.invalidateQueries({ queryKey: ['vcr-item-overrides', vcrId] });
      toast.success(markNA ? 'Item marked as N/A' : 'Item restored');
      setNaItem(null);
    },
  });

  // Create new VCR item mutation
  const createItem = useMutation({
    mutationFn: async (payload: {
      vcr_item: string;
      topic: string | null;
      category_id: string | null;
      delivering_party_role_id: string | null;
      approving_party_role_ids: string[] | null;
      guidance_notes: string | null;
    }) => {
      const maxOrder = items.reduce((max, i) => Math.max(max, i.display_order), 0);
      const { error } = await supabase
        .from('vcr_items')
        .insert({
          vcr_item: payload.vcr_item,
          topic: payload.topic,
          category_id: payload.category_id,
          delivering_party_role_id: payload.delivering_party_role_id,
          approving_party_role_ids: payload.approving_party_role_ids,
          guidance_notes: payload.guidance_notes,
          display_order: maxOrder + 1,
          is_active: true,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vcr-exec-items'] });
      toast.success('VCR item added');
      setAddSheetOpen(false);
    },
  });

  // Separate N/A items from active items
  const naItems = mergedItems.filter(item => item.is_na);
  const activeItems = mergedItems.filter(item => !item.is_na);

  // Filter active items using effective (overridden) values
  const filtered = activeItems.filter(item =>
    !searchQuery ||
    item.effective_vcr_item.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.effective_topic?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Also filter N/A items by search
  const filteredNaItems = naItems.filter(item =>
    !searchQuery ||
    item.effective_vcr_item.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.effective_topic?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Group active items by category
  const grouped = filtered.reduce<Record<string, MergedVCRItem[]>>((acc, item) => {
    const cat = item.category?.name || 'Uncategorized';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {});

  const sortedCategories = Object.keys(grouped).sort((a, b) => {
    const ai = VCR_CATEGORY_ORDER.indexOf(a);
    const bi = VCR_CATEGORY_ORDER.indexOf(b);
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });

  // Default all categories (including N/A bucket) to collapsed on first load
  useEffect(() => {
    if (collapsedCategories === null && sortedCategories.length > 0) {
      setCollapsedCategories(new Set([...sortedCategories, '__NA__']));
    }
  }, [sortedCategories, collapsedCategories]);

  const effectiveCollapsed = collapsedCategories ?? new Set<string>();

  const toggleCategory = (cat: string) => {
    setCollapsedCategories(prev => {
      const next = new Set(prev ?? []);
      next.has(cat) ? next.delete(cat) : next.add(cat);
      return next;
    });
  };

  const getRoleName = (id: string | null) => {
    if (!id) return '—';
    return roles.find(r => r.id === id)?.name || 'Unknown';
  };

  if (isLoading || isLoadingHydrocarbon) {
    return <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-16" />)}</div>;
  }

  return (
    <TooltipProvider delayDuration={150}>
    <div className="space-y-4">
      {/* Step header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-base font-semibold leading-tight">VCR Checklist</h3>
          <div className="flex items-center gap-1.5 mt-0.5">
            <p className="text-xs text-muted-foreground">
              Final verification of all items required for this VCR before submission.
            </p>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="text-muted-foreground/60 hover:text-muted-foreground transition-colors"
                  aria-label="Guidance"
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" className="max-w-xs text-xs">
                Expand each category to review items. Click any item to edit its content, delivering or approving parties. Mark non-applicable items as N/A.
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
      </div>

      {/* No-systems banner — short, conditional. HC stripe in header carries the "why". */}
      {linkedSystemsCount === 0 && (
        <div className="flex items-center gap-2 rounded-md border border-amber-500/30 bg-amber-500/5 px-3 py-1.5">
          <HelpCircle className="w-3.5 h-3.5 text-amber-600/80 shrink-0" />
          <span className="text-xs text-amber-700 dark:text-amber-400">
            Add systems first — the checklist depends on system mapping.
          </span>
        </div>
      )}

      {/* Search + counts + Add */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search items..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Badge variant="outline" className="shrink-0">{activeItems.length} items</Badge>
        {naItems.length > 0 && (
          <Badge variant="outline" className="shrink-0 border-orange-300 dark:border-orange-700 text-orange-600 dark:text-orange-400">{naItems.length} N/A</Badge>
        )}
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 shrink-0 text-muted-foreground border-dashed hover:border-solid hover:bg-primary hover:text-primary-foreground hover:border-primary transition-colors"
          onClick={() => setAddSheetOpen(true)}
        >
          <Plus className="w-3.5 h-3.5" />
          Add Item
        </Button>
      </div>

      {/* Items grouped by category */}
      <div className="space-y-3">
        <div className="space-y-3 pr-1">
          {sortedCategories.map(cat => {
            const catItems = grouped[cat];
            const isCollapsed = effectiveCollapsed.has(cat);

            return (
              <div key={cat}>
                <button
                  onClick={() => toggleCategory(cat)}
                  className="flex items-center gap-2 w-full text-left py-2 px-1 hover:bg-muted/40 rounded transition-colors"
                >
                  {isCollapsed ? <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/50" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground/50" />}
                  {(() => {
                    const catCfg = getVCRCategoryConfig(cat);
                    const CatIcon = catCfg.icon;
                    return <CatIcon className={cn("w-4 h-4", catCfg.color)} />;
                  })()}
                  <span className="text-sm font-semibold">{cat}</span>
                  <Badge variant="secondary" className="text-[10px] ml-auto">{catItems.length}</Badge>
                </button>

                {!isCollapsed && (
                  <div className="space-y-1.5 ml-6">
                    {catItems.map((item, idx) => {
                      const catCode = item.category?.code || '??';
                      const itemId = `${catCode}-${String(idx + 1).padStart(2, '0')}`;
                      const catColor = getVCRCategoryConfig(item.category?.name || '');

                      return (
                        <Card key={item.id} className={cn("group transition-colors cursor-pointer", item.is_na ? "opacity-50 border-dashed" : "hover:border-primary/40")} onClick={() => { if (!item.is_na) { setEditingItem(item); setEditSheetOpen(true); } }}>
                          <CardContent className="p-3">
                            <div className="flex items-start gap-3">
                              <Badge variant="outline" className={cn("text-[10px] font-mono font-semibold shrink-0 mt-0.5 border", item.is_na ? "bg-muted text-muted-foreground border-border line-through" : cn(catColor.badgeBg, catColor.badgeText, catColor.badgeBorder))}>
                                {itemId}
                              </Badge>
                              <div className={cn("flex-1 min-w-0", item.is_na && "line-through text-muted-foreground")}>
                                <p className="text-sm leading-snug">{item.effective_vcr_item}</p>
                                {item.effective_topic && (
                                  <p className="text-[10px] text-muted-foreground mt-1">Topic: {item.effective_topic}</p>
                                )}
                                <div className="flex items-center gap-3 mt-1.5 text-[10px] text-muted-foreground">
                                  {item.is_na ? (
                                    <Badge variant="outline" className="text-[9px] h-4 border-orange-300 dark:border-orange-700 text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/30">N/A</Badge>
                                  ) : (
                                    <>
                                      <span>Delivering: <span className="text-foreground font-medium">{getRoleName(item.effective_delivering_party_role_id)}</span></span>
                                      {item.effective_approving_party_role_ids && item.effective_approving_party_role_ids.length > 0 && (
                                        <span className="flex items-center gap-1">
                                          <Users className="w-3 h-3" />
                                          {item.effective_approving_party_role_ids.length} approvers
                                        </span>
                                      )}
                                      {item.has_overrides && (
                                        <Badge variant="outline" className="text-[9px] h-4 border-accent text-accent-foreground">Customized</Badge>
                                      )}
                                    </>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                {item.is_na ? (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-green-600 hover:text-green-700"
                                    onClick={(e) => { e.stopPropagation(); toggleNAItem.mutate({ item, markNA: false }); }}
                                    title="Restore item"
                                  >
                                    <Undo2 className="w-3.5 h-3.5" />
                                  </Button>
                                ) : (
                                  <>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7"
                                      onClick={(e) => { e.stopPropagation(); setEditingItem(item); setEditSheetOpen(true); }}
                                    >
                                      <Pencil className="w-3.5 h-3.5" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7 text-orange-500 hover:text-orange-600"
                                      onClick={(e) => { e.stopPropagation(); setNaItem(item); }}
                                      title="Mark as N/A"
                                    >
                                      <Ban className="w-3.5 h-3.5" />
                                    </Button>
                                  </>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}

          {/* N/A Items Section — muted secondary accordion */}
          {naItems.length > 0 && (
            <div>
              <button
                onClick={() => setCollapsedCategories(prev => {
                  const next = new Set(prev ?? []);
                  next.has('__NA__') ? next.delete('__NA__') : next.add('__NA__');
                  return next;
                })}
                className="flex items-center gap-2 w-full text-left py-2 px-1 hover:bg-muted/40 rounded transition-colors"
              >
                {effectiveCollapsed.has('__NA__') ? <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/50" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground/50" />}
                <Ban className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-semibold text-muted-foreground">Not Applicable Items</span>
                <Badge variant="secondary" className="text-[10px] ml-auto">{filteredNaItems.length}</Badge>
              </button>

              {!effectiveCollapsed.has('__NA__') && (
                <div className="space-y-1.5 ml-6 mt-1">
                  <p className="text-[11px] text-muted-foreground mb-2">
                    These items have been marked as not applicable to this VCR. Approvers can review this list during the approval process.
                  </p>
                  {filteredNaItems.map(item => {
                    const catCode = item.category?.code || '??';
                    const catName = item.category?.name || 'Uncategorized';
                    const allCatItems = mergedItems.filter(i => (i.category?.name || 'Uncategorized') === catName);
                    const origIdx = allCatItems.findIndex(i => i.id === item.id);
                    const itemId = `${catCode}-${String(origIdx + 1).padStart(2, '0')}`;
                    const catColor = getVCRCategoryConfig(catName);

                    return (
                      <Card key={item.id} className="group bg-muted/30">
                        <CardContent className="p-3">
                          <div className="flex items-start gap-3">
                            <Badge variant="outline" className={cn("text-[10px] font-mono font-semibold shrink-0 mt-0.5 border line-through opacity-70", catColor.badgeBg, catColor.badgeText, catColor.badgeBorder)}>
                              {itemId}
                            </Badge>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm leading-snug text-muted-foreground">{item.effective_vcr_item}</p>
                              {item.effective_topic && (
                                <p className="text-[10px] text-muted-foreground/70 mt-1">Topic: {item.effective_topic}</p>
                              )}
                              <div className="flex items-center gap-2 mt-1.5">
                                <Badge variant="secondary" className="text-[9px] h-4">N/A</Badge>
                                <span className="text-[10px] text-muted-foreground">{catName}</span>
                              </div>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              className="shrink-0 h-7 text-xs gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => toggleNAItem.mutate({ item, markNA: false })}
                            >
                              <Undo2 className="w-3 h-3" />
                              Restore
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <Sheet open={editSheetOpen} onOpenChange={setEditSheetOpen}>
        <SheetContent className="w-[480px] sm:max-w-[480px] z-[150]" overlayClassName="z-[150]">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              Edit VCR Item
              {editingItem && (() => {
                const catName = editingItem.category?.name || '';
                const catCode = editingItem.category?.code || '??';
                const catItems = grouped[catName] || [];
                const idx = catItems.findIndex(i => i.id === editingItem.id);
                const badgeId = `${catCode}-${String(idx + 1).padStart(2, '0')}`;
                const colors = getVCRCategoryConfig(catName);
                return (
                  <Badge variant="outline" className={cn("text-[10px] font-mono font-semibold border", colors.badgeBg, colors.badgeText, colors.badgeBorder)}>
                    {badgeId}
                  </Badge>
                );
              })()}
            </SheetTitle>
          </SheetHeader>
          {editingItem && (
            <EditItemForm
              item={editingItem}
              roles={roles}
              projectId={projectId}
              projectLocationCtx={projectLocationCtx || undefined}
              vcrId={vcrId}
              onSave={(payload) => updateItem.mutate(payload)}
              isSaving={updateItem.isPending}
            />
          )}
        </SheetContent>
      </Sheet>

      {/* Add New Item Sheet */}
      <Sheet open={addSheetOpen} onOpenChange={setAddSheetOpen}>
        <SheetContent className="w-[480px] sm:max-w-[480px] z-[150]" overlayClassName="z-[150]">
          <SheetHeader>
            <SheetTitle>Add VCR Item</SheetTitle>
          </SheetHeader>
          <AddItemForm
            roles={roles}
            categories={categories}
            projectId={projectId}
            projectLocationCtx={projectLocationCtx || undefined}
            onSave={(payload) => createItem.mutate(payload)}
            isSaving={createItem.isPending}
          />
        </SheetContent>
      </Sheet>

      {/* N/A Confirmation */}
      <AlertDialog open={!!naItem} onOpenChange={() => setNaItem(null)}>
        <AlertDialogContent className="z-[150]" overlayClassName="z-[149] bg-black/80 backdrop-blur-sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Mark as Not Applicable</AlertDialogTitle>
            <AlertDialogDescription>
              This will mark the item as N/A for this VCR. The item will remain visible but greyed out for audit trail purposes. You can restore it at any time.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => naItem && toggleNAItem.mutate({ item: naItem, markNA: true })}
              className="bg-orange-500 text-white hover:bg-orange-600"
            >
              Mark N/A
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
    </TooltipProvider>
  );
};

// Edit Form Component
const AVATAR_BASE = 'https://kgnrjqjbonuvpxxfvfjq.supabase.co/storage/v1/object/public/user-avatars/';
const getAvatarUrl = (path: string | null) => {
  if (!path) return undefined;
  if (path.startsWith('http')) return path;
  return `${AVATAR_BASE}${path}`;
};
const getInitials = (name: string) => name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

interface ResolvedUser {
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  role_id: string;
  position: string | null;
}

interface OverridePayload {
  vcr_item_id: string;
  vcr_item_override: string | null;
  topic_override: string | null;
  delivering_party_role_id_override: string | null;
  approving_party_role_ids_override: string[] | null;
  guidance_notes_override: string | null;
}

const EditItemForm: React.FC<{
  item: MergedVCRItem;
  roles: Role[];
  projectId?: string;
  projectLocationCtx?: ProjectLocationContext;
  vcrId: string;
  onSave: (payload: OverridePayload) => void;
  isSaving: boolean;
}> = ({ item, roles, projectId, projectLocationCtx, vcrId, onSave, isSaving }) => {
  const queryClient = useQueryClient();
  const [vcrItem, setVcrItem] = useState(item.effective_vcr_item);
  const [topic, setTopic] = useState(item.effective_topic || '');
  const [deliveringParty, setDeliveringParty] = useState(item.effective_delivering_party_role_id || '');
  const [approvingParties, setApprovingParties] = useState<string[]>(item.effective_approving_party_role_ids || []);
  const [guidanceNotes, setGuidanceNotes] = useState(item.effective_guidance_notes || '');
  const [addApproverOpen, setAddApproverOpen] = useState(false);
  const [approverSearch, setApproverSearch] = useState('');
  const [addDeliveringOpen, setAddDeliveringOpen] = useState(false);
  const [deliveringSearch, setDeliveringSearch] = useState('');

  const { members: explicitDeliveringParties, addMember, removeMember } = useVCRItemDeliveringParties({ vcrItemId: item.id, handoverPointId: vcrId });

  // Build delivering role IDs with family expansion (e.g., ORA Engr → Snr ORA Engr).
  // Approving parties are resolved separately via the shared org_role_holders-first hook.
  const deliveringRoleIds = deliveringParty ? [deliveringParty] : [];

  const expandedRoleIds = React.useMemo(() => {
    const expanded = new Set<string>();
    deliveringRoleIds.forEach(roleId => {
      expanded.add(roleId);
      const roleName = roles.find(r => r.id === roleId)?.name;
      if (roleName) {
        const familyNames = getRoleFamilyNames(roleName);
        roles.forEach(r => {
          if (familyNames.includes(r.name)) expanded.add(r.id);
        });
      }
    });
    return [...expanded];
  }, [deliveringRoleIds.join(','), roles]);

  // Resolve delivering candidates filtered by project location (unchanged behaviour).
  const { data: resolvedUsers = [] } = useQuery({
    queryKey: ['edit-form-delivering-users', expandedRoleIds.sort().join(','), projectId, projectLocationCtx?.hubName],
    queryFn: async () => {
      if (expandedRoleIds.length === 0) return [];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, avatar_url, role, position, hub')
        .in('role', expandedRoleIds)
        .eq('is_active', true);
      if (!profiles || profiles.length === 0) return [];
      const filtered = profiles.filter((p: any) => {
        if (!projectLocationCtx) return true;
        const roleName = roles.find(r => r.id === p.role)?.name || '';
        const usePortfolio = requiresPortfolio(roleName) && !requiresHub(roleName);
        return profileMatchesProjectLocation(
          { position: p.position, hub: p.hub },
          projectLocationCtx,
          usePortfolio
        );
      });
      return filtered.map((p: any) => ({
        user_id: p.user_id,
        full_name: p.full_name,
        avatar_url: p.avatar_url,
        role_id: p.role,
        position: p.position ?? null,
      })) as ResolvedUser[];
    },
    enabled: expandedRoleIds.length > 0,
  });

  // SHARED resolver: approving-party holders come from org_role_holders FIRST
  // (seeded global / B2B holders are authoritative). Roles without a seeded
  // entry fall back to the same project-location filter used for delivering.
  const { data: approvingHoldersById = {} } = useApprovingPartyHoldersByIds({
    roles,
    roleIds: approvingParties,
    expandFamily: true,
    scopeKey: `vcr|${projectId || ''}|${projectLocationCtx?.hubName || ''}`,
    fallbackFilter: (p, roleName) => {
      if (!projectLocationCtx) return true;
      const usePortfolio = requiresPortfolio(roleName) && !requiresHub(roleName);
      return profileMatchesProjectLocation(
        { position: p.position, hub: p.hub },
        projectLocationCtx,
        usePortfolio,
      );
    },
  });

  const getUsersForRole = (roleId: string) => {
    // Delivering uses local family-expanded resolution.
    const roleName = roles.find(r => r.id === roleId)?.name;
    const familyNames = roleName ? getRoleFamilyNames(roleName) : [];
    const familyRoleIds = new Set(roles.filter(r => familyNames.includes(r.name)).map(r => r.id));
    familyRoleIds.add(roleId);
    return resolvedUsers.filter(u => familyRoleIds.has(u.role_id));
  };

  const getApprovingUsersForRole = (roleId: string): ResolvedUser[] =>
    (approvingHoldersById[roleId] || []).map(h => ({
      user_id: h.user_id,
      full_name: h.full_name,
      avatar_url: h.avatar_url,
      role_id: h.role_id,
      position: h.position,
    }));
  const getRoleName = (roleId: string) => roles.find(r => r.id === roleId)?.name || 'Unknown';

  const roleDeliveringUsers = deliveringParty ? getUsersForRole(deliveringParty) : [];

  const displayDeliveringUsers = explicitDeliveringParties.length > 0
    ? explicitDeliveringParties.map(user => ({
        id: user.id,
        user_id: user.user_id,
        full_name: user.full_name,
        avatar_url: user.avatar_url,
        role_name: user.role_name,
        source: 'explicit' as const,
      }))
    : roleDeliveringUsers.map(user => ({
        id: user.user_id,
        user_id: user.user_id,
        full_name: user.full_name,
        avatar_url: user.avatar_url,
        role_name: getRoleName(user.role_id),
        source: 'role' as const,
      }));

  const assignedDeliveringUserIds = new Set(displayDeliveringUsers.map(u => u.user_id));

  // Use role+location-filtered candidates for Add popover (not broad team search)
  const availableDeliveringCandidates = roleDeliveringUsers
    .filter(user =>
      !assignedDeliveringUserIds.has(user.user_id) &&
      (deliveringSearch === '' ||
        user.full_name.toLowerCase().includes(deliveringSearch.toLowerCase()))
    )
    .map(u => ({ ...u, role_name: getRoleName(u.role_id) }));

  const removeApprover = (roleId: string) => {
    setApprovingParties(prev => prev.filter(r => r !== roleId));
  };

  const availableRolesToAdd = roles.filter(r =>
    !approvingParties.includes(r.id) &&
    r.id !== deliveringParty &&
    (approverSearch === '' || r.name.toLowerCase().includes(approverSearch.toLowerCase()))
  );

  const seedRoleUsersAsExplicit = async (extraUserIds: string[] = []) => {
    const userIdsFromRole = roleDeliveringUsers.map(u => u.user_id);
    const targetUserIds = [...new Set([...userIdsFromRole, ...extraUserIds])];
    if (targetUserIds.length === 0) return;

    const { data: authData } = await supabase.auth.getUser();
    const rows = targetUserIds.map(userId => ({
      vcr_item_id: item.id,
      user_id: userId,
      added_by: authData.user?.id,
      handover_point_id: vcrId,
    }));

    const client = supabase as any;
    const { error } = await client
      .from('vcr_item_delivering_parties')
      .upsert(rows, { onConflict: 'vcr_item_id,user_id' });

    if (error) throw error;
    await queryClient.invalidateQueries({ queryKey: ['vcr-item-delivering-parties'] });
  };

  const handleAddDeliveringUser = async (userId: string) => {
    try {
      if (explicitDeliveringParties.length === 0 && roleDeliveringUsers.length > 0) {
        await seedRoleUsersAsExplicit([userId]);
      } else {
        await addMember.mutateAsync(userId);
      }
      setDeliveringSearch('');
    } catch {
      toast.error('Failed to add delivering party');
    }
  };

  const handleRemoveDeliveringUser = async (user: (typeof displayDeliveringUsers)[number]) => {
    try {
      if (user.source === 'explicit') {
        await removeMember.mutateAsync(user.id);
        return;
      }

      // First convert role-based users to explicit, then remove selected user
      await seedRoleUsersAsExplicit();
      const client = supabase as any;
      const { error } = await client
        .from('vcr_item_delivering_parties')
        .delete()
        .eq('vcr_item_id', item.id)
        .eq('user_id', user.user_id);

      if (error) throw error;
      await queryClient.invalidateQueries({ queryKey: ['vcr-item-delivering-parties'] });
      toast.success('Delivering party removed');
    } catch {
      toast.error('Failed to remove delivering party');
    }
  };

  // ── Dirty-tracking + add'l UI state ────────────────────────────
  const initialSnapshot = React.useMemo(() => ({
    vcrItem: item.effective_vcr_item,
    topic: item.effective_topic || '',
    deliveringParty: item.effective_delivering_party_role_id || '',
    approvingParties: [...(item.effective_approving_party_role_ids || [])],
    guidanceNotes: item.effective_guidance_notes || '',
  }), [item.id]);

  const isDirty = React.useMemo(() => {
    if (vcrItem !== initialSnapshot.vcrItem) return true;
    if ((topic || '') !== initialSnapshot.topic) return true;
    if ((deliveringParty || '') !== initialSnapshot.deliveringParty) return true;
    if ((guidanceNotes || '') !== initialSnapshot.guidanceNotes) return true;
    const a = [...approvingParties].sort().join('|');
    const b = [...initialSnapshot.approvingParties].sort().join('|');
    return a !== b;
  }, [vcrItem, topic, deliveringParty, guidanceNotes, approvingParties, initialSnapshot]);

  const [editingTopic, setEditingTopic] = useState(false);
  const [guidanceOpen, setGuidanceOpen] = useState(false);
  const [approversOpen, setApproversOpen] = useState(true);
  const [deleteApproverTarget, setDeleteApproverTarget] = useState<{ roleId: string; name: string } | null>(null);
  const [memberPopoverRoleId, setMemberPopoverRoleId] = useState<string | null>(null);
  const [deliveringPopoverOpen, setDeliveringPopoverOpen] = useState(false);
  const [expandedB2BKeys, setExpandedB2BKeys] = useState<Set<string>>(new Set());
  const toggleB2BExpand = (key: string) => {
    setExpandedB2BKeys(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  // Renders a single party row.
  // Fixed column grid: [role label] [avatar] [name(s)] [B2B chip] [trash]
  // When B2B chip is clicked the row reveals BOTH holders inline (name column
  // becomes [name A] [avatar B] [name B]). B2B chip is the toggle.
  const renderPartyRow = (opts: {
    key: string;
    title: string;
    isB2B: boolean;
    users: { user_id: string; full_name: string; avatar_url: string | null }[];
    onDelete?: () => void;
    onPopoverChange?: (open: boolean) => void;
    popoverOpen?: boolean;
    popoverContent?: React.ReactNode;
  }) => {
    const primary = opts.users[0];
    const partner = opts.users[1];
    const expanded = opts.isB2B && !!partner && expandedB2BKeys.has(opts.key);
    const allNames = opts.users.map(u => u.full_name).join(', ');
    return (
      <div
        key={opts.key}
        className="group/row grid grid-cols-[minmax(140px,180px)_28px_minmax(0,1fr)_44px_24px] items-center gap-x-2 py-2.5 border-b border-border/40 last:border-b-0"
      >
        <span className="text-xs font-medium text-foreground/80 truncate">{opts.title}</span>

        {primary ? (
          <Popover open={!!opts.popoverOpen} onOpenChange={opts.onPopoverChange}>
            <Tooltip>
              <TooltipTrigger asChild>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="contents text-left"
                  >
                    <Avatar className="w-6 h-6 justify-self-start">
                      <AvatarImage src={getAvatarUrl(primary.avatar_url)} />
                      <AvatarFallback className="text-[9px]">{getInitials(primary.full_name)}</AvatarFallback>
                    </Avatar>
                    <span className="text-xs truncate min-w-0 justify-self-start hover:underline">
                      {expanded && partner ? (
                        <span className="inline-flex items-center gap-2">
                          <span className="truncate">{primary.full_name}</span>
                          <Avatar className="w-6 h-6 shrink-0">
                            <AvatarImage src={getAvatarUrl(partner.avatar_url)} />
                            <AvatarFallback className="text-[9px]">{getInitials(partner.full_name)}</AvatarFallback>
                          </Avatar>
                          <span className="truncate">{partner.full_name}</span>
                        </span>
                      ) : (
                        primary.full_name
                      )}
                    </span>
                  </button>
                </PopoverTrigger>
              </TooltipTrigger>
              <TooltipContent side="left" className="max-w-[240px]">
                {allNames}
              </TooltipContent>
            </Tooltip>
            <PopoverContent side="left" align="start" collisionPadding={16} className="w-64 p-2 z-[200]">
              {opts.popoverContent ?? (
                <div className="space-y-1">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground px-1 pb-1">
                    Holders ({opts.users.length})
                  </p>
                  {opts.users.map(u => (
                    <div key={u.user_id} className="flex items-center gap-2 px-1.5 py-1 rounded hover:bg-muted/60">
                      <Avatar className="w-5 h-5">
                        <AvatarImage src={getAvatarUrl(u.avatar_url)} />
                        <AvatarFallback className="text-[9px]">{getInitials(u.full_name)}</AvatarFallback>
                      </Avatar>
                      <span className="text-xs truncate">{u.full_name}</span>
                    </div>
                  ))}
                </div>
              )}
            </PopoverContent>
          </Popover>
        ) : (
          <>
            <span className="w-6 h-6" />
            <span className="text-[11px] italic text-muted-foreground truncate min-w-0">No users assigned</span>
          </>
        )}

        <div className="justify-self-start">
          {opts.isB2B && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); toggleB2BExpand(opts.key); }}
                  aria-pressed={expanded}
                  className={cn(
                    "inline-flex items-center justify-center text-[9px] font-semibold tracking-wider px-1.5 py-0 h-4 rounded-md border transition-colors cursor-pointer",
                    expanded
                      ? "bg-amber-200 text-amber-900 border-amber-400 ring-1 ring-amber-400 dark:bg-amber-800/60 dark:text-amber-100 dark:border-amber-600"
                      : "bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-200 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-800"
                  )}
                >
                  B2B
                </button>
              </TooltipTrigger>
              <TooltipContent side="left">
                {expanded ? 'Hide partner holder' : 'Show both holders'}
              </TooltipContent>
            </Tooltip>
          )}
        </div>

        <div className="justify-self-end">
          {opts.onDelete && (
            <button
              type="button"
              onClick={opts.onDelete}
              className="opacity-0 group-hover/row:opacity-100 transition-opacity p-1 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10"
              title={`Remove ${opts.title}`}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    );
  };

  // Secondary outline → primary-fill hover button
  const addBtnClass =
    "h-7 text-xs gap-1 border-border/60 text-muted-foreground hover:bg-primary hover:text-primary-foreground hover:border-primary transition-colors";

  const deliveringUsersForRow = displayDeliveringUsers.map(u => ({
    user_id: u.user_id,
    full_name: u.full_name,
    avatar_url: u.avatar_url,
  }));

  return (
    <div className="flex flex-col h-[calc(100vh-80px)]">
      <ScrollArea className="flex-1 min-h-0">
        <div className="space-y-5 mt-4 pr-4 pb-6">
          {/* VCR Item Description */}
          <div className="space-y-1.5">
            <Label className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">
              VCR Item Description *
            </Label>
            <Textarea
              value={vcrItem}
              onChange={(e) => setVcrItem(e.target.value)}
              className="text-sm"
              rows={3}
            />
          </div>

          {/* Topic — inline chip with click-to-edit */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">Topic:</span>
            {editingTopic ? (
              <Input
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                onBlur={() => setEditingTopic(false)}
                onKeyDown={(e) => { if (e.key === 'Enter') setEditingTopic(false); }}
                autoFocus
                className="h-7 text-xs w-48"
              />
            ) : (
              <button
                type="button"
                onClick={() => setEditingTopic(true)}
                className="text-xs font-medium px-1 py-0.5 rounded hover:bg-muted/60 hover:underline underline-offset-2 transition-colors"
                title="Click to edit"
              >
                {topic || <span className="italic text-muted-foreground">none</span>}
              </button>
            )}
          </div>


          {/* Guidance Notes — collapsible, label-left aligned with peers */}
          <div className="border-t border-border/40 pt-4 relative">
            <button
              type="button"
              onClick={() => setGuidanceOpen(o => !o)}
              className="w-full flex items-center text-left group"
            >
              <span className="absolute -left-5 top-4 flex items-center">
                {guidanceOpen ? (
                  <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                )}
              </span>
              <span className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">
                Guidance Notes
              </span>
            </button>
            {guidanceOpen && (
              <div className="mt-2">
                <Textarea
                  value={guidanceNotes}
                  onChange={(e) => setGuidanceNotes(e.target.value)}
                  className="text-sm resize-none overflow-hidden"
                  ref={(el) => {
                    if (el) {
                      el.style.height = 'auto';
                      el.style.height = `${el.scrollHeight}px`;
                    }
                  }}
                />
              </div>
            )}
          </div>

          {/* Delivering Party — header + single row, no standalone dropdown */}
          <div className="border-t border-border/40 pt-4">
            <div className="flex items-center justify-between mb-1">
              <Label className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">
                Delivering Party ({displayDeliveringUsers.length})
              </Label>
              <Popover open={addDeliveringOpen} onOpenChange={setAddDeliveringOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className={addBtnClass}>
                    <Plus className="w-3 h-3" /> Add
                  </Button>
                </PopoverTrigger>
                <PopoverContent side="left" align="end" collisionPadding={16} className="w-64 p-2 z-[200]">
                  <Input
                    placeholder="Search role or team member..."
                    value={deliveringSearch}
                    onChange={(e) => setDeliveringSearch(e.target.value)}
                    className="h-8 text-xs mb-2"
                  />
                  <div className="max-h-64 overflow-y-auto space-y-2">
                    {!deliveringParty && (
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground px-1 pb-1">Select role</p>
                        <div className="space-y-0.5">
                          {roles
                            .filter(r => !deliveringSearch || r.name.toLowerCase().includes(deliveringSearch.toLowerCase()))
                            .map(r => (
                              <button
                                key={r.id}
                                onClick={() => { setDeliveringParty(r.id); setDeliveringSearch(''); }}
                                className="w-full text-left text-xs px-2 py-1.5 rounded hover:bg-muted/60 transition-colors"
                              >
                                {r.name}
                              </button>
                            ))}
                        </div>
                      </div>
                    )}
                    {deliveringParty && (
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground px-1 pb-1">
                          Add member to {getRoleName(deliveringParty)}
                        </p>
                        <div className="space-y-0.5">
                          {availableDeliveringCandidates.map(user => (
                            <button
                              key={user.user_id}
                              onClick={() => { void handleAddDeliveringUser(user.user_id); }}
                              className="w-full text-left text-xs px-2 py-1.5 rounded hover:bg-muted/60 transition-colors"
                            >
                              <div className="font-medium truncate">{user.full_name}</div>
                              {user.role_name && (
                                <div className="text-[10px] text-muted-foreground truncate">{user.role_name}</div>
                              )}
                            </button>
                          ))}
                          {availableDeliveringCandidates.length === 0 && (
                            <p className="text-xs text-muted-foreground text-center py-4">No members available</p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            {displayDeliveringUsers.length > 0 ? (
              <div className="mt-1">
                {renderPartyRow({
                  key: 'delivering-row',
                  title: getRoleName(deliveringParty) || 'Delivering Party',
                  isB2B: isB2BPairUsers(displayDeliveringUsers as any),
                  users: deliveringUsersForRow,
                  popoverOpen: deliveringPopoverOpen,
                  onPopoverChange: setDeliveringPopoverOpen,
                  popoverContent: (
                    <div className="space-y-1">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground px-1 pb-1">
                        Assigned ({displayDeliveringUsers.length})
                      </p>
                      {displayDeliveringUsers.map(u => (
                        <div key={u.id} className="flex items-center justify-between gap-2 px-1.5 py-1 rounded hover:bg-muted/60 group/holder">
                          <div className="flex items-center gap-2 min-w-0">
                            <Avatar className="w-5 h-5">
                              <AvatarImage src={getAvatarUrl(u.avatar_url)} />
                              <AvatarFallback className="text-[9px]">{getInitials(u.full_name)}</AvatarFallback>
                            </Avatar>
                            <span className="text-xs truncate">{u.full_name}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => { void handleRemoveDeliveringUser(u); }}
                            className="opacity-0 group-hover/holder:opacity-100 p-0.5 rounded text-muted-foreground hover:text-destructive transition"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ),
                })}
              </div>
            ) : deliveringParty ? (
              <p className="text-[11px] italic text-muted-foreground mt-1.5">No users assigned to this role</p>
            ) : (
              <p className="text-[11px] italic text-muted-foreground mt-1.5">No delivering party assigned</p>
            )}
          </div>


          {/* Approving Parties — collapsible (default expanded) */}
          <div className="border-t border-border/40 pt-4">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setApproversOpen(o => !o)}
                className="flex items-center gap-2 group"
              >
                {approversOpen ? (
                  <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                )}
                <Label className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium cursor-pointer">
                  Approving Parties ({approvingParties.length})
                </Label>
              </button>
              <Popover open={addApproverOpen} onOpenChange={setAddApproverOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className={addBtnClass}>
                    <Plus className="w-3 h-3" /> Add
                  </Button>
                </PopoverTrigger>
                <PopoverContent side="left" align="end" collisionPadding={16} className="w-64 p-2 z-[200]">
                  <Input
                    placeholder="Search roles..."
                    value={approverSearch}
                    onChange={(e) => setApproverSearch(e.target.value)}
                    className="h-8 text-xs mb-2"
                  />
                  <div className="max-h-48 overflow-y-auto space-y-0.5">
                    {availableRolesToAdd.map(r => (
                      <button
                        key={r.id}
                        onClick={() => {
                          setApprovingParties(prev => [...prev, r.id]);
                          setApproverSearch('');
                        }}
                        className="w-full text-left text-xs px-2 py-1.5 rounded hover:bg-muted/60 transition-colors"
                      >
                        {r.name}
                      </button>
                    ))}
                    {availableRolesToAdd.length === 0 && (
                      <p className="text-xs text-muted-foreground text-center py-4">No more roles available</p>
                    )}
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            {approversOpen && (
              <div className="mt-1">
                {approvingParties.length > 0 ? (
                  <div>
                    {approvingParties.map(roleId => {
                      const users = getApprovingUsersForRole(roleId);
                      const b2b = isB2BPairUsers(users);
                      const roleName = getRoleName(roleId);
                      return renderPartyRow({
                        key: roleId,
                        title: roleName,
                        isB2B: b2b,
                        users: users.map(u => ({ user_id: u.user_id, full_name: u.full_name, avatar_url: u.avatar_url })),
                        onDelete: () => setDeleteApproverTarget({ roleId, name: roleName }),
                        popoverOpen: memberPopoverRoleId === roleId,
                        onPopoverChange: (open) => setMemberPopoverRoleId(open ? roleId : null),
                      });
                    })}
                  </div>
                ) : (
                  <p className="text-[11px] italic text-muted-foreground py-2">No approving parties assigned</p>
                )}
              </div>
            )}
          </div>
        </div>
      </ScrollArea>

      {/* Sticky footer — only when dirty */}
      <div className="shrink-0 border-t bg-background/95 backdrop-blur px-1 py-3">
        {isDirty ? (
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setVcrItem(initialSnapshot.vcrItem);
                setTopic(initialSnapshot.topic);
                setDeliveringParty(initialSnapshot.deliveringParty);
                setApprovingParties([...initialSnapshot.approvingParties]);
                setGuidanceNotes(initialSnapshot.guidanceNotes);
              }}
              className="text-muted-foreground"
            >
              Discard
            </Button>
            <Button
              onClick={() => onSave({
                vcr_item_id: item.id,
                vcr_item_override: vcrItem,
                topic_override: topic || null,
                delivering_party_role_id_override: deliveringParty || null,
                approving_party_role_ids_override: approvingParties.length > 0 ? approvingParties : null,
                guidance_notes_override: guidanceNotes || null,
              })}
              disabled={!vcrItem || isSaving}
              className="flex-1"
            >
              {isSaving ? 'Saving…' : 'Save Changes'}
            </Button>
          </div>
        ) : (
          <p className="text-center text-[11px] text-muted-foreground italic">No changes</p>
        )}
      </div>

      {/* Approver delete confirmation */}
      <AlertDialog open={!!deleteApproverTarget} onOpenChange={(open) => !open && setDeleteApproverTarget(null)}>
        <AlertDialogContent className="z-[200]" overlayClassName="z-[199] bg-black/80 backdrop-blur-sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Approving Party</AlertDialogTitle>
            <AlertDialogDescription>
              Remove <span className="font-semibold text-foreground">{deleteApproverTarget?.name}</span> from this VCR item's approving parties?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteApproverTarget) removeApprover(deleteApproverTarget.roleId);
                setDeleteApproverTarget(null);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};


// Add Item Form Component (mirrors EditItemForm structure)
interface CreateItemPayload {
  vcr_item: string;
  topic: string | null;
  category_id: string | null;
  delivering_party_role_id: string | null;
  approving_party_role_ids: string[] | null;
  guidance_notes: string | null;
}

const AddItemForm: React.FC<{
  roles: Role[];
  categories: Array<{ id: string; name: string; code: string }>;
  projectId?: string;
  projectLocationCtx?: ProjectLocationContext;
  onSave: (payload: CreateItemPayload) => void;
  isSaving: boolean;
}> = ({ roles, categories, projectId, projectLocationCtx, onSave, isSaving }) => {
  const [vcrItem, setVcrItem] = useState('');
  const [topic, setTopic] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [deliveringParty, setDeliveringParty] = useState('');
  const [approvingParties, setApprovingParties] = useState<string[]>([]);
  const [guidanceNotes, setGuidanceNotes] = useState('');
  const [addApproverOpen, setAddApproverOpen] = useState(false);
  const [approverSearch, setApproverSearch] = useState('');

  // Delivering-only family expansion (approving goes through the shared resolver).
  const deliveringRoleIds = deliveringParty ? [deliveringParty] : [];
  const expandedRoleIds = React.useMemo(() => {
    const expanded = new Set<string>();
    deliveringRoleIds.forEach(roleId => {
      expanded.add(roleId);
      const roleName = roles.find(r => r.id === roleId)?.name;
      if (roleName) {
        const familyNames = getRoleFamilyNames(roleName);
        roles.forEach(r => {
          if (familyNames.includes(r.name)) expanded.add(r.id);
        });
      }
    });
    return [...expanded];
  }, [deliveringRoleIds.join(','), roles]);

  const { data: resolvedUsers = [] } = useQuery({
    queryKey: ['add-form-delivering-users', expandedRoleIds.sort().join(','), projectId, projectLocationCtx?.hubName],
    queryFn: async () => {
      if (expandedRoleIds.length === 0) return [];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, avatar_url, role, position, hub')
        .in('role', expandedRoleIds)
        .eq('is_active', true);
      if (!profiles || profiles.length === 0) return [];
      const filtered = profiles.filter((p: any) => {
        if (!projectLocationCtx) return true;
        const roleName = roles.find(r => r.id === p.role)?.name || '';
        const usePortfolio = requiresPortfolio(roleName) && !requiresHub(roleName);
        return profileMatchesProjectLocation(
          { position: p.position, hub: p.hub },
          projectLocationCtx,
          usePortfolio
        );
      });
      return filtered.map((p: any) => ({
        user_id: p.user_id,
        full_name: p.full_name,
        avatar_url: p.avatar_url,
        role_id: p.role,
        position: p.position ?? null,
      })) as ResolvedUser[];
    },
    enabled: expandedRoleIds.length > 0,
  });

  // SHARED resolver — approving parties read org_role_holders first.
  const { data: approvingHoldersById = {} } = useApprovingPartyHoldersByIds({
    roles,
    roleIds: approvingParties,
    expandFamily: true,
    scopeKey: `vcr-add|${projectId || ''}|${projectLocationCtx?.hubName || ''}`,
    fallbackFilter: (p, roleName) => {
      if (!projectLocationCtx) return true;
      const usePortfolio = requiresPortfolio(roleName) && !requiresHub(roleName);
      return profileMatchesProjectLocation(
        { position: p.position, hub: p.hub },
        projectLocationCtx,
        usePortfolio,
      );
    },
  });

  const getUsersForRole = (roleId: string) => {
    const roleName = roles.find(r => r.id === roleId)?.name;
    const familyNames = roleName ? getRoleFamilyNames(roleName) : [];
    const familyRoleIds = new Set(roles.filter(r => familyNames.includes(r.name)).map(r => r.id));
    familyRoleIds.add(roleId);
    return resolvedUsers.filter(u => familyRoleIds.has(u.role_id));
  };
  const getApprovingUsersForRole = (roleId: string): ResolvedUser[] =>
    (approvingHoldersById[roleId] || []).map(h => ({
      user_id: h.user_id,
      full_name: h.full_name,
      avatar_url: h.avatar_url,
      role_id: h.role_id,
      position: h.position,
    }));
  const getRoleName = (roleId: string) => roles.find(r => r.id === roleId)?.name || 'Unknown';
  const removeApprover = (roleId: string) => setApprovingParties(prev => prev.filter(r => r !== roleId));

  const availableRolesToAdd = roles.filter(r =>
    !approvingParties.includes(r.id) &&
    r.id !== deliveringParty &&
    (approverSearch === '' || r.name.toLowerCase().includes(approverSearch.toLowerCase()))
  );

  return (
    <ScrollArea className="h-[calc(100vh-100px)]">
      <div className="space-y-5 mt-4 pr-4 pb-4">
        {/* Category */}
        <div className="space-y-1.5">
          <Label className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">Category *</Label>
          <Select value={categoryId} onValueChange={setCategoryId}>
            <SelectTrigger className="text-sm">
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent className="z-[200]">
              {categories.map(c => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">VCR Item Description *</Label>
          <Textarea
            value={vcrItem}
            onChange={(e) => setVcrItem(e.target.value)}
            className="text-sm"
            rows={3}
            placeholder="Enter the VCR item description..."
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">Topic</Label>
          <Input value={topic} onChange={(e) => setTopic(e.target.value)} className="text-sm" placeholder="e.g., Documentation, Training" />
        </div>

        {/* Delivering Party */}
        <div className="space-y-1.5">
          <Label className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">Delivering Party</Label>
          <Select value={deliveringParty} onValueChange={setDeliveringParty}>
            <SelectTrigger className="text-sm">
              <SelectValue placeholder="Select role" />
            </SelectTrigger>
            <SelectContent className="z-[200]">
              {roles.map(r => (
                <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {deliveringParty && (
            <div className="mt-2 flex items-center gap-2 flex-wrap">
              {getUsersForRole(deliveringParty).length > 0 ? (
                getUsersForRole(deliveringParty).map(user => (
                  <div key={user.user_id} className="flex items-center gap-2 bg-muted/50 rounded-full pl-1 pr-3 py-1">
                    <Avatar className="w-6 h-6">
                      <AvatarImage src={getAvatarUrl(user.avatar_url)} />
                      <AvatarFallback className="text-[9px]">{getInitials(user.full_name)}</AvatarFallback>
                    </Avatar>
                    <span className="text-xs">{user.full_name}</span>
                  </div>
                ))
              ) : (
                <p className="text-xs text-muted-foreground italic">No users assigned to this role</p>
              )}
            </div>
          )}
        </div>

        {/* Approving Parties */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">Approving Parties ({approvingParties.length})</Label>
            <Popover open={addApproverOpen} onOpenChange={setAddApproverOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-7 text-xs gap-1">
                  <Plus className="w-3 h-3" /> Add
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-2 z-[200]" align="end">
                <Input
                  placeholder="Search roles..."
                  value={approverSearch}
                  onChange={(e) => setApproverSearch(e.target.value)}
                  className="h-8 text-xs mb-2"
                />
                <ScrollArea className="h-48">
                  <div className="space-y-0.5">
                    {availableRolesToAdd.map(r => (
                      <button
                        key={r.id}
                        onClick={() => {
                          setApprovingParties(prev => [...prev, r.id]);
                          setApproverSearch('');
                        }}
                        className="w-full text-left text-xs px-2 py-1.5 rounded hover:bg-muted/60 transition-colors"
                      >
                        {r.name}
                      </button>
                    ))}
                    {availableRolesToAdd.length === 0 && (
                      <p className="text-xs text-muted-foreground text-center py-4">No more roles available</p>
                    )}
                  </div>
                </ScrollArea>
              </PopoverContent>
            </Popover>
          </div>

          {approvingParties.length > 0 ? (
            <div className="space-y-2">
              {approvingParties.map(roleId => {
                const users = getApprovingUsersForRole(roleId);
                const b2b = isB2BPairUsers(users);
                return (
                  <div key={roleId} className="border rounded-lg p-2.5 group/approver hover:border-primary/30 transition-colors">
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-xs font-medium text-muted-foreground truncate">{getRoleName(roleId)}</span>
                        {b2b && (
                          <Badge
                            variant="outline"
                            className="text-[9px] font-semibold tracking-wider px-1.5 py-0 h-4 bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border-amber-200 dark:border-amber-800"
                            title="Back-to-back pair — either holder can close the approval"
                          >
                            B2B
                          </Badge>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5 opacity-0 group-hover/approver:opacity-100 transition-opacity text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        onClick={() => removeApprover(roleId)}
                        title={`Remove ${getRoleName(roleId)}`}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                    {users.length > 0 ? (
                      <div className="flex items-center gap-2 flex-wrap">
                        {users.map(user => (
                          <div key={user.user_id} className="flex items-center gap-2 bg-muted/50 rounded-full pl-1 pr-3 py-1">
                            <Avatar className="w-6 h-6">
                              <AvatarImage src={getAvatarUrl(user.avatar_url)} />
                              <AvatarFallback className="text-[9px]">{getInitials(user.full_name)}</AvatarFallback>
                            </Avatar>
                            <span className="text-xs">{user.full_name}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[10px] text-muted-foreground italic">No users assigned</p>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="border border-dashed rounded-lg p-4 text-center">
              <p className="text-xs text-muted-foreground">No approving parties assigned</p>
            </div>
          )}
        </div>

        <div className="space-y-1.5">
          <Label className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">Guidance Notes</Label>
          <Textarea
            value={guidanceNotes}
            onChange={(e) => setGuidanceNotes(e.target.value)}
            className="text-sm"
            rows={2}
            placeholder="Optional guidance notes..."
          />
        </div>
        <Button
          onClick={() => onSave({
            vcr_item: vcrItem,
            topic: topic || null,
            category_id: categoryId || null,
            delivering_party_role_id: deliveringParty || null,
            approving_party_role_ids: approvingParties.length > 0 ? approvingParties : null,
            guidance_notes: guidanceNotes || null,
          })}
          disabled={!vcrItem || !categoryId || isSaving}
          className="w-full"
        >
          {isSaving ? 'Adding...' : 'Add Item'}
        </Button>
      </div>
    </ScrollArea>
  );
};

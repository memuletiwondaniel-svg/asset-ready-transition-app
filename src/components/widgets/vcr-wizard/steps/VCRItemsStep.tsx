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
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useParams } from 'react-router-dom';

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
  const { id: projectId } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string> | null>(null);
  const [editingItem, setEditingItem] = useState<MergedVCRItem | null>(null);
  const [editSheetOpen, setEditSheetOpen] = useState(false);
  const [addSheetOpen, setAddSheetOpen] = useState(false);
  const [naItem, setNaItem] = useState<MergedVCRItem | null>(null);

  // Determine if VCR has hydrocarbon systems
  const { data: hasHydrocarbon, isLoading: isLoadingHydrocarbon } = useQuery({
    queryKey: ['vcr-hydrocarbon-check', vcrId],
    queryFn: async () => {
      // Get systems linked to this VCR
      const { data: linkedSystems, error: lsError } = await supabase
        .from('p2a_handover_point_systems')
        .select('system_id')
        .eq('handover_point_id', vcrId);
      if (lsError) throw lsError;
      if (!linkedSystems || linkedSystems.length === 0) return false;

      const systemIds = linkedSystems.map(s => s.system_id);
      const { data: systems, error: sError } = await supabase
        .from('p2a_systems')
        .select('is_hydrocarbon')
        .in('id', systemIds)
        .eq('is_hydrocarbon', true)
        .limit(1);
      if (sError) throw sError;
      return (systems && systems.length > 0);
    },
  });

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

  const CATEGORY_ORDER = ['Design Integrity', 'Technical Integrity', 'Operating Integrity', 'Management Systems', 'Health & Safety'];
  const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
    'Design Integrity': { bg: 'bg-blue-50 dark:bg-blue-950/40', text: 'text-blue-700 dark:text-blue-300', border: 'border-blue-200 dark:border-blue-800' },
    'Technical Integrity': { bg: 'bg-teal-50 dark:bg-teal-950/40', text: 'text-teal-700 dark:text-teal-300', border: 'border-teal-200 dark:border-teal-800' },
    'Operating Integrity': { bg: 'bg-amber-50 dark:bg-amber-950/40', text: 'text-amber-700 dark:text-amber-300', border: 'border-amber-200 dark:border-amber-800' },
    'Management Systems': { bg: 'bg-purple-50 dark:bg-purple-950/40', text: 'text-purple-700 dark:text-purple-300', border: 'border-purple-200 dark:border-purple-800' },
    'Health & Safety': { bg: 'bg-rose-50 dark:bg-rose-950/40', text: 'text-rose-700 dark:text-rose-300', border: 'border-rose-200 dark:border-rose-800' },
  };
  const sortedCategories = Object.keys(grouped).sort((a, b) => {
    const ai = CATEGORY_ORDER.indexOf(a);
    const bi = CATEGORY_ORDER.indexOf(b);
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });

  // Default all categories to collapsed on first load
  useEffect(() => {
    if (collapsedCategories === null && sortedCategories.length > 0) {
      setCollapsedCategories(new Set(sortedCategories));
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
    <div className="space-y-4">
      {/* Template indicator */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Badge variant="secondary" className="text-[10px]">
          {hasHydrocarbon ? 'Hydrocarbon Systems' : 'Non-Hydrocarbon Systems'} Template
        </Badge>
        <span>•</span>
        <span>Items loaded based on linked system types</span>
      </div>

      {/* Header */}
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
          className="gap-1.5 shrink-0"
          onClick={() => setAddSheetOpen(true)}
        >
          <Plus className="w-3.5 h-3.5" />
          Add Item
        </Button>
      </div>

      {/* Items grouped by category */}
      <ScrollArea className="h-[calc(min(90vh,780px)-240px)]">
        <div className="space-y-3 pr-4">
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
                  <span className="text-sm font-semibold">{cat}</span>
                  <Badge variant="secondary" className="text-[10px] ml-auto">{catItems.length}</Badge>
                </button>

                {!isCollapsed && (
                  <div className="space-y-1.5 ml-6">
                    {catItems.map((item, idx) => {
                      const catCode = item.category?.code || '??';
                      const itemId = `${catCode}-${String(idx + 1).padStart(2, '0')}`;
                      const catColor = CATEGORY_COLORS[item.category?.name || ''] || { bg: 'bg-muted', text: 'text-muted-foreground', border: 'border-border' };

                      return (
                        <Card key={item.id} className={cn("group transition-colors cursor-pointer", item.is_na ? "opacity-50 border-dashed" : "hover:border-primary/40")} onClick={() => { if (!item.is_na) { setEditingItem(item); setEditSheetOpen(true); } }}>
                          <CardContent className="p-3">
                            <div className="flex items-start gap-3">
                              <Badge variant="outline" className={cn("text-[10px] font-mono font-semibold shrink-0 mt-0.5 border", item.is_na ? "bg-muted text-muted-foreground border-border line-through" : cn(catColor.bg, catColor.text, catColor.border))}>
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

          {/* N/A Items Section */}
          {naItems.length > 0 && (
            <div className="border-t border-border pt-3 mt-3">
              <button
                onClick={() => setCollapsedCategories(prev => {
                  const next = new Set(prev ?? []);
                  next.has('__NA__') ? next.delete('__NA__') : next.add('__NA__');
                  return next;
                })}
                className="flex items-center gap-2 w-full text-left py-2 px-1 hover:bg-muted/40 rounded transition-colors"
              >
                {effectiveCollapsed.has('__NA__') ? <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/50" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground/50" />}
                <Ban className="w-3.5 h-3.5 text-orange-500" />
                <span className="text-sm font-semibold text-orange-600 dark:text-orange-400">Not Applicable Items</span>
                <Badge variant="outline" className="text-[10px] ml-auto border-orange-300 dark:border-orange-700 text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/30">
                  {filteredNaItems.length}
                </Badge>
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
                    const catColor = CATEGORY_COLORS[catName] || { bg: 'bg-muted', text: 'text-muted-foreground', border: 'border-border' };

                    return (
                      <Card key={item.id} className="group border-dashed border-orange-200 dark:border-orange-900/50 bg-orange-50/30 dark:bg-orange-950/10">
                        <CardContent className="p-3">
                          <div className="flex items-start gap-3">
                            <Badge variant="outline" className={cn("text-[10px] font-mono font-semibold shrink-0 mt-0.5 border line-through", catColor.bg, catColor.text, catColor.border)}>
                              {itemId}
                            </Badge>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm leading-snug text-muted-foreground">{item.effective_vcr_item}</p>
                              {item.effective_topic && (
                                <p className="text-[10px] text-muted-foreground/70 mt-1">Topic: {item.effective_topic}</p>
                              )}
                              <div className="flex items-center gap-2 mt-1.5">
                                <Badge variant="outline" className="text-[9px] h-4 border-orange-300 dark:border-orange-700 text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/30">N/A</Badge>
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
      </ScrollArea>

      <Sheet open={editSheetOpen} onOpenChange={setEditSheetOpen}>
        <SheetContent className="w-[480px] sm:max-w-[480px]">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              Edit VCR Item
              {editingItem && (() => {
                const catName = editingItem.category?.name || '';
                const catCode = editingItem.category?.code || '??';
                const catItems = grouped[catName] || [];
                const idx = catItems.findIndex(i => i.id === editingItem.id);
                const badgeId = `${catCode}-${String(idx + 1).padStart(2, '0')}`;
                const colors = CATEGORY_COLORS[catName] || { bg: 'bg-muted', text: 'text-muted-foreground', border: 'border-border' };
                return (
                  <Badge variant="outline" className={cn("text-[10px] font-mono font-semibold border", colors.bg, colors.text, colors.border)}>
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
              onSave={(payload) => updateItem.mutate(payload)}
              isSaving={updateItem.isPending}
            />
          )}
        </SheetContent>
      </Sheet>

      {/* Add New Item Sheet */}
      <Sheet open={addSheetOpen} onOpenChange={setAddSheetOpen}>
        <SheetContent className="w-[480px] sm:max-w-[480px]">
          <SheetHeader>
            <SheetTitle>Add VCR Item</SheetTitle>
          </SheetHeader>
          <AddItemForm
            roles={roles}
            categories={categories}
            projectId={projectId}
            onSave={(payload) => createItem.mutate(payload)}
            isSaving={createItem.isPending}
          />
        </SheetContent>
      </Sheet>

      {/* N/A Confirmation */}
      <AlertDialog open={!!naItem} onOpenChange={() => setNaItem(null)}>
        <AlertDialogContent>
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
  onSave: (payload: OverridePayload) => void;
  isSaving: boolean;
}> = ({ item, roles, projectId, onSave, isSaving }) => {
  const [vcrItem, setVcrItem] = useState(item.effective_vcr_item);
  const [topic, setTopic] = useState(item.effective_topic || '');
  const [deliveringParty, setDeliveringParty] = useState(item.effective_delivering_party_role_id || '');
  const [approvingParties, setApprovingParties] = useState<string[]>(item.effective_approving_party_role_ids || []);
  const [guidanceNotes, setGuidanceNotes] = useState(item.effective_guidance_notes || '');
  const [addApproverOpen, setAddApproverOpen] = useState(false);
  const [approverSearch, setApproverSearch] = useState('');

  // Resolve actual users for all assigned role IDs
  const allRoleIds = [...new Set([deliveringParty, ...approvingParties].filter(Boolean))];

  const { data: resolvedUsers = [] } = useQuery({
    queryKey: ['edit-form-users', allRoleIds.sort().join(','), projectId],
    queryFn: async () => {
      if (allRoleIds.length === 0) return [];
      let candidates: any[] = [];

      if (projectId) {
        const { data: members } = await supabase
          .from('project_team_members')
          .select('user_id')
          .eq('project_id', projectId);
        if (members && members.length > 0) {
          const userIds = members.map((m: any) => m.user_id);
          const { data: profiles } = await supabase
            .from('profiles')
            .select('user_id, full_name, avatar_url, role')
            .in('user_id', userIds)
            .in('role', allRoleIds)
            .eq('is_active', true);
          candidates = profiles || [];
        }
      }

      // Fallback for uncovered roles
      const coveredRoles = new Set(candidates.map((p: any) => p.role));
      const uncovered = allRoleIds.filter(r => !coveredRoles.has(r));
      if (uncovered.length > 0) {
        const { data: fallback } = await supabase
          .from('profiles')
          .select('user_id, full_name, avatar_url, role, position')
          .in('role', uncovered)
          .eq('is_active', true);
        if (fallback) {
          const filtered = fallback.filter((p: any) => {
            const pos = (p.position || '').toLowerCase();
            return !pos.includes('asset');
          });
          candidates.push(...filtered);
        }
      }

      return candidates.map((p: any) => ({
        user_id: p.user_id,
        full_name: p.full_name,
        avatar_url: p.avatar_url,
        role_id: p.role,
      })) as ResolvedUser[];
    },
    enabled: allRoleIds.length > 0,
  });

  const getUsersForRole = (roleId: string) => resolvedUsers.filter(u => u.role_id === roleId);
  const getRoleName = (roleId: string) => roles.find(r => r.id === roleId)?.name || 'Unknown';

  const removeApprover = (roleId: string) => {
    setApprovingParties(prev => prev.filter(r => r !== roleId));
  };

  const availableRolesToAdd = roles.filter(r =>
    !approvingParties.includes(r.id) &&
    r.id !== deliveringParty &&
    (approverSearch === '' || r.name.toLowerCase().includes(approverSearch.toLowerCase()))
  );

  return (
    <ScrollArea className="h-[calc(100vh-100px)]">
      <div className="space-y-5 mt-4 pr-4 pb-4">
        <div className="space-y-1.5">
          <Label className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">VCR Item Description *</Label>
          <Textarea
            value={vcrItem}
            onChange={(e) => setVcrItem(e.target.value)}
            className="text-sm"
            rows={3}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">Topic</Label>
          <Input value={topic} onChange={(e) => setTopic(e.target.value)} className="text-sm" />
        </div>

        {/* Delivering Party */}
        <div className="space-y-1.5">
          <Label className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">Delivering Party</Label>
          <Select value={deliveringParty} onValueChange={setDeliveringParty}>
            <SelectTrigger className="text-sm">
              <SelectValue placeholder="Select role" />
            </SelectTrigger>
            <SelectContent>
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
              <PopoverContent className="w-64 p-2" align="end">
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
                const users = getUsersForRole(roleId);
                return (
                  <div key={roleId} className="border rounded-lg p-2.5 group/approver hover:border-primary/30 transition-colors">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-medium text-muted-foreground">{getRoleName(roleId)}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5 opacity-0 group-hover/approver:opacity-100 transition-opacity text-destructive hover:text-destructive"
                        onClick={() => removeApprover(roleId)}
                      >
                        <X className="w-3 h-3" />
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
          />
        </div>
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
          className="w-full"
        >
          {isSaving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </ScrollArea>
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
  onSave: (payload: CreateItemPayload) => void;
  isSaving: boolean;
}> = ({ roles, categories, projectId, onSave, isSaving }) => {
  const [vcrItem, setVcrItem] = useState('');
  const [topic, setTopic] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [deliveringParty, setDeliveringParty] = useState('');
  const [approvingParties, setApprovingParties] = useState<string[]>([]);
  const [guidanceNotes, setGuidanceNotes] = useState('');
  const [addApproverOpen, setAddApproverOpen] = useState(false);
  const [approverSearch, setApproverSearch] = useState('');

  const allRoleIds = [...new Set([deliveringParty, ...approvingParties].filter(Boolean))];

  const { data: resolvedUsers = [] } = useQuery({
    queryKey: ['add-form-users', allRoleIds.sort().join(','), projectId],
    queryFn: async () => {
      if (allRoleIds.length === 0) return [];
      let candidates: any[] = [];

      if (projectId) {
        const { data: members } = await supabase
          .from('project_team_members')
          .select('user_id')
          .eq('project_id', projectId);
        if (members && members.length > 0) {
          const userIds = members.map((m: any) => m.user_id);
          const { data: profiles } = await supabase
            .from('profiles')
            .select('user_id, full_name, avatar_url, role')
            .in('user_id', userIds)
            .in('role', allRoleIds)
            .eq('is_active', true);
          candidates = profiles || [];
        }
      }

      const coveredRoles = new Set(candidates.map((p: any) => p.role));
      const uncovered = allRoleIds.filter(r => !coveredRoles.has(r));
      if (uncovered.length > 0) {
        const { data: fallback } = await supabase
          .from('profiles')
          .select('user_id, full_name, avatar_url, role, position')
          .in('role', uncovered)
          .eq('is_active', true);
        if (fallback) {
          const filtered = fallback.filter((p: any) => {
            const pos = (p.position || '').toLowerCase();
            return !pos.includes('asset');
          });
          candidates.push(...filtered);
        }
      }

      return candidates.map((p: any) => ({
        user_id: p.user_id,
        full_name: p.full_name,
        avatar_url: p.avatar_url,
        role_id: p.role,
      })) as ResolvedUser[];
    },
    enabled: allRoleIds.length > 0,
  });

  const getUsersForRole = (roleId: string) => resolvedUsers.filter(u => u.role_id === roleId);
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
            <SelectContent>
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
            <SelectContent>
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
              <PopoverContent className="w-64 p-2" align="end">
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
                const users = getUsersForRole(roleId);
                return (
                  <div key={roleId} className="border rounded-lg p-2.5 group/approver hover:border-primary/30 transition-colors">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-medium text-muted-foreground">{getRoleName(roleId)}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5 opacity-0 group-hover/approver:opacity-100 transition-opacity text-destructive hover:text-destructive"
                        onClick={() => removeApprover(roleId)}
                      >
                        <X className="w-3 h-3" />
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

import React, { useState, useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, FileCheck, ChevronDown, ChevronRight, Ban, Undo2, Edit2, Globe, Loader2, Plus, User, Trash2 } from 'lucide-react';
import { usePSSRChecklistItems, usePSSRChecklistCategories, ChecklistItem } from '@/hooks/usePSSRChecklistLibrary';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChecklistItemOverride } from './ChecklistItemEditDialog';
import PSSRItemDetailSheet from './PSSRItemDetailSheet';
import AddPSSRItemSheet from './AddPSSRItemSheet';
import { useChecklistTranslation } from '@/hooks/useChecklistTranslation';
import { useLanguage } from '@/contexts/LanguageContext';
import { Progress } from '@/components/ui/progress';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ChecklistItemOverrides {
  [itemId: string]: ChecklistItemOverride;
}

interface WizardStepChecklistItemsProps {
  selectedItemIds: string[];
  itemOverrides: ChecklistItemOverrides;
  onItemToggle: (itemId: string) => void;
  onSelectAllItems: (itemIds: string[]) => void;
  onDeselectAll: () => void;
  onItemOverrideChange: (itemId: string, override: ChecklistItemOverride) => void;
  onItemOverrideReset: (itemId: string) => void;
  // N/A items management
  naItemIds?: string[];
  onMarkNA?: (itemId: string) => void;
  onRestoreNA?: (itemId: string) => void;
  // Location context for personnel resolution
  plantName?: string;
  fieldName?: string;
  // Adding items
  onAddExistingItems?: (itemIds: string[]) => void;
  onAddCustomItem?: (item: { category: string; description: string; topic?: string; supporting_evidence?: string }) => void;
  /** Remove a custom item or all items in a custom category */
  onRemoveCustomItem?: (itemId: string) => void;
  onRemoveCustomCategory?: (categoryId: string) => void;
  /** Custom items added during this wizard session */
  customItems?: ChecklistItem[];
}

const WizardStepChecklistItems: React.FC<WizardStepChecklistItemsProps> = ({
  selectedItemIds,
  itemOverrides,
  onItemToggle,
  onSelectAllItems,
  onDeselectAll,
  onItemOverrideChange,
  onItemOverrideReset,
  naItemIds = [],
  onMarkNA,
  onRestoreNA,
  plantName,
  fieldName,
  onAddExistingItems,
  onAddCustomItem,
  onRemoveCustomItem,
  onRemoveCustomCategory,
  customItems = [],
}) => {
  const { data: rawChecklistItems = [], isLoading: itemsLoading } = usePSSRChecklistItems();
  const { data: rawCategories = [], isLoading: categoriesLoading } = usePSSRChecklistCategories();
  const { language } = useLanguage();

  const {
    items: checklistItems,
    isTranslating: isTranslatingItems,
    translationProgress: itemsProgress,
    isEnglish
  } = useChecklistTranslation(rawChecklistItems, ['description', 'topic']);

  const {
    items: categories,
    isTranslating: isTranslatingCategories,
    translationProgress: categoriesProgress
  } = useChecklistTranslation(rawCategories, ['name', 'description']);

  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [naExpanded, setNaExpanded] = useState(false);
  const [detailSheetOpen, setDetailSheetOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<ChecklistItem | null>(null);
  const [addSheetOpen, setAddSheetOpen] = useState(false);

  const isLoading = itemsLoading || categoriesLoading;
  const isTranslating = isTranslatingItems || isTranslatingCategories;
  const avgProgress = Math.round((itemsProgress + categoriesProgress) / 2);

  // Resolve delivering party role names to actual people
  const { data: resolvedDeliveringParties = {} } = useQuery({
    queryKey: ['pssr-delivering-parties', plantName, fieldName],
    queryFn: async () => {
      // Get all unique responsible role names from checklist items
      const allResponsibleRoles = new Set<string>();
      rawChecklistItems.forEach(item => {
        if (item.responsible) {
          item.responsible.split(',').forEach(r => {
            const trimmed = r.trim();
            if (trimmed) allResponsibleRoles.add(trimmed);
          });
        }
      });

      if (allResponsibleRoles.size === 0) return {};

      // Find role IDs for these names
      const { data: roles } = await supabase
        .from('roles')
        .select('id, name')
        .eq('is_active', true);

      if (!roles) return {};

      const roleNameToId: Record<string, string> = {};
      roles.forEach(r => { roleNameToId[r.name.toLowerCase()] = r.id; });

      const matchedRoleIds = [...allResponsibleRoles]
        .map(name => ({ name, id: roleNameToId[name.toLowerCase()] }))
        .filter(r => r.id);

      if (matchedRoleIds.length === 0) return {};

      // Get profiles with these roles
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, avatar_url, role, position')
        .in('role', matchedRoleIds.map(r => r.id))
        .eq('is_active', true);

      if (!profiles) return {};

      // Build a map: roleName -> best matching person name
      const result: Record<string, string> = {};
      matchedRoleIds.forEach(({ name, id }) => {
        let candidates = profiles.filter((p: any) => p.role === id);

        // Filter by plant/field if available
        if (plantName) {
          const plantLower = plantName.toLowerCase();
          const fieldLower = fieldName?.toLowerCase() || '';
          const locationFiltered = candidates.filter((p: any) => {
            const pos = (p.position || '').toLowerCase();
            if (!pos.includes(plantLower)) return false;
            if (fieldLower && !pos.includes(fieldLower)) return false;
            return true;
          });
          if (locationFiltered.length > 0) candidates = locationFiltered;
        }

        if (candidates.length === 1) {
          result[name] = candidates[0].full_name || name;
        } else if (candidates.length > 1) {
          // Take the first location-matched one
          result[name] = candidates[0].full_name || name;
        }
        // If no candidates, leave it as role name (not added to map)
      });

      return result;
    },
    enabled: rawChecklistItems.length > 0 && !!plantName,
  });

  // All items including custom ones
  const allChecklistItems = useMemo(() => {
    return [...checklistItems, ...customItems];
  }, [checklistItems, customItems]);

  // Active items (selected and not N/A)
  const activeItems = useMemo(() => {
    return allChecklistItems.filter(item =>
      selectedItemIds.includes(item.id) && !naItemIds.includes(item.id)
    );
  }, [allChecklistItems, selectedItemIds, naItemIds]);

  // N/A items
  const naItems = useMemo(() => {
    return allChecklistItems.filter(item => naItemIds.includes(item.id));
  }, [allChecklistItems, naItemIds]);

  // Group active items by category
  const groupedItems = useMemo(() => {
    const groups: Record<string, ChecklistItem[]> = {};
    activeItems.forEach(item => {
      if (!groups[item.category]) groups[item.category] = [];
      groups[item.category].push(item);
    });
    return groups;
  }, [activeItems]);

  // Filter by search
  const filteredGroupedItems = useMemo(() => {
    if (!searchQuery.trim()) return groupedItems;
    const query = searchQuery.toLowerCase();
    const filtered: Record<string, ChecklistItem[]> = {};
    Object.entries(groupedItems).forEach(([categoryId, items]) => {
      const matched = items.filter(item =>
        item.description.toLowerCase().includes(query) ||
        item.topic?.toLowerCase().includes(query)
      );
      if (matched.length > 0) filtered[categoryId] = matched;
    });
    return filtered;
  }, [groupedItems, searchQuery]);

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(categoryId)) newSet.delete(categoryId);
      else newSet.add(categoryId);
      return newSet;
    });
  };

  const getCategoryName = (categoryId: string) => {
    if (categoryId.startsWith('other:')) return categoryId.replace('other:', '');
    return categories.find(c => c.id === categoryId)?.name || 'Unknown Category';
  };

  const getCategoryRefId = (categoryId: string) => {
    if (categoryId.startsWith('other:')) return 'OT';
    return categories.find(c => c.id === categoryId)?.ref_id || '';
  };

  const handleItemClick = (item: ChecklistItem) => {
    setSelectedItem(item);
    setDetailSheetOpen(true);
  };

  const handleMarkNA = (e: React.MouseEvent, itemId: string) => {
    e.stopPropagation();
    onMarkNA?.(itemId);
  };

  const handleEditClick = (e: React.MouseEvent, item: ChecklistItem) => {
    e.stopPropagation();
    handleItemClick(item);
  };

  const totalActiveItems = activeItems.length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="space-y-2">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <FileCheck className="h-5 w-5 text-primary" />
          PSSR Items
          {!isEnglish && (
            <Badge variant="outline" className="text-xs gap-1">
              <Globe className="h-3 w-3" />
              {language}
            </Badge>
          )}
        </h3>
        <p className="text-sm text-muted-foreground">
          Review, edit, add or remove PSSR checklist items and assign parties.
        </p>

        {isTranslating && !isEnglish && (
          <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-md">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            <span className="text-sm text-muted-foreground">Translating to {language}...</span>
            <Progress value={avgProgress} className="flex-1 h-2" />
            <span className="text-xs text-muted-foreground">{avgProgress}%</span>
          </div>
        )}
      </div>

      {/* Search & Counts */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="relative flex-1 w-full sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search items..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-2">
          {onAddExistingItems && onAddCustomItem && (
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs gap-1.5"
              onClick={() => setAddSheetOpen(true)}
            >
              <Plus className="h-3.5 w-3.5" />
              Add Item
            </Button>
          )}
          <Badge variant="outline" className="text-xs">
            {totalActiveItems} items
          </Badge>
          {naItemIds.length > 0 && (
            <Badge variant="outline" className="text-xs border-amber-300 text-amber-700 dark:border-amber-700 dark:text-amber-400">
              {naItemIds.length} N/A
            </Badge>
          )}
        </div>
      </div>

      {/* Categories List - All collapsed by default */}
      <ScrollArea className="h-[400px] border rounded-lg">
        <div className="divide-y divide-border">
          {Object.entries(filteredGroupedItems).length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchQuery ? 'No items match your search' : 'No checklist items available'}
            </div>
          ) : (
            Object.entries(filteredGroupedItems)
              .sort(([catIdA], [catIdB]) => {
                const catA = categories.find(c => c.id === catIdA);
                const catB = categories.find(c => c.id === catIdB);
                return (catA?.display_order ?? 999) - (catB?.display_order ?? 999);
              })
              .map(([categoryId, items], categoryIndex) => {
                const isExpanded = expandedCategories.has(categoryId);
                const refId = getCategoryRefId(categoryId);

                // Category color palette for ID badges
                const categoryColors = [
                  'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-700',
                  'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-700',
                  'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-700',
                  'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-900/20 dark:text-rose-300 dark:border-rose-700',
                  'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-900/20 dark:text-indigo-300 dark:border-indigo-700',
                  'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-900/20 dark:text-teal-300 dark:border-teal-700',
                  'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:text-purple-300 dark:border-purple-700',
                  'bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-900/20 dark:text-cyan-300 dark:border-cyan-700',
                ];
                const badgeColor = categoryColors[categoryIndex % categoryColors.length];

                return (
                  <Collapsible
                    key={categoryId}
                    open={isExpanded}
                    onOpenChange={() => toggleCategory(categoryId)}
                  >
                    <CollapsibleTrigger className="w-full">
                      <div className="group/cat flex items-center justify-between px-4 py-3 hover:bg-muted/40 transition-colors">
                        <div className="flex items-center gap-2">
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4 text-muted-foreground/60" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-muted-foreground/60" />
                          )}
                          <Badge variant="outline" className={`text-[10px] font-mono px-1.5 py-0 ${badgeColor}`}>
                            {refId}
                          </Badge>
                          <span className="font-semibold text-sm uppercase tracking-wide text-foreground">{getCategoryName(categoryId)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {/* Delete custom category button */}
                          {categoryId.startsWith('other:') && onRemoveCustomCategory && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onRemoveCustomCategory(categoryId);
                              }}
                              className="p-1 rounded-md opacity-0 group-hover/cat:opacity-100 hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all"
                              title="Delete category and all its items"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                          <span className="text-sm text-muted-foreground">{items.length}</span>
                        </div>
                      </div>
                    </CollapsibleTrigger>

                    <CollapsibleContent>
                      <div className="divide-y divide-border/50">
                        {items.map((item, itemIndex) => {
                          const hasOverride = itemOverrides[item.id] && Object.keys(itemOverrides[item.id]).length > 0;
                          const displayDescription = itemOverrides[item.id]?.description ?? item.description;
                          const displayTopic = itemOverrides[item.id]?.topic ?? item.topic;
                          const responsibleRole = itemOverrides[item.id]?.responsible ?? item.responsible;
                          const resolvedName = plantName && responsibleRole ? resolvedDeliveringParties[responsibleRole] : null;
                          // Sequential numbering within the visible category (1-based)
                          const itemRefId = refId
                            ? `${refId}-${String(itemIndex + 1).padStart(2, '0')}`
                            : `#${itemIndex + 1}`;

                          return (
                            <div
                              key={item.id}
                              className="group flex items-start gap-3 px-6 py-3 hover:bg-muted/30 transition-colors cursor-pointer"
                              onClick={() => handleItemClick(item)}
                            >
                              {/* Item ID Badge - color coded per category */}
                              <Badge
                                variant="outline"
                                className={`text-[10px] font-mono mt-0.5 shrink-0 ${badgeColor}`}
                              >
                                {itemRefId}
                              </Badge>

                              {/* Content */}
                              <div className="flex-1 min-w-0">
                                <p className="text-sm leading-snug">
                                  {displayDescription}
                                </p>
                                <div className="flex items-center gap-2 mt-1 flex-wrap">
                                  {displayTopic && (
                                    <span className="text-xs text-muted-foreground">{displayTopic}</span>
                                  )}
                                  {responsibleRole && (
                                    <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded">
                                      <User className="h-2.5 w-2.5" />
                                      {resolvedName || responsibleRole}
                                    </span>
                                  )}
                                  {hasOverride && (
                                    <Badge variant="secondary" className="text-[10px] bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
                                      Customized
                                    </Badge>
                                  )}
                                </div>
                              </div>

                              {/* Hover Actions */}
                              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                <button
                                  type="button"
                                  onClick={(e) => handleEditClick(e, item)}
                                  className="p-1.5 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                                  title="Edit item"
                                >
                                  <Edit2 className="h-3.5 w-3.5" />
                                </button>
                                {item.id.startsWith('custom-') && onRemoveCustomItem && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onRemoveCustomItem(item.id);
                                    }}
                                    className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                                    title="Delete custom item"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                )}
                                {onMarkNA && (
                                  <button
                                    type="button"
                                    onClick={(e) => handleMarkNA(e, item.id)}
                                    className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                                    title="Mark as Not Applicable"
                                  >
                                    <Ban className="h-3.5 w-3.5" />
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                );
              })
          )}

          {/* Not Applicable Items Section */}
          {naItems.length > 0 && (
            <Collapsible open={naExpanded} onOpenChange={setNaExpanded}>
              <CollapsibleTrigger className="w-full">
                <div className="flex items-center justify-between px-4 py-3 hover:bg-muted/40 transition-colors">
                  <div className="flex items-center gap-2">
                    {naExpanded ? (
                      <ChevronDown className="h-4 w-4 text-muted-foreground/60" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground/60" />
                    )}
                    <Ban className="h-4 w-4 text-amber-600" />
                    <span className="font-medium text-sm text-amber-700 dark:text-amber-400">Not Applicable Items</span>
                  </div>
                  <Badge variant="outline" className="text-xs border-amber-300 text-amber-700 bg-amber-50 dark:border-amber-700 dark:text-amber-400 dark:bg-amber-900/20">
                    {naItems.length}
                  </Badge>
                </div>
              </CollapsibleTrigger>

              <CollapsibleContent>
                <div className="px-6 pb-2">
                  <p className="text-xs text-muted-foreground mb-3">
                    These items have been marked as not applicable to this PSSR. Approvers can review this list during the approval process.
                  </p>
                </div>
                <div className="divide-y divide-border/50">
                  {naItems.map((item, naIndex) => {
                    const catRefId = getCategoryRefId(item.category);
                    const itemRefId = catRefId
                      ? `${catRefId}-N${naIndex + 1}`
                      : `#N${naIndex + 1}`;

                    return (
                      <div
                        key={item.id}
                        className="group flex items-start gap-3 px-6 py-3 bg-amber-50/50 dark:bg-amber-900/5 hover:bg-amber-50 dark:hover:bg-amber-900/10 transition-colors"
                      >
                        <Badge
                          variant="outline"
                          className="text-[10px] font-mono mt-0.5 shrink-0 border-amber-300 text-amber-700 bg-amber-50 dark:border-amber-700 dark:text-amber-400 dark:bg-amber-900/20"
                        >
                          {itemRefId}
                        </Badge>

                        <div className="flex-1 min-w-0">
                          <p className="text-sm leading-snug line-through text-muted-foreground">
                            {item.description}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-[10px] border-amber-300 text-amber-600 dark:border-amber-700 dark:text-amber-400">
                              N/A
                            </Badge>
                            <span className="text-[10px] text-muted-foreground">
                              {getCategoryName(item.category)}
                            </span>
                          </div>
                        </div>

                        {onRestoreNA && (
                          <button
                            type="button"
                            onClick={() => onRestoreNA(item.id)}
                            className="p-1.5 rounded-md opacity-0 group-hover:opacity-100 hover:bg-accent text-muted-foreground hover:text-foreground transition-all"
                            title="Restore item"
                          >
                            <Undo2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}
        </div>
      </ScrollArea>

      {/* Item Detail Sheet */}
      <PSSRItemDetailSheet
        open={detailSheetOpen}
        onOpenChange={setDetailSheetOpen}
        item={selectedItem}
        categoryRefId={selectedItem ? getCategoryRefId(selectedItem.category) : undefined}
        currentOverride={selectedItem ? itemOverrides[selectedItem.id] : undefined}
        onSave={onItemOverrideChange}
        onReset={onItemOverrideReset}
        plantName={plantName}
        fieldName={fieldName}
      />

      {/* Add Item Sheet */}
      {onAddExistingItems && onAddCustomItem && (
        <AddPSSRItemSheet
          open={addSheetOpen}
          onOpenChange={setAddSheetOpen}
          selectedItemIds={selectedItemIds}
          onAddExistingItems={onAddExistingItems}
          onAddCustomItem={onAddCustomItem}
        />
      )}
    </div>
  );
};

export default WizardStepChecklistItems;

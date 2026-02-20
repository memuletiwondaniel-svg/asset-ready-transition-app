import React, { useState, useMemo } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Plus, Database, FileText, Check } from 'lucide-react';
import { usePSSRChecklistItems, usePSSRChecklistCategories, ChecklistItem } from '@/hooks/usePSSRChecklistLibrary';
import { useRoles } from '@/hooks/useRoles';

interface AddPSSRItemSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** IDs already selected in the wizard */
  selectedItemIds: string[];
  /** Called when user selects existing items from DB */
  onAddExistingItems: (itemIds: string[]) => void;
  /** Called when user creates a brand new custom item */
  onAddCustomItem: (item: {
    category: string;
    description: string;
    topic?: string;
    supporting_evidence?: string;
  }) => void;
}

const AddPSSRItemSheet: React.FC<AddPSSRItemSheetProps> = ({
  open,
  onOpenChange,
  selectedItemIds,
  onAddExistingItems,
  onAddCustomItem,
}) => {
  const { data: allItems = [] } = usePSSRChecklistItems();
  const { data: categories = [] } = usePSSRChecklistCategories();
  const { roles = [] } = useRoles();

  // DB tab state
  const [dbSearch, setDbSearch] = useState('');
  const [dbSelectedIds, setDbSelectedIds] = useState<Set<string>>(new Set());

  // Custom tab state
  const [customCategory, setCustomCategory] = useState('');
  const [customDescription, setCustomDescription] = useState('');
  const [customTopic, setCustomTopic] = useState('');
  const [customEvidence, setCustomEvidence] = useState('');

  // Available items (not already selected)
  const availableItems = useMemo(() => {
    return allItems.filter(item => !selectedItemIds.includes(item.id));
  }, [allItems, selectedItemIds]);

  // Filtered by search
  const filteredItems = useMemo(() => {
    if (!dbSearch.trim()) return availableItems;
    const q = dbSearch.toLowerCase();
    return availableItems.filter(item =>
      item.description.toLowerCase().includes(q) ||
      item.topic?.toLowerCase().includes(q)
    );
  }, [availableItems, dbSearch]);

  // Group by category
  const groupedItems = useMemo(() => {
    const groups: Record<string, ChecklistItem[]> = {};
    filteredItems.forEach(item => {
      if (!groups[item.category]) groups[item.category] = [];
      groups[item.category].push(item);
    });
    return groups;
  }, [filteredItems]);

  const getCategoryName = (catId: string) =>
    categories.find(c => c.id === catId)?.name || 'Unknown';

  const getCategoryRefId = (catId: string) =>
    categories.find(c => c.id === catId)?.ref_id || '';

  const toggleDbItem = (id: string) => {
    setDbSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleAddFromDb = () => {
    if (dbSelectedIds.size === 0) return;
    onAddExistingItems(Array.from(dbSelectedIds));
    setDbSelectedIds(new Set());
    setDbSearch('');
    onOpenChange(false);
  };

  const handleAddCustom = () => {
    if (!customCategory || !customDescription.trim()) return;
    onAddCustomItem({
      category: customCategory,
      description: customDescription.trim(),
      topic: customTopic.trim() || undefined,
      supporting_evidence: customEvidence.trim() || undefined,
    });
    // Reset
    setCustomCategory('');
    setCustomDescription('');
    setCustomTopic('');
    setCustomEvidence('');
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg p-0 flex flex-col">
        <SheetHeader className="px-6 pt-6 pb-4 border-b">
          <SheetTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5 text-primary" />
            Add PSSR Item
          </SheetTitle>
        </SheetHeader>

        <Tabs defaultValue="database" className="flex-1 flex flex-col overflow-hidden [&>div[role=tabpanel][data-state=inactive]]:hidden [&>div[role=tabpanel][data-state=inactive]]:!p-0 [&>div[role=tabpanel][data-state=inactive]]:!m-0">
          <div className="px-6 pt-3">
            <TabsList className="w-full">
              <TabsTrigger value="database" className="flex-1 gap-1.5">
                <Database className="h-3.5 w-3.5" />
                From Library
              </TabsTrigger>
              <TabsTrigger value="custom" className="flex-1 gap-1.5">
                <FileText className="h-3.5 w-3.5" />
                New Custom
              </TabsTrigger>
            </TabsList>
          </div>

          {/* From Database */}
          <TabsContent value="database" className="flex-1 flex flex-col overflow-hidden mt-0 px-6 py-4">
            <p className="text-xs text-muted-foreground mb-3">
              Select items from the PSSR checklist library to add to this PSSR.
            </p>

            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search items..."
                value={dbSearch}
                onChange={e => setDbSearch(e.target.value)}
                className="pl-9"
              />
            </div>

            {dbSelectedIds.size > 0 && (
              <div className="flex items-center justify-between mb-3 p-2 bg-primary/5 rounded-md">
                <span className="text-sm font-medium text-primary">
                  {dbSelectedIds.size} item{dbSelectedIds.size > 1 ? 's' : ''} selected
                </span>
                <Button size="sm" onClick={handleAddFromDb} className="h-7 text-xs">
                  <Plus className="h-3 w-3 mr-1" />
                  Add Selected
                </Button>
              </div>
            )}

            <ScrollArea className="flex-1 border rounded-lg">
              <div className="divide-y divide-border">
                {Object.keys(groupedItems).length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    {dbSearch ? 'No items match your search' : 'All items are already added'}
                  </div>
                ) : (
                  Object.entries(groupedItems)
                    .sort(([a], [b]) => {
                      const catA = categories.find(c => c.id === a);
                      const catB = categories.find(c => c.id === b);
                      return (catA?.display_order ?? 999) - (catB?.display_order ?? 999);
                    })
                    .map(([catId, items]) => (
                      <div key={catId}>
                        <div className="px-3 py-2 bg-muted/30 border-b">
                          <span className="text-xs font-medium text-muted-foreground">
                            {getCategoryName(catId)}
                          </span>
                          <Badge variant="secondary" className="text-[10px] ml-2">
                            {items.length}
                          </Badge>
                        </div>
                        {items.map(item => {
                          const isSelected = dbSelectedIds.has(item.id);
                          const refId = getCategoryRefId(catId);
                          const itemRefId = refId
                            ? `${refId}-${String(item.sequence_number).padStart(2, '0')}`
                            : `#${item.sequence_number}`;

                          return (
                            <div
                              key={item.id}
                              onClick={() => toggleDbItem(item.id)}
                              className={`flex items-start gap-3 px-3 py-2.5 cursor-pointer transition-colors ${
                                isSelected
                                  ? 'bg-primary/5 border-l-2 border-l-primary'
                                  : 'hover:bg-muted/30'
                              }`}
                            >
                              <div className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${
                                isSelected ? 'bg-primary border-primary' : 'border-muted-foreground/30'
                              }`}>
                                {isSelected && <Check className="h-3 w-3 text-primary-foreground" />}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <Badge variant="outline" className="text-[9px] font-mono shrink-0 bg-primary/5 text-primary border-primary/20">
                                    {itemRefId}
                                  </Badge>
                                </div>
                                <p className="text-xs mt-1 leading-snug">{item.description}</p>
                                {item.topic && (
                                  <span className="text-[10px] text-muted-foreground">{item.topic}</span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ))
                )}
              </div>
            </ScrollArea>

            {dbSelectedIds.size > 0 && (
              <div className="pt-3">
                <Button className="w-full" onClick={handleAddFromDb}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add {dbSelectedIds.size} Item{dbSelectedIds.size > 1 ? 's' : ''}
                </Button>
              </div>
            )}
          </TabsContent>

          {/* Custom New Item */}
          <TabsContent value="custom" className="overflow-auto mt-0 px-6 py-4">
            <p className="text-xs text-muted-foreground mb-4">
              Create a new custom PSSR item for this specific PSSR.
            </p>

              <div className="space-y-4">
                {/* Category */}
                <div className="space-y-1.5">
                  <Label className="text-sm">Category <span className="text-destructive">*</span></Label>
                  <Select value={customCategory} onValueChange={setCustomCategory}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories
                        .filter(c => c.is_active)
                        .sort((a, b) => a.display_order - b.display_order)
                        .map(cat => (
                          <SelectItem key={cat.id} value={cat.id}>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-[9px] font-mono">{cat.ref_id}</Badge>
                              {cat.name}
                            </div>
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Topic */}
                <div className="space-y-1.5">
                  <Label className="text-sm">Topic</Label>
                  <Input
                    value={customTopic}
                    onChange={e => setCustomTopic(e.target.value)}
                    placeholder="e.g., Pressure Testing"
                  />
                </div>

                {/* Description */}
                <div className="space-y-1.5">
                  <Label className="text-sm">Description <span className="text-destructive">*</span></Label>
                  <Textarea
                    value={customDescription}
                    onChange={e => setCustomDescription(e.target.value)}
                    placeholder="Describe the checklist item requirement..."
                    rows={4}
                  />
                </div>

                {/* Supporting Evidence */}
                <div className="space-y-1.5">
                  <Label className="text-sm">Supporting Evidence</Label>
                  <Textarea
                    value={customEvidence}
                    onChange={e => setCustomEvidence(e.target.value)}
                    placeholder="What evidence is required to satisfy this item?"
                    rows={3}
                  />
                </div>
              </div>

            <div className="pt-4 border-t mt-4">
              <Button
                className="w-full"
                onClick={handleAddCustom}
                disabled={!customCategory || !customDescription.trim()}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Custom Item
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
};

export default AddPSSRItemSheet;

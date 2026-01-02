import React, { useState, useMemo } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, FileCheck, ChevronDown, ChevronRight } from 'lucide-react';
import { usePSSRChecklistItems, usePSSRChecklistCategories } from '@/hooks/usePSSRChecklistLibrary';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface WizardStepChecklistItemsProps {
  selectedItemIds: string[];
  onItemToggle: (itemId: string) => void;
  onSelectAllItems: (itemIds: string[]) => void;
  onDeselectAll: () => void;
}

const WizardStepChecklistItems: React.FC<WizardStepChecklistItemsProps> = ({
  selectedItemIds,
  onItemToggle,
  onSelectAllItems,
  onDeselectAll,
}) => {
  const { data: checklistItems = [], isLoading: itemsLoading } = usePSSRChecklistItems();
  const { data: categories = [], isLoading: categoriesLoading } = usePSSRChecklistCategories();
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  const isLoading = itemsLoading || categoriesLoading;

  // Group items by category
  const groupedItems = useMemo(() => {
    const groups: Record<string, typeof checklistItems> = {};
    
    checklistItems.forEach(item => {
      if (!groups[item.category]) {
        groups[item.category] = [];
      }
      groups[item.category].push(item);
    });
    
    return groups;
  }, [checklistItems]);

  // Filter items by search query
  const filteredGroupedItems = useMemo(() => {
    if (!searchQuery.trim()) return groupedItems;
    
    const query = searchQuery.toLowerCase();
    const filtered: Record<string, typeof checklistItems> = {};
    
    Object.entries(groupedItems).forEach(([categoryId, items]) => {
      const matchedItems = items.filter(item => 
        item.description.toLowerCase().includes(query) ||
        item.topic?.toLowerCase().includes(query)
      );
      if (matchedItems.length > 0) {
        filtered[categoryId] = matchedItems;
      }
    });
    
    return filtered;
  }, [groupedItems, searchQuery]);

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(categoryId)) {
        newSet.delete(categoryId);
      } else {
        newSet.add(categoryId);
      }
      return newSet;
    });
  };

  const getCategoryName = (categoryId: string) => {
    const category = categories.find(c => c.id === categoryId);
    return category?.name || 'Unknown Category';
  };

  const getCategoryRefId = (categoryId: string) => {
    const category = categories.find(c => c.id === categoryId);
    return category?.ref_id || '';
  };

  const totalItems = checklistItems.length;
  const selectedCount = selectedItemIds.length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <FileCheck className="h-5 w-5 text-primary" />
          Select Applicable Checklist Items
        </h3>
        <p className="text-sm text-muted-foreground">
          Choose the checklist items that should be included when this PSSR reason is used.
        </p>
      </div>

      {/* Search and Selection Controls */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="relative flex-1 w-full sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search checklist items..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-sm">
            {selectedCount} of {totalItems} selected
          </Badge>
          <button
            type="button"
            onClick={() => onSelectAllItems(checklistItems.map(item => item.id))}
            className="text-sm text-primary hover:underline"
          >
            Select All
          </button>
          <span className="text-muted-foreground">|</span>
          <button
            type="button"
            onClick={onDeselectAll}
            className="text-sm text-primary hover:underline"
          >
            Deselect All
          </button>
        </div>
      </div>

      {/* Checklist Items by Category */}
      <ScrollArea className="h-[400px] border rounded-lg p-2">
        <div className="space-y-2">
          {Object.entries(filteredGroupedItems).length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchQuery ? 'No items match your search' : 'No checklist items available'}
            </div>
          ) : (
            Object.entries(filteredGroupedItems).map(([categoryId, items]) => {
              const isExpanded = expandedCategories.has(categoryId);
              const categorySelectedCount = items.filter(item => 
                selectedItemIds.includes(item.id)
              ).length;
              
              return (
                <Collapsible
                  key={categoryId}
                  open={isExpanded}
                  onOpenChange={() => toggleCategory(categoryId)}
                >
                  <CollapsibleTrigger className="w-full">
                    <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors">
                      <div className="flex items-center gap-2">
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                        <span className="font-medium text-sm">
                          {getCategoryRefId(categoryId)} - {getCategoryName(categoryId)}
                        </span>
                      </div>
                      <Badge variant={categorySelectedCount > 0 ? 'default' : 'outline'} className="text-xs">
                        {categorySelectedCount}/{items.length}
                      </Badge>
                    </div>
                  </CollapsibleTrigger>
                  
                  <CollapsibleContent>
                    <div className="ml-6 mt-2 space-y-1">
                      {items.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-start gap-3 p-2 rounded-md hover:bg-muted/30 transition-colors cursor-pointer"
                          onClick={() => onItemToggle(item.id)}
                        >
                          <Checkbox
                            checked={selectedItemIds.includes(item.id)}
                            onCheckedChange={() => onItemToggle(item.id)}
                            className="mt-0.5"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium">
                              {item.sequence_number}. {item.topic || 'No Topic'}
                            </p>
                            <p className="text-xs text-muted-foreground line-clamp-2">
                              {item.description}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              );
            })
          )}
        </div>
      </ScrollArea>
    </div>
  );
};

export default WizardStepChecklistItems;

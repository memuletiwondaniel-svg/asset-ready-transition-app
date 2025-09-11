import React, { useState, useMemo } from 'react';
import { useChecklistItems, useReorderChecklistItem, ChecklistItem } from '@/hooks/useChecklistItems';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, GripVertical, Plus } from 'lucide-react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { toast } from '@/hooks/use-toast';

interface SortableItemProps {
  item: ChecklistItem;
  onClick: (item: ChecklistItem) => void;
}

const SortableItem: React.FC<SortableItemProps> = ({ item, onClick }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.unique_id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="group relative"
    >
      <Card className="cursor-pointer hover:shadow-md transition-shadow border border-border/50">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div
              {...attributes}
              {...listeners}
              className="mt-1 cursor-grab active:cursor-grabbing opacity-50 group-hover:opacity-100 transition-opacity"
            >
              <GripVertical className="h-4 w-4" />
            </div>
            
            <div className="flex-1 min-w-0" onClick={() => onClick(item)}>
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline" className="text-xs font-mono">
                  {item.unique_id}
                </Badge>
                <Badge variant="secondary" className="text-xs">
                  {item.category}
                </Badge>
              </div>
              
              <p className="text-sm font-medium text-foreground mb-2 line-clamp-2">
                {item.description}
              </p>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-muted-foreground">
                {item.required_evidence && (
                  <div>
                    <span className="font-medium">Evidence:</span>
                    <span className="ml-1 truncate block">{item.required_evidence}</span>
                  </div>
                )}
                {item.responsible && (
                  <div>
                    <span className="font-medium">Responsible:</span>
                    <span className="ml-1 truncate block">{item.responsible}</span>
                  </div>
                )}
                {item.Approver && (
                  <div>
                    <span className="font-medium">Approver:</span>
                    <span className="ml-1 truncate block">{item.Approver}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

interface CategorySectionProps {
  category: string;
  items: ChecklistItem[];
  onItemClick: (item: ChecklistItem) => void;
  onReorder: (uniqueId: string, newPosition: number) => void;
}

const CategorySection: React.FC<CategorySectionProps> = ({ category, items, onItemClick, onReorder }) => {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor)
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      const oldIndex = items.findIndex((item) => item.unique_id === active.id);
      const newIndex = items.findIndex((item) => item.unique_id === over?.id);
      
      if (oldIndex !== -1 && newIndex !== -1) {
        onReorder(active.id as string, newIndex + 1);
      }
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>{category}</span>
          <Badge variant="outline">{items.length} items</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={items.map(item => item.unique_id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-3">
              {items.map((item) => (
                <SortableItem
                  key={item.unique_id}
                  item={item}
                  onClick={onItemClick}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      </CardContent>
    </Card>
  );
};

interface EnhancedChecklistManagementProps {
  onItemClick: (item: ChecklistItem) => void;
  onCreateItem: () => void;
}

export const EnhancedChecklistManagement: React.FC<EnhancedChecklistManagementProps> = ({
  onItemClick,
  onCreateItem,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const { data: items = [], isLoading } = useChecklistItems();
  const reorderMutation = useReorderChecklistItem();

  const filteredItems = useMemo(() => {
    return items.filter(item =>
      item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.unique_id.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [items, searchTerm]);

  const groupedItems = useMemo(() => {
    const groups: Record<string, ChecklistItem[]> = {};
    filteredItems.forEach(item => {
      if (!groups[item.category]) {
        groups[item.category] = [];
      }
      groups[item.category].push(item);
    });
    
    // Sort items within each category by sequence_number
    Object.keys(groups).forEach(category => {
      groups[category].sort((a, b) => (a.sequence_number || 0) - (b.sequence_number || 0));
    });
    
    return groups;
  }, [filteredItems]);

  const handleReorder = async (uniqueId: string, newPosition: number) => {
    try {
      await reorderMutation.mutateAsync({ uniqueId, newPosition });
      toast({
        title: "Item reordered",
        description: "Checklist item position updated successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to reorder item. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-10 bg-muted rounded animate-pulse" />
        <div className="grid gap-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-48 bg-muted rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search items by description, category, or ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <Button onClick={onCreateItem} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Add Item
        </Button>
      </div>

      <div className="grid gap-6">
        {Object.entries(groupedItems).map(([category, categoryItems]) => (
          <CategorySection
            key={category}
            category={category}
            items={categoryItems}
            onItemClick={onItemClick}
            onReorder={handleReorder}
          />
        ))}
        
        {Object.keys(groupedItems).length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <p className="text-muted-foreground mb-4">
                {searchTerm ? 'No items match your search.' : 'No checklist items found.'}
              </p>
              <Button onClick={onCreateItem}>Create First Item</Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};
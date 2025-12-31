import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { FileText, GripVertical, Search, ChevronDown, Users, UserCheck } from 'lucide-react';
import { ChecklistItem, useUpdateChecklistItem } from '@/hooks/useChecklistItems';
import { useDisciplines } from '@/hooks/useDisciplines';
import { usePositions } from '@/hooks/usePositions';
import { useChecklistCategories } from '@/hooks/useChecklistCategories';
import { useChecklistTopics } from '@/hooks/useChecklistTopics';
import { useChecklistItemDisciplines } from '@/hooks/useChecklistItemDisciplines';
import { useChecklistItemDeliveringParties } from '@/hooks/useChecklistItemDeliveringParties';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  horizontalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// Category order and colors
const CATEGORY_ORDER = [
  'General',
  'Process Safety',
  'Health & Safety',
  'Organization',
  'Documentation',
  'PACO',
  'Rotating',
  'Static',
  'Civil',
  'Elect'
];

const CATEGORY_COLORS = {
  'General': 'bg-blue-100/80 text-blue-700 border-blue-200/60',
  'Process Safety': 'bg-red-100/80 text-red-700 border-red-200/60',
  'Health & Safety': 'bg-orange-100/80 text-orange-700 border-orange-200/60',
  'Organization': 'bg-purple-100/80 text-purple-700 border-purple-200/60',
  'Documentation': 'bg-green-100/80 text-green-700 border-green-200/60',
  'PACO': 'bg-yellow-100/80 text-yellow-700 border-yellow-200/60',
  'Rotating': 'bg-cyan-100/80 text-cyan-700 border-cyan-200/60',
  'Static': 'bg-indigo-100/80 text-indigo-700 border-indigo-200/60',
  'Civil': 'bg-pink-100/80 text-pink-700 border-pink-200/60',
  'Elect': 'bg-emerald-100/80 text-emerald-700 border-emerald-200/60'
};

interface ChecklistItemsTableViewProps {
  items: ChecklistItem[];
  onViewItem: (item: ChecklistItem) => void;
  onEditItem: (item: ChecklistItem) => void;
  onDeleteItem: (item: ChecklistItem) => void;
}

// Define column structure
interface Column {
  id: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  width: string;
}

const defaultColumns: Column[] = [
  { id: 'id', label: 'ID', icon: FileText, width: 'w-24' },
  { id: 'description', label: 'Description', width: 'min-w-[200px]' },
  { id: 'approvers', label: 'Approvers', icon: UserCheck, width: 'w-40' },
  { id: 'responsible', label: 'Responsible', icon: Users, width: 'w-40' },
  { id: 'category', label: 'Category', width: 'w-36' },
  { id: 'topic', label: 'Topic', width: 'w-36' },
];

// Sortable Header Component
interface SortableHeaderProps {
  column: Column;
}

const SortableHeader: React.FC<SortableHeaderProps> = ({ column }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: column.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <TableHead 
      ref={setNodeRef}
      style={style}
      className={`font-semibold text-gray-700 px-3 py-3 relative group ${column.width} ${
        isDragging ? 'opacity-50' : ''
      }`}
      {...attributes}
    >
      <div className="flex items-center gap-1.5 justify-between">
        <div className="flex items-center gap-1.5">
          {column.icon && <column.icon className="h-3.5 w-3.5" />}
          <span className="text-xs">{column.label}</span>
        </div>
        <div 
          {...listeners}
          className="opacity-0 group-hover:opacity-100 cursor-grab active:cursor-grabbing transition-opacity p-0.5"
        >
          <GripVertical className="h-3.5 w-3.5 text-gray-400" />
        </div>
      </div>
    </TableHead>
  );
};

const ChecklistItemsTableView: React.FC<ChecklistItemsTableViewProps> = ({
  items,
  onViewItem,
  onEditItem,
  onDeleteItem,
}) => {
  const [columns, setColumns] = useState<Column[]>(defaultColumns);
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch data for dropdowns
  const { disciplines = [] } = useDisciplines();
  const { data: positions = [] } = usePositions();
  const { data: categories = [] } = useChecklistCategories();
  const { data: topics = [] } = useChecklistTopics();
  
  // Fetch and manage assignments
  const { 
    getDisciplinesForItem, 
    assignDisciplines 
  } = useChecklistItemDisciplines();
  
  const { 
    getDeliveringPartyForItem, 
    assignDeliveringParty 
  } = useChecklistItemDeliveringParties();
  
  const updateChecklistItem = useUpdateChecklistItem();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setColumns((columns) => {
        const oldIndex = columns.findIndex((col) => col.id === active.id);
        const newIndex = columns.findIndex((col) => col.id === over.id);

        return arrayMove(columns, oldIndex, newIndex);
      });
    }
  };

  // Handle approver (discipline) toggle
  const handleApproverToggle = (itemId: string, disciplineId: string, checked: boolean) => {
    const currentDisciplines = getDisciplinesForItem(itemId);
    const currentIds = currentDisciplines.map(d => d.id);
    
    let newIds: string[];
    if (checked) {
      newIds = [...currentIds, disciplineId];
    } else {
      newIds = currentIds.filter(id => id !== disciplineId);
    }
    
    assignDisciplines.mutate({ 
      checklistItemId: itemId, 
      disciplineIds: newIds 
    });
  };

  // Handle responsible party change
  const handleResponsibleChange = (itemId: string, positionId: string | null) => {
    assignDeliveringParty.mutate({ 
      checklistItemId: itemId, 
      positionId 
    });
  };

  // Handle category change
  const handleCategoryChange = (itemId: string, categoryName: string) => {
    updateChecklistItem.mutate({ 
      itemId, 
      updateData: { category: categoryName }
    });
  };

  // Handle topic change
  const handleTopicChange = (itemId: string, topicName: string) => {
    updateChecklistItem.mutate({ 
      itemId, 
      updateData: { topic: topicName }
    });
  };

  // Filter and sort items
  const filteredAndSortedItems = useMemo(() => {
    let filtered = items;
    
    // Apply search filter
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase().trim();
      filtered = items.filter(item => 
        item.unique_id?.toLowerCase().includes(searchLower) ||
        item.description?.toLowerCase().includes(searchLower) ||
        item.topic?.toLowerCase().includes(searchLower) ||
        item.category?.toLowerCase().includes(searchLower) ||
        item.Approver?.toLowerCase().includes(searchLower) ||
        item.responsible?.toLowerCase().includes(searchLower)
      );
    }
    
    // Sort by category order
    return filtered.sort((a, b) => {
      const aIndex = CATEGORY_ORDER.indexOf(a.category);
      const bIndex = CATEGORY_ORDER.indexOf(b.category);
      
      // If category not found in order, put it at the end
      const aOrder = aIndex === -1 ? CATEGORY_ORDER.length : aIndex;
      const bOrder = bIndex === -1 ? CATEGORY_ORDER.length : bIndex;
      
      if (aOrder !== bOrder) {
        return aOrder - bOrder;
      }
      
      // If same category, sort by sequence_number or unique_id
      return (a.sequence_number || 0) - (b.sequence_number || 0) || 
             a.unique_id.localeCompare(b.unique_id);
    });
  }, [items, searchTerm]);

  const getCategoryColor = (category: string) => {
    return CATEGORY_COLORS[category as keyof typeof CATEGORY_COLORS] || 'bg-gray-100/80 text-gray-700 border-gray-200/60';
  };

  if (items.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-blue-100 to-blue-200 rounded-full flex items-center justify-center shadow-lg">
          <FileText className="w-12 h-12 text-blue-600" />
        </div>
        <h3 className="text-xl font-semibold text-gray-800 mb-2">No Checklist Items</h3>
        <p className="text-gray-600 mb-6 max-w-md mx-auto">
          No checklist items are currently available. Items will appear here once they are created.
        </p>
      </div>
    );
  }

  const renderCellContent = (column: Column, item: ChecklistItem) => {
    const itemId = item.unique_id;
    
    switch (column.id) {
      case 'id':
        return (
          <Badge 
            variant="outline" 
            className="bg-gray-100/80 text-gray-700 border-gray-200/60 text-xs font-medium"
          >
            {item.unique_id || 'XX-YY'}
          </Badge>
        );
      
      case 'approvers': {
        const assignedDisciplines = getDisciplinesForItem(itemId);
        const assignedCount = assignedDisciplines.length;
        
        return (
          <Popover>
            <PopoverTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full justify-between text-xs h-8 px-2"
              >
                <span className="truncate">
                  {assignedCount > 0 
                    ? assignedCount === 1 
                      ? assignedDisciplines[0].name 
                      : `${assignedCount} selected`
                    : 'Select...'
                  }
                </span>
                <ChevronDown className="h-3 w-3 ml-1 shrink-0" />
              </Button>
            </PopoverTrigger>
            <PopoverContent 
              className="w-56 p-2 max-h-64 overflow-y-auto" 
              align="start"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="space-y-1">
                {disciplines.map(discipline => {
                  const isChecked = assignedDisciplines.some(d => d.id === discipline.id);
                  return (
                    <div 
                      key={discipline.id} 
                      className="flex items-center space-x-2 p-1.5 hover:bg-muted rounded-md cursor-pointer"
                      onClick={() => handleApproverToggle(itemId, discipline.id, !isChecked)}
                    >
                      <Checkbox
                        id={`${itemId}-${discipline.id}`}
                        checked={isChecked}
                        onCheckedChange={(checked) => handleApproverToggle(itemId, discipline.id, !!checked)}
                      />
                      <label 
                        htmlFor={`${itemId}-${discipline.id}`}
                        className="text-sm cursor-pointer flex-1"
                      >
                        {discipline.name}
                      </label>
                    </div>
                  );
                })}
                {disciplines.length === 0 && (
                  <p className="text-xs text-muted-foreground p-2">No disciplines available</p>
                )}
              </div>
            </PopoverContent>
          </Popover>
        );
      }
      
      case 'responsible': {
        const deliveringParty = getDeliveringPartyForItem(itemId);
        
        return (
          <Select
            value={deliveringParty?.id || '__none__'}
            onValueChange={(value) => handleResponsibleChange(itemId, value === '__none__' ? null : value)}
          >
            <SelectTrigger 
              className="w-full text-xs h-8 px-2 bg-background"
              onClick={(e) => e.stopPropagation()}
            >
              <SelectValue placeholder="Select..." />
            </SelectTrigger>
            <SelectContent className="bg-background z-50" onClick={(e) => e.stopPropagation()}>
              <SelectItem value="__none__">None</SelectItem>
              {positions.map(position => (
                <SelectItem key={position.id} value={position.id}>
                  {position.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      }
      
      case 'category':
        return (
          <Select
            value={item.category || '__none__'}
            onValueChange={(value) => handleCategoryChange(itemId, value === '__none__' ? '' : value)}
          >
            <SelectTrigger 
              className="w-full text-xs h-8 px-2 bg-background"
              onClick={(e) => e.stopPropagation()}
            >
              <SelectValue placeholder="Select..." />
            </SelectTrigger>
            <SelectContent className="bg-background z-50" onClick={(e) => e.stopPropagation()}>
              {categories.map(cat => (
                <SelectItem key={cat.id} value={cat.name}>
                  <Badge 
                    variant="outline" 
                    className={`${getCategoryColor(cat.name)} text-xs`}
                  >
                    {cat.name}
                  </Badge>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      
      case 'topic':
        return (
          <Select
            value={item.topic || '__none__'}
            onValueChange={(value) => handleTopicChange(itemId, value === '__none__' ? '' : value)}
          >
            <SelectTrigger 
              className="w-full text-xs h-8 px-2 bg-background"
              onClick={(e) => e.stopPropagation()}
            >
              <SelectValue placeholder="Select..." />
            </SelectTrigger>
            <SelectContent className="bg-background z-50" onClick={(e) => e.stopPropagation()}>
              <SelectItem value="__none__">None</SelectItem>
              {topics.map(topic => (
                <SelectItem key={topic.id} value={topic.name}>
                  {topic.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      
      case 'description':
        return (
          <p className="text-xs text-gray-800 leading-relaxed line-clamp-2">
            {item.description}
          </p>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Search by ID, description, topic, category, approver, or responsible..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 bg-white/80 backdrop-blur-sm border border-gray-200/60 focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
        />
      </div>

      <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200/60 shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
        <DndContext 
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <Table>
            <TableHeader>
              <TableRow className="border-b border-gray-200/60 bg-gradient-to-r from-gray-50/80 to-gray-100/80">
                <SortableContext items={columns.map(col => col.id)} strategy={horizontalListSortingStrategy}>
                  {columns.map((column) => (
                    <SortableHeader key={column.id} column={column} />
                  ))}
                </SortableContext>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAndSortedItems.map((item, index) => (
                <TableRow 
                  key={item.unique_id} 
                  className={`group border-b border-gray-100/60 hover:bg-gradient-to-r hover:from-primary/5 hover:to-transparent transition-all duration-200 cursor-pointer ${
                    index % 2 === 0 ? 'bg-white/50' : 'bg-gray-50/30'
                  }`}
                  onClick={() => onViewItem(item)}
                >
                  {columns.map((column) => (
                    <TableCell 
                      key={column.id} 
                      className={`px-3 py-2 ${column.width}`}
                    >
                      {renderCellContent(column, item)}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </DndContext>
        </div>
      </div>
      
      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span className="font-medium">Total: {filteredAndSortedItems.length} items</span>
        <span>•</span>
        <span>Click row to view details</span>
        <span>•</span>
        <span>Use dropdowns to configure inline</span>
      </div>
    </div>
  );
};

export default ChecklistItemsTableView;

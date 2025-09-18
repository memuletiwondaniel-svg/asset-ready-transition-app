import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Eye, Edit, MoreVertical, Trash2, FileText, GripVertical, Search } from 'lucide-react';
import { ChecklistItem } from '@/hooks/useChecklistItems';
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
  { id: 'actions', label: 'Actions', width: 'w-16' },
  { id: 'id', label: 'ID', icon: FileText, width: 'w-24' },
  { id: 'category', label: 'Category', width: 'w-auto' },
  { id: 'topic', label: 'Topic', width: 'w-32' },
  { id: 'description', label: 'Description', width: 'flex-1 min-w-0' },
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
      className={`font-semibold text-gray-700 px-4 py-4 relative group ${column.width} ${
        isDragging ? 'opacity-50' : ''
      } ${column.id === 'actions' ? 'text-center' : ''}`}
      {...attributes}
    >
      <div className="flex items-center gap-2 justify-between">
        <div className="flex items-center gap-2">
          {column.icon && <column.icon className="h-4 w-4" />}
          <span>{column.label}</span>
        </div>
        <div 
          {...listeners}
          className="opacity-0 group-hover:opacity-100 cursor-grab active:cursor-grabbing transition-opacity p-1"
        >
          <GripVertical className="h-4 w-4 text-gray-400" />
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
        item.category?.toLowerCase().includes(searchLower)
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
    switch (column.id) {
      case 'actions':
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-gray-400 hover:text-gray-600 hover:bg-gray-100/80 rounded-full transition-all duration-200"
              >
                <span className="sr-only">Open menu</span>
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 bg-white/95 backdrop-blur-sm border border-gray-200/60">
              <DropdownMenuItem onClick={() => onViewItem(item)} className="hover:bg-blue-50/50">
                <Eye className="mr-2 h-4 w-4" />
                View Item
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onEditItem(item)} className="hover:bg-green-50/50">
                <Edit className="mr-2 h-4 w-4" />
                Edit Item
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => onDeleteItem(item)}
                className="text-red-600 focus:text-red-600 hover:bg-red-50/50"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Item
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      case 'id':
        return (
          <Badge 
            variant="outline" 
            className="bg-gray-100/80 text-gray-700 border-gray-200/60 text-xs font-medium"
          >
            {item.unique_id?.replace(/^(.{2})(.{2}).*/, '$1-$2') || 'XX-YY'}
          </Badge>
        );
      case 'category':
        return (
          <Badge 
            variant="outline" 
            className={`${getCategoryColor(item.category)} text-xs font-medium whitespace-nowrap`}
          >
            {item.category}
          </Badge>
        );
      case 'topic':
        return item.topic ? (
          <span className="text-sm text-gray-700 font-medium">{item.topic}</span>
        ) : (
          <span className="text-sm text-gray-400 italic">No topic</span>
        );
      case 'description':
        return (
          <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">
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
          placeholder="Search by ID, description, topic, or category..."
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
                  className={`border-b border-gray-100/60 hover:bg-gradient-to-r hover:from-blue-50/30 hover:to-purple-50/30 transition-all duration-300 ${
                    index % 2 === 0 ? 'bg-white/50' : 'bg-gray-50/30'
                  }`}
                >
                  {columns.map((column) => (
                    <TableCell 
                      key={column.id} 
                      className={`px-4 py-4 ${column.id === 'actions' ? 'text-center' : ''} ${column.width}`}
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
    </div>
  );
};

export default ChecklistItemsTableView;
import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { Eye, Edit, MoreVertical, Trash2, FileText } from 'lucide-react';
import { ChecklistItem } from '@/hooks/useChecklistItems';

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

const ChecklistItemsTableView: React.FC<ChecklistItemsTableViewProps> = ({
  items,
  onViewItem,
  onEditItem,
  onDeleteItem,
}) => {
  // Sort items by category order
  const sortedItems = React.useMemo(() => {
    return [...items].sort((a, b) => {
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
  }, [items]);

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

  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200/60 shadow-lg overflow-hidden">
      <div className="overflow-x-auto">
        <ResizablePanelGroup direction="horizontal" className="w-full">
          {/* Actions Column */}
          <ResizablePanel defaultSize={10} minSize={8} maxSize={15}>
            <div className="h-full">
              <div className="border-b border-gray-200/60 bg-gradient-to-r from-gray-50/80 to-gray-100/80 px-6 py-4">
                <span className="font-semibold text-gray-700 text-center block">Actions</span>
              </div>
              <div className="space-y-0">
                {sortedItems.map((item, index) => (
                  <div 
                    key={`actions-${item.unique_id}`}
                    className={`px-6 py-4 text-center border-b border-gray-100/60 hover:bg-gradient-to-r hover:from-blue-50/30 hover:to-purple-50/30 transition-all duration-300 ${
                      index % 2 === 0 ? 'bg-white/50' : 'bg-gray-50/30'
                    }`}
                  >
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
                  </div>
                ))}
              </div>
            </div>
          </ResizablePanel>

          <ResizableHandle withHandle />

          {/* ID Column */}
          <ResizablePanel defaultSize={15} minSize={10} maxSize={20}>
            <div className="h-full">
              <div className="border-b border-gray-200/60 bg-gradient-to-r from-gray-50/80 to-gray-100/80 px-6 py-4">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  <span className="font-semibold text-gray-700">ID</span>
                </div>
              </div>
              <div className="space-y-0">
                {sortedItems.map((item, index) => (
                  <div 
                    key={`id-${item.unique_id}`}
                    className={`px-6 py-4 border-b border-gray-100/60 hover:bg-gradient-to-r hover:from-blue-50/30 hover:to-purple-50/30 transition-all duration-300 ${
                      index % 2 === 0 ? 'bg-white/50' : 'bg-gray-50/30'
                    }`}
                  >
                    <Badge 
                      variant="outline" 
                      className="bg-gray-100/80 text-gray-700 border-gray-200/60 text-xs font-medium"
                    >
                      {item.unique_id?.replace(/^(.{2})(.{2}).*/, '$1-$2') || 'XX-YY'}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          </ResizablePanel>

          <ResizableHandle withHandle />

          {/* Category Column */}
          <ResizablePanel defaultSize={20} minSize={15} maxSize={25}>
            <div className="h-full">
              <div className="border-b border-gray-200/60 bg-gradient-to-r from-gray-50/80 to-gray-100/80 px-6 py-4">
                <span className="font-semibold text-gray-700">Category</span>
              </div>
              <div className="space-y-0">
                {sortedItems.map((item, index) => (
                  <div 
                    key={`category-${item.unique_id}`}
                    className={`px-6 py-4 border-b border-gray-100/60 hover:bg-gradient-to-r hover:from-blue-50/30 hover:to-purple-50/30 transition-all duration-300 ${
                      index % 2 === 0 ? 'bg-white/50' : 'bg-gray-50/30'
                    }`}
                  >
                    <Badge 
                      variant="outline" 
                      className={`${getCategoryColor(item.category)} text-xs font-medium`}
                    >
                      {item.category}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          </ResizablePanel>

          <ResizableHandle withHandle />

          {/* Topic Column */}
          <ResizablePanel defaultSize={20} minSize={15} maxSize={25}>
            <div className="h-full">
              <div className="border-b border-gray-200/60 bg-gradient-to-r from-gray-50/80 to-gray-100/80 px-6 py-4">
                <span className="font-semibold text-gray-700">Topic</span>
              </div>
              <div className="space-y-0">
                {sortedItems.map((item, index) => (
                  <div 
                    key={`topic-${item.unique_id}`}
                    className={`px-6 py-4 border-b border-gray-100/60 hover:bg-gradient-to-r hover:from-blue-50/30 hover:to-purple-50/30 transition-all duration-300 ${
                      index % 2 === 0 ? 'bg-white/50' : 'bg-gray-50/30'
                    }`}
                  >
                    {item.topic ? (
                      <span className="text-sm text-gray-700 font-medium">{item.topic}</span>
                    ) : (
                      <span className="text-sm text-gray-400 italic">No topic</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </ResizablePanel>

          <ResizableHandle withHandle />

          {/* Description Column */}
          <ResizablePanel defaultSize={35} minSize={25}>
            <div className="h-full">
              <div className="border-b border-gray-200/60 bg-gradient-to-r from-gray-50/80 to-gray-100/80 px-6 py-4">
                <span className="font-semibold text-gray-700">Description</span>
              </div>
              <div className="space-y-0">
                {sortedItems.map((item, index) => (
                  <div 
                    key={`description-${item.unique_id}`}
                    className={`px-6 py-4 border-b border-gray-100/60 hover:bg-gradient-to-r hover:from-blue-50/30 hover:to-purple-50/30 transition-all duration-300 ${
                      index % 2 === 0 ? 'bg-white/50' : 'bg-gray-50/30'
                    }`}
                  >
                    <p className="text-sm text-gray-800 line-clamp-2 leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </div>
  );
};

export default ChecklistItemsTableView;
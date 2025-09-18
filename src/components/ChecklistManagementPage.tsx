import React, { useState } from 'react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent, DragOverlay, DragStartEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ArrowLeft, ChevronDown, FileText, Users, Shield, Cog, GripVertical, CheckCircle, Trash2, Save, Plus, MoreVertical, Eye, Edit, Grid3X3, Table } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useChecklistItems, ChecklistItem } from '@/hooks/useChecklistItems';
import ChecklistItemDeletionModal from './ChecklistItemDeletionModal';
import ViewChecklistItemModal from './ViewChecklistItemModal';
import EditChecklistItemModal from './EditChecklistItemModal';
import CreateChecklistItemForm from './CreateChecklistItemForm';
import ChecklistItemsTableView from './ChecklistItemsTableView';
interface ChecklistManagementPageProps {
  onBack: () => void;
}
const ChecklistManagementPage: React.FC<ChecklistManagementPageProps> = ({
  onBack
}) => {
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);
  const [categoryOrder, setCategoryOrder] = useState<string[]>([]);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [deletingItem, setDeletingItem] = useState<ChecklistItem | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [viewingItem, setViewingItem] = useState<ChecklistItem | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [detailModalMode, setDetailModalMode] = useState<'view' | 'edit'>('view');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [viewMode, setViewMode] = useState<'card' | 'table'>('table');
  const {
    data: checklistItems,
    isLoading: itemsLoading
  } = useChecklistItems();
  const categoryStats = checklistItems?.reduce((acc, item) => {
    acc[item.category] = (acc[item.category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Initialize category order when data loads
  React.useEffect(() => {
    if (categoryStats && categoryOrder.length === 0) {
      // Set categories in the specified default order
      const defaultOrder = ["General", "Hardware Integrity", "Process Safety", "Documentation", "Organization", "Health & Safety", "Emergency Response", "Electrical", "PACO", "Static", "Rotating", "Civil"];

      // Only include categories that actually exist in the data
      const existingCategories = Object.keys(categoryStats);
      const orderedExistingCategories = defaultOrder.filter(cat => existingCategories.includes(cat));

      // Add any categories that exist in data but not in our default order
      const remainingCategories = existingCategories.filter(cat => !defaultOrder.includes(cat));
      setCategoryOrder([...orderedExistingCategories, ...remainingCategories]);
    }
  }, [categoryStats, categoryOrder.length]);

  // Drag and drop sensors
  const sensors = useSensors(useSensor(PointerSensor, {
    activationConstraint: {
      distance: 8
    }
  }), useSensor(KeyboardSensor, {
    coordinateGetter: sortableKeyboardCoordinates
  }));
  const handleDragStart = (event: DragStartEvent) => {
    setActiveDragId(event.active.id as string);
  };
  const handleDragEnd = (event: DragEndEvent) => {
    const {
      active,
      over
    } = event;
    setActiveDragId(null);
    if (!over || active.id === over.id) {
      return;
    }
    setCategoryOrder(items => {
      const oldIndex = items.indexOf(active.id as string);
      const newIndex = items.indexOf(over.id as string);
      return arrayMove(items, oldIndex, newIndex);
    });
  };
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'General':
        return <FileText className="h-4 w-4" />;
      case 'Technical Integrity':
        return <Cog className="h-4 w-4" />;
      case 'Start-Up Readiness':
        return <Shield className="h-4 w-4" />;
      case 'Health & Safety':
        return <Shield className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };
  const getItemsByCategory = (category: string) => {
    return checklistItems?.filter(item => item.category === category) || [];
  };
  const handleViewItem = (item: ChecklistItem) => {
    setViewingItem(item);
    setDetailModalMode('view');
    setShowDetailModal(true);
  };
  const handleEditItem = (item: ChecklistItem) => {
    setViewingItem(item);
    setShowEditForm(true);
  };
  const handleCloseDetailModal = () => {
    setShowDetailModal(false);
    setViewingItem(null);
  };
  const handleSaveComplete = () => {
    // Navigate back to checklist categories view
    onBack();
  };
  const handleSaveItem = (item: ChecklistItem) => {
    // Quick save functionality - could show a toast or update indicator
    console.log('Quick saving item:', item.unique_id);
    // In a real app, this would trigger an immediate save without opening the modal
  };
  const handleDeleteItem = (item: ChecklistItem) => {
    setDeletingItem(item);
    setShowDeleteModal(true);
  };
  const handleCloseDeleteModal = () => {
    setShowDeleteModal(false);
    setDeletingItem(null);
  };
  const handleItemDeleted = (deletedItemId: string) => {
    // The item will be automatically removed from the list due to the query invalidation
    // in the useDeleteChecklistItem hook
  };
  const handleCreateItem = () => {
    setShowCreateForm(true);
  };
  const handleCreateComplete = (newItem: any) => {
    // Handle successful creation
    setShowCreateForm(false);
    // The item will be automatically added to the list due to the query invalidation
    // in the useCreateChecklistItem hook
  };
  const handleCreateCancel = () => {
    setShowCreateForm(false);
  };

  // Draggable Category Component
  const DraggableCategory = ({
    category,
    count,
    isOpen
  }: {
    category: string;
    count: number;
    isOpen: boolean;
  }) => {
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging
    } = useSortable({
      id: category
    });
    const style = {
      transform: CSS.Transform.toString(transform),
      transition
    };
    const categoryItems = getItemsByCategory(category);
    return <div ref={setNodeRef} style={style} className={`${isDragging ? 'opacity-50 scale-105 z-50' : ''} transition-all duration-200`} {...attributes}>
        <AccordionItem value={category} className="border-0 mb-4">
          <div className={`group relative overflow-hidden rounded-2xl backdrop-blur-xl border shadow-lg transition-all duration-500 hover:shadow-xl hover:scale-[1.02] hover:-translate-y-1 ${isOpen ? 'bg-primary/5 border-primary/30 ring-2 ring-primary/30' : 'bg-white/70 border-white/20'}`}>
            {/* Microsoft Fluent Design Acrylic Background */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/90 via-white/60 to-white/30 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            {/* Animated mesh gradient background */}
            <div className="absolute inset-0 bg-gradient-to-br from-blue-50/30 via-purple-50/20 to-indigo-50/30 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            {/* Microsoft Reveal Effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-blue-200/20 to-transparent -translate-x-[100%] group-hover:translate-x-[100%] transition-transform duration-1000 ease-out"></div>
            {/* Floating particles effect */}
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700">
              <div className="absolute top-4 right-8 w-2 h-2 bg-blue-400/40 rounded-full animate-pulse"></div>
              <div className="absolute top-16 right-16 w-1 h-1 bg-purple-400/50 rounded-full animate-pulse" style={{
              animationDelay: '0.5s'
            }}></div>
              <div className="absolute bottom-8 left-12 w-1.5 h-1.5 bg-indigo-400/30 rounded-full animate-pulse" style={{
              animationDelay: '1s'
            }}></div>
            </div>

            {/* Category Header */}
            <AccordionTrigger className={`hover:no-underline px-8 py-5 relative z-10 transition-all duration-500 ${isOpen ? 'bg-primary/5' : 'group-hover:bg-white/20'}`}>
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center space-x-6">
                  {/* Drag Handle */}
                  <div {...listeners} className="cursor-grab active:cursor-grabbing p-2 rounded-2xl hover:bg-white/80 transition-all duration-300 group-hover:bg-white/60 backdrop-blur-sm border border-white/30 group-hover:border-white/50 shadow-lg hover:shadow-xl" title="Drag to reorder">
                    <GripVertical className="w-5 h-5 text-gray-400 hover:text-blue-600 transition-colors duration-300" />
                  </div>

                  <div className="relative">
                    {/* Icon with glow */}
                    <div className="absolute -inset-4 bg-gradient-to-br from-blue-500/30 to-purple-500/30 rounded-3xl blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                    <div className="absolute -inset-2 bg-gradient-to-br from-blue-400/20 to-purple-400/20 rounded-2xl blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-400" style={{
                    animationDelay: '0.1s'
                  }}></div>
                    <div className="relative w-16 h-16 bg-gradient-to-br from-blue-100/80 to-purple-100/80 backdrop-blur-sm rounded-2xl flex items-center justify-center border border-blue-200/60 group-hover:border-blue-300/80 group-hover:shadow-2xl transition-all duration-500 group-hover:scale-110">
                      <div className="absolute inset-0 bg-gradient-to-br from-white/50 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                      <div className="relative">{getCategoryIcon(category)}</div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h4 className={`text-xl font-bold bg-gradient-to-r bg-clip-text text-transparent transition-all duration-500 ${isOpen ? 'from-blue-700 via-purple-700 to-blue-700' : 'from-gray-900 via-blue-900 to-gray-900 group-hover:from-blue-700 group-hover:via-purple-700 group-hover:to-blue-700'}`}>
                      {category}
                    </h4>
                  </div>
                </div>

                <div className="flex items-center space-x-4">
                  <Badge className="bg-gradient-to-r from-blue-50/90 to-purple-50/90 text-blue-700 border border-blue-200/60 group-hover:from-blue-100/90 group-hover:to-purple-100/90 group-hover:border-blue-300/80 group-hover:shadow-lg transition-all duration-500 backdrop-blur-sm px-4 py-2 text-sm font-medium">
                    <span>{count} items</span>
                  </Badge>
                  {/* Chevron icon removed */}
                </div>
              </div>
            </AccordionTrigger>

            {/* Accordion Content */}
            <AccordionContent className="px-8 pb-8 relative z-10">
              <div className="space-y-6 animate-fade-in">
                <div className="w-full h-px bg-gradient-to-r from-transparent via-blue-200/60 to-transparent"></div>

                {categoryItems.length === 0 ? <div className="text-center py-12">
                    <h3 className="text-lg font-semibold text-gray-700 mb-2">No Items Available</h3>
                    <p className="text-sm text-gray-500 max-w-sm mx-auto">
                      This category currently contains no checklist items. Items will appear here once they are created.
                    </p>
                  </div> : <div className="space-y-4">
                    <p className="text-sm text-gray-600 mb-4">{categoryItems.length} items in this category</p>
                    <div className="space-y-3">
                      {categoryItems.map(item => <div key={item.unique_id} className="group relative p-4 bg-white/70 backdrop-blur-sm border border-gray-200/60 rounded-2xl hover:bg-white/90 hover:border-blue-300/60 hover:shadow-lg transition-all duration-300">
                          <div className="flex items-center justify-between">
                            <div className="flex-1 space-y-2">
                              <div className="flex items-center space-x-3">
                                <div className="px-3 py-1 bg-blue-100/80 text-blue-700 text-xs font-medium rounded-full border border-blue-200/60">
                                  {item.unique_id}
                                </div>
                                <div className="text-sm font-medium text-gray-600">
                                  {item.topic && <span className="text-purple-600">{item.topic}</span>}
                                </div>
                              </div>
                              <div className="text-sm text-gray-800 line-clamp-2">
                                {item.description}
                              </div>
                            </div>
                            
                            <div className="flex items-center space-x-2">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-gray-400 hover:text-gray-600 hover:bg-gray-100/80 rounded-full">
                                    <span className="sr-only">Open menu</span>
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-48">
                                  <DropdownMenuItem onClick={() => handleViewItem(item)}>
                                    <Eye className="mr-2 h-4 w-4" />
                                    View Item
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleEditItem(item)}>
                                    <Edit className="mr-2 h-4 w-4" />
                                    Edit Item
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem onClick={() => handleDeleteItem(item)} className="text-red-600 focus:text-red-600">
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Delete Item
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </div>
                        </div>)}
                    </div>
                  </div>}
              </div>
            </AccordionContent>
          </div>
        </AccordionItem>
      </div>;
  };
  if (itemsLoading) {
    return <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto"></div>
          <p className="text-gray-600 font-medium">Loading checklist items...</p>
        </div>
      </div>;
  }
  return <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      {/* Top Row with Logo and Back Button */}
      <div className="relative overflow-hidden bg-gradient-to-r from-white/95 via-white/90 to-white/95 backdrop-blur-xl border-b border-gray-200/40 shadow-sm">
        <div className="relative z-10 flex items-center justify-between px-8 py-6">
          {/* Back Button */}
          <div className="flex-shrink-0">
            <Button variant="outline" onClick={onBack} className="h-12 px-6 rounded-xl border border-border/40 bg-background/95 backdrop-blur-sm shadow-sm hover:shadow-lg hover:bg-accent/10 hover:border-primary/30 transition-all duration-300 ease-out hover:scale-[1.02] active:scale-[0.98] font-medium text-foreground/90 hover:text-primary group flex items-center gap-3">
              <ArrowLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform duration-300 ease-out" />
              <span className="tracking-wide">Back to Checklist Management</span>
            </Button>
          </div>
          
          {/* Centered ORSH Logo */}
          <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2">
            <img src="/images/orsh-logo.png" alt="ORSH Logo" className="h-40 object-contain" />
          </div>
          
          {/* Spacer to balance layout */}
          <div className="flex-shrink-0 w-48"></div>
        </div>
      </div>

      {/* Microsoft Fluent Design Header */}
      <div className="relative overflow-hidden bg-gradient-to-r from-white/90 via-white/80 to-white/90 backdrop-blur-xl border-b border-gray-200/60 shadow-lg">
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmMGY5ZmYiIGZpbGwtb3BhY2l0eT0iMC40Ij48cGF0aCBkPSJtMzYgMzRjMC0yLjIwOTEzOSAxLjc5MDg2MS00IDQtNCBoMTZjMi4yMDkxMzkgMCA0IDEuNzkwODYxIDQgNHYxNmMwIDIuMjA5MTM5LTEuNzkwODYxIDQtNCA0aC0xNmMtMi4yMDkxMzktNGUtMy00LTEuNzkwODYxLTQtNHptMC0zNmMwLTIuMjA5MTM5IDEuNzkwODYxLTQgNC00aDE2YzIuMjA5MTM5IDAgNCAxLjc5MDg2MSA0IDR2MTZjMCAyLjIwOTEzOS0xLjc5MDg2MSA0LTQgNGgtMTZjLTIuMjA5MTM5LTRlLTMtNC0xLjc5MDg2MS00LTR6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-30"></div>
        
        <div className="relative z-10 max-w-7xl mx-auto px-8 py-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center space-x-6">
                <div className="space-y-1">
                  <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 via-blue-900 to-gray-900 bg-clip-text text-transparent">Checklist Items</h1>
                  
                </div>
              </div>
              <div className="flex items-center space-x-4 mx-0">
                {/* View Mode Toggle */}
                <div className="relative flex items-center bg-gradient-to-r from-card/90 to-muted/80 backdrop-blur-lg rounded-2xl border border-border/50 p-1 shadow-fluent hover:shadow-lg transition-all duration-300">
                  <div className="flex items-center gap-3 px-3 py-2 mx-0">
                    <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                      <Grid3X3 className="w-4 h-4" />
                      <span>Cards</span>
                    </div>
                    <Switch checked={viewMode === 'table'} onCheckedChange={checked => setViewMode(checked ? 'table' : 'card')} className="data-[state=checked]:bg-primary data-[state=unchecked]:bg-secondary/30 border-2 border-border/20 shadow-inner" />
                    <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                      <Table className="w-4 h-4" />
                      <span>Table</span>
                    </div>
                  </div>
                  {/* Glow effect */}
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-primary/5 via-secondary/10 to-primary/5 opacity-0 hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                </div>
                
                <Button onClick={handleCreateItem} className="fluent-button bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg hover:shadow-xl transition-all duration-300 px-6 py-3">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Checklist Item
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-8 py-8">
        {!categoryStats || Object.keys(categoryStats).length === 0 ? <div className="text-center py-16">
            <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-blue-100 to-blue-200 rounded-full flex items-center justify-center shadow-lg">
              <FileText className="w-12 h-12 text-blue-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">No Checklist Items</h3>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              No checklist items are currently available. Items will appear here once they are created.
            </p>
          </div> : viewMode === 'table' ? <ChecklistItemsTableView items={checklistItems || []} onViewItem={handleViewItem} onEditItem={handleEditItem} onDeleteItem={handleDeleteItem} /> : <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
            <SortableContext items={categoryOrder} strategy={verticalListSortingStrategy}>
              <Accordion type="multiple" value={expandedCategories} onValueChange={setExpandedCategories} className="space-y-6">
                {categoryOrder.map(category => <DraggableCategory key={category} category={category} count={categoryStats[category] || 0} isOpen={expandedCategories.includes(category)} />)}
              </Accordion>
            </SortableContext>

            <DragOverlay>
              {activeDragId ? <div className="rounded-xl bg-white shadow-xl border border-gray-200 opacity-90">
                  <div className="px-6 py-4">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-xl flex items-center justify-center border border-blue-200/50">
                        {getCategoryIcon(activeDragId)}
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900">{activeDragId}</h4>
                        <p className="text-sm text-gray-500">
                          {categoryStats[activeDragId] || 0} checklist items
                        </p>
                      </div>
                    </div>
                  </div>
                </div> : null}
            </DragOverlay>
          </DndContext>}
      </div>
      
      {/* Detail Modal */}
      {showDetailModal && viewingItem && <ChecklistItemDetailModal isOpen={showDetailModal} onClose={handleCloseDetailModal} item={viewingItem} mode={detailModalMode} />}


      {/* Delete Modal */}
      {deletingItem && <ChecklistItemDeletionModal item={deletingItem} isOpen={showDeleteModal} onClose={handleCloseDeleteModal} onDeleted={handleItemDeleted} />}

      {/* Create Checklist Item Form */}
      {showCreateForm && <CreateChecklistItemForm onBack={handleCreateCancel} onComplete={handleCreateComplete} />}
    </div>;
};
export default ChecklistManagementPage;
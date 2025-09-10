import React, { useState } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ArrowLeft, ChevronDown, FileText, Users, Shield, Cog, GripVertical, CheckCircle, Edit3, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useChecklistItems, ChecklistItem } from '@/hooks/useChecklistItems';
import EditChecklistItemModal from './EditChecklistItemModal';
import ChecklistItemDeletionModal from './ChecklistItemDeletionModal';

interface ChecklistManagementPageProps {
  onBack: () => void;
}

const ChecklistManagementPage: React.FC<ChecklistManagementPageProps> = ({ onBack }) => {
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);
  const [categoryOrder, setCategoryOrder] = useState<string[]>([]);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<ChecklistItem | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [deletingItem, setDeletingItem] = useState<ChecklistItem | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  
  const { data: checklistItems, isLoading: itemsLoading } = useChecklistItems();

  const categoryStats = checklistItems?.reduce((acc, item) => {
    acc[item.category] = (acc[item.category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Initialize category order when data loads
  React.useEffect(() => {
    if (categoryStats && categoryOrder.length === 0) {
      setCategoryOrder(Object.keys(categoryStats));
    }
  }, [categoryStats, categoryOrder.length]);

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveDragId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDragId(null);

    if (!over || active.id === over.id) {
      return;
    }

    setCategoryOrder((items) => {
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

  const handleEditItem = (item: ChecklistItem) => {
    setEditingItem(item);
    setShowEditModal(true);
  };

  const handleCloseEditModal = () => {
    setShowEditModal(false);
    setEditingItem(null);
  };

  const handleSaveComplete = () => {
    // Navigate back to checklist categories view
    onBack();
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

  // Draggable Category Component
  const DraggableCategory = ({ category, count, isOpen }: { category: string; count: number; isOpen: boolean }) => {
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging,
    } = useSortable({ id: category });

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
    };

    const categoryItems = getItemsByCategory(category);

    return (
      <div
        ref={setNodeRef}
        style={style}
        className={`${isDragging ? 'opacity-50 scale-105 z-50' : ''} transition-all duration-200`}
        {...attributes}
      >
        <AccordionItem value={category} className="border-0 mb-6">
          <div className={`group relative overflow-hidden rounded-3xl backdrop-blur-xl border shadow-2xl transition-all duration-500 hover:shadow-4xl hover:scale-[1.03] hover:-translate-y-2 ${isOpen ? 'bg-primary/5 border-primary/30 ring-2 ring-primary/30' : 'bg-white/70 border-white/20'}`}>
            {/* Microsoft Fluent Design Acrylic Background */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/90 via-white/60 to-white/30 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            {/* Animated mesh gradient background */}
            <div className="absolute inset-0 bg-gradient-to-br from-blue-50/30 via-purple-50/20 to-indigo-50/30 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            {/* Microsoft Reveal Effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-blue-200/20 to-transparent -translate-x-[100%] group-hover:translate-x-[100%] transition-transform duration-1000 ease-out"></div>
            {/* Floating particles effect */}
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700">
              <div className="absolute top-4 right-8 w-2 h-2 bg-blue-400/40 rounded-full animate-pulse"></div>
              <div className="absolute top-16 right-16 w-1 h-1 bg-purple-400/50 rounded-full animate-pulse" style={{ animationDelay: '0.5s' }}></div>
              <div className="absolute bottom-8 left-12 w-1.5 h-1.5 bg-indigo-400/30 rounded-full animate-pulse" style={{ animationDelay: '1s' }}></div>
            </div>

            {/* Category Header */}
            <AccordionTrigger className={`hover:no-underline px-8 py-7 relative z-10 transition-all duration-500 ${isOpen ? 'bg-primary/5' : 'group-hover:bg-white/20'}`}>
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center space-x-6">
                  {/* Drag Handle */}
                  <div
                    {...listeners}
                    className="cursor-grab active:cursor-grabbing p-2 rounded-2xl hover:bg-white/80 transition-all duration-300 group-hover:bg-white/60 backdrop-blur-sm border border-white/30 group-hover:border-white/50 shadow-lg hover:shadow-xl"
                    title="Drag to reorder"
                  >
                    <GripVertical className="w-5 h-5 text-gray-400 hover:text-blue-600 transition-colors duration-300" />
                  </div>

                  <div className="relative">
                    {/* Icon with glow */}
                    <div className="absolute -inset-4 bg-gradient-to-br from-blue-500/30 to-purple-500/30 rounded-3xl blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                    <div className="absolute -inset-2 bg-gradient-to-br from-blue-400/20 to-purple-400/20 rounded-2xl blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-400" style={{ animationDelay: '0.1s' }}></div>
                    <div className="relative w-16 h-16 bg-gradient-to-br from-blue-100/80 to-purple-100/80 backdrop-blur-sm rounded-2xl flex items-center justify-center border border-blue-200/60 group-hover:border-blue-300/80 group-hover:shadow-2xl transition-all duration-500 group-hover:scale-110">
                      <div className="absolute inset-0 bg-gradient-to-br from-white/50 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                      <div className="relative">{getCategoryIcon(category)}</div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h4 className={`text-xl font-bold bg-gradient-to-r bg-clip-text text-transparent transition-all duration-500 ${isOpen ? 'from-blue-700 via-purple-700 to-blue-700' : 'from-gray-900 via-blue-900 to-gray-900 group-hover:from-blue-700 group-hover:via-purple-700 group-hover:to-blue-700'}`}>
                      {category}
                    </h4>
                    <p className="text-sm font-medium text-gray-600 group-hover:text-blue-700 transition-all duration-300">
                      {count} professional checklist items
                    </p>
                    <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity duration-500" style={{ animationDelay: '0.2s' }}>
                      <div className="w-24 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all duration-1000 group-hover:w-full" style={{ width: '60%' }}></div>
                      </div>
                      <span className="text-xs text-blue-600 font-medium">Ready</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-4">
                  <Badge className="bg-gradient-to-r from-blue-50/90 to-purple-50/90 text-blue-700 border border-blue-200/60 group-hover:from-blue-100/90 group-hover:to-purple-100/90 group-hover:border-blue-300/80 group-hover:shadow-lg transition-all duration-500 backdrop-blur-sm px-4 py-2 text-sm font-medium">
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full group-hover:animate-pulse"></div>
                      <span>{count} items</span>
                    </div>
                  </Badge>
                  <div className="relative w-8 h-8 flex items-center justify-center">
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-100/0 to-purple-100/0 group-hover:from-blue-100/80 group-hover:to-purple-100/80 rounded-xl transition-all duration-300"></div>
                    <ChevronDown className="w-6 h-6 text-gray-400 group-hover:text-blue-600 transition-all duration-300 data-[state=open]:rotate-180 group-hover:scale-110" />
                  </div>
                </div>
              </div>
            </AccordionTrigger>

            {/* Accordion Content */}
            <AccordionContent className="px-8 pb-8 relative z-10">
              <div className="space-y-6 animate-fade-in">
                <div className="w-full h-px bg-gradient-to-r from-transparent via-blue-200/60 to-transparent"></div>

                {categoryItems.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="relative">
                      <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-blue-100/80 to-purple-100/80 backdrop-blur-sm rounded-3xl flex items-center justify-center shadow-xl border border-white/50">
                        <div className="absolute inset-0 bg-gradient-to-br from-white/50 to-transparent rounded-3xl"></div>
                        <FileText className="w-10 h-10 text-blue-500 relative z-10" />
                      </div>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-700 mb-2">No Items Available</h3>
                    <p className="text-sm text-gray-500 max-w-sm mx-auto">
                      This category currently contains no checklist items. Items will appear here once they are created.
                    </p>
                  </div>
                ) : (
                  <div className="grid gap-6">
                    {categoryItems.map((item, index) => (
                      <div
                        key={item.id}
                        className="group/item relative overflow-hidden bg-white/80 backdrop-blur-sm border border-white/30 hover:border-blue-200/60 hover:shadow-2xl transition-all duration-500 hover:scale-[1.02] animate-fade-in rounded-2xl"
                        style={{ animationDelay: `${index * 100}ms` }}
                      >
                        <div className="absolute inset-0 bg-gradient-to-br from-white/90 via-white/70 to-blue-50/30 opacity-0 group-hover/item:opacity-100 transition-opacity duration-500"></div>
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-blue-100/30 to-transparent -translate-x-[100%] group-hover/item:translate-x-[100%] transition-transform duration-1000"></div>
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-blue-400 via-blue-500 to-purple-600 group-hover/item:w-2 transition-all duration-500 shadow-lg"></div>

                        <div className="p-6 ml-2 relative z-10">
                          <div className="space-y-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-4">
                                <div className="relative">
                                  <div className="absolute -inset-1 bg-gradient-to-br from-blue-400/20 to-purple-400/20 rounded-xl blur opacity-0 group-hover/item:opacity-100 transition-opacity duration-300"></div>
                                  <div className="relative w-12 h-12 bg-gradient-to-br from-blue-100/90 to-purple-100/90 backdrop-blur-sm rounded-xl flex items-center justify-center border border-blue-200/60 group-hover/item:border-blue-300/80 group-hover/item:shadow-lg transition-all duration-300">
                                    <span className="text-sm font-bold bg-gradient-to-r from-blue-700 to-purple-700 bg-clip-text text-transparent">{item.id}</span>
                                  </div>
                                </div>
                                <Badge
                                  variant={item.is_active ? 'default' : 'secondary'}
                                  className={`text-xs font-medium px-3 py-1.5 transition-all duration-300 ${
                                    item.is_active
                                      ? 'bg-gradient-to-r from-green-100 to-emerald-100 text-green-700 border-green-200 group-hover/item:shadow-md'
                                      : 'bg-gradient-to-r from-gray-100 to-gray-200 text-gray-600 border-gray-200'
                                  }`}
                                >
                                  <div className={`w-2 h-2 rounded-full mr-2 ${item.is_active ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></div>
                                  {item.is_active ? 'Active' : 'Inactive'}
                                </Badge>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="opacity-0 group-hover/item:opacity-100 transition-all duration-300 hover:bg-blue-50 hover:text-blue-700 rounded-xl"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleEditItem(item);
                                  }}
                                  title="Edit checklist item"
                                >
                                  <Edit3 className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="opacity-0 group-hover/item:opacity-100 transition-all duration-300 hover:bg-red-50 hover:text-red-700 rounded-xl"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteItem(item);
                                  }}
                                  title="Delete checklist item"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>

                            <div className="space-y-3">
                              <p className="text-sm font-medium text-gray-800 leading-relaxed group-hover/item:text-blue-900 transition-colors duration-300 line-clamp-2">
                                {item.description}
                              </p>

                              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-2">
                                {item.topic && (
                                  <div className="flex items-start space-x-3 p-3 bg-blue-50/50 rounded-xl border border-blue-100/50 group-hover/item:bg-blue-100/50 group-hover/item:border-blue-200/70 transition-all duration-300">
                                    <div className="w-8 h-8 bg-gradient-to-br from-blue-100 to-blue-200 rounded-lg flex items-center justify-center shadow-sm">
                                      <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <span className="text-xs font-semibold text-blue-700 uppercase tracking-wide">Topic</span>
                                      <p className="text-sm text-gray-700 font-medium mt-1">{item.topic}</p>
                                    </div>
                                  </div>
                                )}

                                {item.supporting_evidence && (
                                  <div className="flex items-start space-x-3 p-3 bg-purple-50/50 rounded-xl border border-purple-100/50 group-hover/item:bg-purple-100/50 group-hover/item:border-purple-200/70 transition-all duration-300">
                                    <div className="w-8 h-8 bg-gradient-to-br from-purple-100 to-purple-200 rounded-lg flex items-center justify-center shadow-sm">
                                      <FileText className="w-4 h-4 text-purple-600" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <span className="text-xs font-semibold text-purple-700 uppercase tracking-wide">Evidence</span>
                                      <p className="text-sm text-gray-700 font-medium mt-1 line-clamp-2">{item.supporting_evidence}</p>
                                    </div>
                                  </div>
                                )}

                                {item.responsible_party && (
                                  <div className="flex items-start space-x-3 p-3 bg-orange-50/50 rounded-xl border border-orange-100/50 group-hover/item:bg-orange-100/50 group-hover/item:border-orange-200/70 transition-all duration-300">
                                    <div className="w-8 h-8 bg-gradient-to-br from-orange-100 to-orange-200 rounded-lg flex items-center justify-center shadow-sm">
                                      <Users className="w-4 h-4 text-orange-600" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <span className="text-xs font-semibold text-orange-700 uppercase tracking-wide">Responsible</span>
                                      <p className="text-sm text-gray-700 font-medium mt-1">{item.responsible_party}</p>
                                    </div>
                                  </div>
                                )}

                                {item.approving_authority && (
                                  <div className="flex items-start space-x-3 p-3 bg-green-50/50 rounded-xl border border-green-100/50 group-hover/item:bg-green-100/50 group-hover/item:border-green-200/70 transition-all duration-300">
                                    <div className="w-8 h-8 bg-gradient-to-br from-green-100 to-green-200 rounded-lg flex items-center justify-center shadow-sm">
                                      <CheckCircle className="w-4 h-4 text-green-600" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <span className="text-xs font-semibold text-green-700 uppercase tracking-wide">Approvers</span>
                                      <p className="text-sm text-gray-700 font-medium mt-1">{item.approving_authority}</p>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>

                            {item.created_at && (
                              <div className="pt-4 border-t border-gray-100/60 group-hover/item:border-blue-200/40 transition-colors duration-300">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center space-x-3">
                                    <div className="w-6 h-6 bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg flex items-center justify-center">
                                      <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                                    </div>
                                    <span className="text-xs text-gray-500 font-medium">
                                      Created {new Date(item.created_at).toLocaleDateString('en-US', {
                                        year: 'numeric',
                                        month: 'short',
                                        day: 'numeric',
                                      })}
                                    </span>
                                  </div>
                                  <div className="opacity-0 group-hover/item:opacity-100 transition-opacity duration-300">
                                    <Badge variant="outline" className="text-xs bg-blue-50 text-blue-600 border-blue-200">
                                      Version {item.version}
                                    </Badge>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </AccordionContent>
          </div>
        </AccordionItem>
      </div>
    );
  };

  if (itemsLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto"></div>
          <p className="text-gray-600 font-medium">Loading checklist items...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      {/* Microsoft Fluent Design Header */}
      <div className="relative overflow-hidden bg-gradient-to-r from-white/90 via-white/80 to-white/90 backdrop-blur-xl border-b border-gray-200/60 shadow-lg">
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmMGY5ZmYiIGZpbGwtb3BhY2l0eT0iMC40Ij48cGF0aCBkPSJtMzYgMzRjMC0yLjIwOTEzOSAxLjc5MDg2MS00IDQtNCBoMTZjMi4yMDkxMzkgMCA0IDEuNzkwODYxIDQgNHYxNmMwIDIuMjA5MTM5LTEuNzkwODYxIDQtNCA0aC0xNmMtMi4yMDkxMzktNGUtMy00LTEuNzkwODYxLTQtNHptMC0zNmMwLTIuMjA5MTM5IDEuNzkwODYxLTQgNC00aDE2YzIuMjA5MTM5IDAgNCAxLjc5MDg2MSA0IDR2MTZjMCAyLjIwOTEzOS0xLjc5MDg2MSA0LTQgNGgtMTZjLTIuMjA5MTM5LTRlLTMtNC0xLjc5MDg2MS00LTR6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-30"></div>
        
        <div className="relative z-10 max-w-7xl mx-auto px-8 py-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-6">
              <Button 
                variant="ghost" 
                onClick={onBack}
                className="flex items-center gap-2 hover:bg-white/80 text-gray-700 hover:text-blue-700 transition-all duration-300 shadow-sm hover:shadow-md"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </Button>
              <div className="space-y-1">
                <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 via-blue-900 to-gray-900 bg-clip-text text-transparent">
                  Checklist Management
                </h1>
                <p className="text-gray-600">Browse and organize PSSR checklist items by category</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-8 py-8">
        {!categoryStats || Object.keys(categoryStats).length === 0 ? (
          <div className="text-center py-16">
            <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-blue-100 to-blue-200 rounded-full flex items-center justify-center shadow-lg">
              <FileText className="w-12 h-12 text-blue-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">No Checklist Items</h3>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              No checklist items are currently available. Items will appear here once they are created.
            </p>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={categoryOrder} strategy={verticalListSortingStrategy}>
              <Accordion 
                type="multiple" 
                value={expandedCategories} 
                onValueChange={setExpandedCategories}
                className="space-y-6"
              >
                {categoryOrder.map((category) => (
                  <DraggableCategory 
                    key={category} 
                    category={category} 
                    count={categoryStats[category] || 0}
                    isOpen={expandedCategories.includes(category)} 
                  />
                ))}
              </Accordion>
            </SortableContext>

            <DragOverlay>
              {activeDragId ? (
                <div className="rounded-xl bg-white shadow-xl border border-gray-200 opacity-90">
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
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        )}
      </div>
      
      {/* Edit Checklist Item Modal */}
      {editingItem && (
        <EditChecklistItemModal
          isOpen={showEditModal}
          onClose={handleCloseEditModal}
          item={editingItem}
          onSaveComplete={handleSaveComplete}
        />
      )}

      {/* Delete Modal */}
      {deletingItem && (
        <ChecklistItemDeletionModal
          item={deletingItem}
          isOpen={showDeleteModal}
          onClose={handleCloseDeleteModal}
          onDeleted={handleItemDeleted}
        />
      )}
    </div>
  );
};

export default ChecklistManagementPage;
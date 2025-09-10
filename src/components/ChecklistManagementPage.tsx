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
import { ArrowLeft, ChevronDown, FileText, Users, Shield, Cog, GripVertical, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useChecklistItems } from '@/hooks/useChecklistItems';

interface ChecklistManagementPageProps {
  onBack: () => void;
}

const ChecklistManagementPage: React.FC<ChecklistManagementPageProps> = ({ onBack }) => {
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);
  const [categoryOrder, setCategoryOrder] = useState<string[]>([]);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  
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

  // Draggable Category Component
  const DraggableCategory = ({ category, count }: { category: string; count: number }) => {
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
        <AccordionItem value={category} className="border-0">
          <div className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-white via-white to-slate-50/50 border border-gray-200/60 shadow-sm hover:shadow-lg transition-all duration-300 hover:scale-[1.02] hover:-translate-y-1">
            {/* Fluent Design Acrylic Background */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/80 via-white/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            
            {/* Reveal Effect on Hover */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
            
            {/* Category Header */}
            <AccordionTrigger className="hover:no-underline px-6 py-5 relative z-10 group-hover:bg-white/30 transition-all duration-300">
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center space-x-4">
                  {/* Drag Handle */}
                  <div 
                    {...listeners}
                    className="cursor-grab active:cursor-grabbing p-1 rounded-lg hover:bg-gray-100/80 transition-colors duration-200 group-hover:bg-white/50"
                    title="Drag to reorder"
                  >
                    <GripVertical className="w-4 h-4 text-gray-400 hover:text-gray-600 transition-colors duration-200" />
                  </div>
                  
                  <div className="relative">
                    {/* Icon Background with Glow Effect */}
                    <div className="absolute -inset-2 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-xl blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    <div className="relative w-12 h-12 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-xl flex items-center justify-center border border-blue-200/50 group-hover:border-blue-300/70 group-hover:shadow-lg transition-all duration-300">
                      {getCategoryIcon(category)}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-semibold text-gray-900 group-hover:text-blue-900 transition-colors duration-300">
                      {category}
                    </h4>
                    <p className="text-sm text-gray-500 group-hover:text-gray-600 transition-colors duration-300">
                      {count} checklist items
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <Badge 
                    variant="secondary" 
                    className="bg-blue-50/80 text-blue-700 border border-blue-200/50 group-hover:bg-blue-100/80 group-hover:border-blue-300/60 transition-all duration-300"
                  >
                    {count} items
                  </Badge>
                  {/* Custom Chevron with Animation */}
                  <div className="w-5 h-5 text-gray-400 group-hover:text-blue-600 transition-colors duration-300">
                    <ChevronDown className="w-5 h-5 transition-transform duration-200 data-[state=open]:rotate-180" />
                  </div>
                </div>
              </div>
            </AccordionTrigger>
            
            {/* Accordion Content */}
            <AccordionContent className="px-6 pb-6 relative z-10">
              <div className="space-y-4 animate-fade-in">
                {categoryItems.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                      <FileText className="w-8 h-8 text-gray-400" />
                    </div>
                    <p className="text-sm text-gray-500">No items in this category</p>
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {categoryItems.map((item, index) => (
                      <Card 
                        key={item.id} 
                        className="group/item relative overflow-hidden bg-gradient-to-br from-white via-slate-50/30 to-white border border-gray-100 hover:border-blue-200/60 hover:shadow-md transition-all duration-300 hover:scale-[1.01] animate-fade-in"
                        style={{ animationDelay: `${index * 50}ms` }}
                      >
                        {/* Left Accent Border */}
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-blue-400 via-blue-500 to-blue-600 group-hover/item:w-2 transition-all duration-300"></div>
                        
                        {/* Item Content */}
                        <div className="p-5 ml-2 relative">
                          {/* Hover Reveal Effect */}
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-blue-50/30 to-transparent translate-x-[-100%] group-hover/item:translate-x-[100%] transition-transform duration-700"></div>
                          
                          <div className="space-y-3 relative z-10">
                            {/* Header */}
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-3">
                                <div className="w-8 h-8 bg-gradient-to-br from-blue-100 to-blue-200 rounded-lg flex items-center justify-center border border-blue-200/50">
                                  <span className="text-xs font-bold text-blue-700">{item.id}</span>
                                </div>
                                <Badge 
                                  variant={item.is_active ? "default" : "secondary"} 
                                  className={`text-xs ${item.is_active ? 'bg-green-100 text-green-700 border-green-200' : 'bg-gray-100 text-gray-600 border-gray-200'}`}
                                >
                                  {item.is_active ? 'Active' : 'Inactive'}
                                </Badge>
                              </div>
                            </div>
                            
                            {/* Description */}
                            <p className="text-sm text-gray-700 leading-relaxed group-hover/item:text-gray-800 transition-colors duration-300">
                              {item.description}
                            </p>
                            
                            {/* Metadata Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                              {item.topic && (
                                <div className="flex items-start space-x-2">
                                  <div className="w-4 h-4 mt-0.5 bg-blue-100 rounded flex items-center justify-center">
                                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                  </div>
                                  <div>
                                    <span className="text-xs font-medium text-gray-600">Topic</span>
                                    <p className="text-xs text-gray-700">{item.topic}</p>
                                  </div>
                                </div>
                              )}
                              
                              {item.supporting_evidence && (
                                <div className="flex items-start space-x-2">
                                  <div className="w-4 h-4 mt-0.5 bg-purple-100 rounded flex items-center justify-center">
                                    <FileText className="w-2.5 h-2.5 text-purple-600" />
                                  </div>
                                  <div>
                                    <span className="text-xs font-medium text-gray-600">Evidence</span>
                                    <p className="text-xs text-gray-700">{item.supporting_evidence}</p>
                                  </div>
                                </div>
                              )}
                              
                              {item.responsible_party && (
                                <div className="flex items-start space-x-2">
                                  <div className="w-4 h-4 mt-0.5 bg-orange-100 rounded flex items-center justify-center">
                                    <Users className="w-2.5 h-2.5 text-orange-600" />
                                  </div>
                                  <div>
                                    <span className="text-xs font-medium text-gray-600">Responsible</span>
                                    <p className="text-xs text-gray-700">{item.responsible_party}</p>
                                  </div>
                                </div>
                              )}
                              
                              {item.approving_authority && (
                                <div className="flex items-start space-x-2">
                                  <div className="w-4 h-4 mt-0.5 bg-green-100 rounded flex items-center justify-center">
                                    <CheckCircle className="w-2.5 h-2.5 text-green-600" />
                                  </div>
                                  <div>
                                    <span className="text-xs font-medium text-gray-600">Approvers</span>
                                    <p className="text-xs text-gray-700">{item.approving_authority}</p>
                                  </div>
                                </div>
                              )}
                            </div>
                            
                            {/* Footer */}
                            {item.created_at && (
                              <div className="pt-2 border-t border-gray-100">
                                <div className="flex items-center space-x-2">
                                  <div className="w-3 h-3 bg-gray-100 rounded-full flex items-center justify-center">
                                    <div className="w-1.5 h-1.5 bg-gray-400 rounded-full"></div>
                                  </div>
                                  <span className="text-xs text-gray-500">
                                    Created {new Date(item.created_at).toLocaleDateString()}
                                  </span>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </Card>
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
    </div>
  );
};

export default ChecklistManagementPage;
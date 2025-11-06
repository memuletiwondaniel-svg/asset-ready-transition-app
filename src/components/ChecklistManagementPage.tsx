import React, { useState, useMemo } from 'react';
import { AnimatedBackground } from '@/components/ui/AnimatedBackground';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent, DragOverlay, DragStartEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ArrowLeft, ChevronDown, FileText, Users, Shield, Cog, GripVertical, CheckCircle, Trash2, Save, Plus, MoreVertical, Eye, Edit, Grid3X3, Search, Home, Filter, Copy, AlignJustify, TableIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import { useChecklistItems, ChecklistItem } from '@/hooks/useChecklistItems';
import { useChecklistCategories } from '@/hooks/useChecklistCategories';
import { useChecklistTopics } from '@/hooks/useChecklistTopics';
import ChecklistItemDeletionModal from './ChecklistItemDeletionModal';
import ViewChecklistItemModal from './ViewChecklistItemModal';
import EditChecklistItemModal from './EditChecklistItemModal';
import CreateChecklistItemForm from './CreateChecklistItemForm';
import ChecklistItemsTableView from './ChecklistItemsTableView';
import { ThemeToggle } from './admin/ThemeToggle';
import LanguageSelector from './admin/LanguageSelector';
import UserProfileDropdown from './admin/UserProfileDropdown';
import OrshLogo from './ui/OrshLogo';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { getCurrentTranslations } from '@/utils/translations';
import { AdvancedFilterSidebar, ChecklistFilters } from './checklist/AdvancedFilterSidebar';
import { BulkActionsToolbar } from './checklist/BulkActionsToolbar';
import { TemplateManagement } from './checklist/TemplateManagement';
import { ChecklistItemPreviewPanel } from './checklist/ChecklistItemPreviewPanel';
import { useToast } from '@/hooks/use-toast';
import { useCreateChecklistItem } from '@/hooks/useChecklistItems';
interface ChecklistManagementPageProps {
  onBack: () => void;
  translations?: any;
  selectedLanguage?: string;
}
const ChecklistManagementPage: React.FC<ChecklistManagementPageProps> = ({
  onBack,
  translations,
  selectedLanguage = 'English'
}) => {
  const [currentLanguage, setCurrentLanguage] = useState(selectedLanguage);
  
  // Update current language when selectedLanguage prop changes
  React.useEffect(() => {
    setCurrentLanguage(selectedLanguage);
  }, [selectedLanguage]);
  
  const t = translations || getCurrentTranslations(currentLanguage);
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
  const [searchTerm, setSearchTerm] = useState('');

  // New state for batch operations and filters
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [showTemplateManagement, setShowTemplateManagement] = useState(false);
  const [filters, setFilters] = useState<ChecklistFilters>({});
  
  // Preview panel state
  const [previewItem, setPreviewItem] = useState<ChecklistItem | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [previewTimeout, setPreviewTimeout] = useState<NodeJS.Timeout | null>(null);

  const { toast } = useToast();
  const createChecklistItemMutation = useCreateChecklistItem();
  const {
    data: allChecklistItems,
    isLoading: itemsLoading
  } = useChecklistItems(currentLanguage);

  // Apply filters to checklist items
  const checklistItems = useMemo(() => {
    if (!allChecklistItems) return [];
    let filtered = [...allChecklistItems];

    // Apply search term
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(item => item.unique_id?.toLowerCase().includes(searchLower) || item.description?.toLowerCase().includes(searchLower) || item.topic?.toLowerCase().includes(searchLower) || item.category?.toLowerCase().includes(searchLower) || item.Approver?.toLowerCase().includes(searchLower) || item.responsible?.toLowerCase().includes(searchLower));
    }

    // Apply advanced filters
    if (filters.categories && filters.categories.length > 0) {
      filtered = filtered.filter(item => filters.categories!.includes(item.category));
    }
    if (filters.topics && filters.topics.length > 0) {
      filtered = filtered.filter(item => item.topic && filters.topics!.includes(item.topic));
    }
    if (filters.approvers && filters.approvers.length > 0) {
      filtered = filtered.filter(item => item.Approver && filters.approvers!.includes(item.Approver));
    }
    if (filters.responsible && filters.responsible.length > 0) {
      filtered = filtered.filter(item => item.responsible && filters.responsible!.includes(item.responsible));
    }
    if (filters.dateFrom || filters.dateTo) {
      filtered = filtered.filter(item => {
        if (!item.created_at) return false;
        const itemDate = new Date(item.created_at);
        if (filters.dateFrom && itemDate < new Date(filters.dateFrom)) return false;
        if (filters.dateTo && itemDate > new Date(filters.dateTo)) return false;
        return true;
      });
    }
    return filtered;
  }, [allChecklistItems, searchTerm, filters]);

  // Build language code and maps for category/topic display
  const toLangCode = (lang?: string) => {
    if (!lang) return 'en';
    const normalized = lang.toLowerCase();
    if (['en', 'english'].includes(normalized)) return 'en';
    if (['ar', 'arabic', 'العربية'].includes(normalized)) return 'ar';
    if (['fr', 'french', 'français'].includes(normalized)) return 'fr';
    if (['ms', 'malay', 'bahasa melayu'].includes(normalized)) return 'ms';
    if (['ru', 'russian', 'русский'].includes(normalized)) return 'ru';
    return 'en';
  };
  const langCode = toLangCode(currentLanguage);

  const { data: categoriesData } = useChecklistCategories();
  const { data: topicsData } = useChecklistTopics();

  const categoryNameMap = React.useMemo(() => {
    const map: Record<string, string> = {};
    (categoriesData as any[] | undefined)?.forEach((c: any) => {
      const localized = c?.translations?.[langCode]?.name;
      if (c?.name) map[c.name] = localized || c.name;
    });
    return map;
  }, [categoriesData, langCode]);

  const topicNameMap = React.useMemo(() => {
    const map: Record<string, string> = {};
    (topicsData as any[] | undefined)?.forEach((t: any) => {
      const localized = t?.translations?.[langCode]?.name;
      if (t?.name) map[t.name] = localized || t.name;
    });
    return map;
  }, [topicsData, langCode]);

  // Calculate category statistics
  const categoryStats = useMemo(() => {
    const stats: Record<string, number> = {};
    checklistItems?.forEach(item => {
      if (item.category) {
        stats[item.category] = (stats[item.category] || 0) + 1;
      }
    });
    return stats;
  }, [checklistItems]);

  // Get unique values for filters
  const availableCategories = useMemo(() => {
    return Array.from(new Set(allChecklistItems?.map(item => item.category).filter(Boolean) || []));
  }, [allChecklistItems]);

  const availableTopics = useMemo(() => {
    return Array.from(new Set(allChecklistItems?.map(item => item.topic).filter(Boolean) || []));
  }, [allChecklistItems]);

  const availableApprovers = useMemo(() => {
    return Array.from(new Set(allChecklistItems?.map(item => item.Approver).filter(Boolean) || []));
  }, [allChecklistItems]);

  const availableResponsible = useMemo(() => {
    return Array.from(new Set(allChecklistItems?.map(item => item.responsible).filter(Boolean) || []));
  }, [allChecklistItems]);

  // Initialize and update category order when data changes
  React.useEffect(() => {
    if (categoryStats) {
      // Set categories in the specified default order
      const defaultOrder = ["General", "Process Safety", "Health & Safety", "Organization", "Documentation", "PACO", "Rotating", "Static", "Civil", "Elect"];

      // Only include categories that actually exist in the data
      const existingCategories = Object.keys(categoryStats);
      const orderedExistingCategories = defaultOrder.filter(cat => existingCategories.includes(cat));

      // Add any categories that exist in data but not in our default order
      const remainingCategories = existingCategories.filter(cat => !defaultOrder.includes(cat));
      const newCategoryOrder = [...orderedExistingCategories, ...remainingCategories];

      // Only update if the order has actually changed
      if (JSON.stringify(newCategoryOrder) !== JSON.stringify(categoryOrder)) {
        setCategoryOrder(newCategoryOrder);
      }
    }
  }, [categoryStats]);

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
    let filtered = checklistItems?.filter(item => item.category === category) || [];

    // Apply search filter
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase().trim();
      filtered = filtered.filter(item => item.unique_id?.toLowerCase().includes(searchLower) || item.description?.toLowerCase().includes(searchLower) || item.topic?.toLowerCase().includes(searchLower) || item.category?.toLowerCase().includes(searchLower) || item.Approver?.toLowerCase().includes(searchLower) || item.responsible?.toLowerCase().includes(searchLower));
    }
    return filtered;
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

  // Hover preview handlers
  const handleItemMouseEnter = (item: ChecklistItem) => {
    if (previewTimeout) {
      clearTimeout(previewTimeout);
    }
    const timeout = setTimeout(() => {
      setPreviewItem(item);
      setShowPreview(true);
    }, 500); // 500ms delay before showing preview
    setPreviewTimeout(timeout);
  };

  const handleItemMouseLeave = () => {
    if (previewTimeout) {
      clearTimeout(previewTimeout);
      setPreviewTimeout(null);
    }
  };

  const handleClosePreview = () => {
    setShowPreview(false);
    setPreviewItem(null);
  };

  // Duplicate item handler
  const handleDuplicateItem = async (item: ChecklistItem) => {
    try {
      const duplicatedItem = {
        unique_id: `${item.unique_id}_copy`,
        description: item.description,
        category: item.category,
        topic: item.topic,
        Approver: item.Approver,
        responsible: item.responsible,
      };

      await createChecklistItemMutation.mutateAsync(duplicatedItem);
      
      toast({
        title: "Item duplicated",
        description: `Successfully duplicated item ${item.unique_id}`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to duplicate item",
        variant: "destructive",
      });
    }
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
    return <div ref={setNodeRef} style={style} className={`${isDragging ? 'opacity-50 z-50' : ''} transition-all duration-200`} {...attributes}>
        <AccordionItem value={category} className="border-0 mb-4">
          <div className={`fluent-card group relative overflow-hidden rounded-xl transition-all duration-300 hover:shadow-fluent-lg ${isOpen ? 'bg-accent/10 border-primary/20 shadow-fluent-md' : 'border-border/40'}`}>
            
            {/* Category Header */}
            <AccordionTrigger className={`hover:no-underline px-6 py-5 relative z-10 transition-all duration-300 ${isOpen ? 'bg-accent/5' : 'group-hover:bg-muted/30'}`}>
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center space-x-5">
                  {/* Drag Handle */}
                  <div {...listeners} className="cursor-grab active:cursor-grabbing p-2 rounded-lg hover:bg-accent/50 transition-all duration-200 border border-transparent hover:border-border/40" title="Drag to reorder">
                    <GripVertical className="w-5 h-5 text-muted-foreground hover:text-foreground transition-colors duration-200" />
                  </div>

                  <div className="relative">
                    <div className="w-12 h-12 bg-gradient-to-br from-primary/10 to-accent/10 rounded-lg flex items-center justify-center border border-border/40 group-hover:border-primary/40 group-hover:shadow-fluent-sm transition-all duration-300">
                      {getCategoryIcon(category)}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <h4 className={`text-lg font-semibold transition-all duration-300 ${isOpen ? 'text-primary' : 'text-foreground group-hover:text-primary'}`}>
                      {category}
                    </h4>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <Badge className={`${isOpen ? 'bg-primary/10 text-primary border-primary/30' : 'bg-muted text-muted-foreground border-border/40'} group-hover:bg-primary/10 group-hover:text-primary group-hover:border-primary/30 transition-all duration-300 px-3 py-1 text-sm font-medium shadow-fluent-xs`}>
                    <span>{count} items</span>
                  </Badge>
                </div>
              </div>
            </AccordionTrigger>

            {/* Accordion Content */}
            <AccordionContent className="px-6 pb-6 relative z-10">
              <div className="space-y-4 animate-fade-in-up">
                <div className="w-full h-px bg-gradient-to-r from-transparent via-border to-transparent"></div>

                {categoryItems.length === 0 ? <div className="text-center py-12">
                    <h3 className="text-base font-semibold text-muted-foreground mb-2">No Items Available</h3>
                    <p className="text-sm text-muted-foreground/70 max-w-sm mx-auto">
                      This category currently contains no checklist items.
                    </p>
                  </div> : <div className="space-y-3">
                    <p className="text-sm text-muted-foreground font-medium">{categoryItems.length} item{categoryItems.length !== 1 ? 's' : ''} in this category</p>
                    <div className="space-y-2">
                      {categoryItems.map(item => <div 
                          key={item.unique_id} 
                          className="group relative p-4 bg-card/50 backdrop-blur-sm border border-border/40 rounded-lg hover:bg-card hover:border-primary/30 hover:shadow-fluent-sm transition-all duration-200"
                          onMouseEnter={() => handleItemMouseEnter(item)}
                          onMouseLeave={handleItemMouseLeave}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-start gap-3 flex-1">
                              <Checkbox checked={selectedItems.has(item.unique_id || '')} onCheckedChange={checked => {
                          const newSelected = new Set(selectedItems);
                          if (checked) {
                            newSelected.add(item.unique_id || '');
                          } else {
                            newSelected.delete(item.unique_id || '');
                          }
                          setSelectedItems(newSelected);
                        }} className="mt-1" />
                              <div className="flex-1 space-y-2">
                                <div className="flex items-center space-x-3">
                                  <Badge variant="secondary" className="font-mono text-xs shadow-fluent-xs">
                                    {item.unique_id}
                                  </Badge>
                                  {item.topic && <span className="text-sm font-medium text-primary">{item.topic}</span>}
                                </div>
                                <div className="text-sm text-foreground/90 line-clamp-2">
                                  {item.description}
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex items-center space-x-2">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg">
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
                                  <DropdownMenuItem onClick={() => handleDuplicateItem(item)}>
                                    <Copy className="mr-2 h-4 w-4" />
                                    Duplicate Item
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem onClick={() => handleDeleteItem(item)} className="text-destructive focus:text-destructive">
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
    return <AnimatedBackground className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto"></div>
          <p className="text-foreground font-medium">Loading checklist items...</p>
        </div>
      </AnimatedBackground>;
  }
  return <AnimatedBackground className="min-h-screen">
      {/* Modern Fluent Header */}
      <div className="fluent-navigation sticky top-0 z-50">
        
      </div>

      {/* Bulk Actions Toolbar */}
      <BulkActionsToolbar selectedItems={selectedItems} items={checklistItems || []} onClearSelection={() => setSelectedItems(new Set())} availableCategories={availableCategories} />

      <div className="container pt-12 pb-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Modern Hero Header */}
        <div className="mb-10 animate-fade-in-up">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground/50 uppercase tracking-wider">
                Checklist Management
              </p>
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight fluent-hero-text">
                Checklist Items
              </h1>
              <p className="text-muted-foreground text-base max-w-2xl">
                Manage and organize your checklist items across different categories
              </p>
              {selectedItems.size > 0 && <Badge className="mt-2">
                  {selectedItems.size} item{selectedItems.size !== 1 ? 's' : ''} selected
                </Badge>}
            </div>
            
            <div className="flex flex-wrap items-center gap-3">
              {/* Add New Item Button */}
              <Button 
                onClick={handleCreateItem} 
                className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white hover:from-emerald-600 hover:to-teal-700 shadow-lg hover:shadow-xl transition-all duration-300 border-0"
              >
                <Plus className="w-4 h-4 mr-2" />
                New Item
              </Button>

              {/* Advanced Filters Button */}
              <Button variant="outline" onClick={() => setShowAdvancedFilters(true)} className="fluent-button-secondary shadow-fluent-xs">
                <Filter className="w-4 h-4 mr-2" />
                Filters
                {(filters.categories?.length || 0) + (filters.topics?.length || 0) + (filters.approvers?.length || 0) + (filters.responsible?.length || 0) > 0 && <Badge variant="secondary" className="ml-2">
                    {(filters.categories?.length || 0) + (filters.topics?.length || 0) + (filters.approvers?.length || 0) + (filters.responsible?.length || 0)}
                  </Badge>}
              </Button>

              {/* Template Management Button - Without Icon */}
              <Button variant="outline" onClick={() => setShowTemplateManagement(true)} className="fluent-button-secondary shadow-fluent-xs">
                Templates
              </Button>

              {/* View Mode Toggle - With Distinct Icons and Tooltips */}
              <TooltipProvider>
                <div className="flex items-center gap-1 rounded-lg border bg-muted/30 p-1">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant={viewMode === 'card' ? 'secondary' : 'ghost'}
                        size="sm"
                        onClick={() => setViewMode('card')}
                        className={`h-8 px-3 transition-all ${
                          viewMode === 'card' 
                            ? 'bg-background shadow-sm text-foreground' 
                            : 'text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        <AlignJustify className="w-4 h-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Grouped View - Items organized by category</p>
                    </TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant={viewMode === 'table' ? 'secondary' : 'ghost'}
                        size="sm"
                        onClick={() => setViewMode('table')}
                        className={`h-8 px-3 transition-all ${
                          viewMode === 'table' 
                            ? 'bg-background shadow-sm text-foreground' 
                            : 'text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        <TableIcon className="w-4 h-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Table View - All items in a sortable table</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
              </TooltipProvider>
            </div>
          </div>
        </div>

        {!categoryStats || Object.keys(categoryStats).length === 0 ? <div className="text-center py-16">
            <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-primary/10 to-accent/10 rounded-full flex items-center justify-center shadow-fluent-md">
              <FileText className="w-12 h-12 text-primary" />
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-2">No Checklist Items</h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              No checklist items are currently available. Items will appear here once they are created.
            </p>
          </div> : viewMode === 'table' ? <ChecklistItemsTableView items={checklistItems || []} onViewItem={handleViewItem} onEditItem={handleEditItem} onDeleteItem={handleDeleteItem} /> : <div className="space-y-6">
            {/* Search Bar for Cards View */}
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input placeholder="Search by ID, description, topic, category, approver, or responsible..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-12 h-12 bg-card border-border/40 focus:border-primary/60 focus:ring-primary/20 rounded-xl shadow-fluent-sm" />
            </div>
            
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
            <SortableContext items={categoryOrder} strategy={verticalListSortingStrategy}>
              <Accordion type="multiple" value={expandedCategories} onValueChange={setExpandedCategories} className="space-y-6">
                {categoryOrder.map(category => <DraggableCategory key={category} category={category} count={categoryStats[category] || 0} isOpen={expandedCategories.includes(category)} />)}
              </Accordion>
            </SortableContext>

            <DragOverlay>
              {activeDragId ? <div className="fluent-card rounded-xl shadow-fluent-xl border-border/40 opacity-90">
                  <div className="px-6 py-4">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-primary/10 to-accent/10 rounded-lg flex items-center justify-center border border-border/40">
                        {getCategoryIcon(activeDragId)}
                      </div>
                      <div>
                        <h4 className="font-semibold text-foreground">{activeDragId}</h4>
                        <p className="text-sm text-muted-foreground">
                          {categoryStats[activeDragId] || 0} checklist item{(categoryStats[activeDragId] || 0) !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>
                  </div>
                 </div> : null}
            </DragOverlay>
          </DndContext>
          </div>}
      </div>
      
      {/* Detail Modal */}
      {showDetailModal && viewingItem && detailModalMode === 'view' && <ViewChecklistItemModal isOpen={showDetailModal} onClose={handleCloseDetailModal} item={viewingItem} onEdit={() => {
      setShowEditForm(true);
      setShowDetailModal(false);
    }} />}
      
      {/* Edit Modal */}
      {showEditForm && viewingItem && <EditChecklistItemModal isOpen={showEditForm} onClose={() => setShowEditForm(false)} item={viewingItem} onComplete={() => {
      setShowEditForm(false);
      setViewingItem(null);
    }} />}


      {/* Delete Modal */}
      {deletingItem && <ChecklistItemDeletionModal item={deletingItem} isOpen={showDeleteModal} onClose={handleCloseDeleteModal} onDeleted={handleItemDeleted} />}

      {/* Create Checklist Item Form */}
      {showCreateForm && <CreateChecklistItemForm onBack={handleCreateCancel} onComplete={handleCreateComplete} />}

      {/* Advanced Filters Sidebar */}
      <AdvancedFilterSidebar isOpen={showAdvancedFilters} onClose={() => setShowAdvancedFilters(false)} filters={filters} onFiltersChange={setFilters} availableCategories={availableCategories} availableTopics={availableTopics} availableApprovers={availableApprovers} availableResponsible={availableResponsible} />

      {/* Template Management */}
      <TemplateManagement isOpen={showTemplateManagement} onClose={() => setShowTemplateManagement(false)} selectedItems={Array.from(selectedItems).map(id => checklistItems?.find(item => item.unique_id === id)).filter(Boolean) as ChecklistItem[]} />

      {/* Quick Preview Panel */}
      <ChecklistItemPreviewPanel 
        item={previewItem}
        isOpen={showPreview}
        onClose={handleClosePreview}
      />
    </AnimatedBackground>;
};
export default ChecklistManagementPage;
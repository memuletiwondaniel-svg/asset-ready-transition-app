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
  const {
    toast
  } = useToast();
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
  const {
    data: categoriesData
  } = useChecklistCategories();
  const {
    data: topicsData
  } = useChecklistTopics();
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
        responsible: item.responsible
      };
      await createChecklistItemMutation.mutateAsync(duplicatedItem);
      toast({
        title: "Item duplicated",
        description: `Successfully duplicated item ${item.unique_id}`
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to duplicate item",
        variant: "destructive"
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
    return <div ref={setNodeRef} style={style} className={`${isDragging ? 'opacity-50 z-50' : ''} transition-all duration-200 animate-fade-in`} {...attributes}>
        <AccordionItem value={category} className="border-0">
          <Card className={`glass-card group relative overflow-hidden border-border/40 transition-all duration-300 hover:shadow-lg ${isOpen ? 'border-primary/30 shadow-md' : ''}`}>
            {/* Subtle gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            
            {/* Category Header */}
            <AccordionTrigger className={`hover:no-underline px-6 py-4 relative z-10 transition-all duration-300`}>
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-4">
                  {/* Drag Handle */}
                  <div {...listeners} className="cursor-grab active:cursor-grabbing p-2 rounded-lg hover:bg-primary/10 transition-all duration-200 opacity-0 group-hover:opacity-100" title="Drag to reorder">
                    <GripVertical className="w-5 h-5 text-muted-foreground hover:text-primary transition-colors" />
                  </div>

                  <div className="w-11 h-11 bg-gradient-to-br from-primary/20 to-accent/20 rounded-xl flex items-center justify-center border border-border/30 group-hover:border-primary/40 group-hover:scale-105 transition-all duration-300">
                    {getCategoryIcon(category)}
                  </div>

                  <div>
                    <h4 className={`text-base font-semibold transition-colors ${isOpen ? 'text-primary' : 'text-foreground group-hover:text-primary'}`}>
                      {category}
                    </h4>
                    <p className="text-sm text-muted-foreground">{count} checklist {count !== 1 ? 'items' : 'item'}</p>
                  </div>
                </div>

                <Badge className={`${isOpen ? 'bg-primary/10 text-primary border-primary/30' : 'bg-muted/50 text-muted-foreground border-border/30'} group-hover:bg-primary/10 group-hover:text-primary group-hover:border-primary/30 transition-all duration-300 px-3 py-1.5 text-xs font-semibold`}>
                  {count}
                </Badge>
              </div>
            </AccordionTrigger>

            {/* Accordion Content */}
            <AccordionContent className="px-6 pb-4 relative z-10">
              <div className="space-y-3 animate-fade-in pt-2">
                <div className="w-full h-px bg-gradient-to-r from-transparent via-border/50 to-transparent mb-3"></div>

                {categoryItems.length === 0 ? (
                  <div className="text-center py-8 px-4 bg-muted/20 rounded-lg border border-dashed border-border/40">
                    <FileText className="w-10 h-10 mx-auto mb-3 text-muted-foreground/50" />
                    <p className="text-sm text-muted-foreground">
                      No items in this category yet
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {categoryItems.map(item => (
                      <div 
                        key={item.unique_id} 
                        className="group/item relative p-4 bg-background/50 backdrop-blur-sm border border-border/40 rounded-lg hover:bg-card hover:border-primary/40 hover:shadow-md transition-all duration-200" 
                        onMouseEnter={() => handleItemMouseEnter(item)} 
                        onMouseLeave={handleItemMouseLeave}
                      >
                          <div className="flex items-center justify-between">
                            <div className="flex items-start gap-3 flex-1">
                              <Checkbox 
                                checked={selectedItems.has(item.unique_id || '')} 
                                onCheckedChange={checked => {
                                  const newSelected = new Set(selectedItems);
                                  if (checked) {
                                    newSelected.add(item.unique_id || '');
                                  } else {
                                    newSelected.delete(item.unique_id || '');
                                  }
                                  setSelectedItems(newSelected);
                                }} 
                                className="mt-1" 
                              />
                              <div className="flex-1 space-y-2">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <Badge variant="secondary" className="font-mono text-xs">
                                    {item.unique_id}
                                  </Badge>
                                  {item.topic && <Badge variant="outline" className="text-xs">{item.topic}</Badge>}
                                </div>
                                <p className="text-sm text-foreground/90 line-clamp-2">
                                  {item.description}
                                </p>
                              </div>
                            </div>
                            
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-primary/10 rounded-lg opacity-0 group-hover/item:opacity-100 transition-opacity">
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
                      ))}
                    </div>
                  )}
              </div>
            </AccordionContent>
          </Card>
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
      {/* Bulk Actions Toolbar */}
      <BulkActionsToolbar selectedItems={selectedItems} items={checklistItems || []} onClearSelection={() => setSelectedItems(new Set())} availableCategories={availableCategories} />

      <div className="container pt-6 pb-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Stats Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 animate-fade-in">
          <Card className="glass-card border-border/40 hover:border-primary/30 transition-all duration-300 hover:shadow-lg group">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Items</p>
                  <p className="text-3xl font-bold bg-gradient-to-br from-primary to-primary/70 bg-clip-text text-transparent">
                    {checklistItems?.length || 0}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <FileText className="w-6 h-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card border-border/40 hover:border-accent/30 transition-all duration-300 hover:shadow-lg group">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Categories</p>
                  <p className="text-3xl font-bold bg-gradient-to-br from-accent to-accent/70 bg-clip-text text-transparent">
                    {Object.keys(categoryStats).length}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-accent/20 to-accent/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Grid3X3 className="w-6 h-6 text-accent" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card border-border/40 hover:border-emerald-500/30 transition-all duration-300 hover:shadow-lg group">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Active Items</p>
                  <p className="text-3xl font-bold bg-gradient-to-br from-emerald-500 to-emerald-600/70 bg-clip-text text-transparent">
                    {checklistItems?.filter(item => item.is_active).length || 0}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500/20 to-emerald-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <CheckCircle className="w-6 h-6 text-emerald-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card border-border/40 hover:border-blue-500/30 transition-all duration-300 hover:shadow-lg group">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Selected</p>
                  <p className="text-3xl font-bold bg-gradient-to-br from-blue-500 to-blue-600/70 bg-clip-text text-transparent">
                    {selectedItems.size}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-blue-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Checkbox className="w-6 h-6 text-blue-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Actions Bar */}
        <Card className="glass-card border-border/40 mb-6 animate-fade-in">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex-1 max-w-md">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input 
                    placeholder="Search items by ID, description, topic..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 bg-background/50 border-border/40 focus:border-primary/40"
                  />
                </div>
              </div>
              
              <div className="flex flex-wrap items-center gap-2">
                {/* Add New Item Button */}
                <Button onClick={handleCreateItem} className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg hover:shadow-xl transition-all duration-300">
                  <Plus className="w-4 h-4 mr-2" />
                  New Item
                </Button>

                {/* Advanced Filters Button */}
                <Button variant="outline" onClick={() => setShowAdvancedFilters(true)} className="border-border/40 hover:border-primary/40">
                  <Filter className="w-4 h-4 mr-2" />
                  Filters
                  {(filters.categories?.length || 0) + (filters.topics?.length || 0) + (filters.approvers?.length || 0) + (filters.responsible?.length || 0) > 0 && <Badge variant="secondary" className="ml-2">
                      {(filters.categories?.length || 0) + (filters.topics?.length || 0) + (filters.approvers?.length || 0) + (filters.responsible?.length || 0)}
                    </Badge>}
                </Button>

                {/* Template Management Button */}
                <Button variant="outline" onClick={() => setShowTemplateManagement(true)} className="border-border/40 hover:border-primary/40">
                  <Copy className="w-4 h-4 mr-2" />
                  Templates
                </Button>

                {/* View Mode Toggle */}
                <TooltipProvider>
                  <div className="flex items-center gap-1 rounded-lg border border-border/40 bg-background/50 p-1">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button 
                          variant={viewMode === 'card' ? 'secondary' : 'ghost'} 
                          size="sm" 
                          onClick={() => setViewMode('card')} 
                          className={`h-8 px-3 transition-all ${viewMode === 'card' ? 'bg-primary/10 text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                        >
                          <AlignJustify className="w-4 h-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Grouped View</p>
                      </TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button 
                          variant={viewMode === 'table' ? 'secondary' : 'ghost'} 
                          size="sm" 
                          onClick={() => setViewMode('table')} 
                          className={`h-8 px-3 transition-all ${viewMode === 'table' ? 'bg-primary/10 text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                        >
                          <TableIcon className="w-4 h-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Table View</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </TooltipProvider>
              </div>
            </div>
          </CardContent>
        </Card>

        {!categoryStats || Object.keys(categoryStats).length === 0 ? (
          <Card className="glass-card border-border/40 animate-fade-in">
            <CardContent className="text-center py-16">
              <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-primary/10 via-accent/10 to-primary/5 rounded-2xl flex items-center justify-center shadow-lg relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-pulse" />
                <FileText className="w-12 h-12 text-primary relative z-10" />
              </div>
              <h3 className="text-2xl font-bold text-foreground mb-2">No Checklist Items Yet</h3>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                Get started by creating your first checklist item. Items will appear organized by categories once created.
              </p>
              <Button onClick={handleCreateItem} className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg hover:shadow-xl transition-all">
                <Plus className="w-4 h-4 mr-2" />
                Create First Item
              </Button>
            </CardContent>
          </Card>
        ) : viewMode === 'table' ? (
          <ChecklistItemsTableView items={checklistItems || []} onViewItem={handleViewItem} onEditItem={handleEditItem} onDeleteItem={handleDeleteItem} />
        ) : (
          <div className="space-y-4">
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
              <SortableContext items={categoryOrder} strategy={verticalListSortingStrategy}>
                <Accordion type="multiple" value={expandedCategories} onValueChange={setExpandedCategories} className="space-y-4">
                  {categoryOrder.map(category => <DraggableCategory key={category} category={category} count={categoryStats[category] || 0} isOpen={expandedCategories.includes(category)} />)}
                </Accordion>
              </SortableContext>

              <DragOverlay>
                {activeDragId ? (
                  <Card className="glass-card border-border/40 shadow-2xl opacity-90 animate-scale-in">
                    <CardContent className="p-4">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-primary/20 to-accent/20 rounded-xl flex items-center justify-center border border-border/40">
                          {getCategoryIcon(activeDragId)}
                        </div>
                        <div>
                          <h4 className="font-semibold text-foreground">{activeDragId}</h4>
                          <p className="text-sm text-muted-foreground">
                            {categoryStats[activeDragId] || 0} item{(categoryStats[activeDragId] || 0) !== 1 ? 's' : ''}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ) : null}
              </DragOverlay>
            </DndContext>
          </div>
        )}
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
      <ChecklistItemPreviewPanel item={previewItem} isOpen={showPreview} onClose={handleClosePreview} />
    </AnimatedBackground>;
};
export default ChecklistManagementPage;
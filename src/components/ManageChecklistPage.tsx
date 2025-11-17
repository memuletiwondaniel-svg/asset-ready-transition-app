import React, { useState, useMemo } from 'react';
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
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { AnimatedBackground } from '@/components/ui/AnimatedBackground';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CardSkeleton, TableSkeleton } from '@/components/ui/skeleton-loader';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ArrowLeft, Search, Filter, Plus, FileText, Calendar, User, Loader2, Edit3, ClipboardList, Users, BookOpen, Settings, Wrench, Languages, Home, ListChecks, Eye, Trash2, GripVertical } from 'lucide-react';
import ChecklistDetailsPage from './ChecklistDetailsPage';
import CreateChecklistModal from './CreateChecklistModal';
import ChecklistManagementPage from './ChecklistManagementPage';
import EditChecklistForm from './EditChecklistForm';
import { ChecklistSuccessPage } from './ChecklistSuccessPage';
import { useChecklists, useCreateChecklist, useUpdateChecklist, useDeleteChecklist, Checklist } from '@/hooks/useChecklists';
import { useChecklistCategories } from '@/hooks/useChecklistCategories';
import { useChecklistTopics } from '@/hooks/useChecklistTopics';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import ChecklistCategoriesManagement from './ChecklistCategoriesManagement';
import ChecklistTopicsManagement from './ChecklistTopicsManagement';
import PSSRSettingsManagement from './PSSRSettingsManagement';
import { getCurrentTranslations } from '@/utils/translations';
import AdminHeader from './admin/AdminHeader';
import { SortableChecklistCard } from './checklist/SortableChecklistCard';

interface ManageChecklistPageProps {
  onBack: () => void;
  selectedLanguage?: string;
  translations?: any;
}

interface NewChecklistData {
  name: string;
  reason: string;
  selected_items: string[];
  approvers: string[];
  custom_reason?: string;
  comments?: string;
}

const ManageChecklistPage: React.FC<ManageChecklistPageProps> = ({
  onBack,
  selectedLanguage = "English",
  translations = {}
}) => {
  const [currentLanguage, setCurrentLanguage] = useState(selectedLanguage);

  React.useEffect(() => {
    setCurrentLanguage(selectedLanguage);
  }, [selectedLanguage]);

  const t = getCurrentTranslations(currentLanguage);
  const [activeTab, setActiveTab] = useState('checklists');
  const [selectedChecklist, setSelectedChecklist] = useState<Checklist | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [editingChecklist, setEditingChecklist] = useState<Checklist | null>(null);
  const [showSuccessPage, setShowSuccessPage] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [sortBy, setSortBy] = useState('name');
  const [createdChecklistName, setCreatedChecklistName] = useState('');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [checklistToDelete, setChecklistToDelete] = useState<Checklist | null>(null);
  const [showApprovalHistory, setShowApprovalHistory] = useState(false);
  const [selectedChecklistForHistory, setSelectedChecklistForHistory] = useState<Checklist | null>(null);
  
  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );
  
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      setLocalChecklists((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        
        return arrayMove(items, oldIndex, newIndex);
      });
      
      toast({
        title: "Order Updated",
        description: "Checklist order has been updated",
      });
    }
  };

  const { toast } = useToast();
  
  // Sample checklists for demonstration
  const sampleChecklists: Checklist[] = [
    {
      id: 'CL-001',
      name: 'Project PSSR',
      reason: 'Start-Up or Commissioning of a new Facility or Project',
      status: 'approved',
      items_count: 45,
      active_pssr_count: 3,
      created_by_email: 'John Doe',
      created_at: new Date('2024-01-15').toISOString(),
      updated_at: new Date('2024-01-15').toISOString(),
      selected_items: [],
      created_by: 'user-123',
      custom_reason: null,
      moc_number: null,
      plant_change_type: null,
      selected_moc_scopes: null,
      selected_tie_in_scopes: null,
    },
    {
      id: 'CL-002',
      name: 'Turn Around Maintenance (TA)',
      reason: 'Restart following a Turn Around (TAR) Event',
      status: 'active',
      items_count: 32,
      active_pssr_count: 1,
      created_by_email: 'Sarah Smith',
      created_at: new Date('2024-02-10').toISOString(),
      updated_at: new Date('2024-02-10').toISOString(),
      selected_items: [],
      created_by: 'user-456',
      custom_reason: null,
      moc_number: null,
      plant_change_type: null,
      selected_moc_scopes: null,
      selected_tie_in_scopes: null,
    }
  ];
  
  const { data: checklistsData, isLoading, error } = useChecklists();
  
  // Use sample checklists if database is empty and enable drag & drop
  const [localChecklists, setLocalChecklists] = useState<Checklist[]>([]);
  
  React.useEffect(() => {
    const items = (checklistsData && checklistsData.length > 0) ? checklistsData : sampleChecklists;
    setLocalChecklists(items);
  }, [checklistsData]);
  
  const checklists = localChecklists;
  const { data: categories = [] } = useChecklistCategories();
  const { data: topics = [] } = useChecklistTopics();
  const { mutate: createChecklist } = useCreateChecklist();
  const { mutate: updateChecklist } = useUpdateChecklist();
  const { mutate: deleteChecklist } = useDeleteChecklist();

  const handleCreateComplete = async (checklistData: NewChecklistData) => {
    try {
      // Create the checklist
      const { data: newChecklist, error: checklistError } = await supabase
        .from('checklists' as any)
        .insert({
          name: checklistData.name,
          reason: checklistData.reason,
          custom_reason: checklistData.custom_reason,
          selected_items: checklistData.selected_items,
          status: 'under_review',
          created_by: (await supabase.auth.getUser()).data.user?.id,
        })
        .select()
        .single();

      if (checklistError) throw checklistError;

      // Add approvers
      if (checklistData.approvers && checklistData.approvers.length > 0) {
        const approversData = checklistData.approvers.map((userId, index) => ({
          checklist_id: (newChecklist as any).id,
          user_id: userId,
          approval_order: index + 1,
          status: 'pending'
        }));

        const { error: approversError } = await supabase
          .from('checklist_approvers' as any)
          .insert(approversData);

        if (approversError) throw approversError;
      }

      setCreatedChecklistName((newChecklist as any).name);
      setShowCreateForm(false);
      setShowSuccessPage(true);
      toast({
        title: "Success",
        description: `Checklist created and sent to ${checklistData.approvers.length} approver(s)`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create checklist",
        variant: "destructive",
      });
    }
  };

  const handleBackToChecklists = () => {
    setShowSuccessPage(false);
    setShowCreateForm(false);
    setShowEditForm(false);
    setEditingChecklist(null);
    setActiveTab('checklists');
  };

  const handleEdit = (checklist: Checklist) => {
    setEditingChecklist(checklist);
    setShowEditForm(true);
  };

  const openCreateChecklist = () => {
    setSelectedChecklist(null);
    setShowEditForm(false);
    setShowSuccessPage(false);
    setShowCreateForm(true);
  };
  const handleEditComplete = () => {
    setShowEditForm(false);
    setEditingChecklist(null);
    toast({
      title: "Success",
      description: "Checklist updated successfully",
    });
  };

  const handleDeleteClick = (checklist: Checklist) => {
    setChecklistToDelete(checklist);
    setShowDeleteDialog(true);
  };

  const handleDeleteConfirm = () => {
    if (!checklistToDelete) return;
    
    deleteChecklist(checklistToDelete.id, {
      onSuccess: () => {
        toast({
          title: "Success",
          description: "Checklist deleted successfully",
        });
        setShowDeleteDialog(false);
        setChecklistToDelete(null);
      },
      onError: (error: any) => {
        toast({
          title: "Error",
          description: error.message || "Failed to delete checklist",
          variant: "destructive",
        });
      }
    });
  };

  const filteredChecklists = useMemo(() => {
    return checklists
      .filter(checklist => {
        const matchesSearch = searchQuery === '' || 
          checklist.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          checklist.reason.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (checklist.created_by_email && checklist.created_by_email.toLowerCase().includes(searchQuery.toLowerCase()));
        
        const matchesFilter = filterCategory === 'all' || checklist.status === filterCategory;
        
        return matchesSearch && matchesFilter;
      })
      .sort((a, b) => {
        if (sortBy === 'name') return a.name.localeCompare(b.name);
        if (sortBy === 'created_at') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        if (sortBy === 'updated_at') return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
        return 0;
      });
  }, [checklists, searchQuery, filterCategory, sortBy]);

  // Render the main page layout with modal overlays
  return (
    <div className="flex-1 overflow-auto">
      <AnimatedBackground>
        <div className="relative z-10">
          <AdminHeader 
            icon={<ClipboardList className="w-6 h-6" />} 
            iconGradient="from-purple-500 to-purple-600"
            title="Checklist Management"
            description="Manage your checklists, items, categories, and topics"
            customBreadcrumbs={[
              { label: 'Home', path: '/', onClick: onBack },
              { label: 'Administration', path: '/admin-tools', onClick: onBack },
              { label: 'Checklist Management', path: '/admin-tools', onClick: () => {} }
            ]}
          />

          <div className="container py-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
              <div className="flex justify-center">
                <TabsList className="inline-flex h-12 items-center justify-center rounded-xl bg-card/90 backdrop-blur-md p-1 shadow-lg border">
                  <TabsTrigger value="checklists" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                    <ClipboardList className="h-4 w-4" />
                    <span className="hidden sm:inline">Checklists</span>
                  </TabsTrigger>
                  <TabsTrigger value="items" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                    <FileText className="h-4 w-4" />
                    <span className="hidden sm:inline">Items</span>
                  </TabsTrigger>
                  <TabsTrigger value="categories" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                    <Users className="h-4 w-4" />
                    <span className="hidden sm:inline">Categories</span>
                  </TabsTrigger>
                  <TabsTrigger value="topics" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                    <BookOpen className="h-4 w-4" />
                    <span className="hidden sm:inline">Topics</span>
                  </TabsTrigger>
                  <TabsTrigger value="settings" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                    <Wrench className="h-4 w-4" />
                    <span className="hidden sm:inline">Settings</span>
                  </TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="checklists" className="space-y-6">
                {/* Search and Actions Widget */}
                <Card className="bg-card/80 backdrop-blur-sm border-border/50 shadow-lg">
                  <CardContent className="pt-6">
                    <div className="flex flex-col sm:flex-row gap-4 items-center">
                      <div className="relative flex-1 w-full">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input 
                          placeholder="Search checklists by name, reason, or creator..." 
                          value={searchQuery} 
                          onChange={e => setSearchQuery(e.target.value)} 
                          className="pl-10 bg-background/50 border-border/50 h-11"
                        />
                      </div>
                      <div className="flex gap-2 w-full sm:w-auto">
                        <Select value={filterCategory} onValueChange={setFilterCategory}>
                          <SelectTrigger className="w-full sm:w-[140px] bg-background/50 border-border/50 h-11">
                            <Filter className="h-4 w-4 mr-2" />
                            <SelectValue placeholder="Status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Statuses</SelectItem>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="draft">Draft</SelectItem>
                            <SelectItem value="archived">Archived</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button 
                          onClick={openCreateChecklist} 
                          className="gap-2 shadow-md hover:shadow-lg transition-shadow h-11 px-6"
                        >
                          <Plus className="h-4 w-4" />
                          Create New
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Checklists Grid Widget */}
                {isLoading ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3, 4, 5, 6].map(i => <CardSkeleton key={i} />)}
                  </div>
                ) : filteredChecklists.length === 0 ? (
                  <Card className="p-16 text-center bg-card/80 backdrop-blur-sm border-border/50 shadow-lg">
                    <div className="flex flex-col items-center gap-6">
                      <div className="rounded-full bg-primary/10 p-6">
                        <FileText className="h-16 w-16 text-primary" />
                      </div>
                      <div className="space-y-2">
                        <h3 className="text-2xl font-semibold">No checklists found</h3>
                        <p className="text-muted-foreground max-w-md">
                          {searchQuery 
                            ? 'Try adjusting your search or filters to find what you\'re looking for' 
                            : 'Get started by creating your first checklist to manage your projects efficiently'}
                        </p>
                      </div>
                      {!searchQuery && (
                        <Button 
                          onClick={openCreateChecklist}
                          size="lg" 
                          className="gap-2 shadow-md"
                        >
                          <Plus className="h-5 w-5" />
                          Create Your First Checklist
                        </Button>
                      )}
                    </div>
                  </Card>
                ) : (
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                  >
                    <SortableContext
                      items={filteredChecklists.map(c => c.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredChecklists.map(checklist => (
                          <SortableChecklistCard 
                            key={checklist.id} 
                            checklist={checklist} 
                            onSelect={setSelectedChecklist} 
                            onEdit={handleEdit} 
                            onDelete={handleDeleteClick} 
                          />
                        ))}
                      </div>
                    </SortableContext>
                  </DndContext>
                )}
              </TabsContent>

              <TabsContent value="items">
                <ChecklistManagementPage 
                  onBack={onBack} 
                  translations={t} 
                  selectedLanguage={currentLanguage} 
                />
              </TabsContent>

              <TabsContent value="categories">
                <ChecklistCategoriesManagement 
                  onBack={onBack} 
                  translations={t} 
                  selectedLanguage={currentLanguage} 
                />
              </TabsContent>

              <TabsContent value="topics">
                <ChecklistTopicsManagement 
                  onBack={onBack} 
                  translations={t} 
                  selectedLanguage={currentLanguage} 
                />
              </TabsContent>

              <TabsContent value="settings">
                <PSSRSettingsManagement 
                  onBack={onBack} 
                  translations={t} 
                  selectedLanguage={currentLanguage} 
                />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </AnimatedBackground>

      {/* Create Checklist Modal */}
      <Dialog open={showCreateForm} onOpenChange={setShowCreateForm}>
        <DialogContent className="max-w-4xl max-h-[90vh] p-0 gap-0 overflow-hidden">
          <div className="px-6 pt-6 pb-4 border-b border-border/50">
            <DialogHeader>
              <DialogTitle className="text-xl">Create New Checklist</DialogTitle>
              <DialogDescription>
                Set up a new safety checklist for your project
              </DialogDescription>
            </DialogHeader>
          </div>
          <div className="overflow-y-auto px-6 py-6">
            <CreateChecklistModal 
              onComplete={handleCreateComplete} 
              onCancel={() => setShowCreateForm(false)}
              selectedLanguage={currentLanguage}
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Checklist Modal */}
      {editingChecklist && (
        <Sheet open={showEditForm} onOpenChange={setShowEditForm}>
          <SheetContent side="right" className="w-full sm:max-w-4xl overflow-y-auto">
            <SheetHeader>
              <SheetTitle>Edit Checklist</SheetTitle>
              <SheetDescription>
                Update your checklist information
              </SheetDescription>
            </SheetHeader>
            <div className="mt-6">
              <EditChecklistForm 
                checklist={editingChecklist} 
                onBack={() => { setShowEditForm(false); setEditingChecklist(null); }} 
                onSave={handleEditComplete} 
              />
            </div>
          </SheetContent>
        </Sheet>
      )}

      {/* Success Page Modal */}
      <Sheet open={showSuccessPage} onOpenChange={setShowSuccessPage}>
        <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
          <div className="mt-6">
            <ChecklistSuccessPage 
              checklistName={createdChecklistName} 
              onViewChecklists={handleBackToChecklists} 
              onCreateAnother={() => { setShowSuccessPage(false); setShowCreateForm(true); }} 
            />
          </div>
        </SheetContent>
      </Sheet>

      {/* Checklist Details - Still full page */}
      {selectedChecklist && (
        <div className="fixed inset-0 z-50 bg-background">
          <ChecklistDetailsPage 
            checklist={selectedChecklist} 
            onBack={() => setSelectedChecklist(null)} 
            selectedLanguage={currentLanguage} 
            translations={t} 
          />
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the checklist "{checklistToDelete?.name}". This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ManageChecklistPage;
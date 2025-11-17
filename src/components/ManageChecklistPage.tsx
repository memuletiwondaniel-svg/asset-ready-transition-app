import React, { useState, useMemo } from 'react';
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
import { ArrowLeft, Search, Filter, Plus, FileText, Calendar, User, Loader2, Edit3, ClipboardList, Users, BookOpen, Settings, Wrench, Languages, Home } from 'lucide-react';
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

  const { toast } = useToast();
  const { data: checklists = [], isLoading, error } = useChecklists();
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
                {/* Stats Widget Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20 hover:shadow-lg transition-all">
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Total Checklists</p>
                          <p className="text-3xl font-bold text-primary">{checklists.length}</p>
                        </div>
                        <ClipboardList className="h-8 w-8 text-primary/60" />
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5 border-green-500/20 hover:shadow-lg transition-all">
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Active</p>
                          <p className="text-3xl font-bold text-green-600">
                            {checklists.filter(c => c.status === 'active').length}
                          </p>
                        </div>
                        <FileText className="h-8 w-8 text-green-500/60" />
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card className="bg-gradient-to-br from-yellow-500/10 to-yellow-500/5 border-yellow-500/20 hover:shadow-lg transition-all">
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Draft</p>
                          <p className="text-3xl font-bold text-yellow-600">
                            {checklists.filter(c => c.status === 'draft').length}
                          </p>
                        </div>
                        <Edit3 className="h-8 w-8 text-yellow-500/60" />
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-500/20 hover:shadow-lg transition-all">
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Total Items</p>
                          <p className="text-3xl font-bold text-blue-600">
                            {checklists.reduce((sum, c) => sum + (c.items_count || 0), 0)}
                          </p>
                        </div>
                        <FileText className="h-8 w-8 text-blue-500/60" />
                      </div>
                    </CardContent>
                  </Card>
                </div>

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
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredChecklists.map(checklist => (
                      <Card 
                        key={checklist.id} 
                        className="group hover:shadow-2xl transition-all duration-300 cursor-pointer overflow-hidden border-border/50 bg-card/80 backdrop-blur-sm hover:bg-card hover:-translate-y-1"
                        onClick={() => setSelectedChecklist(checklist)}
                      >
                        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        <CardHeader className="pb-3 relative">
                          <div className="flex justify-between items-start gap-3">
                            <div className="flex-1 min-w-0">
                              <CardTitle className="text-lg mb-3 group-hover:text-primary transition-colors truncate">
                                {checklist.name}
                              </CardTitle>
                              <div className="flex gap-2 flex-wrap">
                                <Badge 
                                  variant={checklist.status === 'active' ? 'default' : checklist.status === 'draft' ? 'secondary' : 'outline'} 
                                  className="text-xs font-medium"
                                >
                                  {checklist.status}
                                </Badge>
                                <Badge variant="outline" className="text-xs bg-background/50">
                                  {checklist.items_count || 0} items
                                </Badge>
                                {checklist.active_pssr_count > 0 && (
                                  <Badge className="text-xs bg-primary/20 text-primary border-primary/30">
                                    {checklist.active_pssr_count} active PSSR{checklist.active_pssr_count !== 1 ? 's' : ''}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-4 pt-0 relative">
                          <div className="space-y-2.5 text-sm">
                            <div className="flex items-start gap-2.5 text-muted-foreground">
                              <FileText className="h-4 w-4 mt-0.5 flex-shrink-0" />
                              <span className="font-medium line-clamp-2">{checklist.reason}</span>
                            </div>
                            {checklist.created_by_email && (
                              <div className="flex items-center gap-2.5 text-muted-foreground">
                                <User className="h-4 w-4 flex-shrink-0" />
                                <span className="text-xs truncate">{checklist.created_by_email}</span>
                              </div>
                            )}
                            {checklist.created_at && (
                              <div className="flex items-center gap-2.5 text-muted-foreground">
                                <Calendar className="h-4 w-4 flex-shrink-0" />
                                <span className="text-xs">{new Date(checklist.created_at).toLocaleDateString()}</span>
                              </div>
                            )}
                          </div>
                          <div className="flex gap-2 pt-3 border-t border-border/50" onClick={e => e.stopPropagation()}>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => handleEdit(checklist)} 
                              className="flex-1 hover:bg-primary hover:text-primary-foreground hover:border-primary transition-colors"
                            >
                              <Edit3 className="h-3 w-3 mr-1.5" />
                              Edit
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => handleDeleteClick(checklist)} 
                              className="hover:bg-destructive hover:text-destructive-foreground hover:border-destructive transition-colors"
                            >
                              Delete
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
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
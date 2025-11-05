import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Search, Filter, Plus, FileText, Calendar, User, Loader2, Edit3, MoreVertical, Trash2, ClipboardList, Users, BookOpen, Settings, Wrench } from 'lucide-react';
import ChecklistDetailsPage from './ChecklistDetailsPage';
import CreateChecklistForm from './CreateChecklistForm';
import ChecklistManagementPage from './ChecklistManagementPage';
import EditChecklistForm from './EditChecklistForm';
import { ChecklistSuccessPage } from './ChecklistSuccessPage';
import { useChecklists, useCreateChecklist, useUpdateChecklist, useDeleteChecklist, Checklist } from '@/hooks/useChecklists';
import { useChecklistCategories } from '@/hooks/useChecklistCategories';
import { useChecklistTopics } from '@/hooks/useChecklistTopics';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import ChecklistCategoriesManagement from './ChecklistCategoriesManagement';
import ChecklistTopicsManagement from './ChecklistTopicsManagement';
import PSSRSettingsManagement from './PSSRSettingsManagement';

interface ManageChecklistPageProps {
  onBack: () => void;
  selectedLanguage?: string;
  translations?: any;
}

interface NewChecklistData {
  reason: string;
  selected_items: string[];
  custom_reason?: string;
}

const ManageChecklistPage: React.FC<ManageChecklistPageProps> = ({ onBack }) => {
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

  const { toast } = useToast();
  const { data: checklists = [], isLoading, error } = useChecklists();
  const { data: categories = [] } = useChecklistCategories();
  const { data: topics = [] } = useChecklistTopics();
  const { mutate: createChecklist } = useCreateChecklist();
  const { mutate: updateChecklist } = useUpdateChecklist();
  const { mutate: deleteChecklist } = useDeleteChecklist();

  const handleCreateComplete = (checklistData: NewChecklistData) => {
    createChecklist(checklistData, {
      onSuccess: newChecklist => {
        setCreatedChecklistName(newChecklist.name);
        sessionStorage.setItem(`new-checklist-${newChecklist.id}`, 'true');
        setShowCreateForm(false);
        toast({
          title: "Checklist created",
          description: `"${newChecklist.name}" is now available in your list.`
        });
      },
      onError: error => {
        console.error('Failed to create checklist:', error);
        toast({
          title: "Failed to create checklist",
          description: error?.message || "Please try again.",
          variant: "destructive"
        });
      }
    });
  };

  const handleBackToChecklists = () => {
    setShowSuccessPage(false);
    setShowCreateForm(false);
    setShowEditForm(false);
    setEditingChecklist(null);
  };

  const handleEditChecklist = (checklist: Checklist) => {
    setEditingChecklist(checklist);
    setShowEditForm(true);
  };

  const handleEditComplete = () => {
    setShowEditForm(false);
    setEditingChecklist(null);
    toast({
      title: "Success",
      description: "Checklist updated successfully."
    });
  };

  const handleDeleteChecklist = (checklist: Checklist) => {
    setChecklistToDelete(checklist);
    setShowDeleteDialog(true);
  };

  const confirmDeleteChecklist = () => {
    if (!checklistToDelete) return;
    deleteChecklist(checklistToDelete.id, {
      onSuccess: () => {
        toast({
          title: "Checklist deleted",
          description: `"${checklistToDelete.name}" has been permanently removed.`
        });
        setShowDeleteDialog(false);
        setChecklistToDelete(null);
      },
      onError: error => {
        console.error('Failed to delete checklist:', error);
        toast({
          title: "Failed to delete checklist",
          description: error?.message || "Please try again.",
          variant: "destructive"
        });
      }
    });
  };

  const cancelDeleteChecklist = () => {
    setShowDeleteDialog(false);
    setChecklistToDelete(null);
  };

  React.useEffect(() => {
    if (error) {
      toast({
        title: "Error loading checklists",
        description: "Failed to load checklists. Please try again.",
        variant: "destructive"
      });
    }
  }, [error, toast]);

  const filteredAndSortedChecklists = useMemo(() => {
    let filtered = checklists.filter(checklist => {
      const matchesSearch = checklist.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                           checklist.reason.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesSearch;
    });
    return [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'date':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'items':
          return b.items_count - a.items_count;
        default:
          return 0;
      }
    });
  }, [checklists, searchQuery, filterCategory, sortBy]);

  const getStatusBadge = (status: Checklist['status']) => {
    switch (status) {
      case 'Active':
        return <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100">Active</Badge>;
      case 'Draft':
        return <Badge variant="secondary" className="bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100">Draft</Badge>;
      case 'Archived':
        return <Badge variant="outline" className="bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100">Archived</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const isNewChecklist = (checklistId: string) => {
    return sessionStorage.getItem(`new-checklist-${checklistId}`) === 'true';
  };

  const handleChecklistClick = (checklist: Checklist) => {
    sessionStorage.removeItem(`new-checklist-${checklist.id}`);
    setSelectedChecklist(checklist);
  };

  if (showCreateForm) {
    return <CreateChecklistForm onBack={() => setShowCreateForm(false)} onComplete={handleCreateComplete} />;
  }
  if (showEditForm && editingChecklist) {
    return <EditChecklistForm checklist={editingChecklist} onBack={() => {
      setShowEditForm(false);
      setEditingChecklist(null);
    }} onSave={handleEditComplete} />;
  }
  if (showSuccessPage) {
    return <ChecklistSuccessPage checklistName={createdChecklistName} onViewChecklists={handleBackToChecklists} onCreateAnother={() => {
      setShowSuccessPage(false);
      setShowCreateForm(true);
    }} />;
  }
  if (selectedChecklist) {
    return <ChecklistDetailsPage checklist={selectedChecklist} onBack={() => setSelectedChecklist(null)} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 -left-4 w-96 h-96 bg-gradient-to-r from-primary/10 to-emerald-500/10 rounded-full mix-blend-multiply filter blur-3xl animate-pulse" />
        <div className="absolute top-0 -right-4 w-96 h-96 bg-gradient-to-l from-emerald-500/10 to-orange-500/10 rounded-full mix-blend-multiply filter blur-3xl animate-pulse" style={{ animationDelay: '700ms' }} />
        <div className="absolute -bottom-8 left-20 w-96 h-96 bg-gradient-to-t from-orange-500/10 to-primary/10 rounded-full mix-blend-multiply filter blur-3xl animate-pulse" style={{ animationDelay: '1400ms' }} />
      </div>
      
      <div className="relative z-10">
        <div className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60 border-b shadow-sm">
          <div className="container flex h-20 items-center">
            <div className="flex items-center">
              <Button 
                variant="ghost" 
                onClick={onBack} 
                className="h-10 px-4 py-2 rounded-xl border border-border/50 bg-card/80 backdrop-blur-sm shadow-sm hover:shadow-md hover:bg-accent/50 hover:border-border transition-all duration-200 gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Administration
              </Button>
            </div>
            <div className="flex-1 flex justify-center">
              <img src="/images/orsh-logo.png" alt="ORSH Logo" className="h-40 w-auto filter drop-shadow-md" />
            </div>
            <div className="w-40"></div>
          </div>
        </div>

        <div className="container py-10 max-w-7xl mx-auto">
          {/* Modern Header */}
          <div className="mb-10 text-center animate-fade-in">
            <h1 className="text-5xl md:text-6xl font-black tracking-tight mb-4 leading-tight" style={{ fontFamily: "'Poppins', sans-serif" }}>
              <span className="bg-gradient-to-r from-slate-900 via-blue-900 to-slate-900 dark:from-slate-100 dark:via-blue-400 dark:to-slate-100 bg-clip-text text-transparent">
                PSSR Configuration
              </span>
            </h1>
            <p className="text-muted-foreground text-lg md:text-xl max-w-2xl mx-auto font-light">
              Manage all aspects of PSSR system - checklists, items, categories, topics, and settings
            </p>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
            {/* Modern Tab Navigation */}
            <div className="flex justify-center">
              <TabsList className="inline-flex h-14 items-center justify-center rounded-2xl bg-card/80 backdrop-blur-sm p-1.5 text-muted-foreground shadow-lg border animate-scale-in">
                <TabsTrigger 
                  value="checklists" 
                  className="inline-flex items-center justify-center whitespace-nowrap rounded-xl px-6 py-3 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-primary/80 data-[state=active]:text-primary-foreground data-[state=active]:shadow-md gap-2 hover:bg-accent/50"
                >
                  <ClipboardList className="h-4 w-4" />
                  <span className="hidden sm:inline">Checklists</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="items"
                  className="inline-flex items-center justify-center whitespace-nowrap rounded-xl px-6 py-3 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-primary/80 data-[state=active]:text-primary-foreground data-[state=active]:shadow-md gap-2 hover:bg-accent/50"
                >
                  <FileText className="h-4 w-4" />
                  <span className="hidden sm:inline">Items</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="categories"
                  className="inline-flex items-center justify-center whitespace-nowrap rounded-xl px-6 py-3 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-primary/80 data-[state=active]:text-primary-foreground data-[state=active]:shadow-md gap-2 hover:bg-accent/50"
                >
                  <Users className="h-4 w-4" />
                  <span className="hidden sm:inline">Categories</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="topics"
                  className="inline-flex items-center justify-center whitespace-nowrap rounded-xl px-6 py-3 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-primary/80 data-[state=active]:text-primary-foreground data-[state=active]:shadow-md gap-2 hover:bg-accent/50"
                >
                  <BookOpen className="h-4 w-4" />
                  <span className="hidden sm:inline">Topics</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="pssr-settings"
                  className="inline-flex items-center justify-center whitespace-nowrap rounded-xl px-6 py-3 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-primary/80 data-[state=active]:text-primary-foreground data-[state=active]:shadow-md gap-2 hover:bg-accent/50"
                >
                  <Settings className="h-4 w-4" />
                  <span className="hidden sm:inline">PSSR Settings</span>
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="checklists" className="space-y-6 animate-fade-in mt-0">
              <div className="flex items-center justify-between">
                <Button onClick={() => setShowCreateForm(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create New Checklist
                </Button>
              </div>

              <div className="flex gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input placeholder="Search checklists..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-10" />
                </div>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="name">Name</SelectItem>
                    <SelectItem value="date">Date</SelectItem>
                    <SelectItem value="items">Items</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {isLoading ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : filteredAndSortedChecklists.length === 0 ? (
                <div className="text-center py-16">
                  <FileText className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-xl font-semibold mb-2">No Checklists Found</h3>
                  <p className="text-muted-foreground">Create your first checklist to get started</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {filteredAndSortedChecklists.map((checklist, index) => (
                    <Card 
                      key={checklist.id} 
                      className="group cursor-pointer transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 border-0 bg-gradient-to-br from-card to-card/50 backdrop-blur overflow-hidden animate-fade-in" 
                      style={{ animationDelay: `${index * 50}ms` }}
                      onClick={() => handleChecklistClick(checklist)}
                    >
                      {/* Gradient Background Effect */}
                      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      
                      <CardHeader className="relative">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <CardTitle className="text-lg mb-2 group-hover:text-primary transition-colors">{checklist.name}</CardTitle>
                            <CardDescription className="line-clamp-2">{checklist.reason}</CardDescription>
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-accent">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleEditChecklist(checklist); }}>
                                <Edit3 className="h-4 w-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleDeleteChecklist(checklist); }} className="text-destructive">
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </CardHeader>
                      <CardContent className="relative">
                        <div className="flex items-center justify-between">
                          {getStatusBadge(checklist.status)}
                          <div className="flex items-center text-sm text-muted-foreground">
                            <FileText className="h-4 w-4 mr-1" />
                            {checklist.items_count} items
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="items" className="animate-fade-in mt-0">
              <div className="bg-card/60 backdrop-blur-sm rounded-2xl shadow-xl border p-6">
                <ChecklistManagementPage onBack={() => {}} />
              </div>
            </TabsContent>

            <TabsContent value="categories" className="animate-fade-in mt-0">
              <div className="bg-card/60 backdrop-blur-sm rounded-2xl shadow-xl border p-6">
                <ChecklistCategoriesManagement onBack={() => {}} />
              </div>
            </TabsContent>

            <TabsContent value="topics" className="animate-fade-in mt-0">
              <div className="bg-card/60 backdrop-blur-sm rounded-2xl shadow-xl border p-6">
                <ChecklistTopicsManagement onBack={() => {}} />
              </div>
            </TabsContent>

            <TabsContent value="pssr-settings" className="animate-fade-in mt-0">
              <div className="bg-card/60 backdrop-blur-sm rounded-2xl shadow-xl border p-6">
                <PSSRSettingsManagement onBack={() => {}} />
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Checklist</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{checklistToDelete?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={cancelDeleteChecklist}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteChecklist} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ManageChecklistPage;

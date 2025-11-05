import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Search, Filter, Plus, FileText, Calendar, User, Activity, Loader2, Settings, FolderOpen, Edit3, MoreVertical, Trash2, ClipboardList, Tag, Users, BookOpen } from 'lucide-react';
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
    <div className="min-h-screen relative overflow-hidden">
      <div className="absolute inset-0 bg-background">
        <div className="absolute inset-0 opacity-42 dark:opacity-32">
          <div 
            className="absolute inset-0 animate-gradient-shift-morph"
            style={{
              background: 'radial-gradient(at 20% 30%, hsl(210, 25%, 88%) 0%, transparent 40%), radial-gradient(at 80% 20%, hsl(280, 22%, 87%) 0%, transparent 40%), radial-gradient(at 40% 80%, hsl(200, 28%, 89%) 0%, transparent 40%), radial-gradient(at 90% 70%, hsl(320, 24%, 88%) 0%, transparent 40%), radial-gradient(at 50% 50%, hsl(250, 23%, 88%) 0%, transparent 35%)',
              filter: 'blur(50px)',
            }}
          />
        </div>
      </div>
      
      <div className="relative z-10">
        <div className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
          <div className="container flex h-20 items-center">
            <div className="flex items-center">
              <Button variant="ghost" onClick={onBack} className="h-10 px-4 py-2 rounded-lg border border-border/50 bg-background/80 backdrop-blur-sm shadow-sm hover:shadow-md hover:bg-accent/50 hover:border-border transition-all duration-200">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Admin Tools
              </Button>
            </div>
            <div className="flex-1 flex justify-center">
              <img src="/images/orsh-logo.png" alt="ORSH Logo" className="h-40 w-auto filter drop-shadow-sm" />
            </div>
            <div className="w-40"></div>
          </div>
        </div>

        <div className="container py-8">
          <div className="mb-8">
            <h2 className="text-3xl font-bold tracking-tight">Checklist Management</h2>
            <p className="text-muted-foreground mt-2">Manage checklists, items, categories, and topics for PSSR safety reviews</p>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-4 lg:w-[600px]">
              <TabsTrigger value="checklists" className="flex items-center gap-2">
                <ClipboardList className="h-4 w-4" />
                <span className="hidden sm:inline">Checklists</span>
              </TabsTrigger>
              <TabsTrigger value="items" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                <span className="hidden sm:inline">Items</span>
              </TabsTrigger>
              <TabsTrigger value="categories" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                <span className="hidden sm:inline">Categories</span>
              </TabsTrigger>
              <TabsTrigger value="topics" className="flex items-center gap-2">
                <BookOpen className="h-4 w-4" />
                <span className="hidden sm:inline">Topics</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="checklists" className="space-y-6">
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
                  {filteredAndSortedChecklists.map(checklist => (
                    <Card key={checklist.id} className="cursor-pointer hover:shadow-lg transition-all" onClick={() => handleChecklistClick(checklist)}>
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <CardTitle className="text-lg mb-2">{checklist.name}</CardTitle>
                            <CardDescription className="line-clamp-2">{checklist.reason}</CardDescription>
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
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
                      <CardContent>
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

            <TabsContent value="items">
              <ChecklistManagementPage onBack={() => {}} />
            </TabsContent>

            <TabsContent value="categories">
              <ChecklistCategoriesManagement onBack={() => {}} />
            </TabsContent>

            <TabsContent value="topics">
              <ChecklistTopicsManagement onBack={() => {}} />
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

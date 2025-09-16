import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
}

interface NewChecklistData {
  reason: string;
  selected_items: string[];
  custom_reason?: string;
}

const ManageChecklistPage: React.FC<ManageChecklistPageProps> = ({
  onBack
}) => {
  const [activeView, setActiveView] = useState<'dashboard' | 'checklists' | 'items' | 'categories' | 'topics'>('dashboard');
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

  // Show error toast if there's an error
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

  // Category management data
  const checklistCategories = [
    {
      id: 'checklists',
      title: 'Checklists',
      description: 'Manage and configure PSSR checklists for safety reviews and compliance',
      icon: ClipboardList,
      stats: { total: checklists.length, active: checklists.filter(c => c.status === 'Active').length },
      onClick: () => setActiveView('checklists')
    },
    {
      id: 'items',
      title: 'Checklist Items',
      description: 'Configure individual checklist items, questions, and validation criteria',
      icon: FileText,
      stats: { total: 245, active: 220 },
      onClick: () => setActiveView('items')
    },
    {
      id: 'categories',
      title: 'Checklist Categories',
      description: 'Organize checklist items into logical categories',
      icon: Users,
      stats: { total: categories.length, active: categories.filter(c => c.is_active).length },
      onClick: () => setActiveView('categories')
    },
    {
      id: 'topics',
      title: 'Checklist Topics',
      description: 'Define and manage topics for categorizing and organizing checklists',
      icon: BookOpen,
      stats: { total: topics.length, active: topics.filter(t => t.is_active).length },
      onClick: () => setActiveView('topics')
    }
  ];

  // Handle form submissions and other views
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

  // Handle different views
  if (activeView === 'items') {
    return <ChecklistManagementPage onBack={() => setActiveView('dashboard')} />;
  } else if (activeView === 'categories') {
    return <ChecklistCategoriesManagement onBack={() => setActiveView('dashboard')} />;
  } else if (activeView === 'topics') {
    return <ChecklistTopicsManagement onBack={() => setActiveView('dashboard')} />;
  } else if (activeView === 'dashboard') {
    // Show dashboard view with categories
    return (
      <div className="min-h-screen bg-background">
        {/* Navigation Bar */}
        <div className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
          <div className="container flex h-20 items-center">
            <div className="flex items-center">
              <Button 
                variant="ghost" 
                onClick={onBack}
                className="h-10 px-4 py-2 rounded-lg border border-border/50 bg-background/80 backdrop-blur-sm shadow-sm hover:shadow-md hover:bg-accent/50 hover:border-border transition-all duration-200 ease-out hover:scale-[1.02] active:scale-[0.98] font-medium text-foreground/90 hover:text-foreground"
              >
                <ArrowLeft className="h-4 w-4 mr-2 transition-transform duration-200 group-hover:-translate-x-0.5" />
                Back to Admin Tools
              </Button>
            </div>
            <div className="flex-1 flex justify-center">
              <div className="transition-all duration-300 hover:scale-110 hover:drop-shadow-lg">
                <img 
                  src="/images/orsh-logo.png" 
                  alt="ORSH Logo" 
                  className="h-40 w-auto filter drop-shadow-sm" 
                />
              </div>
            </div>
            <div className="w-40"></div> {/* Spacer to center the logo */}
          </div>
        </div>

        <div className="container py-8">
          {/* Header */}
          <div className="mb-8">
            <h2 className="text-3xl font-bold tracking-tight">
              Checklist Management
            </h2>
            <p className="text-muted-foreground mt-2">
              Manage checklists, items, groups, and topics for PSSR safety reviews
            </p>
          </div>

          {/* Categories Grid */}
          <TooltipProvider>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {checklistCategories.map((category, index) => {
                const IconComponent = category.icon;
                return (
                  <Tooltip key={category.id}>
                    <TooltipTrigger asChild>
                      <Card
                        className="group cursor-pointer transition-all duration-200 hover:shadow-lg border-0 bg-card hover:bg-accent/5"
                        onClick={category.onClick}
                      >
                        <CardHeader className="pb-2">
                          <div className="flex items-start justify-between mb-4">
                            <div 
                              className="w-16 h-16 rounded-lg flex items-center justify-center transition-all duration-200 group-hover:scale-110 bg-primary/10"
                            >
                              <IconComponent 
                                className="h-10 w-10 text-primary" 
                              />
                            </div>
                            
                            <div className="flex flex-col items-end space-y-1">
                              <Badge variant="secondary" className="text-xs">
                                {category.stats.total}
                              </Badge>
                              {category.stats.active && (
                                <Badge variant="outline" className="text-xs text-green-600 border-green-200">
                                  {category.stats.active} Active
                                </Badge>
                              )}
                            </div>
                          </div>
                          
                          <div>
                            <CardTitle className="text-xl font-semibold mb-3 group-hover:text-primary transition-colors">
                              {category.title}
                            </CardTitle>
                            <div className="space-y-2">
                              <div className="flex items-center justify-between text-sm text-muted-foreground">
                                <span>Total Items</span>
                                <span className="font-medium">{category.stats.total}</span>
                              </div>
                              {category.stats.active && (
                                <div className="flex items-center justify-between text-sm text-muted-foreground">
                                  <span>Active</span>
                                  <span className="font-medium text-green-600">{category.stats.active}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </CardHeader>
                      </Card>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="max-w-xs">
                      <p>{category.description}</p>
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </div>
          </TooltipProvider>
        </div>
      </div>
    );
  }

  // Default to checklists view
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background">
      {/* Navigation Bar */}
      <div className="fluent-navigation sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-8 py-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Button 
                variant="outline" 
                onClick={() => setActiveView('dashboard')} 
                className="fluent-button hover:bg-secondary/80 hover:border-primary/20 shadow-fluent-sm hover:shadow-fluent-md group"
              >
                <ArrowLeft className="h-4 w-4 mr-2 group-hover:-translate-x-1 transition-transform duration-200" />
                Back to Categories
              </Button>
            </div>
            <div className="flex-1 flex justify-center">
              <div className="transition-all duration-300 hover:scale-110 hover:drop-shadow-lg">
                <img 
                  src="/images/orsh-logo.png" 
                  alt="ORSH Logo" 
                  className="h-20 w-auto filter drop-shadow-sm" 
                />
              </div>
            </div>
            <div className="w-40"></div> {/* Spacer to center the logo */}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-8 py-8">
        {/* Page Header */}
        <div className="mb-8 animate-fade-in-up">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-light text-foreground mb-2 tracking-tight">
                PSSR
                <span className="fluent-hero-text font-semibold"> Checklists</span>
              </h2>
              <p className="text-muted-foreground">
                Manage and configure Pre-Startup Safety Review checklists for your projects
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <Button className="fluent-button bg-primary hover:bg-primary-hover shadow-fluent-md hover:shadow-fluent-lg" onClick={() => setShowCreateForm(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create New Checklist
              </Button>
            </div>
          </div>
        </div>

        {/* Search and Filter Controls */}
        <div className="mb-8 bg-card/50 backdrop-blur-sm border border-border/50 rounded-2xl p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input placeholder="Search checklists by name or reason..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-10" />
            </div>
            <div className="flex gap-4">
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger className="w-48">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filter by category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="General">General</SelectItem>
                  <SelectItem value="Process Safety">Process Safety</SelectItem>
                  <SelectItem value="Emergency Systems">Emergency Systems</SelectItem>
                  <SelectItem value="Technical Integrity">Technical Integrity</SelectItem>
                </SelectContent>
              </Select>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name">Name</SelectItem>
                  <SelectItem value="date">Date Created</SelectItem>
                  <SelectItem value="items">Item Count</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
              <p className="text-muted-foreground">Loading checklists...</p>
            </div>
          </div>
        ) : (
          <>
            {/* Checklists Grid */}
            {filteredAndSortedChecklists.length === 0 ? (
              <div className="text-center py-16">
                <div className="flex flex-col items-center space-y-6">
                  <FileText className="h-16 w-16 text-muted-foreground" />
                  <div className="space-y-2">
                    <h3 className="text-xl font-semibold text-foreground">No Checklists Found</h3>
                    <p className="text-muted-foreground max-w-md">
                      {searchQuery || filterCategory !== 'all' ? 'No checklists match your current filters. Try adjusting your search criteria.' : 'Create your first PSSR checklist to get started with safety reviews.'}
                    </p>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Button className="fluent-button bg-primary hover:bg-primary-hover" onClick={() => setShowCreateForm(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Create First Checklist
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredAndSortedChecklists.map((checklist, index) => (
                  <Card key={checklist.id} className="fluent-card group hover:shadow-fluent-lg transition-all duration-300 cursor-pointer animate-fade-in-up" style={{animationDelay: `${index * 0.1}s`}} onClick={() => handleChecklistClick(checklist)}>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <CardTitle className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors">
                              {checklist.name}
                            </CardTitle>
                            {isNewChecklist(checklist.id) && (
                              <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 animate-pulse">New</Badge>
                            )}
                          </div>
                          <CardDescription className="text-sm text-muted-foreground line-clamp-2">
                            {checklist.reason}
                          </CardDescription>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={(e) => {
                              e.stopPropagation();
                              handleEditChecklist(checklist);
                            }}>
                              <Edit3 className="h-4 w-4 mr-2" />
                              Edit Checklist
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive" onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteChecklist(checklist);
                            }}>
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete Checklist
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          {getStatusBadge(checklist.status)}
                          <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                            <div className="flex items-center">
                              <FileText className="h-4 w-4 mr-1" />
                              {checklist.items_count} items
                            </div>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-xs text-muted-foreground">
                          <div className="flex items-center">
                            <Calendar className="h-3 w-3 mr-1" />
                            {new Date(checklist.created_at).toLocaleDateString()}
                          </div>
                          <div className="flex items-center">
                            <User className="h-3 w-3 mr-1" />
                            {checklist.created_by || 'System'}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
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
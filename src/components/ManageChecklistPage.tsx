import React, { useState, useMemo } from 'react';
import { AnimatedBackground } from '@/components/ui/AnimatedBackground';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CardSkeleton, TableSkeleton } from '@/components/ui/skeleton-loader';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Search, Filter, Plus, FileText, Calendar, User, Loader2, Edit3, ClipboardList, Users, BookOpen, Settings, Wrench, Languages, Home } from 'lucide-react';
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
  reason: string;
  selected_items: string[];
  custom_reason?: string;
}
const ManageChecklistPage: React.FC<ManageChecklistPageProps> = ({
  onBack,
  selectedLanguage = "English",
  translations = {}
}) => {
  const [currentLanguage, setCurrentLanguage] = useState(selectedLanguage);

  // Update current language when selectedLanguage prop changes
  React.useEffect(() => {
    setCurrentLanguage(selectedLanguage);
  }, [selectedLanguage]);

  // Get current translations based on selected language
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
  const {
    toast
  } = useToast();
  const {
    data: checklists = [],
    isLoading,
    error
  } = useChecklists();
  const {
    data: categories = []
  } = useChecklistCategories();
  const {
    data: topics = []
  } = useChecklistTopics();
  const {
    mutate: createChecklist
  } = useCreateChecklist();
  const {
    mutate: updateChecklist
  } = useUpdateChecklist();
  const {
    mutate: deleteChecklist
  } = useDeleteChecklist();
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
      const matchesSearch = checklist.name.toLowerCase().includes(searchQuery.toLowerCase()) || checklist.reason.toLowerCase().includes(searchQuery.toLowerCase());
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
        return <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100">{t.active}</Badge>;
      case 'Draft':
        return <Badge variant="secondary" className="bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100">{t.draft}</Badge>;
      case 'Archived':
        return <Badge variant="outline" className="bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100">{t.archived}</Badge>;
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

  // Generate breadcrumbs based on current state
  const getBreadcrumbs = () => {
    const crumbs = [
      { label: 'Home', icon: Home, onClick: onBack }, 
      { label: 'Admin Tools', icon: Settings, onClick: onBack }
    ];
    
    if (showCreateForm) {
      crumbs.push({ label: 'Checklist Management', icon: ClipboardList, onClick: () => setShowCreateForm(false) });
      crumbs.push({ label: 'Create Checklist', icon: Plus, onClick: undefined });
    } else if (showEditForm) {
      crumbs.push({ label: 'Checklist Management', icon: ClipboardList, onClick: () => { setShowEditForm(false); setEditingChecklist(null); } });
      crumbs.push({ label: 'Edit Checklist', icon: Edit3, onClick: undefined });
    } else if (selectedChecklist) {
      crumbs.push({ label: 'Checklist Management', icon: ClipboardList, onClick: () => setSelectedChecklist(null) });
      crumbs.push({ label: selectedChecklist.name, icon: FileText, onClick: undefined });
    } else {
      crumbs.push({ label: 'Checklist Management', icon: ClipboardList, onClick: undefined });
    }
    
    return crumbs;
  };

  if (showCreateForm) {
    return <div className="flex-1 overflow-auto">
          <AnimatedBackground>
        <div className="relative z-10">
          <AdminHeader 
            icon={<ClipboardList className="w-5 h-5" />} 
            title="Checklist Management" 
            description="Manage your checklists, items, categories, and topics"
            customBreadcrumbs={[
              { label: 'Home', path: '/', onClick: onBack },
              { label: 'Administration', path: '/admin-tools', onClick: onBack },
              { label: 'Checklist Management', path: '/admin-tools', onClick: () => {} }
            ]}
          />

          <CreateChecklistForm onBack={() => setShowCreateForm(false)} onComplete={handleCreateComplete} selectedLanguage={currentLanguage} translations={t} />
        </div>
          </AnimatedBackground>
        </div>;
  }
  if (showEditForm && editingChecklist) {
    return <div className="flex-1 overflow-auto">
          <AnimatedBackground>
        <div className="relative z-10">
          <AdminHeader 
            icon={<ClipboardList className="w-5 h-5" />} 
            title="Checklist Management" 
            description="Manage your checklists, items, categories, and topics"
            customBreadcrumbs={[
              { label: 'Home', path: '/', onClick: onBack },
              { label: 'Administration', path: '/admin-tools', onClick: onBack },
              { label: 'Checklist Management', path: '/admin-tools', onClick: () => {} }
            ]}
          />

          <EditChecklistForm checklist={editingChecklist} onBack={() => { setShowEditForm(false); setEditingChecklist(null); }} onSave={handleEditComplete} />
        </div>
          </AnimatedBackground>
        </div>;
  }
  
  if (showSuccessPage) {
    return <div className="flex-1 overflow-auto">
      <AnimatedBackground>
        <div className="relative z-10">
          <AdminHeader 
            icon={<ClipboardList className="w-5 h-5" />} 
            title="Checklist Management" 
            description="Manage your checklists, items, categories, and topics"
            customBreadcrumbs={[
              { label: 'Home', path: '/', onClick: onBack },
              { label: 'Administration', path: '/admin-tools', onClick: onBack },
              { label: 'Checklist Management', path: '/admin-tools', onClick: () => {} }
            ]}
          />
          
          <ChecklistSuccessPage 
            checklistName={createdChecklistName} 
            onViewChecklists={handleBackToChecklists} 
            onCreateAnother={() => { setShowSuccessPage(false); setShowCreateForm(true); }} 
          />
        </div>
      </AnimatedBackground>
    </div>;
  }
  
  if (selectedChecklist) {
    return <div className="flex-1 overflow-auto">
      <ChecklistDetailsPage 
        checklist={selectedChecklist} 
        onBack={() => setSelectedChecklist(null)} 
        selectedLanguage={currentLanguage} 
        translations={t} 
      />
    </div>;
  }

  return <div className="flex-1 overflow-auto">
    <AnimatedBackground>
      <div className="relative z-10">
        <AdminHeader 
          icon={<ClipboardList className="w-5 h-5" />} 
          title="Checklist Management" 
          description="Manage your checklists, items, categories, and topics"
          customBreadcrumbs={[
            { label: 'Home', path: '/', onClick: onBack },
            { label: 'Administration', path: '/admin-tools', onClick: onBack },
            { label: 'Checklist Management', path: '/admin-tools', onClick: () => {} }
          ]}
        />

        <div className="container py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-10">
            <div className="flex justify-center animate-smooth-in stagger-1">
              <TabsList className="inline-flex h-14 items-center justify-center rounded-2xl bg-card/90 backdrop-blur-md p-1.5 text-muted-foreground shadow-lg border transition-all duration-300">
                <TabsTrigger value="checklists" className="inline-flex items-center justify-center whitespace-nowrap rounded-xl px-6 py-3 text-sm font-medium ring-offset-background transition-all duration-300 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-primary/80 data-[state=active]:text-primary-foreground data-[state=active]:shadow-md data-[state=active]:scale-105 gap-2 hover:bg-accent/50 hover:scale-102 active:scale-100">
                  <ClipboardList className="h-4 w-4 transition-transform duration-300" />
                  <span className="hidden sm:inline">{t.checklists}</span>
                </TabsTrigger>
                <TabsTrigger value="items" className="inline-flex items-center justify-center whitespace-nowrap rounded-xl px-6 py-3 text-sm font-medium ring-offset-background transition-all duration-300 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-primary/80 data-[state=active]:text-primary-foreground data-[state=active]:shadow-md data-[state=active]:scale-105 gap-2 hover:bg-accent/50 hover:scale-102 active:scale-100">
                  <FileText className="h-4 w-4 transition-transform duration-300" />
                  <span className="hidden sm:inline">{t.items}</span>
                </TabsTrigger>
                <TabsTrigger value="categories" className="inline-flex items-center justify-center whitespace-nowrap rounded-xl px-6 py-3 text-sm font-medium ring-offset-background transition-all duration-300 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-primary/80 data-[state=active]:text-primary-foreground data-[state=active]:shadow-md data-[state=active]:scale-105 gap-2 hover:bg-accent/50 hover:scale-102 active:scale-100">
                  <Users className="h-4 w-4 transition-transform duration-300" />
                  <span className="hidden sm:inline">{t.categories}</span>
                </TabsTrigger>
                <TabsTrigger value="topics" className="inline-flex items-center justify-center whitespace-nowrap rounded-xl px-6 py-3 text-sm font-medium ring-offset-background transition-all duration-300 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-primary/80 data-[state=active]:text-primary-foreground data-[state=active]:shadow-md data-[state=active]:scale-105 gap-2 hover:bg-accent/50 hover:scale-102 active:scale-100">
                  <BookOpen className="h-4 w-4 transition-transform duration-300" />
                  <span className="hidden sm:inline">{t.topics}</span>
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="checklists" className="space-y-8 animate-slide-up mt-0">
              <div className="flex items-center justify-between animate-smooth-in stagger-2">
                <Button onClick={() => setShowCreateForm(true)} className="btn-premium shadow-md hover:shadow-lg transition-all duration-300">
                  <Plus className="h-4 w-4 mr-2 transition-transform duration-300 group-hover:rotate-90" />
                  {t.createNewChecklist}
                </Button>
              </div>
              
              {isLoading ? <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">{[...Array(6)].map((_, i) => <CardSkeleton key={i} />)}</div> : checklists.length === 0 ? <div className="text-center py-16 animate-smooth-in">
                  <ClipboardList className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <h3 className="text-xl font-semibold mb-2 text-foreground/80">No Checklists Yet</h3>
                  <p className="text-muted-foreground">Create your first checklist to get started</p>
                </div> : <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {checklists.map((checklist, index) => {
                    const colorVariants = ['from-blue-500/10 via-blue-500/5 to-transparent border-blue-500/15 hover:border-blue-500/30', 'from-violet-500/10 via-violet-500/5 to-transparent border-violet-500/15 hover:border-violet-500/30', 'from-emerald-500/10 via-emerald-500/5 to-transparent border-emerald-500/15 hover:border-emerald-500/30'];
                    const colorClass = colorVariants[index % colorVariants.length];
                    return <Card key={checklist.id} className={`group cursor-pointer relative overflow-hidden transition-all duration-300 ease-out hover:scale-[1.02] hover:shadow-xl hover:-translate-y-1 bg-gradient-to-br backdrop-blur animate-smooth-in ${colorClass}`} onClick={() => handleChecklistClick(checklist)}>
                      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                      <CardHeader className="relative">
                        <CardTitle className="text-lg mb-2 group-hover:text-primary transition-colors duration-300">{checklist.name}</CardTitle>
                      </CardHeader>
                      <CardContent className="relative">
                        <div className="flex items-center justify-between">
                          {getStatusBadge(checklist.status)}
                          <div className="flex items-center text-sm text-muted-foreground transition-colors duration-300 group-hover:text-foreground">
                            <FileText className="h-4 w-4 mr-1" />
                            {checklist.items_count} {t.items.toLowerCase()}
                          </div>
                        </div>
                      </CardContent>
                    </Card>;
                  })}
                </div>}
            </TabsContent>

            <TabsContent value="items" className="animate-slide-up mt-0">
              <div className="bg-card/60 backdrop-blur-sm rounded-xl shadow-xl border p-6 card-lift">
                <ChecklistManagementPage onBack={() => {}} translations={t} selectedLanguage={currentLanguage} />
              </div>
            </TabsContent>

            <TabsContent value="categories" className="animate-slide-up mt-0">
              <div className="bg-card/60 backdrop-blur-sm rounded-xl shadow-xl border p-6 card-lift">
                <ChecklistCategoriesManagement onBack={() => {}} translations={t} selectedLanguage={currentLanguage} />
              </div>
            </TabsContent>

            <TabsContent value="topics" className="animate-slide-up mt-0">
              <div className="bg-card/60 backdrop-blur-sm rounded-xl shadow-xl border p-6 card-lift">
                <ChecklistTopicsManagement onBack={() => {}} translations={t} selectedLanguage={currentLanguage} />
              </div>
            </TabsContent>
          </Tabs>
        </div>

        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t.delete} {t.checklists}</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete "{checklistToDelete?.name}"? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={cancelDeleteChecklist}>{t.cancel}</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDeleteChecklist} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                {t.delete}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AnimatedBackground>
  </div>;
};

export default ManageChecklistPage;
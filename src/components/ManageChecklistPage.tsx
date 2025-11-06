import React, { useState, useMemo } from 'react';
import { AnimatedBackground } from '@/components/ui/AnimatedBackground';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CardSkeleton, TableSkeleton } from '@/components/ui/skeleton-loader';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Search, Filter, Plus, FileText, Calendar, User, Loader2, Edit3, MoreVertical, Trash2, ClipboardList, Users, BookOpen, Settings, Wrench, Languages, Home } from 'lucide-react';
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
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import ChecklistCategoriesManagement from './ChecklistCategoriesManagement';
import ChecklistTopicsManagement from './ChecklistTopicsManagement';
import PSSRSettingsManagement from './PSSRSettingsManagement';
import TranslationManagement from './TranslationManagement';
import UserProfileDropdown from '@/components/admin/UserProfileDropdown';
import OrshLogo from './ui/OrshLogo';
import LanguageSelector from '@/components/admin/LanguageSelector';
import { ThemeToggle } from '@/components/admin/ThemeToggle';
import { getCurrentTranslations } from '@/utils/translations';

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
  if (showCreateForm) {
    return (
      <AnimatedBackground>
        <div className="relative z-10">
          <div className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60 border-b shadow-sm">
            <div className="container flex h-20 items-center justify-between gap-4">
              {/* Left - Breadcrumb Navigation */}
              <div className="flex items-center min-w-0 flex-1">
                <Breadcrumb>
                  <BreadcrumbList>
                    <BreadcrumbItem>
                      <BreadcrumbLink 
                        onClick={() => setShowCreateForm(false)}
                        className="flex items-center gap-1.5 cursor-pointer hover:text-foreground transition-colors"
                      >
                        <Home className="h-4 w-4" />
                        <span className="hidden sm:inline">Home</span>
                      </BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator />
                    <BreadcrumbItem>
                      <BreadcrumbLink 
                        onClick={() => setShowCreateForm(false)}
                        className="cursor-pointer hover:text-foreground transition-colors hidden sm:inline"
                      >
                        Administration
                      </BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator className="hidden sm:block" />
                    <BreadcrumbItem>
                      <BreadcrumbLink 
                        onClick={() => setShowCreateForm(false)}
                        className="cursor-pointer hover:text-foreground transition-colors hidden sm:inline"
                      >
                        Checklist Management
                      </BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator />
                    <BreadcrumbItem>
                      <BreadcrumbPage className="font-semibold">Create New Checklist</BreadcrumbPage>
                    </BreadcrumbItem>
                  </BreadcrumbList>
                </Breadcrumb>
              </div>

              {/* Center - Logo */}
              <div className="hidden md:flex flex-shrink-0">
                <OrshLogo />
              </div>

              {/* Right - Settings Controls */}
              <div className="flex items-center gap-2">
                <ThemeToggle />
                <LanguageSelector 
                  selectedLanguage={currentLanguage}
                  onLanguageChange={setCurrentLanguage}
                />
                <UserProfileDropdown translations={t} />
              </div>
            </div>
          </div>

          <CreateChecklistForm 
            onBack={() => setShowCreateForm(false)} 
            onComplete={handleCreateComplete} 
          />
        </div>
      </AnimatedBackground>
    );
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
  return <AnimatedBackground>
      <div className="relative z-10">
        <div className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60 border-b shadow-sm">
          <div className="container flex h-20 items-center justify-between gap-4">
            {/* Left - Breadcrumb Navigation */}
            <div className="flex items-center min-w-0 flex-1">
              <Breadcrumb>
                <BreadcrumbList>
                  <BreadcrumbItem>
                    <BreadcrumbLink 
                      onClick={onBack}
                      className="flex items-center gap-1.5 cursor-pointer hover:text-foreground transition-colors"
                    >
                      <Home className="h-4 w-4" />
                      <span className="hidden sm:inline">Home</span>
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <BreadcrumbLink 
                      onClick={onBack}
                      className="cursor-pointer hover:text-foreground transition-colors hidden sm:inline"
                    >
                      Administration
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator className="hidden sm:inline" />
                  <BreadcrumbItem className="hidden sm:inline">
                    <BreadcrumbPage className="font-medium">
                      Checklist Management
                    </BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
            </div>

            {/* Center - ORSH Logo */}
            <div className="flex-shrink-0">
              <OrshLogo size="medium" />
            </div>

            {/* Right - Controls */}
            <div className="flex items-center gap-3 justify-end flex-1">
              <ThemeToggle />
              <LanguageSelector 
                selectedLanguage={currentLanguage}
                onLanguageChange={setCurrentLanguage}
              />
              <UserProfileDropdown translations={t} />
            </div>
          </div>
        </div>

        <div className="container py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Modern Header */}
          <div className="mb-14 animate-smooth-in">
            <h1 className="text-2xl md:text-3xl font-semibold tracking-tight mb-3 bg-gradient-to-r from-foreground/60 to-foreground/40 bg-clip-text text-transparent">
              Checklist Management
            </h1>
            <p className="text-muted-foreground/80 text-sm md:text-base max-w-3xl">
              Manage your checklists, items, categories, and topics in one centralized location
            </p>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-10">
            {/* Modern Tab Navigation */}
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

              <div className="flex gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input placeholder={t.searchChecklists} value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-10 h-11 rounded-xl border-border/60 bg-background/60 backdrop-blur-sm focus:border-primary/40 focus:ring-primary/20" />
                </div>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-44 h-11 rounded-xl border-border/60 bg-background/60 backdrop-blur-sm">
                    <SelectValue placeholder={t.sortBy} />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="name">{t.name}</SelectItem>
                    <SelectItem value="date">{t.date}</SelectItem>
                    <SelectItem value="items">{t.items}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {isLoading ? <div className="flex items-center justify-center py-16">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div> : filteredAndSortedChecklists.length === 0 ? <div className="text-center py-16">
                  <FileText className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-xl font-semibold mb-2">{t.noChecklistsFound}</h3>
                  <p className="text-muted-foreground">{t.createFirstChecklist}</p>
                </div> : <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {filteredAndSortedChecklists.map((checklist, index) => <Card key={checklist.id} className="group cursor-pointer card-lift border-0 bg-gradient-to-br from-card to-card/50 backdrop-blur overflow-hidden animate-smooth-in" style={{
                animationDelay: `${index * 50}ms`
              }} onClick={() => handleChecklistClick(checklist)}>
                      {/* Gradient Background Effect */}
                      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                      
                      <CardHeader className="relative">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <CardTitle className="text-lg mb-2 group-hover:text-primary transition-colors duration-300">{checklist.name}</CardTitle>
                            <CardDescription className="line-clamp-2">{checklist.reason}</CardDescription>
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-accent transition-all duration-300 hover:scale-110 active:scale-95">
                                <MoreVertical className="h-4 w-4 transition-transform duration-300 group-hover:rotate-90" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="animate-scale-up">
                              <DropdownMenuItem onClick={e => {
                          e.stopPropagation();
                          handleEditChecklist(checklist);
                        }} className="transition-all duration-200 hover:bg-primary/10">
                                <Edit3 className="h-4 w-4 mr-2 transition-transform duration-300 hover:rotate-12" />
                                {t.edit}
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={e => {
                          e.stopPropagation();
                          handleDeleteChecklist(checklist);
                        }} className="text-destructive transition-all duration-200 hover:bg-destructive/10">
                                <Trash2 className="h-4 w-4 mr-2 transition-transform duration-300 hover:rotate-12" />
                                {t.delete}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </CardHeader>
                      <CardContent className="relative">
                        <div className="flex items-center justify-between">
                          {getStatusBadge(checklist.status)}
                          <div className="flex items-center text-sm text-muted-foreground transition-colors duration-300 group-hover:text-foreground">
                            <FileText className="h-4 w-4 mr-1 transition-transform duration-300 group-hover:scale-110" />
                            {checklist.items_count} {t.items.toLowerCase()}
                          </div>
                        </div>
                      </CardContent>
                    </Card>)}
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
    </AnimatedBackground>;
};
export default ManageChecklistPage;
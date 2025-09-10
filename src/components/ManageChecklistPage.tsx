import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Search, Filter, Plus, FileText, Calendar, User, Activity, Loader2, Settings, FolderOpen, Edit3 } from 'lucide-react';
import ChecklistDetailsPage from './ChecklistDetailsPage';
import CreateChecklistForm from './CreateChecklistForm';
import ChecklistManagementPage from './ChecklistManagementPage';
import EditChecklistForm from './EditChecklistForm';
import { ChecklistSuccessPage } from './ChecklistSuccessPage';
import { useChecklists, useCreateChecklist, useUpdateChecklist, Checklist } from '@/hooks/useChecklists';
import { useToast } from '@/hooks/use-toast';

// Use the Checklist type from the hook

interface ManageChecklistPageProps {
  onBack: () => void;
}

interface NewChecklistData {
  name: string;
  reason: string;
  selected_items: string[];
  custom_reason?: string;
}

const ManageChecklistPage: React.FC<ManageChecklistPageProps> = ({ onBack }) => {
  const [selectedChecklist, setSelectedChecklist] = useState<Checklist | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [editingChecklist, setEditingChecklist] = useState<Checklist | null>(null);
  const [showSuccessPage, setShowSuccessPage] = useState(false);
  const [showItemsManagement, setShowItemsManagement] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [sortBy, setSortBy] = useState('name');
  const [createdChecklistName, setCreatedChecklistName] = useState('');
  
  const { toast } = useToast();
  const { data: checklists = [], isLoading, error } = useChecklists();
  const { mutate: createChecklist } = useCreateChecklist();
  const { mutate: updateChecklist } = useUpdateChecklist();

  const handleCreateComplete = (checklistData: NewChecklistData) => {
    createChecklist(checklistData, {
      onSuccess: (newChecklist) => {
        setCreatedChecklistName(newChecklist.name);
        setShowCreateForm(false);
        setShowSuccessPage(true);
      },
      onError: (error) => {
        console.error('Failed to create checklist:', error);
        toast({
          title: "Error",
          description: "Failed to create checklist. Please try again.",
          variant: "destructive",
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
      description: "Checklist updated successfully.",
    });
  };

  // Show error toast if there's an error
  React.useEffect(() => {
    if (error) {
      toast({
        title: "Error loading checklists",
        description: "Failed to load checklists. Please try again.",
        variant: "destructive",
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

  if (showCreateForm) {
    return (
      <CreateChecklistForm 
        onBack={() => setShowCreateForm(false)}
        onComplete={handleCreateComplete}
      />
    );
  }

  if (showEditForm && editingChecklist) {
    return (
      <EditChecklistForm 
        checklist={editingChecklist}
        onBack={() => {
          setShowEditForm(false);
          setEditingChecklist(null);
        }}
        onSave={handleEditComplete}
      />
    );
  }

  if (showSuccessPage) {
    return (
      <ChecklistSuccessPage 
        checklistName={createdChecklistName}
        onViewChecklists={handleBackToChecklists}
        onCreateAnother={() => {
          setShowSuccessPage(false);
          setShowCreateForm(true);
        }}
      />
    );
  }

  if (showItemsManagement) {
    return (
      <ChecklistManagementPage 
        onBack={() => setShowItemsManagement(false)}
      />
    );
  }

  if (selectedChecklist) {
    return (
      <ChecklistDetailsPage 
        checklist={selectedChecklist}
        onBack={() => setSelectedChecklist(null)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background">
      {/* Navigation Bar */}
      <div className="fluent-navigation sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-6">
              <div className="fluent-reveal">
                <img 
                  src="/lovable-uploads/70145c9c-2a08-4847-8e11-a13dc6eeb723.png" 
                  alt="BGC Logo" 
                  className="h-12 w-auto animate-float" 
                />
              </div>
              <div className="animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-foreground to-primary bg-clip-text text-transparent">
                  Manage Checklists
                </h1>
                <p className="text-sm text-muted-foreground font-medium">PSSR Microservice • Basrah Gas Company</p>
              </div>
            </div>
            <Button 
              variant="outline" 
              onClick={onBack}
              className="fluent-button hover:bg-secondary/80 hover:border-primary/20 shadow-fluent-sm hover:shadow-fluent-md group"
            >
              <ArrowLeft className="h-4 w-4 mr-2 group-hover:-translate-x-1 transition-transform duration-200" />
              Back to Admin Tools
            </Button>
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
              <Button 
                variant="outline"
                className="fluent-button hover:bg-secondary/80 hover:border-primary/20"
                onClick={() => setShowItemsManagement(true)}
              >
                <FolderOpen className="h-4 w-4 mr-2" />
                Browse Items & Categories
              </Button>
              <Button 
                className="fluent-button bg-primary hover:bg-primary-hover shadow-fluent-md hover:shadow-fluent-lg"
                onClick={() => setShowCreateForm(true)}
              >
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
              <Input
                placeholder="Search checklists by name or reason..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
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
                      {searchQuery || filterCategory !== 'all' 
                        ? 'No checklists match your current filters. Try adjusting your search criteria.'
                        : 'Create your first PSSR checklist to get started with safety reviews.'
                      }
                    </p>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Button 
                      variant="outline"
                      className="fluent-button hover:bg-secondary/80"
                      onClick={() => setShowItemsManagement(true)}
                    >
                      <FolderOpen className="h-4 w-4 mr-2" />
                      Browse Checklist Items
                    </Button>
                    <Button 
                      className="fluent-button bg-primary hover:bg-primary-hover"
                      onClick={() => setShowCreateForm(true)}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Create First Checklist
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredAndSortedChecklists.map((checklist, index) => (
                  <Card
                    key={checklist.id}
                    className="group cursor-pointer hover:shadow-fluent-lg transition-all duration-300 border border-border/20 bg-card/90 backdrop-blur-sm hover:-translate-y-1 animate-fade-in-up"
                    style={{ animationDelay: `${index * 0.1}s` }}
                    onClick={() => setSelectedChecklist(checklist)}
                  >
                    <CardHeader className="pb-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-lg group-hover:text-primary transition-colors duration-200">
                            {checklist.name}
                          </CardTitle>
                          <CardDescription className="mt-2">
                            {checklist.reason}
                          </CardDescription>
                        </div>
                        <div className="flex items-center space-x-2">
                          {getStatusBadge(checklist.status)}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-primary/10"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditChecklist(checklist);
                            }}
                            title="Edit checklist"
                          >
                            <Edit3 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex items-center space-x-2">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium">{checklist.items_count} items</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Activity className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{checklist.active_pssr_count} active PSSR</span>
                        </div>
                      </div>
                      
                      <div className="pt-2 border-t border-border/10">
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <div className="flex items-center space-x-1">
                            <Calendar className="h-3 w-3" />
                            <span>{new Date(checklist.created_at).toLocaleDateString()}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <User className="h-3 w-3" />
                            <span>{checklist.created_by_email}</span>
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
    </div>
  );
};

export default ManageChecklistPage;
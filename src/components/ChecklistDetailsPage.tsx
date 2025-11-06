import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, Search, Filter, Calendar, User, Activity, FileText, Edit, Trash2, Plus, Settings, Eye, Home } from 'lucide-react';
import EditChecklistForm from './EditChecklistForm';
import EditChecklistItemModal from './EditChecklistItemModal';
import ViewChecklistItemModal from './ViewChecklistItemModal';
import { Checklist } from '@/hooks/useChecklists';
import { useChecklistItems, ChecklistItem } from '@/hooks/useChecklistItems';
import AdminHeader from '@/components/admin/AdminHeader';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import { getCurrentTranslations } from '@/utils/translations';
import { AnimatedBackground } from '@/components/ui/AnimatedBackground';

// Category color mapping
const CATEGORY_COLORS: Record<string, string> = {
  'General': 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30',
  'Hardware Integrity': 'bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/30',
  'Process Safety': 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/30',
  'Documentation': 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 border-cyan-500/30',
  'Organization': 'bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/30',
  'Health & Safety': 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/30',
  'Emergency Response': 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/30',
  'HSE': 'bg-teal-500/10 text-teal-700 dark:text-teal-400 border-teal-500/30',
  'Electrical': 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/30',
  'Mechanical': 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border-indigo-500/30',
  'Instrumentation': 'bg-pink-500/10 text-pink-700 dark:text-pink-400 border-pink-500/30',
  'Civil': 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30',
  'Rotating': 'bg-violet-500/10 text-violet-700 dark:text-violet-400 border-violet-500/30',
};

interface ChecklistDetailsPageProps {
  checklist: Checklist;
  onBack: () => void;
  selectedLanguage?: string;
  translations?: any;
}

const ChecklistDetailsPage: React.FC<ChecklistDetailsPageProps> = ({ 
  checklist, 
  onBack,
  selectedLanguage = "English",
  translations = {}
}) => {
  const [currentLanguage, setCurrentLanguage] = useState(selectedLanguage);
  const t = getCurrentTranslations(currentLanguage);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState('id');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [showEditChecklist, setShowEditChecklist] = useState(false);
  const [editingItem, setEditingItem] = useState<ChecklistItem | null>(null);
  const [viewingItem, setViewingItem] = useState<ChecklistItem | null>(null);
  const { data: allChecklistItems = [], isLoading } = useChecklistItems();
  const [selectedItems, setSelectedItems] = useState<string[]>(
    checklist.selected_items || []
  );

  // Filter checklist items to show only the ones selected for this checklist
  const checklistItems = allChecklistItems.filter(item => 
    selectedItems.includes(item.unique_id)
  );

  // Mock active PSSR data
  const activePSSRs = [
    { id: 'PSSR-2024-001', projectName: 'Gas Processing Unit A', status: 'In Progress', progress: 65 },
    { id: 'PSSR-2024-002', projectName: 'Compression Station B', status: 'Under Review', progress: 85 },
    { id: 'PSSR-2024-003', projectName: 'Pipeline Section C', status: 'Not Started', progress: 0 }
  ];

  // Filter and sort checklist items
  const filteredItems = useMemo(() => {
    let items = checklistItems.filter(item => {
      const matchesSearch = item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           (item.required_evidence || '').toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });

    items.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'id':
          comparison = (a.unique_id || '').localeCompare(b.unique_id || '');
          break;
        case 'description':
          comparison = a.description.localeCompare(b.description);
          break;
        case 'category':
          comparison = a.category.localeCompare(b.category);
          break;
        case 'authority':
          comparison = (a.Approver || '').localeCompare(b.Approver || '');
          break;
        default:
          comparison = 0;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return items;
  }, [searchQuery, selectedCategory, sortBy, sortOrder, checklistItems, selectedItems]);

  const handleEditChecklist = () => {
    setShowEditChecklist(true);
  };

  const handleSaveChecklist = (updatedChecklist: Checklist, updatedSelectedItems: string[]) => {
    // Update checklist and selected items
    setSelectedItems(updatedSelectedItems);
    setShowEditChecklist(false);
    // In real app, this would save to database
  };

  const handleEditItem = (item: ChecklistItem) => {
    setEditingItem(item);
  };

  const handleSaveItem = (updatedItem: ChecklistItem) => {
    // This would trigger a refetch from the server
    setEditingItem(null);
  };

  const handleDeleteItem = (itemId: string) => {
    setSelectedItems(prev => prev.filter(id => id !== itemId));
    setEditingItem(null);
  };

  const getCategoryStats = (category: string) => {
    const categoryItems = category === 'all' 
      ? checklistItems
      : checklistItems.filter(item => item.category === category);
    return categoryItems.length;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'In Progress':
        return <Badge variant="default" className="bg-blue-100 text-blue-700 border-blue-200">In Progress</Badge>;
      case 'Under Review':
        return <Badge variant="default" className="bg-yellow-100 text-yellow-700 border-yellow-200">Under Review</Badge>;
      case 'Not Started':
        return <Badge variant="outline">Not Started</Badge>;
      case 'Completed':
        return <Badge variant="default" className="bg-green-100 text-green-700 border-green-200">Completed</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  // Show edit checklist form
  if (showEditChecklist) {
    return (
      <EditChecklistForm 
        checklist={checklist}
        onBack={() => setShowEditChecklist(false)}
        onSave={() => setShowEditChecklist(false)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/5">
      <AnimatedBackground>
        <div className="relative z-10">
          {/* Admin Header with Breadcrumb */}
          <AdminHeader
            selectedLanguage={currentLanguage}
            onLanguageChange={setCurrentLanguage}
            translations={t}
          >
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink onClick={onBack} className="cursor-pointer flex items-center gap-1.5">
                    <Home className="h-4 w-4" />
                    Dashboard
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbLink onClick={onBack} className="cursor-pointer">
                    Checklists
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>{checklist.name}</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </AdminHeader>

      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Checklist Overview */}
        <div className="mb-8 animate-fade-in-up">
          <Card className="border-border/40 bg-card/95 backdrop-blur-xl shadow-xl hover:shadow-2xl transition-shadow duration-300">
            <CardHeader className="pb-4">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <CardTitle className="text-3xl font-bold bg-gradient-to-r from-foreground to-primary bg-clip-text text-transparent">
                    {checklist.name}
                  </CardTitle>
                  <CardDescription className="text-base text-muted-foreground">
                    {checklist.reason}
                  </CardDescription>
                </div>
                <div className="flex space-x-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleEditChecklist}
                    className="shadow-sm hover:shadow-md transition-shadow"
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Checklist
                  </Button>
                  <Button 
                    variant="default" 
                    size="sm"
                    className="shadow-sm hover:shadow-md transition-shadow"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Item
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="flex items-center space-x-4 p-4 rounded-lg bg-primary/5 border border-primary/10">
                  <div className="p-3 rounded-full bg-primary/10">
                    <FileText className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-3xl font-bold text-foreground">{checklist.items_count}</p>
                    <p className="text-sm text-muted-foreground font-medium">Total Items</p>
                  </div>
                </div>
                <div className="flex items-center space-x-4 p-4 rounded-lg bg-green-500/5 border border-green-500/10">
                  <div className="p-3 rounded-full bg-green-500/10">
                    <Activity className="h-6 w-6 text-green-600 dark:text-green-500" />
                  </div>
                  <div>
                    <p className="text-3xl font-bold text-foreground">{checklist.active_pssr_count}</p>
                    <p className="text-sm text-muted-foreground font-medium">Active PSSRs</p>
                  </div>
                </div>
                <div className="flex items-center space-x-4 p-4 rounded-lg bg-blue-500/5 border border-blue-500/10">
                  <div className="p-3 rounded-full bg-blue-500/10">
                    <Calendar className="h-6 w-6 text-blue-600 dark:text-blue-500" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-foreground">{new Date(checklist.created_at).toLocaleDateString()}</p>
                    <p className="text-sm text-muted-foreground font-medium">Created Date</p>
                  </div>
                </div>
                <div className="flex items-center space-x-4 p-4 rounded-lg bg-purple-500/5 border border-purple-500/10">
                  <div className="p-3 rounded-full bg-purple-500/10">
                    <User className="h-6 w-6 text-purple-600 dark:text-purple-500" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-foreground truncate max-w-[120px]">{checklist.created_by}</p>
                    <p className="text-sm text-muted-foreground font-medium">Created By</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs for different views */}
        <Tabs defaultValue="items" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 h-12 bg-muted/50 backdrop-blur-sm">
            <TabsTrigger value="items" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">
              Checklist Items
            </TabsTrigger>
            <TabsTrigger value="pssrs" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">
              Active PSSRs
            </TabsTrigger>
          </TabsList>

          {/* Checklist Items Tab */}
          <TabsContent value="items" className="space-y-6">
            {/* Search and Filter Controls */}
            <Card className="border-border/40 bg-card/95 backdrop-blur-xl shadow-lg">
              <CardContent className="p-6">
                <div className="flex flex-col lg:flex-row gap-4">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <Input
                      placeholder="Search checklist items..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 h-11 bg-background/50"
                    />
                  </div>
                  <div className="flex gap-3">
                    <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                      <SelectTrigger className="w-56 h-11 bg-background/50">
                        <Filter className="h-4 w-4 mr-2" />
                        <SelectValue placeholder="Filter by category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Categories ({getCategoryStats('all')})</SelectItem>
                        {Array.from(new Set(allChecklistItems.map(item => item.category))).map(category => (
                          <SelectItem key={category} value={category}>
                            {category} ({getCategoryStats(category)})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={sortBy} onValueChange={setSortBy}>
                      <SelectTrigger className="w-48 h-11 bg-background/50">
                        <SelectValue placeholder="Sort by" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="id">Item ID</SelectItem>
                        <SelectItem value="description">Description</SelectItem>
                        <SelectItem value="category">Category</SelectItem>
                        <SelectItem value="authority">Authority</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Items Grid */}
            <Card className="border-border/40 bg-card/95 backdrop-blur-xl shadow-xl">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-2xl">Checklist Items ({filteredItems.length})</CardTitle>
                    <CardDescription className="mt-1">
                      Detailed view of all items in this checklist
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="text-center space-y-3">
                      <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto"></div>
                      <p className="text-muted-foreground">Loading checklist items...</p>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                    {filteredItems.map((item) => (
                      <div 
                        key={item.unique_id} 
                        className="group relative p-5 rounded-xl border border-border/40 bg-gradient-to-br from-card/80 to-card/50 hover:shadow-lg hover:border-primary/30 transition-all duration-300 hover:scale-[1.01]"
                      >
                        {/* Item Header */}
                        <div className="flex items-start justify-between gap-4 mb-3">
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <Badge 
                              variant="outline" 
                              className="font-mono text-sm px-3 py-1 bg-primary/5 border-primary/30 text-primary font-semibold shrink-0 whitespace-nowrap"
                            >
                              {item.unique_id}
                            </Badge>
                            <Badge 
                              className={`text-xs px-2.5 py-1 font-medium ${CATEGORY_COLORS[item.category] || 'bg-secondary/10 text-secondary-foreground border-secondary/30'}`}
                            >
                              {item.category}
                            </Badge>
                          </div>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => setViewingItem(item)}
                              className="h-8 w-8 p-0 hover:bg-primary/10"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleEditItem(item)}
                              className="h-8 w-8 p-0 hover:bg-primary/10"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleDeleteItem(item.unique_id)}
                              className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        
                        {/* Description */}
                        <p className="text-sm font-medium text-foreground mb-3 line-clamp-2 leading-relaxed">
                          {item.description}
                        </p>
                        
                        {/* Footer Info */}
                        <div className="flex items-center justify-between gap-4 pt-3 border-t border-border/20">
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-muted-foreground mb-1">Supporting Evidence</p>
                            <p className="text-xs font-medium text-foreground truncate">
                              {item.required_evidence || 'No evidence required'}
                            </p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-xs text-muted-foreground mb-1">Authority</p>
                            <p className="text-xs font-medium text-foreground">
                              {item.Approver || 'N/A'}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Active PSSRs Tab */}
          <TabsContent value="pssrs" className="space-y-6">
            <Card className="border border-border/20 bg-card/90 backdrop-blur-sm">
              <CardHeader>
                <CardTitle>Active PSSR Reviews</CardTitle>
                <CardDescription>
                  Projects currently using this checklist for PSSR reviews
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {activePSSRs.map((pssr) => (
                    <div key={pssr.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="space-y-1">
                        <h4 className="font-semibold">{pssr.id}</h4>
                        <p className="text-sm text-muted-foreground">{pssr.projectName}</p>
                      </div>
                      <div className="flex items-center space-x-4">
                        <div className="text-right">
                          <div className="text-sm font-medium">{pssr.progress}% Complete</div>
                          <div className="w-24 bg-muted rounded-full h-2 mt-1">
                            <div 
                              className="bg-primary h-2 rounded-full" 
                              style={{ width: `${pssr.progress}%` }}
                            />
                          </div>
                        </div>
                        {getStatusBadge(pssr.status)}
                        <Button variant="outline" size="sm">
                          View PSSR
                        </Button>
                      </div>
                    </div>
                  ))}
                  {activePSSRs.length === 0 && (
                    <div className="text-center py-8">
                      <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">No Active PSSRs</h3>
                      <p className="text-muted-foreground">
                        No projects are currently using this checklist for PSSR reviews.
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* View Item Modal */}
      {viewingItem && (
        <ViewChecklistItemModal 
          isOpen={true}
          item={viewingItem}
          onClose={() => setViewingItem(null)}
          onEdit={() => {
            setEditingItem(viewingItem);
            setViewingItem(null);
          }}
        />
      )}

      {/* Edit Item Modal */}
      {editingItem && (
        <EditChecklistItemModal 
          isOpen={true}
          item={editingItem}
          onClose={() => setEditingItem(null)}
          onComplete={handleSaveItem}
        />
      )}
        </div>
      </AnimatedBackground>
    </div>
  );
};

export default ChecklistDetailsPage;
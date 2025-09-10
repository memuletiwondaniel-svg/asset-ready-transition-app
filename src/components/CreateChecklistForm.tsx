import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, ArrowRight, CheckCircle, AlertTriangle, FileText, Users, Shield, Heart, ClipboardCheck, Search, Filter, Plus, X } from 'lucide-react';
import { useChecklistItems, ChecklistItem as DBChecklistItem, useChecklistCategories } from '@/hooks/useChecklistItems';
import CreateChecklistItemForm from './CreateChecklistItemForm';
import ChecklistItemSuccessPage from './ChecklistItemSuccessPage';
import ChecklistProgressSteps from './ChecklistProgressSteps';

interface CreateChecklistFormProps {
  onBack: () => void;
  onComplete: (checklist: NewChecklistData) => void;
}

interface NewChecklistData {
  name: string;
  reason: string;
  selected_items: string[];
  custom_reason?: string;
}

const CreateChecklistForm: React.FC<CreateChecklistFormProps> = ({ onBack, onComplete }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [showCreateItem, setShowCreateItem] = useState(false);
  const [showItemSuccess, setShowItemSuccess] = useState(false);
  const [newCreatedItem, setNewCreatedItem] = useState<DBChecklistItem | null>(null);
  const [customChecklistItems, setCustomChecklistItems] = useState<DBChecklistItem[]>([]);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  
  const { data: checklistItems = [], isLoading } = useChecklistItems();
  const { data: availableCategories = [] } = useChecklistCategories();
  
  const [formData, setFormData] = useState<NewChecklistData>({
    name: '',
    reason: '',
    selected_items: [],
  });
  const [customReason, setCustomReason] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Combine database items and custom items
  const allChecklistItems = [...checklistItems, ...customChecklistItems];

  // Checklist reasons
  const checklistReasons = [
    'Start-up or Commissioning of a new Asset',
    'Restart following modification to existing Hardware, Safeguarding or Operating Philosophy',
    'Restart following a process safety incident',
    'Restart following a Turn Around (TAR) Event or Major Maintenance Activity',
    'Others'
  ];

  // Create categories with fixed order
  const categories = React.useMemo(() => {
    const categoryMap = new Map();
    
    // Group items by category
    allChecklistItems.forEach(item => {
      if (!categoryMap.has(item.category)) {
        categoryMap.set(item.category, []);
      }
      categoryMap.get(item.category).push(item);
    });

    // Fixed order as requested
    const orderedCategoryNames = [
      'General',
      'Hardware Integrity', 
      'Process Safety',
      'Documentation',
      'Organization',
      'Health & Safety',
      'Emergency Response',
      'HSE',
      'Electrical',
      'Mechanical',
      'Instrumentation',
      'Civil',
      'Rotating'
    ];

    // Create category objects in the specified order
    return orderedCategoryNames
      .filter(categoryName => categoryMap.has(categoryName))
      .map(categoryName => ({
        id: categoryName,
        name: categoryName,
        items: categoryMap.get(categoryName) || []
      }));
  }, [allChecklistItems]);

  // Get unselected items
  const unselectedItems = allChecklistItems.filter(item => !formData.selected_items.includes(item.id));

  const handleCreateNewItem = (newItemData: any) => {
    // Generate a new ID
    const newId = `CUST-${String(customChecklistItems.length + 1).padStart(3, '0')}`;
    
    const newItem: DBChecklistItem = {
      id: newId,
      description: newItemData.description,
      category: newItemData.category,
      topic: newItemData.topic || null,
      supporting_evidence: newItemData.supportingEvidence || null,
      responsible_party: newItemData.responsibleParty || null,
      approving_authority: newItemData.approvingAuthority || null,
      is_active: true,
      version: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      created_by: null,
      updated_by: null,
    };

    // Add to custom items and automatically select it
    setCustomChecklistItems(prev => [...prev, newItem]);
    setFormData(prev => ({
      ...prev,
      selected_items: [...prev.selected_items, newId]
    }));
    
    setNewCreatedItem(newItem);
    setShowCreateItem(false);
    setShowItemSuccess(true);
  };

  const handleItemSuccessBack = () => {
    setShowItemSuccess(false);
    setNewCreatedItem(null);
  };

  const handleCreateAnother = () => {
    setShowItemSuccess(false);
    setNewCreatedItem(null);
    setShowCreateItem(true);
  };

  const handleItemToggle = (itemId: string) => {
    setFormData(prev => ({
      ...prev,
      selected_items: prev.selected_items.includes(itemId)
        ? prev.selected_items.filter(id => id !== itemId)
        : [...prev.selected_items, itemId]
    }));
  };

  const toggleItemExpansion = (itemId: string) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  };

  const handleNext = () => {
    if (currentStep === 1 && formData.name && formData.reason) {
      setCurrentStep(2);
    }
  };

  const handleComplete = () => {
    const finalData = {
      ...formData,
      custom_reason: formData.reason === 'Others' ? customReason : undefined
    };
    onComplete(finalData);
  };

  const getStepProgress = () => {
    return currentStep === 1 ? 50 : 100;
  };

  const filteredItems = (categoryItems: DBChecklistItem[]) => {
    return categoryItems.filter(item => {
      const matchesSearch = searchQuery === '' || 
        item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.supporting_evidence && item.supporting_evidence.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (item.topic && item.topic.toLowerCase().includes(searchQuery.toLowerCase())) ||
        item.id.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesSearch;
    });
  };

  const getCategoryStats = (categoryItems: DBChecklistItem[]) => {
    const total = categoryItems.length;
    const selected = categoryItems.filter(item => formData.selected_items.includes(item.id)).length;
    return { total, selected, percentage: total > 0 ? Math.round((selected / total) * 100) : 0 };
  };

  // Show create item form
  if (showCreateItem) {
    return (
      <CreateChecklistItemForm 
        onBack={() => setShowCreateItem(false)}
        onComplete={handleCreateNewItem}
        existingCategories={availableCategories}
      />
    );
  }

  // Show item success page
  if (showItemSuccess && newCreatedItem) {
    return (
      <ChecklistItemSuccessPage 
        newItem={newCreatedItem}
        onBackToChecklist={handleItemSuccessBack}
        onCreateAnother={handleCreateAnother}
      />
    );
  }

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto"></div>
          <p className="text-muted-foreground font-medium">Loading checklist items...</p>
        </div>
      </div>
    );
  }

  if (currentStep === 1) {
    return (
      <div className="min-h-screen relative overflow-hidden">
        {/* Microsoft Fluent Background with Acrylic Material */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-100/40"></div>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-100/20 via-transparent to-purple-50/10"></div>
        
        {/* Fluent Design Noise Texture */}
        <div className="absolute inset-0 opacity-[0.015]" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='1'%3E%3Ccircle cx='7' cy='7' r='1'/%3E%3Ccircle cx='27' cy='7' r='1'/%3E%3Ccircle cx='47' cy='7' r='1'/%3E%3Ccircle cx='7' cy='27' r='1'/%3E%3Ccircle cx='27' cy='27' r='1'/%3E%3Ccircle cx='47' cy='27' r='1'/%3E%3Ccircle cx='7' cy='47' r='1'/%3E%3Ccircle cx='27' cy='47' r='1'/%3E%3Ccircle cx='47' cy='47' r='1'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
        }}></div>
        
        {/* Floating Geometric Elements */}
        <div className="absolute top-20 left-20 w-32 h-32 bg-gradient-to-br from-blue-200/20 to-indigo-300/20 rounded-full blur-xl animate-pulse"></div>
        <div className="absolute top-40 right-32 w-24 h-24 bg-gradient-to-br from-purple-200/15 to-pink-300/15 rounded-full blur-lg animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute bottom-32 left-40 w-20 h-20 bg-gradient-to-br from-cyan-200/20 to-blue-300/20 rounded-full blur-md animate-pulse" style={{ animationDelay: '2s' }}></div>
        
        {/* Content Layer with Fluent Acrylic */}
        <div className="relative z-10">
          {/* Navigation Bar with Acrylic Effect */}
          <div className="fluent-navigation sticky top-0 z-50 backdrop-blur-xl bg-white/80 border-b border-white/20 shadow-lg">
            <div className="max-w-4xl mx-auto px-8 py-6">
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
                      Create New Checklist
                    </h1>
                    <p className="text-sm text-muted-foreground font-medium">Step 1 of 2 • Basic Information</p>
                  </div>
                </div>
                <Button 
                  variant="outline" 
                  onClick={onBack}
                  className="fluent-button hover:bg-secondary/80 hover:border-primary/20 shadow-fluent-sm hover:shadow-fluent-md group"
                >
                  <ArrowLeft className="h-4 w-4 mr-2 group-hover:-translate-x-1 transition-transform duration-200" />
                  Cancel
                </Button>
              </div>
            </div>
          </div>

          {/* Progress Steps */}
          <div className="max-w-4xl mx-auto px-8">
            <ChecklistProgressSteps currentStep={currentStep} />
          </div>

          {/* Form Content */}
          <div className="min-h-[calc(100vh-200px)] flex items-center justify-center px-8 -mt-32">
            <div className="w-full max-w-4xl">
              <Card className="border border-white/30 bg-white/70 backdrop-blur-xl shadow-2xl ring-1 ring-black/5 fluent-card">
                <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent rounded-lg"></div>
                <div className="relative z-10">
                  <CardHeader>
                    <CardTitle className="text-2xl">Checklist Information</CardTitle>
                    <CardDescription>
                      Provide basic information about your new PSSR checklist
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Checklist Name */}
                    <div className="space-y-2">
                      <Label htmlFor="name" className="text-base font-semibold">
                        Checklist Name <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="name"
                        placeholder="Enter a descriptive name for your checklist"
                        value={formData.name}
                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                        className="h-12"
                      />
                      <p className="text-sm text-muted-foreground">
                        Choose a clear, descriptive name that identifies the purpose of this checklist
                      </p>
                    </div>

                    {/* Reason for Checklist */}
                    <div className="space-y-2">
                      <Label className="text-base font-semibold">
                        Reason for Checklist <span className="text-destructive">*</span>
                      </Label>
                      <Select value={formData.reason} onValueChange={(value) => setFormData(prev => ({ ...prev, reason: value }))}>
                        <SelectTrigger className="h-12">
                          <SelectValue placeholder="Select the primary reason for creating this checklist" />
                        </SelectTrigger>
                        <SelectContent className="bg-popover border border-border shadow-lg z-50">
                          {checklistReasons.map((reason) => (
                            <SelectItem key={reason} value={reason} className="cursor-pointer">
                              {reason}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      
                      {/* Custom Reason Input */}
                      {formData.reason === 'Others' && (
                        <div className="mt-4 space-y-2">
                          <Label htmlFor="customReason" className="text-sm font-medium">
                            Please specify the reason
                          </Label>
                          <Input
                            id="customReason"
                            placeholder="Enter your custom reason"
                            value={customReason}
                            onChange={(e) => setCustomReason(e.target.value)}
                            className="h-10"
                          />
                        </div>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex justify-end pt-6 border-t border-border/20">
                      <Button 
                        onClick={handleNext}
                        disabled={!formData.name || !formData.reason || (formData.reason === 'Others' && !customReason)}
                        className="fluent-button bg-primary hover:bg-primary-hover px-8"
                      >
                        Next: Select Items
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </Button>
                    </div>
                  </CardContent>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Microsoft Fluent Background with Acrylic Material */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-100/40"></div>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-cyan-100/20 via-transparent to-blue-50/10"></div>
      
      {/* Fluent Design Noise Texture */}
      <div className="absolute inset-0 opacity-[0.015]" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='1'%3E%3Ccircle cx='7' cy='7' r='1'/%3E%3Ccircle cx='27' cy='7' r='1'/%3E%3Ccircle cx='47' cy='7' r='1'/%3E%3Ccircle cx='7' cy='27' r='1'/%3E%3Ccircle cx='27' cy='27' r='1'/%3E%3Ccircle cx='47' cy='27' r='1'/%3E%3Ccircle cx='7' cy='47' r='1'/%3E%3Ccircle cx='27' cy='47' r='1'/%3E%3Ccircle cx='47' cy='47' r='1'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
      }}></div>
      
      {/* Floating Geometric Elements */}
      <div className="absolute top-32 right-20 w-40 h-40 bg-gradient-to-br from-blue-200/15 to-indigo-300/15 rounded-full blur-2xl animate-pulse"></div>
      <div className="absolute bottom-20 left-20 w-28 h-28 bg-gradient-to-br from-purple-200/10 to-pink-300/10 rounded-full blur-xl animate-pulse" style={{ animationDelay: '1.5s' }}></div>
      <div className="absolute top-1/2 left-1/3 w-16 h-16 bg-gradient-to-br from-cyan-200/20 to-blue-300/20 rounded-full blur-lg animate-pulse" style={{ animationDelay: '3s' }}></div>
      
      {/* Content Layer with Fluent Acrylic */}
      <div className="relative z-10">
        {/* Progress Steps */}
        <div className="max-w-7xl mx-auto px-8 pt-6">
          <ChecklistProgressSteps currentStep={currentStep} />
        </div>

        {/* Navigation Bar with Acrylic Effect */}
        <div className="fluent-navigation sticky top-0 z-50 backdrop-blur-xl bg-white/80 border-b border-white/20 shadow-lg">
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
                    Select Checklist Items
                  </h1>
                  <p className="text-sm text-muted-foreground font-medium">
                    Step 2 of 2 • {formData.name}
                  </p>
                </div>
              </div>
              <div className="flex space-x-3">
              </div>
            </div>
          </div>
        </div>


        {/* Back and Action Buttons */}
        <div className="max-w-7xl mx-auto px-8 mb-6">
          <div className="flex justify-between items-center">
            <Button 
              variant="outline" 
              onClick={() => setCurrentStep(1)}
              className="fluent-button hover:bg-secondary/80 hover:border-primary/20"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Step 1
            </Button>
            <div className="flex space-x-3">
              <Button 
                variant="outline"
                onClick={() => setShowCreateItem(true)}
                className="fluent-button bg-green-50 hover:bg-green-100 border-green-200 text-green-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add new checklist item
              </Button>
              <Button 
                onClick={handleComplete}
                className="fluent-button bg-primary hover:bg-primary-hover"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Create Checklist
              </Button>
            </div>
          </div>
        </div>

        {/* Categories Tabs */}
        <div className="max-w-7xl mx-auto px-8 pb-8">
          <Tabs value={selectedCategory} onValueChange={setSelectedCategory} className="w-full">
            <div className="fluent-glassmorphism border border-border/30 backdrop-blur-md rounded-2xl p-6 mb-6">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5 rounded-2xl pointer-events-none"></div>
              <div className="relative z-10">
                {/* Search and Summary */}
                <div className="flex flex-col lg:flex-row gap-4 items-center justify-between mb-6">
                  <div className="flex-1 relative max-w-md">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <Input
                      placeholder="Search checklist items by ID or description..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <div className="flex items-center space-x-4 text-sm">
                    <Badge variant="outline" className="px-3 py-1">
                      {formData.selected_items.length} items selected
                    </Badge>
                    <Badge variant="outline" className="px-3 py-1">
                      {allChecklistItems.length} total items
                    </Badge>
                    {customChecklistItems.length > 0 && (
                      <Badge variant="default" className="px-3 py-1 bg-green-100 text-green-700 border-green-200">
                        {customChecklistItems.length} custom items
                      </Badge>
                    )}
                  </div>
                </div>
                
                <TabsList className="w-full h-auto p-1 grid grid-cols-7 lg:grid-cols-7 gap-1 bg-transparent">
                  <TabsTrigger
                    value="all"
                    className="fluent-tab-trigger data-[state=active]:fluent-tab-active group relative overflow-hidden h-10 bg-card/30 border border-border/20 hover:bg-card/50 hover:border-primary/30 hover:shadow-md transition-all duration-300 ease-out hover:scale-[1.02] active:scale-[0.98]"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 opacity-0 group-hover:opacity-100 transition-all duration-300"></div>
                    <div className="absolute inset-0 bg-gradient-to-t from-white/5 to-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    <div className="relative z-10 flex items-center justify-center h-full">
                      <span className="font-medium text-sm group-hover:text-primary transition-colors duration-200">All Categories</span>
                    </div>
                  </TabsTrigger>
                  
                  {categories.map((category) => {
                    return (
                      <TabsTrigger
                        key={category.id}
                        value={category.id}
                        className="fluent-tab-trigger data-[state=active]:fluent-tab-active group relative overflow-hidden h-10 bg-card/30 border border-border/20 hover:bg-card/50 hover:border-primary/30 hover:shadow-md transition-all duration-300 ease-out hover:scale-[1.02] active:scale-[0.98]"
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 opacity-0 group-hover:opacity-100 transition-all duration-300"></div>
                        <div className="absolute inset-0 bg-gradient-to-t from-white/5 to-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                        <div className="relative z-10 flex items-center justify-center h-full">
                          <span className="font-medium text-sm group-hover:text-primary transition-colors duration-200">{category.name}</span>
                        </div>
                      </TabsTrigger>
                    );
                  })}
                </TabsList>
              </div>
            </div>

            {/* All Categories Tab Content */}
            <TabsContent value="all" className="mt-0">
              <div className="space-y-6">
                {categories.map((category) => {
                  const filteredCategoryItems = filteredItems(category.items);
                  if (filteredCategoryItems.length === 0) return null;

                  const stats = getCategoryStats(category.items);

                  return (
                    <Card key={category.id} className="fluent-glassmorphism border-border/30 backdrop-blur-md">
                      <CardHeader className="pb-4">
                        <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div>
                            <CardTitle className="text-xl font-bold">{category.name}</CardTitle>
                            <CardDescription className="text-sm">
                              {stats.selected} of {stats.total} items selected
                              {stats.selected > 0 && ` (${stats.percentage}%)`}
                            </CardDescription>
                          </div>
                        </div>
                          {stats.selected > 0 && (
                            <div className="flex items-center space-x-2">
                              <Progress value={stats.percentage} className="w-20 h-2" />
                              <Badge variant="secondary" className="text-xs">
                                {stats.percentage}%
                              </Badge>
                            </div>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent>
                        <ScrollArea className="h-96">
                          <div className="grid gap-3">
                            {filteredCategoryItems.map((item) => (
                              <div
                                key={item.id}
                                className="fluent-item-card group border border-border/30 rounded-xl p-4 bg-gradient-to-r from-card/50 to-card/30 backdrop-blur-sm hover:shadow-lg transition-all duration-300 cursor-pointer"
                                onClick={() => handleItemToggle(item.id)}
                              >
                                <div className="flex items-start space-x-4">
                                  <Checkbox
                                    checked={formData.selected_items.includes(item.id)}
                                    onChange={() => handleItemToggle(item.id)}
                                    className="mt-1 fluent-checkbox"
                                  />
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center space-x-3 mb-2">
                                      <Badge variant="outline" className="text-xs font-mono px-2 py-1 bg-primary/5 border-primary/20">
                                        {item.id}
                                      </Badge>
                                      <h4 className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors duration-200">
                                        {item.description}
                                      </h4>
                                    </div>
                                    
                                    {(item.supporting_evidence || item.topic) && (
                                      <div className="space-y-2 text-xs text-muted-foreground">
                                        {item.topic && (
                                          <div className="flex items-center space-x-2">
                                            <span className="font-medium">Topic:</span>
                                            <span>{item.topic}</span>
                                          </div>
                                        )}
                                        {item.supporting_evidence && expandedItems.has(item.id) && (
                                          <div className="space-y-1">
                                            <span className="font-medium">Supporting Evidence:</span>
                                            <p className="text-xs leading-relaxed">{item.supporting_evidence}</p>
                                          </div>
                                        )}
                                      </div>
                                    )}
                                    
                                    {item.supporting_evidence && (
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          toggleItemExpansion(item.id);
                                        }}
                                        className="mt-2 h-6 px-2 text-xs hover:bg-primary/10"
                                      >
                                        {expandedItems.has(item.id) ? 'Show Less' : 'Show More'}
                                      </Button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </TabsContent>

            {/* Individual Category Tab Contents */}
            {categories.map((category) => (
              <TabsContent key={category.id} value={category.id} className="mt-0">
                <Card className="fluent-glassmorphism border-border/30 backdrop-blur-md">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div>
                          <CardTitle className="text-2xl font-bold">{category.name}</CardTitle>
                          <CardDescription>
                            Select the {category.name.toLowerCase()} items you need for your checklist
                          </CardDescription>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-primary">
                          {getCategoryStats(category.items).selected}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          of {category.items.length} selected
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-96">
                      <div className="grid gap-3">
                        {filteredItems(category.items).map((item) => (
                          <div
                            key={item.id}
                            className="fluent-item-card group border border-border/30 rounded-xl p-4 bg-gradient-to-r from-card/50 to-card/30 backdrop-blur-sm hover:shadow-lg transition-all duration-300 cursor-pointer"
                            onClick={() => handleItemToggle(item.id)}
                          >
                            <div className="flex items-start space-x-4">
                              <Checkbox
                                checked={formData.selected_items.includes(item.id)}
                                onChange={() => handleItemToggle(item.id)}
                                className="mt-1 fluent-checkbox"
                              />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center space-x-3 mb-2">
                                  <Badge variant="outline" className="text-xs font-mono px-2 py-1 bg-primary/5 border-primary/20">
                                    {item.id}
                                  </Badge>
                                  <h4 className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors duration-200">
                                    {item.description}
                                  </h4>
                                </div>
                                
                                {(item.supporting_evidence || item.topic) && (
                                  <div className="space-y-2 text-xs text-muted-foreground">
                                    {item.topic && (
                                      <div className="flex items-center space-x-2">
                                        <span className="font-medium">Topic:</span>
                                        <span>{item.topic}</span>
                                      </div>
                                    )}
                                    {item.supporting_evidence && expandedItems.has(item.id) && (
                                      <div className="space-y-1">
                                        <span className="font-medium">Supporting Evidence:</span>
                                        <p className="text-xs leading-relaxed">{item.supporting_evidence}</p>
                                      </div>
                                    )}
                                  </div>
                                )}
                                
                                {item.supporting_evidence && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toggleItemExpansion(item.id);
                                    }}
                                    className="mt-2 h-6 px-2 text-xs hover:bg-primary/10"
                                  >
                                    {expandedItems.has(item.id) ? 'Show Less' : 'Show More'}
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </TabsContent>
            ))}
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default CreateChecklistForm;
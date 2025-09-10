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

  // Create categories dynamically from database items
  const categories = React.useMemo(() => {
    const categoryMap = new Map();
    
    // Group items by category
    allChecklistItems.forEach(item => {
      if (!categoryMap.has(item.category)) {
        categoryMap.set(item.category, []);
      }
      categoryMap.get(item.category).push(item);
    });

    // Create category objects with appropriate icons and colors
    const categoryConfigs = [
      { name: 'Civil', icon: Shield, color: 'text-blue-600 bg-blue-100 border-blue-200' },
      { name: 'Documentation', icon: FileText, color: 'text-purple-600 bg-purple-100 border-purple-200' },
      { name: 'Electrical', icon: AlertTriangle, color: 'text-yellow-600 bg-yellow-100 border-yellow-200' },
      { name: 'Emergency Response', icon: Heart, color: 'text-red-600 bg-red-100 border-red-200' },
      { name: 'General', icon: ClipboardCheck, color: 'text-gray-600 bg-gray-100 border-gray-200' },
      { name: 'Hardware Integrity', icon: Shield, color: 'text-green-600 bg-green-100 border-green-200' },
      { name: 'Health & Safety', icon: Heart, color: 'text-pink-600 bg-pink-100 border-pink-200' },
      { name: 'Process Safety', icon: AlertTriangle, color: 'text-orange-600 bg-orange-100 border-orange-200' },
      { name: 'Technical Integrity', icon: Users, color: 'text-teal-600 bg-teal-100 border-teal-200' },
    ];

    return Array.from(categoryMap.entries()).map(([categoryName, items]) => {
      const config = categoryConfigs.find(c => c.name === categoryName) || 
                    { name: categoryName, icon: FileText, color: 'text-gray-600 bg-gray-100 border-gray-200' };
      
      return {
        id: categoryName,
        name: categoryName,
        icon: config.icon,
        color: config.color,
        items: items
      };
    });
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
        (item.topic && item.topic.toLowerCase().includes(searchQuery.toLowerCase()));
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
      <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background">
        {/* Navigation Bar */}
        <div className="fluent-navigation sticky top-0 z-50">
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


        {/* Form Content */}
        <div className="max-w-4xl mx-auto px-8 pb-8">
          <Card className="border border-border/20 bg-card/90 backdrop-blur-sm">
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
          </Card>
        </div>
      </div>
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


      {/* Search and Summary */}
      <div className="max-w-7xl mx-auto px-8 mb-6">
        <div className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-2xl p-6">
          <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
            <div className="flex-1 relative max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search checklist items..."
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
        <Tabs value={selectedCategory} onValueChange={setSelectedCategory} className="space-y-6">
          <TabsList className="grid grid-cols-4 lg:grid-cols-7 h-auto p-1 bg-card/50 backdrop-blur-sm">
            <TabsTrigger value="all" className="text-xs p-3">
              All Items
            </TabsTrigger>
            {categories.map((category) => {
              const IconComponent = category.icon;
              const stats = getCategoryStats(category.items);
              return (
                <TabsTrigger key={category.id} value={category.id} className="text-xs p-3 space-y-1">
                  <div className="flex items-center space-x-1">
                    <IconComponent className="h-3 w-3" />
                    <span className="hidden sm:inline">{category.name}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {stats.selected}/{stats.total}
                  </div>
                </TabsTrigger>
              );
            })}
            <TabsTrigger value="not-selected" className="text-xs p-3">
              Not Selected
              <Badge variant="secondary" className="ml-2 text-xs">
                {unselectedItems.length}
              </Badge>
            </TabsTrigger>
          </TabsList>

          {/* All Items Tab */}
          <TabsContent value="all" className="space-y-4">
            <Card className="border border-border/20 bg-card/90 backdrop-blur-sm">
              <CardHeader>
                <CardTitle>All Checklist Items</CardTitle>
                <CardDescription>
                  Select the items you want to include in your checklist
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-96">
                  <div className="space-y-4">
                    {allChecklistItems.filter(item => 
                      searchQuery === '' || 
                      item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      (item.supporting_evidence && item.supporting_evidence.toLowerCase().includes(searchQuery.toLowerCase()))
                     ).map((item) => {
                        const isExpanded = expandedItems.has(item.id);
                        return (
                          <div key={item.id} className={`border rounded-lg transition-colors ${
                            customChecklistItems.some(custom => custom.id === item.id) ? 'bg-green-50 border-green-200' : 'hover:bg-muted/20'
                          }`}>
                            <div 
                              className="flex items-start space-x-4 p-3 cursor-pointer"
                              onClick={() => toggleItemExpansion(item.id)}
                            >
                              <Checkbox
                                checked={formData.selected_items.includes(item.id)}
                                onCheckedChange={() => handleItemToggle(item.id)}
                                className="mt-1"
                                onClick={(e) => e.stopPropagation()}
                              />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center space-x-2">
                                    <h4 className="font-medium text-sm">{item.id}</h4>
                                    {customChecklistItems.some(custom => custom.id === item.id) && (
                                      <Badge variant="default" className="text-xs bg-green-100 text-green-700 border-green-200">
                                        New
                                      </Badge>
                                    )}
                                  </div>
                                  <Badge variant="outline" className="text-xs">
                                    {item.category}
                                  </Badge>
                                </div>
                                <p className="text-sm text-foreground mt-1 line-clamp-2">{item.description}</p>
                              </div>
                            </div>
                            
                            {isExpanded && (
                              <div className="px-3 pb-3 border-t bg-muted/10">
                                <div className="pt-3 space-y-2">
                                  <div>
                                    <span className="text-xs font-medium text-muted-foreground">Supporting Evidence:</span>
                                    <p className="text-xs text-foreground mt-1">{item.supporting_evidence || 'Not provided'}</p>
                                  </div>
                                  <div>
                                    <span className="text-xs font-medium text-muted-foreground">Approving Authority:</span>
                                    <p className="text-xs text-foreground mt-1">{item.approving_authority || 'Not specified'}</p>
                                  </div>
                                  {item.responsible_party && (
                                    <div>
                                      <span className="text-xs font-medium text-muted-foreground">Responsible Party:</span>
                                      <p className="text-xs text-foreground mt-1">{item.responsible_party}</p>
                                    </div>
                                  )}
                                  {item.topic && (
                                    <div>
                                      <span className="text-xs font-medium text-muted-foreground">Topic:</span>
                                      <p className="text-xs text-foreground mt-1">{item.topic}</p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Category Tabs */}
          {categories.map((category) => {
            const IconComponent = category.icon;
            const stats = getCategoryStats(category.items);
            const items = filteredItems(category.items);
            
            return (
              <TabsContent key={category.id} value={category.id} className="space-y-4">
                <Card className="border border-border/20 bg-card/90 backdrop-blur-sm">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className={`p-2 rounded-lg ${category.color}`}>
                          <IconComponent className="h-5 w-5" />
                        </div>
                        <div>
                          <CardTitle>{category.name}</CardTitle>
                          <CardDescription>
                            {stats.selected} of {stats.total} items selected ({stats.percentage}%)
                          </CardDescription>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            const categoryItemIds = category.items.map(item => item.id);
                            setFormData(prev => ({
                              ...prev,
                              selected_items: [...new Set([...prev.selected_items, ...categoryItemIds])]
                            }));
                          }}
                        >
                          Select All
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            const categoryItemIds = category.items.map(item => item.id);
                            setFormData(prev => ({
                              ...prev,
                              selected_items: prev.selected_items.filter(id => !categoryItemIds.includes(id))
                            }));
                          }}
                        >
                          Deselect All
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-96">
                      <div className="space-y-4">
                         {items.map((item) => {
                            const isExpanded = expandedItems.has(item.id);
                            return (
                              <div key={item.id} className={`border rounded-lg transition-colors ${
                                customChecklistItems.some(custom => custom.id === item.id) ? 'bg-green-50 border-green-200' : 'hover:bg-muted/20'
                              }`}>
                                <div 
                                  className="flex items-start space-x-4 p-3 cursor-pointer"
                                  onClick={() => toggleItemExpansion(item.id)}
                                >
                                  <Checkbox
                                    checked={formData.selected_items.includes(item.id)}
                                    onCheckedChange={() => handleItemToggle(item.id)}
                                    className="mt-1"
                                    onClick={(e) => e.stopPropagation()}
                                  />
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center space-x-2 mb-1">
                                      <h4 className="font-medium text-sm">{item.id}</h4>
                                      {customChecklistItems.some(custom => custom.id === item.id) && (
                                        <Badge variant="default" className="text-xs bg-green-100 text-green-700 border-green-200">
                                          New
                                        </Badge>
                                      )}
                                    </div>
                                    <p className="text-sm text-foreground line-clamp-2">{item.description}</p>
                                  </div>
                                </div>
                                
                                {isExpanded && (
                                  <div className="px-3 pb-3 border-t bg-muted/10">
                                    <div className="pt-3 space-y-2">
                                      <div>
                                        <span className="text-xs font-medium text-muted-foreground">Supporting Evidence:</span>
                                        <p className="text-xs text-foreground mt-1">{item.supporting_evidence || 'Not provided'}</p>
                                      </div>
                                      <div>
                                        <span className="text-xs font-medium text-muted-foreground">Approving Authority:</span>
                                        <p className="text-xs text-foreground mt-1">{item.approving_authority || 'Not specified'}</p>
                                      </div>
                                      {item.responsible_party && (
                                        <div>
                                          <span className="text-xs font-medium text-muted-foreground">Responsible Party:</span>
                                          <p className="text-xs text-foreground mt-1">{item.responsible_party}</p>
                                        </div>
                                      )}
                                      {item.topic && (
                                        <div>
                                          <span className="text-xs font-medium text-muted-foreground">Topic:</span>
                                          <p className="text-xs text-foreground mt-1">{item.topic}</p>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        {items.length === 0 && (
                          <div className="text-center py-8 text-muted-foreground">
                            No items found matching your search criteria.
                          </div>
                        )}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </TabsContent>
            );
          })}

          {/* Not Selected Tab */}
          <TabsContent value="not-selected" className="space-y-4">
            <Card className="border border-border/20 bg-card/90 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <AlertTriangle className="h-5 w-5 text-muted-foreground" />
                  <span>Not Selected Items</span>
                </CardTitle>
                <CardDescription>
                  These items are not included in your checklist ({unselectedItems.length} items)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-96">
                  <div className="space-y-4">
                     {unselectedItems.map((item) => {
                        const isExpanded = expandedItems.has(item.id);
                        return (
                          <div key={item.id} className="border rounded-lg bg-muted/10 opacity-60">
                            <div 
                              className="flex items-start space-x-4 p-3 cursor-pointer"
                              onClick={() => toggleItemExpansion(item.id)}
                            >
                              <Checkbox
                                checked={false}
                                onCheckedChange={() => handleItemToggle(item.id)}
                                className="mt-1"
                                onClick={(e) => e.stopPropagation()}
                              />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between">
                                  <h4 className="font-medium text-sm">{item.id}</h4>
                                  <Badge variant="outline" className="text-xs">
                                    {item.category}
                                  </Badge>
                                </div>
                                <p className="text-sm mt-1 line-clamp-2">{item.description}</p>
                              </div>
                            </div>
                            
                            {isExpanded && (
                              <div className="px-3 pb-3 border-t">
                                <div className="pt-3 space-y-2">
                                  <div>
                                    <span className="text-xs font-medium text-muted-foreground">Supporting Evidence:</span>
                                    <p className="text-xs text-foreground mt-1">{item.supporting_evidence || 'Not provided'}</p>
                                  </div>
                                  {item.approving_authority && (
                                    <div>
                                      <span className="text-xs font-medium text-muted-foreground">Approving Authority:</span>
                                      <p className="text-xs text-foreground mt-1">{item.approving_authority}</p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    {unselectedItems.length === 0 && (
                      <div className="text-center py-8">
                        <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-green-600 mb-2">All Items Selected!</h3>
                        <p className="text-muted-foreground">
                          You have selected all available checklist items.
                        </p>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Selected Items Summary - Modern Floating Panel */}
        {formData.selected_items.length > 0 && (
          <div className="fixed bottom-8 right-8 z-50 animate-scale-in">
            <Card className="border-0 shadow-2xl bg-white/95 backdrop-blur-xl rounded-2xl w-80 overflow-hidden">
              <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-4">
                <h4 className="font-semibold text-white flex items-center space-x-2">
                  <CheckCircle className="w-5 h-5" />
                  <span>Selected Items</span>
                  <Badge className="bg-white/20 text-white border-white/30">
                    {formData.selected_items.length}
                  </Badge>
                </h4>
              </div>
              <CardContent className="p-4 max-h-60 overflow-y-auto">
                <div className="space-y-2">
                  {formData.selected_items.slice(0, 5).map((itemId) => {
                    const item = allChecklistItems.find(i => i.id === itemId);
                    if (!item) return null;
                    return (
                      <div key={item.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg hover:bg-blue-50 transition-colors group">
                        <div className="flex items-center space-x-2">
                          <div className="w-6 h-6 bg-blue-100 rounded-lg flex items-center justify-center">
                            <span className="text-xs font-bold text-blue-600">{item.id}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-gray-700 truncate">{item.description}</p>
                            <Badge variant="outline" className="text-xs mt-1">
                              {item.category}
                            </Badge>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleItemToggle(item.id)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0 hover:bg-red-100"
                        >
                          <X className="w-3 h-3 text-red-500" />
                        </Button>
                      </div>
                    );
                  })}
                  {formData.selected_items.length > 5 && (
                    <div className="text-center py-2 text-xs text-gray-500">
                      ... and {formData.selected_items.length - 5} more items
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default CreateChecklistForm;
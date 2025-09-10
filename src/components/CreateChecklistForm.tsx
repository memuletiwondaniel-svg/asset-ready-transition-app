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
import { ArrowLeft, ArrowRight, CheckCircle, AlertTriangle, FileText, Users, Shield, Heart, ClipboardCheck, Search, Filter, Plus } from 'lucide-react';
import { pssrChecklistData, ChecklistItem } from '@/data/pssrChecklistData';
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
  const [newCreatedItem, setNewCreatedItem] = useState<ChecklistItem | null>(null);
  const [customChecklistItems, setCustomChecklistItems] = useState<ChecklistItem[]>([]);
  
  const [formData, setFormData] = useState<NewChecklistData>({
    name: '',
    reason: '',
    selected_items: [],
  });
  const [customReason, setCustomReason] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Combine original and custom items
  const allChecklistItems = [...pssrChecklistData, ...customChecklistItems];

  // Checklist reasons
  const checklistReasons = [
    'Start-up or Commissioning of a new Asset',
    'Restart following modification to existing Hardware, Safeguarding or Operating Philosophy',
    'Restart following a process safety incident',
    'Restart following a Turn Around (TAR) Event or Major Maintenance Activity',
    'Others'
  ];

  // Categories with icons and colors - use dynamic data
  const categories = [
    { 
      id: 'Plant Integrity', 
      name: 'Plant Integrity', 
      icon: Shield, 
      color: 'text-blue-600 bg-blue-100 border-blue-200',
      items: allChecklistItems.filter(item => item.category === 'Technical Integrity')
    },
    { 
      id: 'Process Safety', 
      name: 'Process Safety', 
      icon: AlertTriangle, 
      color: 'text-orange-600 bg-orange-100 border-orange-200',
      items: allChecklistItems.filter(item => item.category === 'Health & Safety')
    },
    { 
      id: 'People', 
      name: 'People', 
      icon: Users, 
      color: 'text-green-600 bg-green-100 border-green-200',
      items: allChecklistItems.filter(item => item.category === 'Start-Up Readiness')
    },
    { 
      id: 'Documentation', 
      name: 'Documentation', 
      icon: FileText, 
      color: 'text-purple-600 bg-purple-100 border-purple-200',
      items: allChecklistItems.filter(item => item.category === 'General')
    },
    { 
      id: 'Health & Safety', 
      name: 'Health & Safety', 
      icon: Heart, 
      color: 'text-red-600 bg-red-100 border-red-200',
      items: allChecklistItems.filter(item => item.category === 'Health & Safety')
    },
    { 
      id: 'PSSR Walkdown', 
      name: 'PSSR Walkdown', 
      icon: ClipboardCheck, 
      color: 'text-teal-600 bg-teal-100 border-teal-200',
      items: allChecklistItems.filter(item => item.category === 'Technical Integrity')
    }
  ];

  // Get unselected items
  const unselectedItems = allChecklistItems.filter(item => !formData.selected_items.includes(item.id));

  const handleCreateNewItem = (newItemData: Omit<ChecklistItem, 'id'>) => {
    // Generate a new ID
    const newId = `CUST-${String(customChecklistItems.length + 1).padStart(3, '0')}`;
    
    const newItem: ChecklistItem = {
      id: newId,
      ...newItemData
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

  const filteredItems = (categoryItems: ChecklistItem[]) => {
    return categoryItems.filter(item => {
      const matchesSearch = searchQuery === '' || 
        item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.supportingEvidence.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesSearch;
    });
  };

  const getCategoryStats = (categoryItems: ChecklistItem[]) => {
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
        existingCategories={[...new Set(allChecklistItems.map(item => item.category))]}
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

        {/* Progress Bar */}
        <div className="max-w-4xl mx-auto px-8 mb-8">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="font-medium">Progress</span>
              <span className="text-muted-foreground">{getStepProgress()}%</span>
            </div>
            <Progress value={getStepProgress()} className="h-2" />
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
              <Button 
                variant="outline"
                onClick={() => setShowCreateItem(true)}
                className="fluent-button hover:bg-secondary/80 hover:border-primary/20"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create New Item
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
      </div>

      {/* Progress Bar */}
      <div className="max-w-7xl mx-auto px-8 mb-8">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="font-medium">Progress</span>
            <span className="text-muted-foreground">{getStepProgress()}%</span>
          </div>
          <Progress value={getStepProgress()} className="h-2" />
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

      {/* Back and Create Item Buttons */}
      <div className="max-w-7xl mx-auto px-8 mb-6">
        <div className="flex justify-between">
          <Button 
            variant="outline" 
            onClick={() => setCurrentStep(1)}
            className="fluent-button hover:bg-secondary/80 hover:border-primary/20"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Step 1
          </Button>
          <Button 
            variant="outline"
            onClick={() => setShowCreateItem(true)}
            className="fluent-button bg-green-50 hover:bg-green-100 border-green-200 text-green-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create New Checklist Item
          </Button>
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
                      item.supportingEvidence.toLowerCase().includes(searchQuery.toLowerCase())
                    ).map((item) => (
                      <div key={item.id} className={`flex items-start space-x-4 p-4 border rounded-lg hover:bg-muted/20 transition-colors ${
                        customChecklistItems.some(custom => custom.id === item.id) ? 'bg-green-50 border-green-200' : ''
                      }`}>
                        <Checkbox
                          checked={formData.selected_items.includes(item.id)}
                          onCheckedChange={() => handleItemToggle(item.id)}
                          className="mt-1"
                        />
                        <div className="flex-1 space-y-2">
                          <div className="flex items-start justify-between">
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
                          <p className="text-sm text-foreground">{item.description}</p>
                          <p className="text-xs text-muted-foreground">{item.supportingEvidence}</p>
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>Authority: {item.approvingAuthority}</span>
                          </div>
                        </div>
                      </div>
                    ))}
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
                        {items.map((item) => (
                          <div key={item.id} className={`flex items-start space-x-4 p-4 border rounded-lg hover:bg-muted/20 transition-colors ${
                            customChecklistItems.some(custom => custom.id === item.id) ? 'bg-green-50 border-green-200' : ''
                          }`}>
                            <Checkbox
                              checked={formData.selected_items.includes(item.id)}
                              onCheckedChange={() => handleItemToggle(item.id)}
                              className="mt-1"
                            />
                            <div className="flex-1 space-y-2">
                              <div className="flex items-center space-x-2">
                                <h4 className="font-medium text-sm">{item.id}</h4>
                                {customChecklistItems.some(custom => custom.id === item.id) && (
                                  <Badge variant="default" className="text-xs bg-green-100 text-green-700 border-green-200">
                                    New
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm text-foreground">{item.description}</p>
                              <p className="text-xs text-muted-foreground font-medium">
                                Evidence: {item.supportingEvidence}
                              </p>
                              <div className="text-xs text-muted-foreground">
                                Approving Authority: {item.approvingAuthority}
                              </div>
                            </div>
                          </div>
                        ))}
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
                    {unselectedItems.map((item) => (
                      <div key={item.id} className="flex items-start space-x-4 p-4 border rounded-lg bg-muted/10 opacity-60">
                        <Checkbox
                          checked={false}
                          onCheckedChange={() => handleItemToggle(item.id)}
                          className="mt-1"
                        />
                        <div className="flex-1 space-y-2">
                          <div className="flex items-start justify-between">
                            <h4 className="font-medium text-sm">{item.id}</h4>
                            <Badge variant="outline" className="text-xs">
                              {item.category}
                            </Badge>
                          </div>
                          <p className="text-sm">{item.description}</p>
                          <p className="text-xs text-muted-foreground">{item.supportingEvidence}</p>
                        </div>
                      </div>
                    ))}
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
      </div>
    </div>
  );
};

export default CreateChecklistForm;
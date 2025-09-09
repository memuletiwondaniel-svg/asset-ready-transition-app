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
import { ArrowLeft, Save, Plus, Search, AlertTriangle, CheckCircle } from 'lucide-react';
import { pssrChecklistData, ChecklistItem, checklistCategories } from '@/data/pssrChecklistData';
import CreateChecklistItemForm from './CreateChecklistItemForm';
import ChecklistItemSuccessPage from './ChecklistItemSuccessPage';

interface ChecklistData {
  id: string;
  name: string;
  reason: string;
  itemsCount: number;
  createdDate: string;
  createdBy: string;
  activePSSRCount: number;
  category: string;
  status: 'Active' | 'Draft' | 'Archived';
}

interface EditChecklistFormProps {
  checklist: ChecklistData;
  onBack: () => void;
  onSave: (updatedChecklist: ChecklistData, selectedItems: string[]) => void;
  initialSelectedItems?: string[];
}

const EditChecklistForm: React.FC<EditChecklistFormProps> = ({ 
  checklist, 
  onBack, 
  onSave,
  initialSelectedItems = []
}) => {
  const [formData, setFormData] = useState({
    name: checklist.name,
    reason: checklist.reason,
    selectedItems: initialSelectedItems
  });
  
  const [customReason, setCustomReason] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showCreateItem, setShowCreateItem] = useState(false);
  const [showItemSuccess, setShowItemSuccess] = useState(false);
  const [newCreatedItem, setNewCreatedItem] = useState<ChecklistItem | null>(null);
  const [customChecklistItems, setCustomChecklistItems] = useState<ChecklistItem[]>([]);

  // Checklist reasons
  const checklistReasons = [
    'Start-up or Commissioning of a new Asset',
    'Restart following modification to existing Hardware, Safeguarding or Operating Philosophy',
    'Restart following a process safety incident',
    'Restart following a Turn Around (TAR) Event or Major Maintenance Activity',
    'Others'
  ];

  // Combine original and custom items
  const allChecklistItems = [...pssrChecklistData, ...customChecklistItems];

  const handleItemToggle = (itemId: string) => {
    setFormData(prev => ({
      ...prev,
      selectedItems: prev.selectedItems.includes(itemId)
        ? prev.selectedItems.filter(id => id !== itemId)
        : [...prev.selectedItems, itemId]
    }));
  };

  const handleSave = () => {
    const updatedChecklist: ChecklistData = {
      ...checklist,
      name: formData.name,
      reason: formData.reason === 'Others' ? customReason : formData.reason,
      itemsCount: formData.selectedItems.length
    };
    onSave(updatedChecklist, formData.selectedItems);
  };

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
      selectedItems: [...prev.selectedItems, newId]
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

  const filteredItems = allChecklistItems.filter(item => {
    const matchesSearch = searchQuery === '' || 
      item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.supportingEvidence.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const getCategoryStats = (category: string) => {
    const categoryItems = category === 'all' 
      ? allChecklistItems 
      : allChecklistItems.filter(item => item.category === category);
    const selectedCount = categoryItems.filter(item => formData.selectedItems.includes(item.id)).length;
    return { total: categoryItems.length, selected: selectedCount };
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
                  Edit Checklist
                </h1>
                <p className="text-sm text-muted-foreground font-medium">Modify checklist details and items</p>
              </div>
            </div>
            <div className="flex space-x-3">
              <Button 
                variant="outline" 
                onClick={onBack}
                className="fluent-button hover:bg-secondary/80 hover:border-primary/20"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button 
                onClick={handleSave}
                disabled={!formData.name || !formData.reason || (formData.reason === 'Others' && !customReason)}
                className="fluent-button bg-primary hover:bg-primary-hover"
              >
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-8 py-8 space-y-8">
        {/* Basic Information */}
        <Card className="border border-border/20 bg-card/90 backdrop-blur-sm">
          <CardHeader>
            <CardTitle>Checklist Information</CardTitle>
            <CardDescription>
              Update the basic details of your checklist
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
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="h-12"
              />
            </div>

            {/* Reason for Checklist */}
            <div className="space-y-2">
              <Label className="text-base font-semibold">
                Reason for Checklist <span className="text-destructive">*</span>
              </Label>
              <Select value={formData.reason} onValueChange={(value) => setFormData(prev => ({ ...prev, reason: value }))}>
                <SelectTrigger className="h-12">
                  <SelectValue />
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
          </CardContent>
        </Card>

        {/* Search and Summary */}
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
                {formData.selectedItems.length} items selected
              </Badge>
              <Badge variant="outline" className="px-3 py-1">
                {allChecklistItems.length} total items
              </Badge>
              <Button 
                variant="outline"
                onClick={() => setShowCreateItem(true)}
                className="fluent-button bg-green-50 hover:bg-green-100 border-green-200 text-green-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create New Item
              </Button>
            </div>
          </div>
        </div>

        {/* Checklist Items Selection */}
        <Card className="border border-border/20 bg-card/90 backdrop-blur-sm">
          <CardHeader>
            <CardTitle>Select Checklist Items</CardTitle>
            <CardDescription>
              Choose which items to include in this checklist
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={selectedCategory} onValueChange={setSelectedCategory} className="space-y-6">
              <TabsList className="grid grid-cols-4 lg:grid-cols-6 h-auto p-1">
                <TabsTrigger value="all" className="text-xs p-3">
                  All ({getCategoryStats('all').selected}/{getCategoryStats('all').total})
                </TabsTrigger>
                {checklistCategories.map((category) => {
                  const stats = getCategoryStats(category);
                  return (
                    <TabsTrigger key={category} value={category} className="text-xs p-3">
                      {category} ({stats.selected}/{stats.total})
                    </TabsTrigger>
                  );
                })}
              </TabsList>

              {/* All Items Tab */}
              <TabsContent value="all">
                <ScrollArea className="h-96">
                  <div className="space-y-4">
                    {filteredItems.map((item) => (
                      <div key={item.id} className={`flex items-start space-x-4 p-4 border rounded-lg hover:bg-muted/20 transition-colors ${
                        customChecklistItems.some(custom => custom.id === item.id) ? 'bg-green-50 border-green-200' : ''
                      }`}>
                        <Checkbox
                          checked={formData.selectedItems.includes(item.id)}
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
              </TabsContent>

              {/* Category Tabs */}
              {checklistCategories.map((category) => (
                <TabsContent key={category} value={category}>
                  <ScrollArea className="h-96">
                    <div className="space-y-4">
                      {filteredItems.filter(item => item.category === category).map((item) => (
                        <div key={item.id} className={`flex items-start space-x-4 p-4 border rounded-lg hover:bg-muted/20 transition-colors ${
                          customChecklistItems.some(custom => custom.id === item.id) ? 'bg-green-50 border-green-200' : ''
                        }`}>
                          <Checkbox
                            checked={formData.selectedItems.includes(item.id)}
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
                    </div>
                  </ScrollArea>
                </TabsContent>
              ))}
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default EditChecklistForm;
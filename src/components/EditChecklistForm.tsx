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
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Save, Plus, Search, Edit3, ClipboardList, Home } from 'lucide-react';
import { useChecklistItems, ChecklistItem } from '@/hooks/useChecklistItems';
import { useCustomReasons, useUpdateChecklist, Checklist } from '@/hooks/useChecklists';
import { usePSSRReasons, usePSSRTieInScopes, usePSSRMOCScopes } from '@/hooks/usePSSRReasons';
import { useToast } from '@/hooks/use-toast';
import CreateChecklistItemForm from './CreateChecklistItemForm';
import ChecklistItemSuccessPage from './ChecklistItemSuccessPage';
import AdminHeader from './admin/AdminHeader';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import { useLanguage } from '@/contexts/LanguageContext';

interface EditChecklistFormProps {
  checklist: Checklist;
  onBack: () => void;
  onSave: () => void;
}

const EditChecklistForm: React.FC<EditChecklistFormProps> = ({ 
  checklist, 
  onBack, 
  onSave
}) => {
  const { language, setLanguage, translations } = useLanguage();
  const [formData, setFormData] = useState({
    reason: checklist.reason,
    selected_items: checklist.selected_items || [],
    custom_reason: checklist.custom_reason || '',
    plant_change_type: (checklist as any).plant_change_type || '',
    selected_tie_in_scopes: (checklist as any).selected_tie_in_scopes || [],
    moc_number: (checklist as any).moc_number || '',
    selected_moc_scopes: (checklist as any).selected_moc_scopes || []
  });
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showCreateItem, setShowCreateItem] = useState(false);
  const [showItemSuccess, setShowItemSuccess] = useState(false);
  const [newCreatedItem, setNewCreatedItem] = useState<ChecklistItem | null>(null);
  const [customChecklistItems, setCustomChecklistItems] = useState<ChecklistItem[]>([]);

  const { toast } = useToast();
  const { data: checklistItems = [], isLoading } = useChecklistItems();
  const { data: customReasons = [] } = useCustomReasons();
  const { data: pssrReasons = [] } = usePSSRReasons();
  const { data: tieInScopes = [] } = usePSSRTieInScopes();
  const { data: mocScopes = [] } = usePSSRMOCScopes();
  const { mutate: updateChecklist, isPending } = useUpdateChecklist();

  // All available reasons (PSSR reasons from database + custom reasons + Others)
  const allReasons = React.useMemo(() => {
    return [
      ...pssrReasons.map(r => r.name),
      ...customReasons,
      "Others"
    ];
  }, [pssrReasons, customReasons]);

  const allChecklistItems = [...checklistItems, ...customChecklistItems];

  const handleItemToggle = (itemId: string) => {
    setFormData(prev => ({
      ...prev,
      selected_items: prev.selected_items.includes(itemId)
        ? prev.selected_items.filter(id => id !== itemId)
        : [...prev.selected_items, itemId]
    }));
  };

  const handleSave = () => {
    updateChecklist({
      checklistId: checklist.id,
      checklistData: {
        name: formData.reason, // Set name as reason
        reason: formData.reason,
        selected_items: formData.selected_items,
        custom_reason: formData.reason === 'Others' ? formData.custom_reason : undefined,
        plant_change_type: formData.reason === 'Restart following plant changes or modifications' ? formData.plant_change_type : undefined,
        selected_tie_in_scopes: formData.plant_change_type === 'tie_in' ? formData.selected_tie_in_scopes : undefined,
        moc_number: formData.plant_change_type === 'moc' ? formData.moc_number : undefined,
        selected_moc_scopes: formData.plant_change_type === 'moc' ? formData.selected_moc_scopes : undefined
      }
    }, {
      onSuccess: () => {
        toast({
          title: "Success",
          description: "Checklist updated successfully.",
        });
        onSave();
      },
      onError: (error) => {
        console.error('Failed to update checklist:', error);
        toast({
          title: "Error",
          description: "Failed to update checklist. Please try again.",
          variant: "destructive",
        });
      }
    });
  };

  const handleCreateNewItem = (newItemData: Omit<ChecklistItem, 'id'>) => {
    const newItem: ChecklistItem = {
      ...newItemData,
      id: `custom-${Date.now()}`,
    };
    
    setCustomChecklistItems(prev => [...prev, newItem]);
    setNewCreatedItem(newItem);
    setShowCreateItem(false);
    setShowItemSuccess(true);
    
    // Auto-select the newly created item
    setFormData(prev => ({
      ...prev,
      selected_items: [...prev.selected_items, newItem.id]
    }));
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

  // Filter items based on search and category
  const filteredItems = allChecklistItems.filter(item => {
    const matchesSearch = item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         item.category.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === "all" || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Group filtered items by category
  const groupedItems = filteredItems.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, ChecklistItem[]>);

  const categories = Object.keys(groupedItems).sort();
  const allCategories = [...new Set(allChecklistItems.map(item => item.category))].sort();

  // Calculate stats
  const totalItems = allChecklistItems.length;
  const selectedCount = formData.selected_items.length;
  const notSelectedItems = allChecklistItems.filter(item => !formData.selected_items.includes(item.id));

  const getCategoryStats = (category: string) => {
    const categoryItems = allChecklistItems.filter(item => item.category === category);
    const selectedInCategory = categoryItems.filter(item => formData.selected_items.includes(item.id)).length;
    return { total: categoryItems.length, selected: selectedInCategory };
  };

  if (showCreateItem) {
    return (
      <CreateChecklistItemForm 
        onBack={() => setShowCreateItem(false)}
        onComplete={handleCreateNewItem}
      />
    );
  }

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
    <div className="min-h-screen bg-background">
      {/* Admin Header with breadcrumb */}
      <AdminHeader
        icon={<Edit3 className="h-5 w-5" />}
        title="Edit Checklist"
        description="Update checklist details and manage items"
        customBreadcrumbs={[
          { label: 'Home', path: '/', onClick: onBack },
          { label: 'Administration', path: '/admin-tools', onClick: onBack },
          { label: 'Edit Checklist', path: '/admin-tools', onClick: () => {} }
        ]}
      />

      <div className="pb-8">
        {/* Navigation Bar */}
        <div className="sticky top-[80px] z-40 bg-background/95 backdrop-blur-xl border-b shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between gap-4">
              <Button variant="outline" onClick={onBack} size="lg">
                <ArrowLeft className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Cancel</span>
                <span className="sm:hidden">Back</span>
              </Button>
              
              <div className="text-center hidden md:block">
                <h2 className="text-xl font-bold">Edit Checklist</h2>
                <p className="text-sm text-muted-foreground">
                  {formData.selected_items.length} items selected
                </p>
              </div>
              
              <Button 
                onClick={handleSave}
                disabled={!formData.reason || (formData.reason === 'Others' && !formData.custom_reason) || isPending}
                size="lg"
              >
                <Save className="h-4 w-4 mr-2" />
                {isPending ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </div>
        </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        {/* Basic Information */}
        <Card className="border-border/50 shadow-xl mb-6">
          <CardHeader>
            <CardTitle>Checklist Information</CardTitle>
            <CardDescription>
              Update the basic information for this checklist
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">

            <div className="space-y-2">
              <Label htmlFor="reason">Reason for Checklist *</Label>
              <Select
                value={formData.reason}
                onValueChange={(value) => setFormData(prev => ({ ...prev, reason: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select reason" />
                </SelectTrigger>
                <SelectContent>
                  {allReasons.map((reason) => (
                    <SelectItem key={reason} value={reason}>
                      {reason}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {formData.reason === "Others" && (
              <div className="space-y-2">
                <Label htmlFor="customReason">Custom Reason *</Label>
                <Textarea
                  id="customReason"
                  value={formData.custom_reason}
                  onChange={(e) => setFormData(prev => ({ ...prev, custom_reason: e.target.value }))}
                  placeholder="Enter custom reason"
                  rows={3}
                />
              </div>
            )}

            {formData.reason === 'Restart following plant changes or modifications' && (
              <div className="space-y-2">
                <Label htmlFor="plantChangeType">Plant Change Type *</Label>
                <Select
                  value={formData.plant_change_type}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, plant_change_type: value }))}
                >
                  <SelectTrigger id="plantChangeType">
                    <SelectValue placeholder="Select plant change type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tie_in">Project Advanced Tie-in scope</SelectItem>
                    <SelectItem value="moc">Implementation of an approved Asset MOC</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {formData.reason === 'Restart following plant changes or modifications' && formData.plant_change_type === 'tie_in' && (
              <div className="space-y-3">
                <Label className="text-sm font-medium">
                  Select Advanced Tie-in Scope(s) *
                </Label>
                <div className="space-y-3 border border-border/30 rounded-lg p-4 bg-muted/20">
                  {tieInScopes.map((scope) => (
                    <div key={scope.id} className="flex items-start space-x-3 p-3 rounded-md hover:bg-muted/40 transition-colors">
                      <Checkbox
                        id={`scope-${scope.code}`}
                        checked={formData.selected_tie_in_scopes.includes(scope.code)}
                        onCheckedChange={(checked) => {
                          setFormData(prev => ({
                            ...prev,
                            selected_tie_in_scopes: checked
                              ? [...prev.selected_tie_in_scopes, scope.code]
                              : prev.selected_tie_in_scopes.filter(c => c !== scope.code)
                          }));
                        }}
                        className="mt-1"
                      />
                      <div className="flex-1 space-y-1">
                        <Label
                          htmlFor={`scope-${scope.code}`}
                          className="text-sm font-semibold cursor-pointer"
                        >
                          {scope.code}
                        </Label>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          {scope.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {formData.reason === 'Restart following plant changes or modifications' && formData.plant_change_type === 'moc' && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="mocNumber">MOC Number *</Label>
                  <Input
                    id="mocNumber"
                    placeholder="Enter MOC number"
                    value={formData.moc_number}
                    onChange={(e) => setFormData(prev => ({ ...prev, moc_number: e.target.value }))}
                    maxLength={50}
                  />
                </div>
                
                <div className="space-y-3">
                  <Label className="text-sm font-medium">
                    Select MOC Scope(s) *
                  </Label>
                  <div className="space-y-3 border border-border/30 rounded-lg p-4 bg-muted/20">
                    {mocScopes.map((scope) => (
                      <div key={scope.id} className="flex items-start space-x-3 p-3 rounded-md hover:bg-muted/40 transition-colors">
                        <Checkbox
                          id={`moc-scope-${scope.id}`}
                          checked={formData.selected_moc_scopes.includes(scope.name)}
                          onCheckedChange={(checked) => {
                            setFormData(prev => ({
                              ...prev,
                              selected_moc_scopes: checked
                                ? [...prev.selected_moc_scopes, scope.name]
                                : prev.selected_moc_scopes.filter(n => n !== scope.name)
                            }));
                          }}
                          className="mt-1"
                        />
                        <div className="flex-1">
                          <Label
                            htmlFor={`moc-scope-${scope.id}`}
                            className="text-sm font-medium cursor-pointer"
                          >
                            {scope.name}
                          </Label>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Select Checklist Items */}
        <Card className="border border-border/20 bg-card/90 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Select Checklist Items</span>
              <div className="flex items-center space-x-2">
                <Badge variant="secondary">{selectedCount} selected</Badge>
                <Badge variant="outline">{totalItems} total items</Badge>
              </div>
            </CardTitle>
            <CardDescription>
              Choose which items to include in this checklist
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">Loading checklist items...</div>
            ) : (
              <div className="space-y-6">
                {/* Controls */}
                <div className="flex items-center justify-between">
                  <Button
                    variant="outline"
                    onClick={() => setShowCreateItem(true)}
                    className="flex items-center space-x-2"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Create New Item</span>
                  </Button>
                </div>

                {/* Search and Filter */}
                <div className="flex items-center space-x-4">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                    <Input
                      placeholder="Search checklist items..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Filter by category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      {allCategories.map((category) => {
                        const stats = getCategoryStats(category);
                        return (
                          <SelectItem key={category} value={category}>
                            {category} ({stats.selected}/{stats.total})
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>

                {/* Summary */}
                <div className="grid grid-cols-3 gap-4">
                  <Card className="p-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">{selectedCount}</div>
                      <div className="text-sm text-muted-foreground">Selected</div>
                    </div>
                  </Card>
                  <Card className="p-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">{totalItems - selectedCount}</div>
                      <div className="text-sm text-muted-foreground">Available</div>
                    </div>
                  </Card>
                  <Card className="p-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-gray-600">{totalItems}</div>
                      <div className="text-sm text-muted-foreground">Total Items</div>
                    </div>
                  </Card>
                </div>

                {/* Items by Category */}
                <Tabs value={selectedCategory === "all" ? categories[0] || "selected" : selectedCategory} 
                      onValueChange={setSelectedCategory} className="w-full">
                  <TabsList className="grid w-full grid-cols-6">
                    <TabsTrigger value="selected">
                      Selected ({selectedCount})
                    </TabsTrigger>
                    {allCategories.slice(0, 4).map((category) => {
                      const stats = getCategoryStats(category);
                      return (
                        <TabsTrigger key={category} value={category} className="text-xs">
                          {category} ({stats.selected}/{stats.total})
                        </TabsTrigger>
                      );
                    })}
                    <TabsTrigger value="not-selected">
                      Not Selected ({totalItems - selectedCount})
                    </TabsTrigger>
                  </TabsList>

                  {/* Selected Items Tab */}
                  <TabsContent value="selected" className="mt-4">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold">Selected Items</h3>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setFormData(prev => ({ ...prev, selected_items: [] }))}
                          disabled={selectedCount === 0}
                        >
                          Clear All
                        </Button>
                      </div>
                      <ScrollArea className="h-96">
                        <div className="space-y-3">
                          {allChecklistItems
                            .filter(item => formData.selected_items.includes(item.id))
                            .map((item) => (
                              <Card key={item.id} className="p-4 border-green-200 bg-green-50 dark:bg-green-900/20">
                                <div className="flex items-start space-x-3">
                                  <Checkbox
                                    checked={true}
                                    onCheckedChange={() => handleItemToggle(item.id)}
                                  />
                                  <div className="flex-1 space-y-2">
                                    <div className="flex items-center justify-between">
                                      <h4 className="font-medium">{item.description}</h4>
                                      <div className="flex items-center space-x-2">
                                        <Badge variant="outline">{item.category}</Badge>
                                        {item.id.startsWith('custom-') && (
                                          <Badge variant="secondary">New</Badge>
                                        )}
                                      </div>
                                    </div>
                                    {item.supporting_evidence && (
                                      <p className="text-sm text-muted-foreground">
                                        <strong>Evidence:</strong> {item.supporting_evidence}
                                      </p>
                                    )}
                                    <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                                      {item.responsible_party && (
                                        <span><strong>Responsible:</strong> {item.responsible_party}</span>
                                      )}
                                      {item.approving_authority && (
                                        <span><strong>Approver:</strong> {item.approving_authority}</span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </Card>
                            ))}
                          {selectedCount === 0 && (
                            <div className="text-center py-8 text-muted-foreground">
                              No items selected yet. Browse categories to select items.
                            </div>
                          )}
                        </div>
                      </ScrollArea>
                    </div>
                  </TabsContent>

                  {/* Category Tabs */}
                  {categories.map((category) => (
                    <TabsContent key={category} value={category} className="mt-4">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h3 className="text-lg font-semibold">{category}</h3>
                          <div className="flex items-center space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const categoryItems = groupedItems[category] || [];
                                const allSelected = categoryItems.every(item => formData.selected_items.includes(item.id));
                                
                                if (allSelected) {
                                  // Deselect all in category
                                  setFormData(prev => ({
                                    ...prev,
                                    selected_items: prev.selected_items.filter(id => 
                                      !categoryItems.some(item => item.id === id)
                                    )
                                  }));
                                } else {
                                  // Select all in category
                                  const newSelections = categoryItems
                                    .filter(item => !formData.selected_items.includes(item.id))
                                    .map(item => item.id);
                                  setFormData(prev => ({
                                    ...prev,
                                    selected_items: [...prev.selected_items, ...newSelections]
                                  }));
                                }
                              }}
                            >
                              {groupedItems[category]?.every(item => formData.selected_items.includes(item.id)) 
                                ? 'Deselect All' 
                                : 'Select All'
                              }
                            </Button>
                          </div>
                        </div>

                        <ScrollArea className="h-96">
                          <div className="space-y-3">
                            {(groupedItems[category] || []).map((item) => {
                              const isSelected = formData.selected_items.includes(item.id);
                              return (
                                <Card key={item.id} className={`p-4 ${isSelected ? 'border-green-200 bg-green-50 dark:bg-green-900/20' : ''}`}>
                                  <div className="flex items-start space-x-3">
                                    <Checkbox
                                      checked={isSelected}
                                      onCheckedChange={() => handleItemToggle(item.id)}
                                    />
                                    <div className="flex-1 space-y-2">
                                      <div className="flex items-center justify-between">
                                        <h4 className="font-medium">{item.description}</h4>
                                        {item.id.startsWith('custom-') && (
                                          <Badge variant="secondary">New</Badge>
                                        )}
                                      </div>
                                      {item.supporting_evidence && (
                                        <p className="text-sm text-muted-foreground">
                                          <strong>Evidence:</strong> {item.supporting_evidence}
                                        </p>
                                      )}
                                      <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                                        {item.responsible_party && (
                                          <span><strong>Responsible:</strong> {item.responsible_party}</span>
                                        )}
                                        {item.approving_authority && (
                                          <span><strong>Approver:</strong> {item.approving_authority}</span>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </Card>
                              );
                            })}
                          </div>
                        </ScrollArea>
                      </div>
                    </TabsContent>
                  ))}

                  {/* Not Selected Tab */}
                  <TabsContent value="not-selected" className="mt-4">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold">Not Selected</h3>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setFormData(prev => ({ 
                            ...prev, 
                            selected_items: allChecklistItems.map(item => item.id)
                          }))}
                          disabled={selectedCount === totalItems}
                        >
                          Select All
                        </Button>
                      </div>
                      <ScrollArea className="h-96">
                        <div className="space-y-3">
                          {notSelectedItems.map((item) => (
                            <Card key={item.id} className="p-4 opacity-60">
                              <div className="flex items-start space-x-3">
                                <Checkbox
                                  checked={false}
                                  onCheckedChange={() => handleItemToggle(item.id)}
                                />
                                <div className="flex-1 space-y-2">
                                  <div className="flex items-center justify-between">
                                    <h4 className="font-medium">{item.description}</h4>
                                    <div className="flex items-center space-x-2">
                                      <Badge variant="outline">{item.category}</Badge>
                                      {item.id.startsWith('custom-') && (
                                        <Badge variant="secondary">New</Badge>
                                      )}
                                    </div>
                                  </div>
                                  {item.supporting_evidence && (
                                    <p className="text-sm text-muted-foreground">
                                      <strong>Evidence:</strong> {item.supporting_evidence}
                                    </p>
                                  )}
                                  <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                                    {item.responsible_party && (
                                      <span><strong>Responsible:</strong> {item.responsible_party}</span>
                                    )}
                                    {item.approving_authority && (
                                      <span><strong>Approver:</strong> {item.approving_authority}</span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </Card>
                          ))}
                          {notSelectedItems.length === 0 && (
                            <div className="text-center py-8 text-muted-foreground">
                              All items are selected!
                            </div>
                          )}
                        </div>
                      </ScrollArea>
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            )}
          </CardContent>
        </Card>
        </div>
      </div>
    </div>
  );
};

export default EditChecklistForm;
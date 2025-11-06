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
import { ArrowLeft, ArrowRight, CheckCircle, AlertTriangle, FileText, Users, Shield, Heart, ClipboardCheck, Search, Filter, Plus, X, User } from 'lucide-react';
import { useChecklistItems, ChecklistItem as DBChecklistItem, useChecklistCategories as useChecklistCategoriesFromItems, useUpdateChecklistItem } from '@/hooks/useChecklistItems';
import { usePSSRReasons, usePSSRTieInScopes, usePSSRMOCScopes } from '@/hooks/usePSSRReasons';
import CreateChecklistItemForm from './CreateChecklistItemForm';
import ChecklistItemSuccessPage from './ChecklistItemSuccessPage';
import ChecklistProgressSteps from './ChecklistProgressSteps';
import ViewChecklistItemModal from './ViewChecklistItemModal';
import ChecklistReviewSummaryPage from './ChecklistReviewSummaryPage';
import { useToast } from '@/hooks/use-toast';
import { AnimatedBackground } from '@/components/ui/AnimatedBackground';

interface CreateChecklistFormProps {
  onBack: () => void;
  onComplete: (checklist: NewChecklistData) => void;
}

interface NewChecklistData {
  reason: string;
  selected_items: string[];
  custom_reason?: string;
}

const CreateChecklistForm: React.FC<CreateChecklistFormProps> = ({ onBack, onComplete }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [showCreateItem, setShowCreateItem] = useState(false);
  const [showItemSuccess, setShowItemSuccess] = useState(false);
  const [showReviewSummary, setShowReviewSummary] = useState(false);
  const [newCreatedItem, setNewCreatedItem] = useState<DBChecklistItem | null>(null);
  const [customChecklistItems, setCustomChecklistItems] = useState<DBChecklistItem[]>([]);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
const [selectedDetailItem, setSelectedDetailItem] = useState<DBChecklistItem | null>(null);
  const { mutate: updateChecklistItem } = useUpdateChecklistItem();
  const { toast } = useToast();
  const [showDetailModal, setShowDetailModal] = useState(false);
  
  const { data: checklistItems = [], isLoading } = useChecklistItems();
  const { data: availableCategories = [] } = useChecklistCategoriesFromItems();
  const { data: pssrReasons = [] } = usePSSRReasons();
  const { data: tieInScopes = [] } = usePSSRTieInScopes();
  const { data: mocScopes = [] } = usePSSRMOCScopes();
  
  const [formData, setFormData] = useState<NewChecklistData>({
    reason: '',
    selected_items: [],
  });
  const [customReason, setCustomReason] = useState('');
  const [plantChangeType, setPlantChangeType] = useState('');
  const [selectedTieInScopes, setSelectedTieInScopes] = useState<string[]>([]);
  const [mocNumber, setMocNumber] = useState('');
  const [selectedMocScopes, setSelectedMocScopes] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Combine database items and custom items
  const allChecklistItems = [...checklistItems, ...customChecklistItems];

  // Get checklist reasons from database (with "Others" option added)
  const checklistReasons = React.useMemo(() => {
    return [...pssrReasons.map(r => r.name), 'Others'];
  }, [pssrReasons]);

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
  const unselectedItems = allChecklistItems.filter(item => !formData.selected_items.includes(item.unique_id));

  const handleCreateNewItem = (newItemData: any) => {
    // Generate a new ID
    const newId = `CUST-${String(customChecklistItems.length + 1).padStart(3, '0')}`;
    
    const newItem: DBChecklistItem = {
      unique_id: newId,
      id: newId,
      description: newItemData.description,
      category: newItemData.category,
      topic: newItemData.topic || null,
      supporting_evidence: newItemData.supportingEvidence || null,
      responsible_party: newItemData.responsibleParty || null,
      approving_authority: newItemData.approvingAuthority || null,
      required_evidence: newItemData.supportingEvidence || null,
      responsible: newItemData.responsibleParty || null,
      Approver: newItemData.approvingAuthority || null,
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

  const handleItemClick = (item: DBChecklistItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedDetailItem(item);
    setShowDetailModal(true);
  };

  const handleDetailModalClose = () => {
    setShowDetailModal(false);
    setSelectedDetailItem(null);
  };

const handleItemSave = (updatedItem: DBChecklistItem) => {
    // Update the item in customChecklistItems if it's a custom item
    if (updatedItem.unique_id.startsWith('CUST-')) {
      setCustomChecklistItems(prev =>
        prev.map(item => item.unique_id === updatedItem.unique_id ? updatedItem : item)
      );
      setSelectedDetailItem(updatedItem);
      setShowDetailModal(false);
    } else {
      // Persist changes for database-backed items
      updateChecklistItem(
        {
          itemId: updatedItem.unique_id,
          updateData: {
            description: updatedItem.description,
            category: updatedItem.category,
            topic: updatedItem.topic || undefined,
            supporting_evidence: updatedItem.supporting_evidence || undefined,
            responsible_party: updatedItem.responsible_party || undefined,
            approving_authority: updatedItem.approving_authority || undefined,
          }
        },
        {
          onSuccess: (serverItem) => {
            setSelectedDetailItem(serverItem as DBChecklistItem);
            toast({ title: 'Saved', description: 'Checklist item updated successfully.' });
            setShowDetailModal(false);
          },
          onError: (error) => {
            console.error('Failed to update checklist item:', error);
            toast({ title: 'Update failed', description: error.message, variant: 'destructive' });
          }
        }
      );
    }
  };

  const handleItemDelete = (itemId: string) => {
    // Remove item from custom items if it's a custom item
    if (itemId.startsWith('CUST-')) {
      setCustomChecklistItems(prev => {
        const filteredItems = prev.filter(item => item.id !== itemId);
        // Re-number the remaining custom items
        const renumberedItems = filteredItems.map((item, index) => ({
          ...item,
          id: `CUST-${String(index + 1).padStart(3, '0')}`
        }));
        return renumberedItems;
      });
      
      // Also remove from selected items and update any references to renumbered items
      setFormData(prev => {
        const filteredSelected = prev.selected_items.filter(id => id !== itemId);
        // Update references to renumbered items
        const updatedSelected = filteredSelected.map(id => {
          if (id.startsWith('CUST-')) {
            const oldIndex = parseInt(id.split('-')[1]);
            const deletedIndex = parseInt(itemId.split('-')[1]);
            if (oldIndex > deletedIndex) {
              return `CUST-${String(oldIndex - 1).padStart(3, '0')}`;
            }
          }
          return id;
        });
        
        return {
          ...prev,
          selected_items: updatedSelected
        };
      });
    } else {
      // For standard library items, just remove from the current checklist selection
      setFormData(prev => ({
        ...prev,
        selected_items: prev.selected_items.filter(id => id !== itemId)
      }));
    }
    // Note: For database items, you would typically make an API call here
  };

  const handleNext = () => {
    if (currentStep === 1 && formData.reason) {
      // Check if plant change type is required and selected
      if (formData.reason === 'Restart following plant changes or modifications' && !plantChangeType) {
        toast({
          title: "Plant Change Type Required",
          description: "Please select a plant change type to continue.",
          variant: "destructive",
        });
        return;
      }
      // Check if tie-in scopes are required
      if (formData.reason === 'Restart following plant changes or modifications' && plantChangeType === 'tie_in' && selectedTieInScopes.length === 0) {
        toast({
          title: "Tie-in Scope Required",
          description: "Please select at least one tie-in scope to continue.",
          variant: "destructive",
        });
        return;
      }
      // Check if MOC number and scopes are required
      if (formData.reason === 'Restart following plant changes or modifications' && plantChangeType === 'moc') {
        if (!mocNumber.trim()) {
          toast({
            title: "MOC Number Required",
            description: "Please enter the MOC number to continue.",
            variant: "destructive",
          });
          return;
        }
        if (selectedMocScopes.length === 0) {
          toast({
            title: "MOC Scope Required",
            description: "Please select at least one MOC scope to continue.",
            variant: "destructive",
          });
          return;
        }
      }
      setCurrentStep(2);
    }
  };

  const handleComplete = () => {
    setShowReviewSummary(true);
  };

  const handleConfirmChecklist = (checklistData: any) => {
    const finalData = {
      ...formData,
      name: formData.reason, // Set name as reason
      custom_reason: formData.reason === 'Others' ? customReason : undefined,
      plant_change_type: formData.reason === 'Restart following plant changes or modifications' ? plantChangeType : undefined,
      selected_tie_in_scopes: plantChangeType === 'tie_in' ? selectedTieInScopes : undefined,
      moc_number: plantChangeType === 'moc' ? mocNumber : undefined,
      selected_moc_scopes: plantChangeType === 'moc' ? selectedMocScopes : undefined
    };
    onComplete(finalData);
  };

  const handleBackFromReview = () => {
    setShowReviewSummary(false);
  };

  const handleCancelReview = () => {
    setShowReviewSummary(false);
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
        item.unique_id.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesSearch;
    });
  };

  const getCategoryStats = (categoryItems: DBChecklistItem[]) => {
    const total = categoryItems.length;
    const selected = categoryItems.filter(item => formData.selected_items.includes(item.unique_id)).length;
    return { total, selected, percentage: total > 0 ? Math.round((selected / total) * 100) : 0 };
  };

  // Component to render individual checklist items
  const ChecklistItemCard = ({ item }: { item: DBChecklistItem }) => {
    const isSelected = formData.selected_items.includes(item.unique_id);
    return (
      <div
        key={item.unique_id}
        className={`group relative overflow-hidden rounded-xl border transition-all duration-300 hover:scale-[1.02] cursor-pointer ${
          isSelected 
            ? 'border-primary/40 bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 shadow-lg shadow-primary/20' 
            : 'border-border/20 bg-gradient-to-r from-card/80 to-card/60 hover:shadow-lg hover:shadow-primary/5'
        }`}
        onClick={(e) => {
          // Only open details if not clicking on checkbox
          if (!(e.target as HTMLElement).closest('[role="checkbox"]')) {
            handleItemClick(item, e);
          }
        }}
      >
        {/* Enhanced Selection Indicator - removed top taper */}
        {isSelected && (
          <>
            <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-primary/5 pointer-events-none"></div>
            {/* Glow effect */}
            <div className="absolute inset-0 rounded-xl ring-1 ring-primary/20 pointer-events-none"></div>
          </>
        )}
        
        {/* Hover overlay for non-selected items */}
        {!isSelected && (
          <div className="absolute inset-0 bg-gradient-to-r from-primary/3 via-transparent to-secondary/3 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
        )}
        
        <div className="relative p-4">
          <div className="flex items-center space-x-6">
            {/* Checkbox */}
            <div className="flex-shrink-0" onClick={(e) => e.stopPropagation()}>
              <Checkbox
                checked={isSelected}
                onCheckedChange={() => handleItemToggle(item.unique_id)}
                className={`w-5 h-5 rounded-md border-2 transition-all duration-200 ${
                  isSelected 
                    ? 'border-primary data-[state=checked]:bg-primary data-[state=checked]:border-primary shadow-md' 
                    : 'border-border data-[state=checked]:bg-primary data-[state=checked]:border-primary'
                }`}
              />
            </div>
            
            {/* ID Badge */}
            <div className="flex-shrink-0">
              <Badge 
                variant="outline" 
                className={`font-mono text-xs px-2 py-1 font-medium transition-all duration-200 ${
                  isSelected 
                    ? 'bg-primary/20 border-primary/50 text-primary shadow-sm' 
                    : 'bg-primary/10 border-primary/30 text-primary'
                }`}
              >
                {item.unique_id}
              </Badge>
            </div>
            
            {/* Description */}
            <div className="flex-1 min-w-0">
              <p className={`font-semibold text-sm transition-colors duration-300 line-clamp-1 ${
                isSelected 
                  ? 'text-primary' 
                  : 'text-foreground group-hover:text-primary'
              }`}>
                {item.description}
              </p>
            </div>
            
            {/* Topic */}
            {item.topic && (
              <div className="flex-shrink-0">
                <Badge 
                  variant="secondary" 
                  className={`text-xs max-w-32 truncate transition-all duration-200 ${
                    isSelected 
                      ? 'bg-secondary/80 text-secondary-foreground shadow-sm' 
                      : 'bg-secondary text-secondary-foreground'
                  }`}
                >
                  {item.topic}
                </Badge>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Show create item form
  if (showCreateItem) {
    return (
      <CreateChecklistItemForm 
        onBack={() => setShowCreateItem(false)}
        onComplete={handleCreateNewItem}
      />
    );
  }

  // Show review summary page
  if (showReviewSummary) {
    return (
      <ChecklistReviewSummaryPage
        checklistData={formData}
        onBack={handleBackFromReview}
        onConfirm={handleConfirmChecklist}
        onCancel={handleCancelReview}
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
      <AnimatedBackground className="min-h-screen">
        {/* Content Layer */}
        <div className="relative z-10">
          {/* Progress Steps */}
          <div className="max-w-4xl mx-auto px-8 pt-6">
            <ChecklistProgressSteps currentStep={currentStep} />
          </div>

          {/* Form Content */}
          <div className="min-h-[calc(100vh-200px)] flex items-center justify-center px-8 -mt-20">
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

                      {/* Plant Change Type Selection */}
                      {formData.reason === 'Restart following plant changes or modifications' && (
                        <div className="mt-4 space-y-2 animate-fade-in-up">
                          <Label htmlFor="plantChangeType" className="text-sm font-medium">
                            Plant Change Type *
                          </Label>
                          <Select
                            value={plantChangeType}
                            onValueChange={setPlantChangeType}
                          >
                            <SelectTrigger id="plantChangeType" className="h-12">
                              <SelectValue placeholder="Select plant change type" />
                            </SelectTrigger>
                            <SelectContent className="bg-popover border border-border shadow-lg z-50">
                              <SelectItem value="tie_in">Project Advanced Tie-in scope</SelectItem>
                              <SelectItem value="moc">Implementation of an approved Asset MOC</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                      {/* Tie-in Scopes Multi-select */}
                      {formData.reason === 'Restart following plant changes or modifications' && plantChangeType === 'tie_in' && (
                        <div className="mt-4 space-y-3 animate-fade-in-up">
                          <Label className="text-sm font-medium">
                            Select Advanced Tie-in Scope(s) *
                          </Label>
                          <div className="space-y-3 border border-border/30 rounded-lg p-4 bg-muted/20">
                            {tieInScopes.map((scope) => (
                              <div key={scope.id} className="flex items-start space-x-3 p-3 rounded-md hover:bg-muted/40 transition-colors">
                                <Checkbox
                                  id={`scope-${scope.code}`}
                                  checked={selectedTieInScopes.includes(scope.code)}
                                  onCheckedChange={(checked) => {
                                    setSelectedTieInScopes(prev =>
                                      checked
                                        ? [...prev, scope.code]
                                        : prev.filter(c => c !== scope.code)
                                    );
                                  }}
                                  className="mt-1"
                                />
                                <div className="flex-1 space-y-1">
                                  <Label
                                    htmlFor={`scope-${scope.code}`}
                                    className="text-sm font-semibold cursor-pointer text-foreground"
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

                      {/* MOC Number and Scopes */}
                      {formData.reason === 'Restart following plant changes or modifications' && plantChangeType === 'moc' && (
                        <div className="mt-4 space-y-4 animate-fade-in-up">
                          <div className="space-y-2">
                            <Label htmlFor="mocNumber" className="text-sm font-medium">
                              MOC Number *
                            </Label>
                            <Input
                              id="mocNumber"
                              placeholder="Enter MOC number"
                              value={mocNumber}
                              onChange={(e) => setMocNumber(e.target.value)}
                              className="h-12"
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
                                    checked={selectedMocScopes.includes(scope.name)}
                                    onCheckedChange={(checked) => {
                                      setSelectedMocScopes(prev =>
                                        checked
                                          ? [...prev, scope.name]
                                          : prev.filter(n => n !== scope.name)
                                      );
                                    }}
                                    className="mt-1"
                                  />
                                  <div className="flex-1">
                                    <Label
                                      htmlFor={`moc-scope-${scope.id}`}
                                      className="text-sm font-medium cursor-pointer text-foreground"
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
                    </div>

                    {/* Action Buttons */}
                    <div className="flex justify-between items-center pt-6 border-t border-border/20">
                      <Button 
                        onClick={onBack}
                        variant="outline"
                        className="group relative overflow-hidden bg-gradient-to-r from-muted/80 to-muted/60 border-2 border-border/30 hover:border-destructive/40 px-6 py-3 rounded-xl font-medium text-muted-foreground hover:text-destructive transition-all duration-300 ease-out hover:scale-105 hover:shadow-lg hover:shadow-destructive/10"
                      >
                        {/* Background gradient overlay on hover */}
                        <div className="absolute inset-0 bg-gradient-to-r from-destructive/5 via-destructive/10 to-destructive/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl"></div>
                        
                        <div className="relative flex items-center">
                          <ArrowLeft className="h-4 w-4 mr-2 group-hover:-translate-x-1 transition-all duration-300 ease-out" />
                          <span className="font-semibold">Cancel</span>
                        </div>
                      </Button>
                      
                      <Button 
                        onClick={handleNext}
                        disabled={!formData.reason || (formData.reason === 'Others' && !customReason)}
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
      </AnimatedBackground>
    );
  }

  return (
    <AnimatedBackground className="min-h-screen">
      {/* Navigation Bar with Acrylic Effect - Top Navigation */}
      <div className="sticky top-0 z-50 backdrop-blur-xl bg-background/80 border-b border-border/20 shadow-lg">
        <div className="max-w-7xl mx-auto px-8 py-6">
          <div className="flex items-center justify-between">
            <Button 
              variant="outline" 
              onClick={() => setCurrentStep(1)}
              className="group relative overflow-hidden bg-gradient-to-r from-card/90 to-card/70 border-2 border-border/30 hover:border-primary/40 px-6 py-3 rounded-xl font-medium text-foreground hover:text-primary transition-all duration-300 ease-out hover:scale-105 hover:shadow-xl hover:shadow-primary/10 backdrop-blur-sm"
            >
              {/* Background gradient overlay on hover */}
              <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-primary/10 to-secondary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl"></div>
              
              {/* Subtle shimmer effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent opacity-0 group-hover:opacity-100 translate-x-[-100%] group-hover:translate-x-[100%] transition-all duration-700 ease-out"></div>
              
              <div className="relative flex items-center">
                <ArrowLeft className="h-4 w-4 mr-3 group-hover:-translate-x-2 transition-all duration-300 ease-out" />
                <span className="font-semibold">Back to Information</span>
              </div>
            </Button>
            
            <div className="text-center">
              <h1 className="text-3xl font-bold bg-gradient-to-r from-foreground to-primary bg-clip-text text-transparent">
                Create New Checklist
              </h1>
            </div>
            
            <Button 
              className="fluent-button bg-primary hover:bg-primary/80 shadow-fluent-sm hover:shadow-fluent-md group"
              onClick={handleComplete}
              disabled={formData.selected_items.length === 0}
            >
              Next: Review Checklist
              <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform duration-200" />
            </Button>
          </div>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="max-w-7xl mx-auto px-8 py-4">
        <ChecklistProgressSteps currentStep={currentStep} />
      </div>

      {/* Content Layer with Fluent Acrylic */}
      <div className="relative z-10 p-8">
        <div className="max-w-7xl mx-auto">
          {/* Search Section with Categories */}
          <Card className="fluent-glassmorphism border-border/30 backdrop-blur-md mb-6">
            <CardContent className="p-6 space-y-6">
              {/* Search and Create Item Row */}
              <div className="flex items-center justify-between space-x-6">
                <div className="flex items-center space-x-6 flex-1">
                  <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <Input
                      placeholder="Search checklist items..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <Button 
                    onClick={() => setShowCreateItem(true)}
                    variant="outline"
                    className="group relative overflow-hidden border-2 border-dashed border-muted-foreground/30 bg-transparent hover:border-primary hover:bg-primary/5 text-muted-foreground hover:text-primary transition-all duration-300 px-6 py-2.5 rounded-xl font-medium hover:shadow-lg hover:shadow-primary/20 hover:scale-105"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-secondary/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    <div className="relative flex items-center">
                      <Plus className="h-4 w-4 mr-2 group-hover:rotate-90 transition-transform duration-300" />
                      <span className="group-hover:font-semibold transition-all duration-300">Create Item</span>
                    </div>
                  </Button>
                </div>
                <div className="text-sm text-muted-foreground font-medium">
                  {formData.selected_items.length} items selected
                </div>
              </div>

              {/* Category Filters - Compact Two Rows */}
              <div className="space-y-3">
                <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
                  {/* First Row */}
                  <TabsList className="grid grid-cols-7 h-auto p-1.5 bg-card/20 border border-border/10 backdrop-blur-sm w-full gap-1">
                    <TabsTrigger
                      value="all"
                      className="h-8 px-3 text-xs font-medium bg-card/40 border border-border/20 hover:bg-card/60 hover:border-primary/30 data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-red-500 data-[state=active]:text-white data-[state=active]:border-transparent data-[state=active]:shadow-lg data-[state=active]:shadow-orange-500/30 transition-all duration-300 rounded-lg data-[state=active]:scale-105"
                    >
                      All
                    </TabsTrigger>
                    
                    <TabsTrigger
                      value="not_selected"
                      className="h-8 px-3 text-xs font-medium bg-card/40 border border-border/20 hover:bg-card/60 hover:border-primary/30 data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-red-500 data-[state=active]:text-white data-[state=active]:border-transparent data-[state=active]:shadow-lg data-[state=active]:shadow-orange-500/30 transition-all duration-300 rounded-lg data-[state=active]:scale-105"
                    >
                      Not Selected
                    </TabsTrigger>

                    {categories.slice(0, 5).map((category, index) => (
                      <TabsTrigger
                        key={category.id}
                        value={category.id}
                        className="h-8 px-3 text-xs font-medium bg-card/40 border border-border/20 hover:bg-card/60 hover:border-primary/30 data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-red-500 data-[state=active]:text-white data-[state=active]:border-transparent data-[state=active]:shadow-lg data-[state=active]:shadow-orange-500/30 transition-all duration-300 rounded-lg data-[state=active]:scale-105"
                      >
                        {category.name}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                  
                  {/* Second Row */}
                  {categories.length > 5 && (
                    <TabsList className="grid grid-cols-7 h-auto p-1.5 bg-card/20 border border-border/10 backdrop-blur-sm w-full gap-1">
                      {categories.slice(5).map((category, index) => (
                        <TabsTrigger
                          key={category.id}
                          value={category.id}
                          className="h-8 px-3 text-xs font-medium bg-card/40 border border-border/20 hover:bg-card/60 hover:border-primary/30 data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-red-500 data-[state=active]:text-white data-[state=active]:border-transparent data-[state=active]:shadow-lg data-[state=active]:shadow-orange-500/30 transition-all duration-300 rounded-lg data-[state=active]:scale-105"
                        >
                          {category.name}
                        </TabsTrigger>
                      ))}
                      {/* Fill remaining slots with empty space */}
                      {Array.from({ length: 7 - categories.slice(5).length }).map((_, index) => (
                        <div key={`empty-${index}`} className="h-8"></div>
                      ))}
                    </TabsList>
                  )}
                </Tabs>
              </div>
            </CardContent>
          </Card>
          {/* Checklist Items */}
          <Tabs value={selectedCategory} onValueChange={setSelectedCategory} className="w-full">
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
                        </div>
                      </CardHeader>
                      <CardContent>
                        <ScrollArea className={category.name === "General" ? "h-64" : "h-96"}>
                          <div className="grid gap-3">
                            {filteredCategoryItems.map((item) => (
                              <ChecklistItemCard key={item.id} item={item} />
                            ))}
                          </div>
                        </ScrollArea>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </TabsContent>

            {/* Not Selected Tab Content */}
            <TabsContent value="not_selected" className="mt-0">
              <Card className="fluent-glassmorphism border-border/30 backdrop-blur-md">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div>
                        <CardTitle className="text-2xl font-bold">Not Selected Items</CardTitle>
                        <CardDescription>
                          Items that are not currently selected for your checklist
                        </CardDescription>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-muted-foreground">
                        {unselectedItems.length}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        items remaining
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-96">
                    <div className="grid gap-3">
                      {filteredItems(unselectedItems).map((item) => (
                        <ChecklistItemCard key={item.id} item={item} />
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
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
                          <ChecklistItemCard key={item.id} item={item} />
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

      {/* Detail Modal */}
      {selectedDetailItem && (
        <ViewChecklistItemModal
          item={selectedDetailItem}
          isOpen={showDetailModal}
          onClose={handleDetailModalClose}
        />
      )}
    </AnimatedBackground>
  );
};

export default CreateChecklistForm;
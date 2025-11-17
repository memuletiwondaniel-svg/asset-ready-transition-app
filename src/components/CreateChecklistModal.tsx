import React, { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { 
  ArrowLeft, 
  ArrowRight, 
  CheckCircle, 
  Search, 
  Filter,
  ListChecks,
  Edit,
  UserCheck,
  FileCheck
} from 'lucide-react';
import { useChecklistItems } from '@/hooks/useChecklistItems';
import { usePSSRReasons, usePSSRTieInScopes, usePSSRMOCScopes } from '@/hooks/usePSSRReasons';
import { useUsers } from '@/hooks/useUsers';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { EditChecklistItemDialog } from '@/components/checklist/EditChecklistItemDialog';

interface CreateChecklistModalProps {
  onComplete: (checklist: NewChecklistData) => void;
  onCancel: () => void;
  selectedLanguage?: string;
}

interface NewChecklistData {
  name: string;
  reason: string;
  selected_items: string[];
  approvers: string[];
  custom_reason?: string;
  comments?: string;
}

interface ItemCustomization {
  [itemId: string]: {
    custom_description?: string;
    custom_responsible?: string;
    custom_approver?: string;
    notes?: string;
  };
}

const CreateChecklistModal: React.FC<CreateChecklistModalProps> = ({ 
  onComplete,
  onCancel,
  selectedLanguage = "English"
}) => {
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [editingItem, setEditingItem] = useState<{ id: string; description: string } | null>(null);
  const [itemCustomizations, setItemCustomizations] = useState<ItemCustomization>({});
  
  const { data: checklistItems = [], isLoading } = useChecklistItems();
  const { data: pssrReasons = [] } = usePSSRReasons();
  const { data: tieInScopes = [] } = usePSSRTieInScopes();
  const { data: mocScopes = [] } = usePSSRMOCScopes();
  const { users } = useUsers();
  
  const [formData, setFormData] = useState<NewChecklistData>({
    name: '',
    reason: '',
    selected_items: [],
    approvers: [],
    comments: ''
  });
  const [customReason, setCustomReason] = useState('');
  const [plantChangeType, setPlantChangeType] = useState('');
  const [selectedTieInScopes, setSelectedTieInScopes] = useState<string[]>([]);
  const [mocNumber, setMocNumber] = useState('');
  const [selectedMocScopes, setSelectedMocScopes] = useState<string[]>([]);

  const checklistReasons = useMemo(() => {
    return [...pssrReasons.map(r => r.name), 'Others'];
  }, [pssrReasons]);

  const categories = useMemo(() => {
    const categoryMap = new Map();
    checklistItems.forEach(item => {
      if (!categoryMap.has(item.category)) {
        categoryMap.set(item.category, []);
      }
      categoryMap.get(item.category).push(item);
    });

    const orderedCategoryNames = [
      'General', 'Hardware Integrity', 'Process Safety', 'Documentation',
      'Organization', 'Health & Safety', 'Emergency Response', 'HSE',
      'Electrical', 'Mechanical', 'Instrumentation', 'Civil', 'Rotating'
    ];

    return orderedCategoryNames
      .filter(categoryName => categoryMap.has(categoryName))
      .map(categoryName => ({
        id: categoryName,
        name: categoryName,
        items: categoryMap.get(categoryName) || []
      }));
  }, [checklistItems]);

  const filteredItems = useMemo(() => {
    return checklistItems.filter(item => {
      const matchesSearch = searchQuery === '' || 
        item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.category.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [checklistItems, searchQuery, selectedCategory]);

  const activeUsers = useMemo(() => {
    return users.filter(u => u.isActive && u.status === 'active');
  }, [users]);

  const handleToggleItem = (itemId: string) => {
    setFormData(prev => ({
      ...prev,
      selected_items: prev.selected_items.includes(itemId)
        ? prev.selected_items.filter(id => id !== itemId)
        : [...prev.selected_items, itemId]
    }));
  };

  const handleSelectAll = () => {
    setFormData(prev => ({
      ...prev,
      selected_items: filteredItems.map(item => item.unique_id)
    }));
  };

  const handleDeselectAll = () => {
    setFormData(prev => ({ ...prev, selected_items: [] }));
  };

  const handleToggleApprover = (userId: string) => {
    setFormData(prev => ({
      ...prev,
      approvers: prev.approvers.includes(userId)
        ? prev.approvers.filter(id => id !== userId)
        : [...prev.approvers, userId]
    }));
  };

  const handleSaveItemCustomization = (customization: any) => {
    if (!editingItem) return;
    setItemCustomizations(prev => ({
      ...prev,
      [editingItem.id]: customization
    }));
    toast({
      title: "Item Updated",
      description: "Your changes will only apply to this checklist",
    });
  };

  const canProceedStep1 = formData.name.trim() !== '' && 
    formData.reason !== '' && 
    (formData.reason !== 'Others' || customReason.trim() !== '');
  const canProceedStep2 = formData.selected_items.length > 0;
  const canProceedStep3 = formData.approvers.length > 0;

  const handleNext = () => {
    if (currentStep === 1 && canProceedStep1) {
      setCurrentStep(2);
    } else if (currentStep === 2 && canProceedStep2) {
      setCurrentStep(3);
    } else if (currentStep === 3 && canProceedStep3) {
      setCurrentStep(4);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    } else {
      onCancel();
    }
  };

  const handleComplete = () => {
    const checklistData: NewChecklistData = {
      name: formData.name,
      reason: formData.reason,
      selected_items: formData.selected_items,
      approvers: formData.approvers,
      custom_reason: formData.reason === 'Others' ? customReason : undefined,
      comments: formData.comments || undefined
    };

    onComplete(checklistData);
  };

  const stepProgress = (currentStep / 4) * 100;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto"></div>
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  const getStepIcon = (step: number) => {
    switch(step) {
      case 1: return <FileCheck className="h-4 w-4" />;
      case 2: return <ListChecks className="h-4 w-4" />;
      case 3: return <UserCheck className="h-4 w-4" />;
      case 4: return <CheckCircle className="h-4 w-4" />;
      default: return null;
    }
  };

  const getStepTitle = (step: number) => {
    switch(step) {
      case 1: return 'Basic Information';
      case 2: return 'Select PSSR Items';
      case 3: return 'Select Approvers';
      case 4: return 'Review & Confirm';
      default: return '';
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header with Progress */}
      <div className="pb-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              {getStepIcon(currentStep)}
              <h3 className="text-lg font-semibold">Step {currentStep} of 4</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              {getStepTitle(currentStep)}
            </p>
          </div>
          <Badge variant="outline" className="text-xs">
            {formData.selected_items.length} items | {formData.approvers.length} approvers
          </Badge>
        </div>
        <Progress value={stepProgress} className="h-2" />
      </div>

      {/* Step 1: Basic Information */}
      {currentStep === 1 && (
        <ScrollArea className="flex-1 px-6">
          <div className="space-y-6 pb-6">
            <div className="space-y-2">
              <Label htmlFor="checklistName" className="text-sm font-semibold text-foreground">
                Checklist Name <span className="text-destructive">*</span>
              </Label>
              <p className="text-xs text-muted-foreground">Your response</p>
              <Input
                id="checklistName"
                placeholder="Enter a descriptive name..."
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="h-11 bg-muted/30 focus:bg-background focus-visible:ring-inset outline-none"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-semibold text-foreground">
                Reason for Checklist <span className="text-destructive">*</span>
              </Label>
              <p className="text-xs text-muted-foreground">Your response</p>
              <Select 
                value={formData.reason} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, reason: value }))}
              >
                <SelectTrigger className="h-11 bg-muted/30 focus:bg-background focus-visible:ring-inset outline-none">
                  <SelectValue placeholder="Select the primary reason..." />
                </SelectTrigger>
                <SelectContent className="max-h-[300px] z-[100] bg-popover">
                  {checklistReasons.map((reason) => (
                    <SelectItem key={reason} value={reason}>
                      {reason}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {formData.reason === 'Others' && (
              <div className="space-y-2 animate-in slide-in-from-top-2">
                <Label htmlFor="customReason" className="text-sm font-semibold">
                  Specify Custom Reason <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="customReason"
                  value={customReason}
                  onChange={(e) => setCustomReason(e.target.value)}
                  className="h-11 bg-muted/30 focus:bg-background focus-visible:ring-inset outline-none"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="comments" className="text-sm font-semibold">
                Comments <span className="text-muted-foreground font-normal">(Optional)</span>
              </Label>
              <p className="text-xs text-muted-foreground">Your response</p>
              <textarea
                id="comments"
                value={formData.comments}
                onChange={(e) => setFormData(prev => ({ ...prev, comments: e.target.value }))}
                className="flex min-h-[100px] w-full rounded-md border bg-muted/30 px-3 py-2 text-sm focus:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset resize-none"
                rows={4}
              />
            </div>
          </div>
        </ScrollArea>
      )}

      {/* Step 2: Select Items */}
      {currentStep === 2 && (
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="space-y-3 pb-4 px-6">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search items..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-10 focus-visible:ring-inset outline-none"
                />
              </div>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-[180px] h-10 bg-muted/30 focus-visible:ring-inset outline-none">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="z-[100] bg-popover">
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map(cat => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">{filteredItems.length} items</p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleSelectAll} className="h-8 text-xs">
                  Select All
                </Button>
                <Button variant="outline" size="sm" onClick={handleDeselectAll} className="h-8 text-xs">
                  Clear
                </Button>
              </div>
            </div>
          </div>

          <Separator />

          <ScrollArea className="flex-1 px-6 mt-4">
            <div className="space-y-2 pb-4">
              {filteredItems.length === 0 ? (
                <div className="text-center py-12">
                  <ListChecks className="h-12 w-12 text-muted-foreground/50 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">No items found</p>
                </div>
              ) : (
                filteredItems.map((item) => (
                  <Card
                    key={item.unique_id}
                    className={cn(
                      "cursor-pointer transition-all hover:shadow-md",
                      formData.selected_items.includes(item.unique_id)
                        ? "border-primary bg-primary/5"
                        : "border-border/50 hover:border-border"
                    )}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <Checkbox
                          checked={formData.selected_items.includes(item.unique_id)}
                          onCheckedChange={() => handleToggleItem(item.unique_id)}
                          className="mt-0.5"
                          onClick={(e) => e.stopPropagation()}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <Badge variant="secondary" className="text-xs font-mono">
                                  {item.unique_id}
                                </Badge>
                                {itemCustomizations[item.unique_id] && (
                                  <Badge variant="outline" className="text-xs">
                                    Customized
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm font-medium leading-snug">
                                {itemCustomizations[item.unique_id]?.custom_description || item.description}
                              </p>
                            </div>
                            <div className="flex items-center gap-1">
                              {formData.selected_items.includes(item.unique_id) && (
                                <>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setEditingItem({ id: item.unique_id, description: item.description });
                                    }}
                                  >
                                    <Edit className="h-3 w-3" />
                                  </Button>
                                  <CheckCircle className="h-4 w-4 text-primary flex-shrink-0" />
                                </>
                              )}
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <Badge variant="outline" className="text-xs">{item.category}</Badge>
                            {item.topic && <Badge variant="secondary" className="text-xs">{item.topic}</Badge>}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </ScrollArea>
        </div>
      )}

      {/* Step 3: Select Approvers */}
      {currentStep === 3 && (
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="px-6 pb-4">
            <p className="text-sm text-muted-foreground">
              Select users who need to approve this checklist
            </p>
          </div>

          <Separator />

          <ScrollArea className="flex-1 px-6 mt-4">
            <div className="space-y-2 pb-4">
              {activeUsers.map((user, index) => (
                <Card
                  key={user.id}
                  className={cn(
                    "cursor-pointer transition-all hover:shadow-md",
                    formData.approvers.includes(user.id)
                      ? "border-primary bg-primary/5"
                      : "border-border/50 hover:border-border"
                  )}
                  onClick={() => handleToggleApprover(user.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <Checkbox
                        checked={formData.approvers.includes(user.id)}
                        onCheckedChange={() => handleToggleApprover(user.id)}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-medium">{user.name}</p>
                          {formData.approvers.includes(user.id) && (
                            <Badge variant="secondary" className="text-xs">
                              Order: {formData.approvers.indexOf(user.id) + 1}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {user.email}
                        </p>
                      </div>
                      {formData.approvers.includes(user.id) && (
                        <CheckCircle className="h-5 w-5 text-primary" />
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}

      {/* Step 4: Review */}
      {currentStep === 4 && (
        <ScrollArea className="flex-1 px-6">
          <div className="space-y-6 pb-6">
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div>
                    <Label className="text-xs text-muted-foreground">Checklist Name</Label>
                    <p className="font-semibold">{formData.name}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Reason</Label>
                    <p>{formData.reason === 'Others' ? customReason : formData.reason}</p>
                  </div>
                  {formData.comments && (
                    <div>
                      <Label className="text-xs text-muted-foreground">Comments</Label>
                      <p className="text-sm">{formData.comments}</p>
                    </div>
                  )}
                  <Separator />
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs text-muted-foreground">Selected Items</Label>
                      <p className="text-2xl font-bold text-primary">{formData.selected_items.length}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Approvers</Label>
                      <p className="text-2xl font-bold text-primary">{formData.approvers.length}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200">
              <CardContent className="pt-6">
                <div className="flex gap-3">
                  <CheckCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="space-y-2">
                    <p className="font-semibold text-blue-900 dark:text-blue-100">Ready to Submit</p>
                    <p className="text-sm text-blue-800 dark:text-blue-200">
                      This checklist will be sent to {formData.approvers.length} approver(s) for review. 
                      You'll be able to track the approval status from the checklist page.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </ScrollArea>
      )}

      {/* Footer */}
      <div className="pt-6 border-t mt-auto px-6">
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={handleBack} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            {currentStep === 1 ? 'Cancel' : 'Back'}
          </Button>

          {currentStep < 4 ? (
            <Button
              onClick={handleNext}
              disabled={
                (currentStep === 1 && !canProceedStep1) ||
                (currentStep === 2 && !canProceedStep2) ||
                (currentStep === 3 && !canProceedStep3)
              }
              className="gap-2 min-w-[160px]"
            >
              <span>
                {currentStep === 1 && 'Next: Select Items'}
                {currentStep === 2 && 'Next: Approvers'}
                {currentStep === 3 && 'Next: Review'}
              </span>
              <ArrowRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={handleComplete} className="gap-2 min-w-[160px]">
              <CheckCircle className="h-4 w-4" />
              Submit Checklist
            </Button>
          )}
        </div>
      </div>

      <EditChecklistItemDialog
        open={!!editingItem}
        onOpenChange={(open) => !open && setEditingItem(null)}
        itemId={editingItem?.id || ''}
        itemDescription={editingItem?.description || ''}
        onSave={handleSaveItemCustomization}
      />
    </div>
  );
};

export default CreateChecklistModal;

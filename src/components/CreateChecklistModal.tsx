import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
  FileText, 
  Search, 
  Filter, 
  Plus,
  Sparkles,
  AlertCircle,
  ChevronRight,
  ListChecks
} from 'lucide-react';
import { useChecklistItems } from '@/hooks/useChecklistItems';
import { usePSSRReasons, usePSSRTieInScopes, usePSSRMOCScopes } from '@/hooks/usePSSRReasons';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface CreateChecklistModalProps {
  onComplete: (checklist: NewChecklistData) => void;
  onCancel: () => void;
  selectedLanguage?: string;
}

interface NewChecklistData {
  name: string;
  reason: string;
  selected_items: string[];
  custom_reason?: string;
  comments?: string;
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
  
  const { data: checklistItems = [], isLoading } = useChecklistItems();
  const { data: pssrReasons = [] } = usePSSRReasons();
  const { data: tieInScopes = [] } = usePSSRTieInScopes();
  const { data: mocScopes = [] } = usePSSRMOCScopes();
  
  const [formData, setFormData] = useState<NewChecklistData>({
    name: '',
    reason: '',
    selected_items: [],
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

  const canProceedStep1 = formData.name.trim() !== '' && 
    formData.reason !== '' && 
    (formData.reason !== 'Others' || customReason.trim() !== '');

  const canComplete = formData.selected_items.length > 0;

  const handleNext = () => {
    if (currentStep === 1 && canProceedStep1) {
      setCurrentStep(2);
    }
  };

  const handleBack = () => {
    if (currentStep === 2) {
      setCurrentStep(1);
    } else {
      onCancel();
    }
  };

  const handleComplete = () => {
    if (!canComplete) {
      toast({
        title: "Selection Required",
        description: "Please select at least one checklist item",
        variant: "destructive"
      });
      return;
    }

    const checklistData: NewChecklistData = {
      name: formData.name,
      reason: formData.reason,
      selected_items: formData.selected_items,
      custom_reason: formData.reason === 'Others' ? customReason : undefined,
      comments: formData.comments || undefined
    };

    onComplete(checklistData);
  };

  const stepProgress = (currentStep / 2) * 100;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto"></div>
          <p className="text-sm text-muted-foreground">Loading items...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header with Progress */}
      <div className="pb-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h3 className="text-lg font-semibold">Step {currentStep} of 2</h3>
            <p className="text-sm text-muted-foreground">
              {currentStep === 1 ? 'Basic Information' : 'Select Items'}
            </p>
          </div>
          <Badge variant="outline" className="text-xs">
            {formData.selected_items.length} items selected
          </Badge>
        </div>
        <Progress value={stepProgress} className="h-2" />
      </div>

      {/* Step 1: Basic Information */}
      {currentStep === 1 && (
        <ScrollArea className="flex-1 -mx-6 px-6">
          <div className="space-y-6 pb-6">
            {/* Checklist Name */}
            <div className="space-y-3">
              <Label htmlFor="checklistName" className="text-sm font-medium flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Checklist Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="checklistName"
                placeholder="Enter a descriptive name for this checklist..."
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="h-11"
              />
            </div>

            {/* Reason Selection */}
            <div className="space-y-3">
              <Label className="text-sm font-medium flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Reason for Checklist <span className="text-destructive">*</span>
              </Label>
              <Select 
                value={formData.reason} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, reason: value }))}
              >
                <SelectTrigger className="h-11 bg-background">
                  <SelectValue placeholder="Select the primary reason..." />
                </SelectTrigger>
                <SelectContent>
                  {checklistReasons.map((reason) => (
                    <SelectItem key={reason} value={reason}>
                      {reason}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Custom Reason */}
            {formData.reason === 'Others' && (
              <div className="space-y-3 animate-in slide-in-from-top-2 duration-300">
                <Label htmlFor="customReason" className="text-sm font-medium">
                  Specify Custom Reason <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="customReason"
                  placeholder="Enter your custom reason..."
                  value={customReason}
                  onChange={(e) => setCustomReason(e.target.value)}
                  className="h-11"
                />
              </div>
            )}

            {/* Plant Change Type */}
            {formData.reason === 'Restart following plant changes or modifications' && (
              <div className="space-y-3 animate-in slide-in-from-top-2 duration-300">
                <Label className="text-sm font-medium">Plant Change Type</Label>
                <Select value={plantChangeType} onValueChange={setPlantChangeType}>
                  <SelectTrigger className="h-11 bg-background">
                    <SelectValue placeholder="Select type..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tie-in">Tie-in</SelectItem>
                    <SelectItem value="moc">MOC (Management of Change)</SelectItem>
                  </SelectContent>
                </Select>

                {/* Tie-in Scopes */}
                {plantChangeType === 'tie-in' && (
                  <Card className="mt-4 border-border/50">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">Tie-in Scopes</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {tieInScopes.map((scope) => (
                        <div key={scope.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={`tie-in-${scope.id}`}
                            checked={selectedTieInScopes.includes(scope.description)}
                            onCheckedChange={(checked) => {
                              setSelectedTieInScopes(prev =>
                                checked
                                  ? [...prev, scope.description]
                                  : prev.filter(s => s !== scope.description)
                              );
                            }}
                          />
                          <Label htmlFor={`tie-in-${scope.id}`} className="text-sm font-normal cursor-pointer">
                            {scope.description}
                          </Label>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}

                {/* MOC Information */}
                {plantChangeType === 'moc' && (
                  <div className="space-y-4 mt-4">
                    <div className="space-y-2">
                      <Label htmlFor="mocNumber" className="text-sm font-medium">
                        MOC Number
                      </Label>
                      <Input
                        id="mocNumber"
                        placeholder="Enter MOC number..."
                        value={mocNumber}
                        onChange={(e) => setMocNumber(e.target.value)}
                        className="h-11"
                      />
                    </div>

                    <Card className="border-border/50">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm">MOC Scopes</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        {mocScopes.map((scope) => (
                          <div key={scope.id} className="flex items-center space-x-2">
                            <Checkbox
                              id={`moc-${scope.id}`}
                              checked={selectedMocScopes.includes(scope.name)}
                              onCheckedChange={(checked) => {
                                setSelectedMocScopes(prev =>
                                  checked
                                    ? [...prev, scope.name]
                                    : prev.filter(s => s !== scope.name)
                                );
                              }}
                            />
                            <Label htmlFor={`moc-${scope.id}`} className="text-sm font-normal cursor-pointer">
                              {scope.name}
                            </Label>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  </div>
                )}
              </div>
            )}

            {/* Comments */}
            <div className="space-y-3">
              <Label htmlFor="comments" className="text-sm font-medium">
                Additional Comments (Optional)
              </Label>
              <textarea
                id="comments"
                placeholder="Add any additional notes or comments about this checklist..."
                value={formData.comments}
                onChange={(e) => setFormData(prev => ({ ...prev, comments: e.target.value }))}
                className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
                rows={4}
              />
            </div>

            {/* Info Card */}
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="pt-4 flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                <div className="space-y-1 text-sm">
                  <p className="font-medium text-primary">Next Step</p>
                  <p className="text-muted-foreground">
                    After providing basic information, you'll select specific checklist items for your PSSR.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </ScrollArea>
      )}

      {/* Step 2: Item Selection */}
      {currentStep === 2 && (
        <div className="flex-1 flex flex-col">
          {/* Search and Filter */}
          <div className="space-y-3 pb-4">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search items..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-10"
                />
              </div>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-[160px] h-10">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map(cat => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {filteredItems.length} items available
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSelectAll}
                  className="h-8 text-xs"
                >
                  Select All
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDeselectAll}
                  className="h-8 text-xs"
                >
                  Clear
                </Button>
              </div>
            </div>
          </div>

          <Separator />

          {/* Items List */}
          <ScrollArea className="flex-1 -mx-6 px-6 mt-4">
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
                    onClick={() => handleToggleItem(item.unique_id)}
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
                            <p className="text-sm font-medium leading-snug">
                              {item.description}
                            </p>
                            {formData.selected_items.includes(item.unique_id) && (
                              <CheckCircle className="h-4 w-4 text-primary flex-shrink-0" />
                            )}
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <Badge variant="outline" className="text-xs">
                              {item.category}
                            </Badge>
                            {item.topic && (
                              <Badge variant="secondary" className="text-xs">
                                {item.topic}
                              </Badge>
                            )}
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

      {/* Footer Actions */}
      <div className="pt-6 border-t border-border/50 mt-auto">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={handleBack}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            {currentStep === 1 ? 'Cancel' : 'Back'}
          </Button>

          {currentStep === 1 ? (
            <Button
              onClick={handleNext}
              disabled={!canProceedStep1}
              className="gap-2 min-w-[120px]"
            >
              Continue
              <ArrowRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              onClick={handleComplete}
              disabled={!canComplete}
              className="gap-2 min-w-[120px]"
            >
              <CheckCircle className="h-4 w-4" />
              Create Checklist
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default CreateChecklistModal;

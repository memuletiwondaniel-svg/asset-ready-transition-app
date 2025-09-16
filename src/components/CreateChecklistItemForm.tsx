import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { EnhancedSearchableCombobox } from '@/components/ui/enhanced-searchable-combobox';
import { ArrowLeft, Plus, CheckCircle, AlertCircle, X, Search } from 'lucide-react';
import { useCreateChecklistItem } from '@/hooks/useChecklistItems';
import { useChecklistCategories, useCreateChecklistCategory } from '@/hooks/useChecklistCategories';
import { useChecklistTopics, useCreateChecklistTopic } from '@/hooks/useChecklistTopics';
import { useRoles } from '@/hooks/useRoles';
import { useDisciplines } from '@/hooks/useDisciplines';
import { useCommissions } from '@/hooks/useCommissions';
import { toast } from '@/hooks/use-toast';
interface CreateChecklistItemFormProps {
  onBack: () => void;
  onComplete: (item: any) => void;
}
interface NewChecklistItemData {
  description: string;
  evidenceGuidance: string;
  category: string;
  approvers: string[];
  responsible: string[];
  topic: string;
}

interface TA2Approver {
  id: string;
  discipline: string;
  commission: string;
  position: string;
}
const CreateChecklistItemForm: React.FC<CreateChecklistItemFormProps> = ({
  onBack,
  onComplete
}) => {
  const [formData, setFormData] = useState<NewChecklistItemData>({
    description: '',
    evidenceGuidance: '',
    category: '',
    approvers: [],
    responsible: [],
    topic: ''
  });
  const [errors, setErrors] = useState<Partial<NewChecklistItemData>>({});
  const [showPreview, setShowPreview] = useState(false);
  const [ta2Approvers, setTA2Approvers] = useState<TA2Approver[]>([]);
  const [ta2Responsible, setTA2Responsible] = useState<TA2Approver[]>([]);
  
  const createChecklistItemMutation = useCreateChecklistItem();
  
  // Hooks for data fetching
  const { data: categories = [] } = useChecklistCategories();
  const createCategoryMutation = useCreateChecklistCategory();
  const { data: topics = [] } = useChecklistTopics();
  const createTopicMutation = useCreateChecklistTopic();
  const { roles } = useRoles();
  const { disciplines } = useDisciplines();
  const { commissions } = useCommissions();

  // Transform data for comboboxes
  const categoryOptions = categories.map(cat => ({ value: cat.name, label: cat.name }));
  const topicOptions = topics.map(topic => ({ value: topic.name, label: topic.name }));
  const roleOptions = roles.map(role => ({ value: role.name, label: role.name }));
  const disciplineOptions = disciplines.map(disc => ({ value: disc.name, label: disc.name }));
  
  // Filter commissions based on discipline selection - only P&E and Asset for most disciplines
  const getCommissionOptions = (disciplineName: string) => {
    if (disciplineName === 'Tech Safety' || disciplineName === 'Civil') {
      return []; // No commission field for these disciplines
    }
    return commissions
      .filter(comm => ['P&E', 'Asset'].includes(comm.name))
      .map(comm => ({ value: comm.name, label: comm.name }));
  };
  const validateForm = (): boolean => {
    const newErrors: Partial<NewChecklistItemData> = {};
    if (!formData.description.trim()) {
      newErrors.description = 'Checklist question is required';
    }
    if (!formData.category) {
      newErrors.category = 'Category is required';
    }
    if (formData.approvers.length === 0 && ta2Approvers.length === 0) {
      newErrors.approvers = 'At least one approver is required' as any;
    }
    if (formData.responsible.length === 0 && ta2Responsible.length === 0) {
      newErrors.responsible = 'At least one responsible party is required' as any;
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  const handleSubmit = async () => {
    if (validateForm()) {
      try {
        // Combine regular approvers with TA2 approvers
        const allApprovers = [
          ...formData.approvers,
          ...ta2Approvers.map(ta2 => ta2.position)
        ];
        
        // Combine regular responsible with TA2 responsible
        const allResponsible = [
          ...formData.responsible,
          ...ta2Responsible.map(ta2 => ta2.position)
        ];
        
        const newItem = {
          description: formData.description.trim(),
          required_evidence: formData.evidenceGuidance.trim(),
          category: formData.category,
          Approver: allApprovers.join(', '),
          responsible: allResponsible.join(', '),
          topic: formData.topic.trim()
        };
        
        await createChecklistItemMutation.mutateAsync(newItem);
        toast({
          title: "Success",
          description: "Checklist item created successfully"
        });
        onComplete(newItem);
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to create checklist item",
          variant: "destructive"
        });
      }
    }
  };
  const updateFormData = (field: keyof NewChecklistItemData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: undefined
      }));
    }
  };
  // Handle creating new categories and topics
  const handleCreateCategory = async (categoryName: string) => {
    try {
      await createCategoryMutation.mutateAsync({ name: categoryName });
      toast({
        title: "Success",
        description: `Category "${categoryName}" created successfully`
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create category",
        variant: "destructive"
      });
    }
  };

  const handleCreateTopic = async (topicName: string) => {
    try {
      await createTopicMutation.mutateAsync({ name: topicName });
      toast({
        title: "Success",
        description: `Topic "${topicName}" created successfully`
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create topic",
        variant: "destructive"
      });
    }
  };

  // TA2 management functions
  const addTA2Approver = () => {
    const newTA2: TA2Approver = {
      id: Date.now().toString(),
      discipline: '',
      commission: '',
      position: ''
    };
    setTA2Approvers([...ta2Approvers, newTA2]);
  };

  const updateTA2Approver = (id: string, field: keyof TA2Approver, value: string) => {
    setTA2Approvers(prev => prev.map(ta2 => {
      if (ta2.id === id) {
        const updated = { ...ta2, [field]: value };
        
        // Update position based on discipline and commission
        if (field === 'discipline' || field === 'commission') {
          const disc = field === 'discipline' ? value : ta2.discipline;
          const comm = field === 'commission' ? value : ta2.commission;
          
          if (disc === 'Tech Safety' || disc === 'Civil') {
            updated.position = `TA2 ${disc}`;
          } else if (disc && comm) {
            updated.position = `TA2 ${disc} (${comm})`;
          } else if (disc) {
            updated.position = `TA2 ${disc}`;
          }
        }
        
        return updated;
      }
      return ta2;
    }));
  };

  const removeTA2Approver = (id: string) => {
    setTA2Approvers(prev => prev.filter(ta2 => ta2.id !== id));
  };

  // Similar functions for TA2 responsible parties
  const addTA2Responsible = () => {
    const newTA2: TA2Approver = {
      id: Date.now().toString(),
      discipline: '',
      commission: '',
      position: ''
    };
    setTA2Responsible([...ta2Responsible, newTA2]);
  };

  const updateTA2Responsible = (id: string, field: keyof TA2Approver, value: string) => {
    setTA2Responsible(prev => prev.map(ta2 => {
      if (ta2.id === id) {
        const updated = { ...ta2, [field]: value };
        
        if (field === 'discipline' || field === 'commission') {
          const disc = field === 'discipline' ? value : ta2.discipline;
          const comm = field === 'commission' ? value : ta2.commission;
          
          if (disc === 'Tech Safety' || disc === 'Civil') {
            updated.position = `TA2 ${disc}`;
          } else if (disc && comm) {
            updated.position = `TA2 ${disc} (${comm})`;
          } else if (disc) {
            updated.position = `TA2 ${disc}`;
          }
        }
        
        return updated;
      }
      return ta2;
    }));
  };

  const removeTA2Responsible = (id: string) => {
    setTA2Responsible(prev => prev.filter(ta2 => ta2.id !== id));
  };
  if (showPreview) {
    return <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto fluent-card">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl font-semibold">Preview Checklist Item</CardTitle>
                <CardDescription>Review the details before creating</CardDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setShowPreview(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <Badge variant="secondary" className="bg-primary/10 text-primary">
                  Auto-assigned ID: CHK-{Date.now().toString().slice(-6)}
                </Badge>
              </div>
              
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Question</Label>
                <p className="mt-1 text-sm">{formData.description}</p>
              </div>
              
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Evidence Guidance</Label>
                <p className="mt-1 text-sm">{formData.evidenceGuidance}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Category</Label>
                  <p className="mt-1 text-sm">{formData.category}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Topic</Label>
                  <p className="mt-1 text-sm">{formData.topic}</p>
                </div>
              </div>
              
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Approvers</Label>
                <div className="mt-1 flex flex-wrap gap-2">
                  {formData.approvers.map(approver => <Badge key={approver} variant="outline">
                      {approver}
                    </Badge>)}
                  {ta2Approvers.filter(ta2 => ta2.position).map(ta2 => 
                    <Badge key={ta2.id} variant="outline" className="bg-blue-50 text-blue-700">
                      {ta2.position}
                    </Badge>
                  )}
                </div>
              </div>
              
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Responsible Parties</Label>
                <div className="mt-1 flex flex-wrap gap-2">
                  {formData.responsible.map(resp => <Badge key={resp} variant="outline">
                      {resp}
                    </Badge>)}
                  {ta2Responsible.filter(ta2 => ta2.position).map(ta2 => 
                    <Badge key={ta2.id} variant="outline" className="bg-green-50 text-green-700">
                      {ta2.position}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button variant="outline" onClick={() => setShowPreview(false)}>
                Edit
              </Button>
              <Button onClick={handleSubmit} disabled={createChecklistItemMutation.isPending} className="bg-primary hover:bg-primary/90">
                {createChecklistItemMutation.isPending ? <>Creating...</> : <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Create Item
                  </>}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>;
  }
  return <div className="fixed inset-0 bg-background/80 backdrop-blur-md z-50 overflow-y-auto">
      {/* Microsoft Fluent Design Header */}
      <div className="sticky top-0 bg-gradient-to-r from-background/95 via-background/90 to-background/95 backdrop-blur-xl border-b border-border/20 shadow-sm z-10">
        <div className="max-w-5xl mx-auto px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-6">
              <Button 
                variant="ghost" 
                onClick={onBack} 
                className="h-11 px-4 rounded-xl hover:bg-accent/10 hover:scale-[1.02] transition-all duration-300 ease-out group flex items-center gap-3"
              >
                <ArrowLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform duration-300 ease-out" />
                <span className="font-medium tracking-wide">Cancel</span>
              </Button>
              <div className="space-y-1">
                <h1 className="text-2xl font-semibold bg-gradient-to-r from-foreground via-foreground/90 to-foreground bg-clip-text text-transparent">
                  Create Checklist Item
                </h1>
                <p className="text-sm text-muted-foreground/80">Add a new item to the PSSR checklist library</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Form Content */}
      <div className="max-w-5xl mx-auto px-8 py-10">
        <Card className="border-0 shadow-xl shadow-black/5 bg-gradient-to-br from-card/95 via-card to-card/90 backdrop-blur-xl">
          <CardHeader className="pb-8 px-8 pt-8">
            <div className="space-y-2">
              <CardTitle className="text-2xl font-semibold bg-gradient-to-r from-foreground via-foreground/90 to-foreground bg-clip-text text-transparent">
                Create New Checklist Item
              </CardTitle>
              <CardDescription className="text-base text-muted-foreground/80 leading-relaxed">
                Fill in the information for your new checklist item. An ID will be auto-assigned upon creation.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-8 px-8 pb-8">
            {/* Checklist Question */}
            <div className="space-y-4 group">
              <Label htmlFor="description" className="text-sm font-semibold flex items-center gap-2 text-foreground/90">
                Checklist Question <span className="text-destructive text-base">*</span>
              </Label>
              <Textarea 
                id="description" 
                placeholder="Enter the checklist question or requirement..." 
                value={formData.description} 
                onChange={e => updateFormData('description', e.target.value)} 
                className="min-h-[120px] resize-none bg-background/60 backdrop-blur-sm border-border/40 focus:border-primary/60 focus:ring-2 focus:ring-primary/20 transition-all duration-300 rounded-xl text-base leading-relaxed placeholder:text-muted-foreground/60 hover:border-border/60 hover:bg-background/80" 
                rows={5} 
              />
              {errors.description && (
                <p className="text-sm text-destructive flex items-center gap-2 animate-in slide-in-from-left-2 duration-300">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  <span>{errors.description}</span>
                </p>
              )}
            </div>

            {/* Evidence Guidance */}
            <div className="space-y-4 group">
              <Label htmlFor="evidenceGuidance" className="text-sm font-semibold flex items-center gap-2 text-foreground/90">
                Evidence Guidance
              </Label>
              <Textarea 
                id="evidenceGuidance" 
                placeholder="Describe what evidence or documentation is required (optional)..." 
                value={formData.evidenceGuidance} 
                onChange={e => updateFormData('evidenceGuidance', e.target.value)} 
                className="min-h-[100px] resize-none bg-background/60 backdrop-blur-sm border-border/40 focus:border-primary/60 focus:ring-2 focus:ring-primary/20 transition-all duration-300 rounded-xl text-base leading-relaxed placeholder:text-muted-foreground/60 hover:border-border/60 hover:bg-background/80" 
                rows={4} 
              />
              {errors.evidenceGuidance && (
                <p className="text-sm text-destructive flex items-center gap-2 animate-in slide-in-from-left-2 duration-300">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  <span>{errors.evidenceGuidance}</span>
                </p>
              )}
              <p className="text-xs text-muted-foreground/70 leading-relaxed">
                Help future users understand what documentation or evidence is needed for verification
              </p>
            </div>

            {/* Category and Topic */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="space-y-4 group">
                <Label className="text-sm font-semibold flex items-center gap-2 text-foreground/90">
                  Category <span className="text-destructive text-base">*</span>
                </Label>
                <div className="relative">
                  <EnhancedSearchableCombobox
                    options={categoryOptions}
                    value={formData.category}
                    onValueChange={value => updateFormData('category', value)}
                    onCreateNew={handleCreateCategory}
                    allowCreate={true}
                    placeholder="Select or create category..."
                    searchPlaceholder="Search categories..."
                    className="h-12 bg-background/60 backdrop-blur-sm border-border/40 focus:border-primary/60 focus:ring-2 focus:ring-primary/20 transition-all duration-300 rounded-xl hover:border-border/60 hover:bg-background/80"
                  />
                </div>
                {errors.category && (
                  <p className="text-sm text-destructive flex items-center gap-2 animate-in slide-in-from-left-2 duration-300">
                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                    <span>{errors.category}</span>
                  </p>
                )}
              </div>

              <div className="space-y-4 group">
                <Label className="text-sm font-semibold flex items-center gap-2 text-foreground/90">
                  Topic
                </Label>
                <div className="relative">
                  <EnhancedSearchableCombobox
                    options={topicOptions}
                    value={formData.topic}
                    onValueChange={value => updateFormData('topic', value)}
                    onCreateNew={handleCreateTopic}
                    allowCreate={true}
                    placeholder="Select or create topic..."
                    searchPlaceholder="Search topics..."
                    className="h-12 bg-background/60 backdrop-blur-sm border-border/40 focus:border-primary/60 focus:ring-2 focus:ring-primary/20 transition-all duration-300 rounded-xl hover:border-border/60 hover:bg-background/80"
                  />
                </div>
                {errors.topic && (
                  <p className="text-sm text-destructive flex items-center gap-2 animate-in slide-in-from-left-2 duration-300">
                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                    <span>{errors.topic}</span>
                  </p>
                )}
                <p className="text-xs text-muted-foreground/70 leading-relaxed">
                  Choose an existing topic or type to add a new one
                </p>
              </div>
            </div>

            {/* Responsible Parties */}
            <div className="space-y-5 group">
              <Label className="text-sm font-semibold flex items-center gap-2 text-foreground/90">
                Responsible Parties <span className="text-destructive text-base">*</span>
              </Label>
              
              {/* Regular Roles */}
              <div className="space-y-4">
                <div className="relative">
                  <EnhancedSearchableCombobox
                    options={roleOptions}
                    value=""
                    onValueChange={(value) => {
                      if (value === 'TA2') {
                        addTA2Responsible();
                      } else if (!formData.responsible.includes(value)) {
                        updateFormData('responsible', [...formData.responsible, value]);
                      }
                    }}
                    placeholder="Select role..."
                    searchPlaceholder="Search roles..."
                    className="h-12 bg-background/60 backdrop-blur-sm border-border/40 focus:border-primary/60 focus:ring-2 focus:ring-primary/20 transition-all duration-300 rounded-xl hover:border-border/60 hover:bg-background/80"
                  />
                </div>
                
                {/* Display selected regular responsible parties */}
                {formData.responsible.length > 0 && (
                  <div className="flex flex-wrap gap-3 animate-in slide-in-from-top-2 duration-300">
                    {formData.responsible.map(resp => (
                      <Badge key={resp} variant="secondary" className="h-8 px-4 gap-2 bg-secondary/80 hover:bg-secondary border-0 shadow-sm transition-all duration-200 hover:scale-[1.02]">
                        <span className="font-medium">{resp}</span>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-5 w-5 p-0 hover:bg-destructive/20 hover:text-destructive rounded-full transition-all duration-200" 
                          onClick={() => updateFormData('responsible', formData.responsible.filter(r => r !== resp))}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </Badge>
                    ))}
                  </div>
                )}
                
                {/* TA2 Responsible Parties */}
                {ta2Responsible.map((ta2) => (
                  <div key={ta2.id} className="border border-border/30 rounded-2xl p-6 bg-gradient-to-br from-green-50/50 via-green-50/30 to-transparent dark:from-green-950/20 dark:via-green-950/10 space-y-4 animate-in slide-in-from-top-2 duration-300 shadow-sm">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-semibold text-green-800 dark:text-green-200 flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-green-500"></div>
                        TA2 Responsible Configuration
                      </Label>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeTA2Responsible(ta2.id)}
                        className="h-8 w-8 p-0 text-red-600 hover:bg-red-100 dark:hover:bg-red-950/30 rounded-full transition-all duration-200 hover:scale-110"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-xs font-medium text-muted-foreground/80 uppercase tracking-wide">Discipline</Label>
                        <EnhancedSearchableCombobox
                          options={disciplineOptions}
                          value={ta2.discipline}
                          onValueChange={(value) => updateTA2Responsible(ta2.id, 'discipline', value)}
                          placeholder="Select discipline..."
                          className="h-10 bg-background/80 border-border/30 rounded-lg"
                        />
                      </div>
                      
                      {ta2.discipline && !['Tech Safety', 'Civil'].includes(ta2.discipline) && (
                        <div className="space-y-2 animate-in slide-in-from-right-2 duration-300">
                          <Label className="text-xs font-medium text-muted-foreground/80 uppercase tracking-wide">Commission</Label>
                          <EnhancedSearchableCombobox
                            options={getCommissionOptions(ta2.discipline)}
                            value={ta2.commission}
                            onValueChange={(value) => updateTA2Responsible(ta2.id, 'commission', value)}
                            placeholder="Select commission..."
                            className="h-10 bg-background/80 border-border/30 rounded-lg"
                          />
                        </div>
                      )}
                    </div>
                    
                    {ta2.position && (
                      <Badge variant="outline" className="bg-green-100/80 text-green-800 border-green-200 dark:bg-green-950/30 dark:text-green-200 dark:border-green-800 px-3 py-1 font-medium animate-in zoom-in-50 duration-200">
                        {ta2.position}
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
              
              {errors.responsible && (
                <p className="text-sm text-destructive flex items-center gap-2 animate-in slide-in-from-left-2 duration-300">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  <span>{errors.responsible}</span>
                </p>
              )}
            </div>

            {/* Approvers */}
            <div className="space-y-5 group">
              <Label className="text-sm font-semibold flex items-center gap-2 text-foreground/90">
                Approvers <span className="text-destructive text-base">*</span>
              </Label>
              
              {/* Regular Roles */}
              <div className="space-y-4">
                <div className="relative">
                  <EnhancedSearchableCombobox
                    options={roleOptions}
                    value=""
                    onValueChange={(value) => {
                      if (value === 'TA2') {
                        addTA2Approver();
                      } else if (!formData.approvers.includes(value)) {
                        updateFormData('approvers', [...formData.approvers, value]);
                      }
                    }}
                    placeholder="Select role..."
                    searchPlaceholder="Search roles..."
                    className="h-12 bg-background/60 backdrop-blur-sm border-border/40 focus:border-primary/60 focus:ring-2 focus:ring-primary/20 transition-all duration-300 rounded-xl hover:border-border/60 hover:bg-background/80"
                  />
                </div>
                
                {/* Display selected regular approvers */}
                {formData.approvers.length > 0 && (
                  <div className="flex flex-wrap gap-3 animate-in slide-in-from-top-2 duration-300">
                    {formData.approvers.map(approver => (
                      <Badge key={approver} variant="secondary" className="h-8 px-4 gap-2 bg-secondary/80 hover:bg-secondary border-0 shadow-sm transition-all duration-200 hover:scale-[1.02]">
                        <span className="font-medium">{approver}</span>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-5 w-5 p-0 hover:bg-destructive/20 hover:text-destructive rounded-full transition-all duration-200" 
                          onClick={() => updateFormData('approvers', formData.approvers.filter(a => a !== approver))}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </Badge>
                    ))}
                  </div>
                )}
                
                {/* TA2 Approvers */}
                {ta2Approvers.map((ta2) => (
                  <div key={ta2.id} className="border border-border/30 rounded-2xl p-6 bg-gradient-to-br from-blue-50/50 via-blue-50/30 to-transparent dark:from-blue-950/20 dark:via-blue-950/10 space-y-4 animate-in slide-in-from-top-2 duration-300 shadow-sm">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-semibold text-blue-800 dark:text-blue-200 flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                        TA2 Approver Configuration
                      </Label>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeTA2Approver(ta2.id)}
                        className="h-8 w-8 p-0 text-red-600 hover:bg-red-100 dark:hover:bg-red-950/30 rounded-full transition-all duration-200 hover:scale-110"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-xs font-medium text-muted-foreground/80 uppercase tracking-wide">Discipline</Label>
                        <EnhancedSearchableCombobox
                          options={disciplineOptions}
                          value={ta2.discipline}
                          onValueChange={(value) => updateTA2Approver(ta2.id, 'discipline', value)}
                          placeholder="Select discipline..."
                          className="h-10 bg-background/80 border-border/30 rounded-lg"
                        />
                      </div>
                      
                      {ta2.discipline && !['Tech Safety', 'Civil'].includes(ta2.discipline) && (
                        <div className="space-y-2 animate-in slide-in-from-right-2 duration-300">
                          <Label className="text-xs font-medium text-muted-foreground/80 uppercase tracking-wide">Commission</Label>
                          <EnhancedSearchableCombobox
                            options={getCommissionOptions(ta2.discipline)}
                            value={ta2.commission}
                            onValueChange={(value) => updateTA2Approver(ta2.id, 'commission', value)}
                            placeholder="Select commission..."
                            className="h-10 bg-background/80 border-border/30 rounded-lg"
                          />
                        </div>
                      )}
                    </div>
                    
                    {ta2.position && (
                      <Badge variant="outline" className="bg-blue-100/80 text-blue-800 border-blue-200 dark:bg-blue-950/30 dark:text-blue-200 dark:border-blue-800 px-3 py-1 font-medium animate-in zoom-in-50 duration-200">
                        {ta2.position}
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
              
              {errors.approvers && (
                <p className="text-sm text-destructive flex items-center gap-2 animate-in slide-in-from-left-2 duration-300">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  <span>{errors.approvers}</span>
                </p>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-4 pt-8 border-t border-border/20">
              <Button 
                variant="outline" 
                onClick={onBack}
                className="h-12 px-8 rounded-xl border-border/40 hover:bg-accent/10 hover:border-primary/30 transition-all duration-300 hover:scale-[1.02] font-medium"
              >
                Cancel
              </Button>
              <Button 
                onClick={() => {
                  if (validateForm()) {
                    setShowPreview(true);
                  }
                }} 
                className="h-12 px-8 rounded-xl bg-primary hover:bg-primary/90 shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all duration-300 hover:scale-[1.02] font-medium"
              >
                <Plus className="h-4 w-4 mr-2" />
                Preview & Create
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>;
};
export default CreateChecklistItemForm;
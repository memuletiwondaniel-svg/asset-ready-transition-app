import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Plus, CheckCircle, AlertCircle, X, Search } from 'lucide-react';
import { useCreateChecklistItem } from '@/hooks/useChecklistItems';
import { useTopics } from '@/hooks/useTopics';
import { useRoles, useTA2Commissions, useTA2Disciplines } from '@/hooks/useRoles';
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
  const [approverSearch, setApproverSearch] = useState('');
  const [responsibleSearch, setResponsibleSearch] = useState('');
  const [topicSearch, setTopicSearch] = useState('');
  const [selectedTA2Commission, setSelectedTA2Commission] = useState<string>('');
  const [showTA2Subcategories, setShowTA2Subcategories] = useState(false);

  const createChecklistItemMutation = useCreateChecklistItem();
  const { data: topics = [] } = useTopics();
  const { data: roles = [] } = useRoles();
  const { data: ta2Commissions = [] } = useTA2Commissions();
  const { data: ta2Disciplines = [] } = useTA2Disciplines(selectedTA2Commission);

  // Microsoft Fluent Design categories
  const categories = [
    'General',
    'Process Safety',
    'Organization',
    'Documentation',
    'Health & Safety',
    'Emergency Response',
    'Elect',
    'Static',
    'Rotating',
    'PACO',
    'Civil'
  ];

  // Filter data based on search terms
  const filteredTopics = topics.filter(topic =>
    topic.toLowerCase().includes(topicSearch.toLowerCase())
  );
  
  const filteredApproverRoles = roles.filter(role => 
    role.toLowerCase().includes(approverSearch.toLowerCase())
  );
  
  const filteredResponsibleRoles = roles.filter(role => 
    role.toLowerCase().includes(responsibleSearch.toLowerCase())
  );

  const validateForm = (): boolean => {
    const newErrors: Partial<NewChecklistItemData> = {};

    if (!formData.description.trim()) {
      newErrors.description = 'Checklist question is required';
    }

    if (!formData.category) {
      newErrors.category = 'Category is required';
    }

    if (formData.approvers.length === 0) {
      newErrors.approvers = 'At least one approver is required' as any;
    }

    if (formData.responsible.length === 0) {
      newErrors.responsible = 'At least one responsible party is required' as any;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (validateForm()) {
      try {
        // Generate auto-assigned ID (simplified for demo)
        const autoId = `CHK-${Date.now().toString().slice(-6)}`;
        
        const newItem = {
          id: autoId,
          description: formData.description.trim(),
          required_evidence: formData.evidenceGuidance.trim(),
          category: formData.category,
          Approver: formData.approvers.join(', '),
          responsible: formData.responsible.join(', '),
          topic: formData.topic.trim()
        };

        await createChecklistItemMutation.mutateAsync(newItem);
        
        toast({
          title: "Success",
          description: "Checklist item created successfully",
        });
        
        onComplete(newItem);
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to create checklist item",
          variant: "destructive",
        });
      }
    }
  };

  const updateFormData = (field: keyof NewChecklistItemData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const addApprover = (role: string) => {
    if (role === 'Technical Authority (TA2)') {
      setShowTA2Subcategories(true);
      setApproverSearch('');
      return;
    }
    
    if (!formData.approvers.includes(role)) {
      updateFormData('approvers', [...formData.approvers, role]);
    }
    setApproverSearch('');
    setShowTA2Subcategories(false);
  };

  const addTA2Approver = (commission: string, discipline?: string) => {
    const ta2Role = discipline 
      ? `Technical Authority (TA2) - ${commission} - ${discipline}`
      : `Technical Authority (TA2) - ${commission}`;
    
    if (!formData.approvers.includes(ta2Role)) {
      updateFormData('approvers', [...formData.approvers, ta2Role]);
    }
    setShowTA2Subcategories(false);
    setSelectedTA2Commission('');
    setApproverSearch('');
  };

  const addResponsible = (role: string) => {
    if (!formData.responsible.includes(role)) {
      updateFormData('responsible', [...formData.responsible, role]);
    }
    setResponsibleSearch('');
  };

  const removeResponsible = (role: string) => {
    updateFormData('responsible', formData.responsible.filter(r => r !== role));
  };

  const addTopic = (topic: string) => {
    if (topic.trim() && !topics.includes(topic.trim())) {
      // In a real app, you'd save this to the database
      updateFormData('topic', topic.trim());
    } else {
      updateFormData('topic', topic);
    }
    setTopicSearch('');
  };

  const removeApprover = (role: string) => {
    updateFormData('approvers', formData.approvers.filter(a => a !== role));
  };

  if (showPreview) {
    return (
      <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
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
                  {formData.approvers.map((approver) => (
                    <Badge key={approver} variant="outline">
                      {approver}
                    </Badge>
                  ))}
                </div>
              </div>
              
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Responsible Parties</Label>
                <div className="mt-1 flex flex-wrap gap-2">
                  {formData.responsible.map((resp) => (
                    <Badge key={resp} variant="outline">
                      {resp}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button variant="outline" onClick={() => setShowPreview(false)}>
                Edit
              </Button>
              <Button 
                onClick={handleSubmit} 
                disabled={createChecklistItemMutation.isPending}
                className="bg-primary hover:bg-primary/90"
              >
                {createChecklistItemMutation.isPending ? (
                  <>Creating...</>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Create Item
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-background z-50 overflow-y-auto">
      {/* Microsoft Fluent Design Header */}
      <div className="sticky top-0 bg-background/95 backdrop-blur-lg border-b z-10">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button 
                variant="ghost" 
                onClick={onBack}
                className="fluent-button hover:bg-secondary/50"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <div>
                <h1 className="text-2xl font-semibold">Create Checklist Item</h1>
                <p className="text-sm text-muted-foreground">Add a new item to the PSSR checklist library</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Form Content */}
      <div className="max-w-4xl mx-auto px-6 py-8">
        <Card className="fluent-card">
          <CardHeader>
            <CardTitle>Checklist Item Details</CardTitle>
            <CardDescription>
              Fill in the information for your new checklist item. An ID will be auto-assigned.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Checklist Question */}
            <div className="space-y-3">
              <Label htmlFor="description" className="text-sm font-medium flex items-center gap-2">
                Checklist Question <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="description"
                placeholder="Enter the checklist question or requirement..."
                value={formData.description}
                onChange={(e) => updateFormData('description', e.target.value)}
                className="min-h-[100px] resize-none fluent-input"
                rows={4}
              />
              {errors.description && (
                <p className="text-sm text-destructive flex items-center gap-1">
                  <AlertCircle className="h-4 w-4" />
                  {errors.description}
                </p>
              )}
            </div>

            {/* Evidence Guidance */}
            <div className="space-y-3">
              <Label htmlFor="evidenceGuidance" className="text-sm font-medium flex items-center gap-2">
                Evidence Guidance
              </Label>
              <Textarea
                id="evidenceGuidance"
                placeholder="Describe what evidence or documentation is required (optional)..."
                value={formData.evidenceGuidance}
                onChange={(e) => updateFormData('evidenceGuidance', e.target.value)}
                className="min-h-[80px] resize-none fluent-input"
                rows={3}
              />
              {errors.evidenceGuidance && (
                <p className="text-sm text-destructive flex items-center gap-1">
                  <AlertCircle className="h-4 w-4" />
                  {errors.evidenceGuidance}
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                Help future users understand what documentation or evidence is needed
              </p>
            </div>

            {/* Category and Topic */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <Label className="text-sm font-medium flex items-center gap-2">
                  Category <span className="text-destructive">*</span>
                </Label>
                <Select value={formData.category} onValueChange={(value) => updateFormData('category', value)}>
                  <SelectTrigger className="fluent-input">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border shadow-lg z-50">
                    {categories.map((category) => (
                      <SelectItem key={category} value={category} className="cursor-pointer">
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.category && (
                  <p className="text-sm text-destructive flex items-center gap-1">
                    <AlertCircle className="h-4 w-4" />
                    {errors.category}
                  </p>
                )}
              </div>

              <div className="space-y-3">
                <Label htmlFor="topic" className="text-sm font-medium flex items-center gap-2">
                  Topic
                </Label>
                <div className="relative">
                  <Input
                    id="topic"
                    placeholder="Search or enter new topic..."
                    value={topicSearch || formData.topic}
                    onChange={(e) => {
                      setTopicSearch(e.target.value);
                      if (!e.target.value) {
                        updateFormData('topic', '');
                      }
                    }}
                    className="fluent-input"
                  />
                  <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                </div>
                
                {topicSearch && (
                  <div className="border rounded-lg bg-popover p-2 space-y-1 max-h-48 overflow-y-auto">
                    {filteredTopics.length > 0 && (
                      <>
                        <p className="text-xs text-muted-foreground px-2 py-1">Existing Topics:</p>
                        {filteredTopics.map((topic) => (
                          <Button
                            key={topic}
                            variant="ghost"
                            size="sm"
                            className="w-full justify-start text-left"
                            onClick={() => addTopic(topic)}
                          >
                            {topic}
                          </Button>
                        ))}
                      </>
                    )}
                    {topicSearch.trim() && !topics.includes(topicSearch.trim()) && (
                      <>
                        <Separator />
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full justify-start text-left text-primary"
                          onClick={() => addTopic(topicSearch.trim())}
                        >
                          <Plus className="h-3 w-3 mr-2" />
                          Add "{topicSearch.trim()}" as new topic
                        </Button>
                      </>
                    )}
                  </div>
                )}
                
                {formData.topic && (
                  <Badge variant="outline" className="mt-2">
                    {formData.topic}
                  </Badge>
                )}
                {errors.topic && (
                  <p className="text-sm text-destructive flex items-center gap-1">
                    <AlertCircle className="h-4 w-4" />
                    {errors.topic}
                  </p>
                )}
              </div>
            </div>

            {/* Responsible */}
            <div className="space-y-3">
              <Label className="text-sm font-medium flex items-center gap-2">
                Responsible <span className="text-destructive">*</span>
              </Label>
              <div className="relative">
                <Input
                  placeholder="Search for responsible party..."
                  value={responsibleSearch}
                  onChange={(e) => setResponsibleSearch(e.target.value)}
                  className="fluent-input"
                />
                <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              </div>
              
              {responsibleSearch && filteredResponsibleRoles.length > 0 && (
                <div className="border rounded-lg bg-popover p-2 space-y-1 max-h-48 overflow-y-auto">
                  {filteredResponsibleRoles.map((role) => (
                    <Button
                      key={role}
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start text-left"
                      onClick={() => addResponsible(role)}
                      disabled={formData.responsible.includes(role)}
                    >
                      {role}
                    </Button>
                  ))}
                </div>
              )}
              
              {formData.responsible.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {formData.responsible.map((resp) => (
                    <Badge key={resp} variant="secondary" className="gap-1">
                      {resp}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-4 w-4 p-0 hover:bg-destructive hover:text-destructive-foreground"
                        onClick={() => removeResponsible(resp)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </Badge>
                  ))}
                </div>
              )}
              
              {errors.responsible && (
                <p className="text-sm text-destructive flex items-center gap-1">
                  <AlertCircle className="h-4 w-4" />
                  {errors.responsible}
                </p>
              )}
            </div>

            {/* Approvers */}
            <div className="space-y-3">
              <Label className="text-sm font-medium flex items-center gap-2">
                Approvers <span className="text-destructive">*</span>
              </Label>
              <div className="relative">
                <Input
                  placeholder="Search for approver roles..."
                  value={approverSearch}
                  onChange={(e) => setApproverSearch(e.target.value)}
                  className="fluent-input"
                />
                <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              </div>
              
              {approverSearch && filteredApproverRoles.length > 0 && (
                <div className="border rounded-lg bg-popover p-2 space-y-1 max-h-48 overflow-y-auto">
                  {filteredApproverRoles.map((role) => (
                    <Button
                      key={role}
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start text-left"
                      onClick={() => addApprover(role)}
                      disabled={formData.approvers.includes(role)}
                    >
                      {role}
                      {role === 'Technical Authority (TA2)' && (
                        <ArrowLeft className="h-3 w-3 ml-auto rotate-180" />
                      )}
                    </Button>
                  ))}
                </div>
              )}
              
              {/* TA2 Subcategories */}
              {showTA2Subcategories && (
                <div className="border rounded-lg bg-popover p-3 space-y-3">
                  <p className="text-sm font-medium">Select TA2 Commission:</p>
                  <div className="grid grid-cols-1 gap-2">
                    {ta2Commissions.map((commission) => (
                      <Button
                        key={commission}
                        variant="outline"
                        size="sm"
                        className="justify-start"
                        onClick={() => {
                          setSelectedTA2Commission(commission);
                        }}
                      >
                        {commission}
                      </Button>
                    ))}
                  </div>
                  
                  {selectedTA2Commission && ta2Disciplines.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Select Discipline (optional):</p>
                      <div className="grid grid-cols-1 gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="justify-start text-primary"
                          onClick={() => addTA2Approver(selectedTA2Commission)}
                        >
                          Use Commission Only: {selectedTA2Commission}
                        </Button>
                        {ta2Disciplines.map((discipline) => (
                          <Button
                            key={discipline}
                            variant="ghost"
                            size="sm"
                            className="justify-start"
                            onClick={() => addTA2Approver(selectedTA2Commission, discipline)}
                          >
                            {discipline}
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setShowTA2Subcategories(false);
                      setSelectedTA2Commission('');
                    }}
                  >
                    <X className="h-3 w-3 mr-1" />
                    Cancel
                  </Button>
                </div>
              )}
              
              {formData.approvers.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {formData.approvers.map((approver) => (
                    <Badge key={approver} variant="secondary" className="gap-1">
                      {approver}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-4 w-4 p-0 hover:bg-destructive hover:text-destructive-foreground"
                        onClick={() => removeApprover(approver)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </Badge>
                  ))}
                </div>
              )}
              
              {errors.approvers && (
                <p className="text-sm text-destructive flex items-center gap-1">
                  <AlertCircle className="h-4 w-4" />
                  {errors.approvers}
                </p>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 pt-6 border-t">
              <Button variant="outline" onClick={onBack}>
                Cancel
              </Button>
              <Button 
                onClick={() => {
                  if (validateForm()) {
                    setShowPreview(true);
                  }
                }}
                className="bg-primary hover:bg-primary/90"
              >
                <Plus className="h-4 w-4 mr-2" />
                Preview & Create
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CreateChecklistItemForm;
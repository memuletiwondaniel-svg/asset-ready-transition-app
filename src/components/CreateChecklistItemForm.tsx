import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { EnhancedSearchableCombobox } from '@/components/ui/enhanced-searchable-combobox';
import { ArrowLeft, Plus, CheckCircle, AlertCircle, X, Search, Users, UserCheck } from 'lucide-react';
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
  
  const createChecklistItemMutation = useCreateChecklistItem();
  
  // Hooks for data fetching
  const { data: categories = [] } = useChecklistCategories();
  const createCategoryMutation = useCreateChecklistCategory();
  const { data: topics = [] } = useChecklistTopics();
  const createTopicMutation = useCreateChecklistTopic();
  const { roles } = useRoles();

  // Transform data for comboboxes
  const categoryOptions = categories.map(cat => ({ value: cat.name, label: cat.name }));
  const topicOptions = topics.map(topic => ({ value: topic.name, label: topic.name }));
  const roleOptions = roles.map(role => ({ value: role.name, label: role.name }));

  // Get category prefix for auto-assigned ID
  const getCategoryPrefix = (category: string) => {
    const categoryMap: { [key: string]: string } = {
      'Civil': 'CX',
      'Documentation': 'DC', 
      'Electrical': 'EL',
      'Emergency Response': 'ER',
      'General': 'GN',
      'Health & Safety': 'HS',
      'Organization': 'OR',
      'PACO': 'IN',
      'Process Safety': 'PS',
      'Rotating': 'MR',
      'Static': 'MS'
    };
    return categoryMap[category] || 'XX';
  };

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
        const newItem = {
          description: formData.description.trim(),
          required_evidence: formData.evidenceGuidance.trim(),
          category: formData.category,
          Approver: formData.approvers.join(', '),
          responsible: formData.responsible.join(', '),
          topic: formData.topic.trim(),
          category_ref_id: getCategoryPrefix(formData.category)
        };
        
        await createChecklistItemMutation.mutateAsync(newItem);
        toast({
          title: "Success",
          description: "Checklist item created successfully"
        });
        onComplete(newItem);
      } catch (error) {
        console.error('Create error:', error);
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
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: undefined
      }));
    }
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header with ORSH Logo */}
        <div className="mb-8 text-center space-y-4">
          <div className="flex justify-center mb-6">
            <img 
              src="/images/orsh-logo.png" 
              alt="ORSH Logo" 
              className="h-16 w-auto"
            />
          </div>
        </div>

        {/* Form Card */}
        <Card className="border-border/50 shadow-2xl">
          <CardHeader className="border-b border-border/30 bg-gradient-to-r from-blue-50/50 to-purple-50/50">
            <CardTitle className="text-2xl font-bold text-foreground">Create Checklist Item</CardTitle>
            <CardDescription className="text-base">
              Add a new item to the PSSR Checklist Library
            </CardDescription>
          </CardHeader>
          
          <CardContent className="p-8 space-y-8">
            {/* Checklist Question */}
            <div className="space-y-2">
              <Label htmlFor="description" className="text-base font-semibold">
                Checklist Question <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => updateFormData('description', e.target.value)}
                placeholder="Enter the checklist question or requirement..."
                className="min-h-[60px] resize-none"
                rows={3}
              />
              {errors.description && (
                <p className="text-sm text-destructive flex items-center">
                  <AlertCircle className="h-4 w-4 mr-1" />
                  {errors.description}
                </p>
              )}
            </div>

            {/* Category and Topic Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Category */}
              <div className="space-y-2">
                <Label className="text-base font-semibold">
                  Category <span className="text-destructive">*</span>
                </Label>
                <EnhancedSearchableCombobox
                  options={categoryOptions}
                  value={formData.category}
                  onValueChange={(value) => updateFormData('category', value)}
                  placeholder="Select category..."
                  searchPlaceholder="Search categories..."
                />
                {errors.category && (
                  <p className="text-sm text-destructive flex items-center">
                    <AlertCircle className="h-4 w-4 mr-1" />
                    {errors.category}
                  </p>
                )}
              </div>

              {/* Topic */}
              <div className="space-y-2">
                <Label className="text-base font-semibold">Topic</Label>
                <EnhancedSearchableCombobox
                  options={topicOptions}
                  value={formData.topic}
                  onValueChange={(value) => updateFormData('topic', value)}
                  placeholder="Select or enter topic..."
                  searchPlaceholder="Search topics..."
                />
              </div>
            </div>

            {/* Evidence Guidance */}
            <div className="space-y-2">
              <Label htmlFor="evidenceGuidance" className="text-base font-semibold">
                Evidence Guidance
              </Label>
              <Textarea
                id="evidenceGuidance"
                value={formData.evidenceGuidance}
                onChange={(e) => updateFormData('evidenceGuidance', e.target.value)}
                placeholder="Describe what evidence or documentation is required..."
                className="min-h-[50px] resize-none"
                rows={2}
              />
            </div>

            {/* Approvers Section */}
            <Card className="overflow-hidden border-border/50 shadow-lg">
              <CardHeader className="bg-gradient-to-r from-blue-50/80 to-indigo-50/80 border-b border-border/30">
                <CardTitle className="text-lg font-semibold text-foreground flex items-center gap-2">
                  <UserCheck className="h-5 w-5 text-blue-600" />
                  Approvers
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <EnhancedSearchableCombobox
                  options={roleOptions}
                  value=""
                  onValueChange={(value) => {
                    if (value && !formData.approvers.includes(value)) {
                      updateFormData('approvers', [...formData.approvers, value]);
                    }
                  }}
                  placeholder="Add approvers..."
                  searchPlaceholder="Search roles..."
                />
                {formData.approvers.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-4">
                    {formData.approvers.map((approver, index) => (
                      <Badge key={index} variant="secondary" className="px-3 py-1">
                        {approver}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-4 w-4 p-0 ml-2"
                          onClick={() => updateFormData('approvers', formData.approvers.filter(a => a !== approver))}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </Badge>
                    ))}
                  </div>
                )}
                {errors.approvers && (
                  <p className="text-sm text-destructive flex items-center mt-2">
                    <AlertCircle className="h-4 w-4 mr-1" />
                    {errors.approvers}
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Responsible Section */}
            <Card className="overflow-hidden border-border/50 shadow-lg">
              <CardHeader className="bg-gradient-to-r from-orange-50/80 to-red-50/80 border-b border-border/30">
                <CardTitle className="text-lg font-semibold text-foreground flex items-center gap-2">
                  <Users className="h-5 w-5 text-orange-600" />
                  Responsible
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <EnhancedSearchableCombobox
                  options={roleOptions}
                  value=""
                  onValueChange={(value) => {
                    if (value && !formData.responsible.includes(value)) {
                      updateFormData('responsible', [...formData.responsible, value]);
                    }
                  }}
                  placeholder="Add responsible parties..."
                  searchPlaceholder="Search roles..."
                />
                {formData.responsible.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-4">
                    {formData.responsible.map((resp, index) => (
                      <Badge key={index} variant="secondary" className="px-3 py-1">
                        {resp}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-4 w-4 p-0 ml-2"
                          onClick={() => updateFormData('responsible', formData.responsible.filter(r => r !== resp))}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </Badge>
                    ))}
                  </div>
                )}
                {errors.responsible && (
                  <p className="text-sm text-destructive flex items-center mt-2">
                    <AlertCircle className="h-4 w-4 mr-1" />
                    {errors.responsible}
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="flex justify-between pt-6">
              <Button 
                variant="outline" 
                onClick={onBack} 
                disabled={createChecklistItemMutation.isPending}
                className="px-6 py-2 rounded-lg border-2 border-primary/20 text-primary hover:bg-primary/5 hover:border-primary/40 transition-all duration-200 font-medium"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Manage Checklist
              </Button>
              <Button 
                onClick={handleSubmit} 
                disabled={createChecklistItemMutation.isPending}
                className="px-8 py-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-lg shadow-lg transition-all duration-200 font-medium"
              >
                {createChecklistItemMutation.isPending ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Item
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CreateChecklistItemForm;
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Plus, CheckCircle, AlertCircle } from 'lucide-react';
import { ChecklistItem } from '@/data/pssrChecklistData';

interface CreateChecklistItemFormProps {
  onBack: () => void;
  onComplete: (item: Omit<ChecklistItem, 'id'>) => void;
  existingCategories?: string[];
}

interface NewChecklistItemData {
  description: string;
  supportingEvidence: string;
  category: string;
  approvingAuthority: string;
  responsibleParty: string;
  customCategory: string;
}

const CreateChecklistItemForm: React.FC<CreateChecklistItemFormProps> = ({ 
  onBack, 
  onComplete,
  existingCategories = []
}) => {
  const [formData, setFormData] = useState<NewChecklistItemData>({
    description: '',
    supportingEvidence: '',
    category: '',
    approvingAuthority: '',
    responsibleParty: '',
    customCategory: ''
  });

  const [errors, setErrors] = useState<Partial<NewChecklistItemData>>({});

  // Predefined categories
  const defaultCategories = [
    'General',
    'Technical Integrity', 
    'Health & Safety',
    'Start-Up Readiness',
    'Plant Integrity',
    'Process Safety',
    'People',
    'Documentation',
    'PSSR Walkdown'
  ];

  // Combine default and existing categories, remove duplicates
  const allCategories = [...new Set([...defaultCategories, ...existingCategories])];

  // Common approving authorities
  const approvingAuthorities = [
    'PSSR Lead',
    'Operations Manager',
    'Engineering Manager', 
    'Safety Manager',
    'Plant Manager',
    'Technical Authority',
    'Process Engineer',
    'Mechanical Engineer',
    'Electrical Engineer',
    'HSE Coordinator',
    'Maintenance Supervisor',
    'Quality Assurance Manager'
  ];

  // Common responsible parties
  const responsibleParties = [
    'Operations Team',
    'Engineering Team',
    'Maintenance Team',
    'HSE Team',
    'Project Team',
    'Quality Team',
    'Technical Team',
    'Safety Team',
    'Process Team',
    'Mechanical Team',
    'Electrical Team',
    'Instrumentation Team'
  ];

  const validateForm = (): boolean => {
    const newErrors: Partial<NewChecklistItemData> = {};

    if (!formData.description.trim()) {
      newErrors.description = 'Question/Description is required';
    }

    if (!formData.supportingEvidence.trim()) {
      newErrors.supportingEvidence = 'Evidence guidance is required';
    }

    if (!formData.category && !formData.customCategory.trim()) {
      newErrors.category = 'Category is required';
    }

    if (!formData.approvingAuthority.trim()) {
      newErrors.approvingAuthority = 'Approving authority is required';
    }

    if (!formData.responsibleParty.trim()) {
      newErrors.responsibleParty = 'Responsible party is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (validateForm()) {
      const finalCategory = formData.category === 'custom' ? formData.customCategory : formData.category;
      
      const newItem: Omit<ChecklistItem, 'id'> = {
        description: formData.description.trim(),
        supportingEvidence: formData.supportingEvidence.trim(),
        category: finalCategory,
        approvingAuthority: formData.approvingAuthority.trim()
      };

      onComplete(newItem);
    }
  };

  const updateFormData = (field: keyof NewChecklistItemData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

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
                  Create New Checklist Item
                </h1>
                <p className="text-sm text-muted-foreground font-medium">Add a custom item to the PSSR checklist library</p>
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
            <CardTitle className="text-2xl">Checklist Item Details</CardTitle>
            <CardDescription>
              Define the attributes for your new checklist item. The Reference ID will be automatically assigned.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Question/Description */}
            <div className="space-y-2">
              <Label htmlFor="description" className="text-base font-semibold">
                Question/Description <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="description"
                placeholder="Enter the checklist question or requirement description..."
                value={formData.description}
                onChange={(e) => updateFormData('description', e.target.value)}
                className="min-h-[100px] resize-none"
                rows={4}
              />
              {errors.description && (
                <p className="text-sm text-destructive flex items-center">
                  <AlertCircle className="h-4 w-4 mr-1" />
                  {errors.description}
                </p>
              )}
              <p className="text-sm text-muted-foreground">
                Clearly describe what needs to be verified or checked during the PSSR process
              </p>
            </div>

            {/* Evidence Guidance */}
            <div className="space-y-2">
              <Label htmlFor="supportingEvidence" className="text-base font-semibold">
                Evidence Guidance <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="supportingEvidence"
                placeholder="Describe what evidence or documentation is required..."
                value={formData.supportingEvidence}
                onChange={(e) => updateFormData('supportingEvidence', e.target.value)}
                className="min-h-[80px] resize-none"
                rows={3}
              />
              {errors.supportingEvidence && (
                <p className="text-sm text-destructive flex items-center">
                  <AlertCircle className="h-4 w-4 mr-1" />
                  {errors.supportingEvidence}
                </p>
              )}
              <p className="text-sm text-muted-foreground">
                Specify what documentation, certificates, or evidence should be provided to satisfy this requirement
              </p>
            </div>

            {/* Category */}
            <div className="space-y-2">
              <Label className="text-base font-semibold">
                Category <span className="text-destructive">*</span>
              </Label>
              <Select value={formData.category} onValueChange={(value) => updateFormData('category', value)}>
                <SelectTrigger className="h-12">
                  <SelectValue placeholder="Select a category for this checklist item" />
                </SelectTrigger>
                <SelectContent className="bg-popover border border-border shadow-lg z-50 max-h-60">
                  {allCategories.map((category) => (
                    <SelectItem key={category} value={category} className="cursor-pointer">
                      {category}
                    </SelectItem>
                  ))}
                  <SelectItem value="custom" className="cursor-pointer font-medium">
                    + Create New Category
                  </SelectItem>
                </SelectContent>
              </Select>
              
              {/* Custom Category Input */}
              {formData.category === 'custom' && (
                <div className="mt-3 space-y-2">
                  <Label htmlFor="customCategory" className="text-sm font-medium">
                    New Category Name
                  </Label>
                  <Input
                    id="customCategory"
                    placeholder="Enter new category name"
                    value={formData.customCategory}
                    onChange={(e) => updateFormData('customCategory', e.target.value)}
                    className="h-10"
                  />
                </div>
              )}
              
              {errors.category && (
                <p className="text-sm text-destructive flex items-center">
                  <AlertCircle className="h-4 w-4 mr-1" />
                  {errors.category}
                </p>
              )}
            </div>

            {/* Two-column layout for Responsible Party and Approving Authority */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Responsible Party */}
              <div className="space-y-2">
                <Label htmlFor="responsibleParty" className="text-base font-semibold">
                  Responsible Party <span className="text-destructive">*</span>
                </Label>
                <Select value={formData.responsibleParty} onValueChange={(value) => updateFormData('responsibleParty', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select responsible party" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border border-border shadow-lg z-50">
                    {responsibleParties.map((party) => (
                      <SelectItem key={party} value={party} className="cursor-pointer">
                        {party}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.responsibleParty && (
                  <p className="text-sm text-destructive flex items-center">
                    <AlertCircle className="h-4 w-4 mr-1" />
                    {errors.responsibleParty}
                  </p>
                )}
                <p className="text-sm text-muted-foreground">
                  Team responsible for completing this requirement
                </p>
              </div>

              {/* Approving Authority */}
              <div className="space-y-2">
                <Label htmlFor="approvingAuthority" className="text-base font-semibold">
                  Approving Authority <span className="text-destructive">*</span>
                </Label>
                <Select value={formData.approvingAuthority} onValueChange={(value) => updateFormData('approvingAuthority', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select approving authority" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border border-border shadow-lg z-50">
                    {approvingAuthorities.map((authority) => (
                      <SelectItem key={authority} value={authority} className="cursor-pointer">
                        {authority}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.approvingAuthority && (
                  <p className="text-sm text-destructive flex items-center">
                    <AlertCircle className="h-4 w-4 mr-1" />
                    {errors.approvingAuthority}
                  </p>
                )}
                <p className="text-sm text-muted-foreground">
                  Authority who will approve this requirement
                </p>
              </div>
            </div>

            {/* Preview Section */}
            <div className="bg-muted/20 rounded-lg p-6 space-y-4">
              <h3 className="font-semibold text-lg">Preview</h3>
              <div className="space-y-3 text-sm">
                <div>
                  <span className="font-medium text-muted-foreground">Reference ID:</span>
                  <span className="ml-2 text-green-600 font-medium">[Auto-assigned]</span>
                </div>
                <div>
                  <span className="font-medium text-muted-foreground">Question:</span>
                  <p className="mt-1">{formData.description || 'Not specified'}</p>
                </div>
                <div>
                  <span className="font-medium text-muted-foreground">Evidence Guidance:</span>
                  <p className="mt-1">{formData.supportingEvidence || 'Not specified'}</p>
                </div>
                <div className="flex flex-wrap gap-4">
                  <div>
                    <span className="font-medium text-muted-foreground">Category:</span>
                    <span className="ml-2">{formData.category === 'custom' ? formData.customCategory : formData.category || 'Not selected'}</span>
                  </div>
                  <div>
                    <span className="font-medium text-muted-foreground">Responsible Party:</span>
                    <span className="ml-2">{formData.responsibleParty || 'Not selected'}</span>
                  </div>
                  <div>
                    <span className="font-medium text-muted-foreground">Approving Authority:</span>
                    <span className="ml-2">{formData.approvingAuthority || 'Not selected'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end pt-6 border-t border-border/20">
              <Button 
                onClick={handleSubmit}
                className="fluent-button bg-primary hover:bg-primary-hover px-8"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Checklist Item
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CreateChecklistItemForm;
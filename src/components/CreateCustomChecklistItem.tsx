import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { X, Save, AlertCircle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useChecklistCategories } from '@/hooks/useChecklistCategories';
import { useChecklistTopics } from '@/hooks/useChecklistTopics';

interface CreateCustomChecklistItemProps {
  pssrId: string;
  onClose: () => void;
  onSave: (item: any) => void;
}

interface CustomChecklistItemData {
  description: string;
  evidenceGuidance: string;
  category: string;
  topic: string;
  responsible: string[];
  approver: string[];
}

const CreateCustomChecklistItem: React.FC<CreateCustomChecklistItemProps> = ({
  pssrId,
  onClose,
  onSave
}) => {
  const [formData, setFormData] = useState<CustomChecklistItemData>({
    description: '',
    evidenceGuidance: '',
    category: '',
    topic: '',
    responsible: [],
    approver: []
  });
  const [errors, setErrors] = useState<Partial<Record<keyof CustomChecklistItemData, string>>>({});
  const [responsibleInput, setResponsibleInput] = useState('');
  const [approverInput, setApproverInput] = useState('');

  const { data: categories = [] } = useChecklistCategories();
  const { data: topics = [] } = useChecklistTopics();

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof CustomChecklistItemData, string>> = {};
    
    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    }
    if (!formData.category) {
      newErrors.category = 'Category is required';
    }
    if (formData.responsible.length === 0) {
      newErrors.responsible = 'At least one responsible party is required';
    }
    if (formData.approver.length === 0) {
      newErrors.approver = 'At least one approver is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (validateForm()) {
      const customItem = {
        ...formData,
        pssrId,
        isCustom: true,
        unique_id: `CUSTOM-${Date.now()}`,
        created_at: new Date().toISOString()
      };
      
      onSave(customItem);
      toast({
        title: 'Success',
        description: 'Custom checklist item created for this PSSR'
      });
      onClose();
    }
  };

  const updateFormData = (field: keyof CustomChecklistItemData, value: any) => {
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

  const addResponsible = () => {
    if (responsibleInput.trim()) {
      updateFormData('responsible', [...formData.responsible, responsibleInput.trim()]);
      setResponsibleInput('');
    }
  };

  const removeResponsible = (index: number) => {
    updateFormData('responsible', formData.responsible.filter((_, i) => i !== index));
  };

  const addApprover = () => {
    if (approverInput.trim()) {
      updateFormData('approver', [...formData.approver, approverInput.trim()]);
      setApproverInput('');
    }
  };

  const removeApprover = (index: number) => {
    updateFormData('approver', formData.approver.filter((_, i) => i !== index));
  };

  return (
    <div className="fixed inset-0 z-50 bg-background overflow-auto">
      {/* Animated gradient background */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-muted/20" />
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl animate-gradient-color-morph" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-accent/5 rounded-full blur-3xl animate-gradient-color-morph animation-delay-2000" />
      </div>

      <div className="max-w-4xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Create Custom Checklist Item
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              This item will be specific to PSSR: {pssrId}
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Form */}
        <Card className="bg-card/60 backdrop-blur-sm border-border/40">
          <CardHeader>
            <CardTitle>Checklist Item Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">
                Checklist Question <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="description"
                placeholder="Enter the checklist question..."
                value={formData.description}
                onChange={(e) => updateFormData('description', e.target.value)}
                rows={3}
                className={errors.description ? 'border-destructive' : ''}
              />
              {errors.description && (
                <p className="text-xs text-destructive flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {errors.description}
                </p>
              )}
            </div>

            {/* Evidence Guidance */}
            <div className="space-y-2">
              <Label htmlFor="evidence">Evidence Guidance (Optional)</Label>
              <Textarea
                id="evidence"
                placeholder="Describe what evidence is required..."
                value={formData.evidenceGuidance}
                onChange={(e) => updateFormData('evidenceGuidance', e.target.value)}
                rows={2}
              />
            </div>

            {/* Category and Topic */}
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category">
                  Category <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => updateFormData('category', value)}
                >
                  <SelectTrigger className={errors.category ? 'border-destructive' : ''}>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.name}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.category && (
                  <p className="text-xs text-destructive flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {errors.category}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="topic">Topic (Optional)</Label>
                <Select
                  value={formData.topic}
                  onValueChange={(value) => updateFormData('topic', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select topic" />
                  </SelectTrigger>
                  <SelectContent>
                    {topics.map((topic) => (
                      <SelectItem key={topic.id} value={topic.name}>
                        {topic.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Responsible */}
            <div className="space-y-2">
              <Label>
                Responsible <span className="text-destructive">*</span>
              </Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Enter responsible party name"
                  value={responsibleInput}
                  onChange={(e) => setResponsibleInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addResponsible())}
                />
                <Button type="button" onClick={addResponsible} variant="outline">
                  Add
                </Button>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {formData.responsible.map((resp, index) => (
                  <Badge key={index} variant="secondary" className="gap-1">
                    {resp}
                    <button onClick={() => removeResponsible(index)}>
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
              {errors.responsible && (
                <p className="text-xs text-destructive flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {errors.responsible}
                </p>
              )}
            </div>

            {/* Approver */}
            <div className="space-y-2">
              <Label>
                Approver <span className="text-destructive">*</span>
              </Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Enter approver name"
                  value={approverInput}
                  onChange={(e) => setApproverInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addApprover())}
                />
                <Button type="button" onClick={addApprover} variant="outline">
                  Add
                </Button>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {formData.approver.map((app, index) => (
                  <Badge key={index} variant="secondary" className="gap-1">
                    {app}
                    <button onClick={() => removeApprover(index)}>
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
              {errors.approver && (
                <p className="text-xs text-destructive flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {errors.approver}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-end gap-3 mt-6">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} className="gap-2">
            <Save className="h-4 w-4" />
            Save Custom Item
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CreateCustomChecklistItem;

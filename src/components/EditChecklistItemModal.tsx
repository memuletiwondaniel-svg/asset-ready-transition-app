import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Combobox } from '@/components/ui/combobox';
import { MultiSelectCombobox } from '@/components/ui/multi-select-combobox';
import { CheckCircle, ArrowLeft, AlertCircle, Plus, Trash2, X, Users, Shield, User } from 'lucide-react';
import { ChecklistItem, useUpdateChecklistItem, UpdateChecklistItemData } from '@/hooks/useChecklistItems';
import { useChecklistCategories } from '@/hooks/useChecklistCategories';
import { useChecklistTopics } from '@/hooks/useChecklistTopics';
import { useRoles } from '@/hooks/useRoles';
import { useDisciplines } from '@/hooks/useDisciplines';
import { useCommissions } from '@/hooks/useCommissions';
import { useToast } from '@/hooks/use-toast';

interface EditChecklistItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: ChecklistItem;
  onSaveComplete?: () => void;
}

interface NewChecklistItemData {
  description: string;
  evidenceGuidance: string;
  category: string;
  topic: string;
  approvers: string[];
  responsible: string[];
}

const EditChecklistItemModal: React.FC<EditChecklistItemModalProps> = ({
  isOpen,
  onClose,
  item,
  onSaveComplete,
}) => {
  const [formData, setFormData] = useState<NewChecklistItemData>({
    description: '',
    evidenceGuidance: '',
    category: '',
    topic: '',
    approvers: [],
    responsible: []
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPreview, setShowPreview] = useState(false);
  const [ta2Approvers, setTA2Approvers] = useState<Array<{id: string; discipline: string; commission: string; position: string}>>([]);
  const [ta2Responsible, setTA2Responsible] = useState<Array<{id: string; discipline: string; commission: string; position: string}>>([]);
  const [engrManagerApprovers, setEngrManagerApprovers] = useState<Array<{id: string; commission: string; position: string}>>([]);
  const [engrManagerResponsible, setEngrManagerResponsible] = useState<Array<{id: string; commission: string; position: string}>>([]);
  const [hseLeadApprovers, setHSELeadApprovers] = useState<Array<{id: string; commission: string; position: string}>>([]);
  const [hseLeadResponsible, setHSELeadResponsible] = useState<Array<{id: string; commission: string; position: string}>>([]);
  const [directorApprovers, setDirectorApprovers] = useState<Array<{id: string; commission: string; position: string}>>([]);
  const [directorResponsible, setDirectorResponsible] = useState<Array<{id: string; commission: string; position: string}>>([]);

  const { toast } = useToast();
  const { data: categories = [] } = useChecklistCategories();
  const { data: topics = [] } = useChecklistTopics();
  const { roles } = useRoles();
  const { disciplines } = useDisciplines();
  const { commissions } = useCommissions();
  const updateChecklistItemMutation = useUpdateChecklistItem();

  // Initialize form data from item
  useEffect(() => {
    if (item) {
      setFormData({
        description: item.description || '',
        evidenceGuidance: item.required_evidence || '',
        category: item.category || '',
        topic: item.topic || '',
        approvers: item.Approver ? item.Approver.split(', ').filter(Boolean) : [],
        responsible: item.responsible ? item.responsible.split(', ').filter(Boolean) : []
      });
    }
  }, [item]);

  const approverOptions = [
    "TA2",
    "Area Authority",
    "Control System Authority", 
    "Electrical Authority",
    "Instrument Authority",
    "Mechanical Authority",
    "Process Authority",
    "Safety Authority",
    "Operations Authority",
    "Plant Director",
    "Commissioning Manager",
    "Engineering Manager",
    "HSE Lead",
    "Operation Team Lead",
    "Site Engineer",
    "Construction Manager"
  ];

  const responsibleOptions = [
    "TA2",
    "Area Engineer",
    "Control System Engineer",
    "Electrical Engineer", 
    "Instrument Engineer",
    "Mechanical Engineer",
    "Process Engineer",
    "Safety Engineer",
    "Operations Engineer",
    "Commissioning Engineer",
    "Engineering Manager",
    "HSE Lead",
    "Construction Manager",
    "Site Engineer"
  ];

  const disciplineOptions = disciplines?.map(d => ({ value: d.name, label: d.name })) || [];
  const commissionOptions = commissions?.map(c => ({ value: c.name, label: c.name })) || [];
  const categoryOptions = categories?.map(c => ({ value: c.name, label: c.name })) || [];
  const topicOptions = topics?.map(t => ({ value: t.name, label: t.name })) || [];

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.description.trim()) {
      newErrors.description = 'Checklist question is required';
    }
    if (!formData.category) {
      newErrors.category = 'Category is required';
    }
    
    // Check if at least one approver is selected
    if (formData.approvers.length === 0 && ta2Approvers.length === 0 && engrManagerApprovers.length === 0 && hseLeadApprovers.length === 0 && directorApprovers.length === 0) {
      newErrors.approvers = 'At least one approver is required' as any;
    }
    if (formData.responsible.length === 0 && ta2Responsible.length === 0 && engrManagerResponsible.length === 0 && hseLeadResponsible.length === 0 && directorResponsible.length === 0) {
      newErrors.responsible = 'At least one responsible party is required' as any;
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (validateForm()) {
      try {
        // Combine all approvers
        const allApprovers = [
          ...formData.approvers,
          ...ta2Approvers.map(ta2 => ta2.position),
          ...engrManagerApprovers.map(engr => engr.position),
          ...hseLeadApprovers.map(hse => hse.position),
          ...directorApprovers.map(dir => dir.position)
        ];
        
        // Combine all responsible
        const allResponsible = [
          ...formData.responsible,
          ...ta2Responsible.map(ta2 => ta2.position),
          ...engrManagerResponsible.map(engr => engr.position),
          ...hseLeadResponsible.map(hse => hse.position),
          ...directorResponsible.map(dir => dir.position)
        ];
        
        const updateData: UpdateChecklistItemData = {
          description: formData.description.trim(),
          required_evidence: formData.evidenceGuidance.trim(),
          category: formData.category,
          Approver: allApprovers.join(', '),
          responsible: allResponsible.join(', '),
          topic: formData.topic.trim()
        };
        
        await updateChecklistItemMutation.mutateAsync({ itemId: item.unique_id, updateData });
        toast({
          title: "Success",
          description: "Checklist item updated successfully"
        });
        onClose();
        onSaveComplete?.();
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to update checklist item",
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
        [field]: ''
      }));
    }
  };

  // TA2 Management Functions
  const addTA2Approver = () => {
    const newTA2 = {
      id: `ta2-${Date.now()}`,
      discipline: '',
      commission: '',
      position: ''
    };
    setTA2Approvers(prev => [...prev, newTA2]);
  };

  const addTA2Responsible = () => {
    const newTA2 = {
      id: `ta2-${Date.now()}`, 
      discipline: '',
      commission: '',
      position: ''
    };
    setTA2Responsible(prev => [...prev, newTA2]);
  };

  const removeTA2Approver = (id: string) => {
    setTA2Approvers(prev => prev.filter(ta2 => ta2.id !== id));
  };

  const removeTA2Responsible = (id: string) => {
    setTA2Responsible(prev => prev.filter(ta2 => ta2.id !== id));
  };

  const updateTA2Approver = (id: string, field: 'discipline' | 'commission', value: string) => {
    setTA2Approvers(prev => prev.map(ta2 => {
      if (ta2.id === id) {
        const updated = { ...ta2, [field]: value };
        if (updated.discipline && updated.commission) {
          updated.position = `TA2 ${updated.discipline} (${updated.commission})`;
        }
        return updated;
      }
      return ta2;
    }));
  };

  const updateTA2Responsible = (id: string, field: 'discipline' | 'commission', value: string) => {
    setTA2Responsible(prev => prev.map(ta2 => {
      if (ta2.id === id) {
        const updated = { ...ta2, [field]: value };
        if (updated.discipline && updated.commission) {
          updated.position = `TA2 ${updated.discipline} (${updated.commission})`;
        }
        return updated;
      }
      return ta2;
    }));
  };

  if (showPreview) {
    return <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 no-hover-effects">
        <Card className="w-full max-w-4xl">
          <CardHeader>
            <CardTitle>Preview: Edit Checklist Item</CardTitle>
            <CardDescription>Review your updated checklist item before saving</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <Badge variant="secondary" className="bg-primary/10 text-primary">
                  {(() => {
                    // Generate prefix from category name by taking first letter of each word
                    const generatePrefix = (category: string) => {
                      return category
                        .split(' ')
                        .map(word => word.charAt(0).toUpperCase())
                        .join('');
                    };
                    const prefix = generatePrefix(formData.category || 'General');
                    const serialNumber = String(Date.now()).slice(-2).padStart(2, '0');
                    return `${prefix}-${serialNumber}`;
                  })()}
                </Badge>
              </div>
              
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Checklist Question</Label>
                <p className="mt-1 text-sm">{formData.description}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Category</Label>
                  <p className="mt-1 text-sm">{formData.category}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Topic</Label>
                  <p className="mt-1 text-sm">{formData.topic || 'Not specified'}</p>
                </div>
              </div>
              
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Evidence Guidance</Label>
                <p className="mt-1 text-sm">{formData.evidenceGuidance || 'None specified'}</p>
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
              <Button onClick={handleSubmit} disabled={updateChecklistItemMutation.isPending} className="bg-primary hover:bg-primary/90">
                {updateChecklistItemMutation.isPending ? <>Updating...</> : <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Update Item
                  </>}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[95vh] p-0 overflow-hidden">
        <div className="fixed inset-0 bg-background z-50 overflow-y-auto no-hover-effects">
          {/* Microsoft Fluent Design Header */}
          <div className="sticky top-0 bg-background/95 backdrop-blur-lg border-b z-10">
            <div className="max-w-4xl mx-auto px-6 py-4">
              <div className="flex items-center justify-between">
                {/* Back Button with Microsoft Fluent Design */}
                <Button 
                  variant="outline" 
                  onClick={onClose} 
                  className="px-6 py-2 h-auto bg-background hover:bg-primary/5 border-border/60 hover:border-primary/30 text-foreground hover:text-primary transition-all duration-200 font-medium rounded-lg shadow-sm hover:shadow-md"
                >
                  <ArrowLeft className="h-4 w-4 mr-3" />
                  Back to Manage Checklist
                </Button>
                
                {/* ORSH Logo Center */}
                <div className="absolute left-1/2 transform -translate-x-1/2">
                  <div className="transition-all duration-300 hover:scale-110 hover:drop-shadow-lg">
                    <img 
                      src="/images/orsh-logo.png" 
                      alt="ORSH Logo" 
                      className="h-40 w-auto filter drop-shadow-sm"
                    />
                  </div>
                </div>
                
                {/* Empty div for layout balance */}
                <div className="w-48"></div>
              </div>
            </div>
          </div>

          {/* Form Content */}
          <div className="max-w-4xl mx-auto px-6 py-8">
            <Card className="fluent-card">
              <CardHeader>
                <CardTitle>Edit Checklist Item</CardTitle>
                <CardDescription>
                  Modify the information for this checklist item. ID: {item?.unique_id}
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
                    onChange={e => updateFormData('description', e.target.value)} 
                    className="min-h-[120px] resize-none fluent-input" 
                    rows={2} 
                  />
                  {errors.description && <p className="text-sm text-destructive flex items-center gap-1">
                      <AlertCircle className="h-4 w-4" />
                      {errors.description}
                    </p>}
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
                    onChange={e => updateFormData('evidenceGuidance', e.target.value)} 
                    className="min-h-[40px] resize-none fluent-input" 
                    rows={2} 
                  />
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
                    <Combobox
                      options={categoryOptions}
                      value={formData.category}
                      onValueChange={(value) => updateFormData('category', value)}
                      placeholder="Select or search category..."
                      searchPlaceholder="Search categories..."
                      allowCustom={true}
                    />
                    {errors.category && <p className="text-sm text-destructive flex items-center gap-1">
                        <AlertCircle className="h-4 w-4" />
                        {errors.category}
                      </p>}
                  </div>

                  <div className="space-y-3">
                    <Label className="text-sm font-medium">Topic</Label>
                    <Combobox
                      options={topicOptions}
                      value={formData.topic}
                      onValueChange={(value) => updateFormData('topic', value)}
                      placeholder="Select or search topic..."
                      searchPlaceholder="Search topics..."
                      allowCustom={true}
                    />
                  </div>
                </div>

                {/* Approvers Section */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-blue-600" />
                    <Label className="text-base font-semibold">Approvers</Label>
                    <span className="text-destructive">*</span>
                  </div>
                  
                  <MultiSelectCombobox
                    options={approverOptions.map(opt => ({ value: opt, label: opt }))}
                    selectedValues={formData.approvers}
                    onValueChange={(values) => updateFormData('approvers', values)}
                    placeholder="Select approvers..."
                    searchPlaceholder="Search approvers..."
                  />

                  {/* TA2 Approvers Configuration */}
                  {formData.approvers.includes('TA2') && (
                    <div className="space-y-3 p-4 border border-blue-200 rounded-lg bg-blue-50/50">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm font-medium text-blue-700">TA2 Approvers Configuration</Label>
                        <Button 
                          type="button" 
                          variant="outline" 
                          size="sm" 
                          onClick={addTA2Approver}
                          className="text-blue-600 border-blue-200 hover:bg-blue-100"
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Add TA2
                        </Button>
                      </div>
                      
                      {ta2Approvers.map((ta2) => (
                        <div key={ta2.id} className="grid grid-cols-3 gap-3 p-3 bg-white rounded border">
                          <Combobox
                            options={disciplineOptions}
                            value={ta2.discipline}
                            onValueChange={(value) => updateTA2Approver(ta2.id, 'discipline', value)}
                            placeholder="Select discipline..."
                            searchPlaceholder="Search disciplines..."
                            allowCustom={true}
                          />
                          <Combobox
                            options={commissionOptions}
                            value={ta2.commission}
                            onValueChange={(value) => updateTA2Approver(ta2.id, 'commission', value)}
                            placeholder="Select commission..."
                            searchPlaceholder="Search commissions..."
                            allowCustom={true}
                          />
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="flex-1">
                              {ta2.position || 'Configure above'}
                            </Badge>
                            <Button 
                              type="button" 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => removeTA2Approver(ta2.id)}
                              className="text-red-600 hover:bg-red-100"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {errors.approvers && <p className="text-sm text-destructive flex items-center gap-1">
                      <AlertCircle className="h-4 w-4" />
                      {errors.approvers}
                    </p>}
                </div>

                {/* Responsible Parties Section */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-green-600" />
                    <Label className="text-base font-semibold">Responsible Parties</Label>
                    <span className="text-destructive">*</span>
                  </div>
                  
                  <MultiSelectCombobox
                    options={responsibleOptions.map(opt => ({ value: opt, label: opt }))}
                    selectedValues={formData.responsible}
                    onValueChange={(values) => updateFormData('responsible', values)}
                    placeholder="Select responsible parties..."
                    searchPlaceholder="Search responsible parties..."
                  />

                  {/* TA2 Responsible Configuration */}
                  {formData.responsible.includes('TA2') && (
                    <div className="space-y-3 p-4 border border-green-200 rounded-lg bg-green-50/50">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm font-medium text-green-700">TA2 Responsible Configuration</Label>
                        <Button 
                          type="button" 
                          variant="outline" 
                          size="sm" 
                          onClick={addTA2Responsible}
                          className="text-green-600 border-green-200 hover:bg-green-100"
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Add TA2
                        </Button>
                      </div>
                      
                      {ta2Responsible.map((ta2) => (
                        <div key={ta2.id} className="grid grid-cols-3 gap-3 p-3 bg-white rounded border">
                          <Combobox
                            options={disciplineOptions}
                            value={ta2.discipline}
                            onValueChange={(value) => updateTA2Responsible(ta2.id, 'discipline', value)}
                            placeholder="Select discipline..."
                            searchPlaceholder="Search disciplines..."
                            allowCustom={true}
                          />
                          <Combobox
                            options={commissionOptions}
                            value={ta2.commission}
                            onValueChange={(value) => updateTA2Responsible(ta2.id, 'commission', value)}
                            placeholder="Select commission..."
                            searchPlaceholder="Search commissions..."
                            allowCustom={true}
                          />
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="flex-1">
                              {ta2.position || 'Configure above'}
                            </Badge>
                            <Button 
                              type="button" 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => removeTA2Responsible(ta2.id)}
                              className="text-red-600 hover:bg-red-100"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {errors.responsible && <p className="text-sm text-destructive flex items-center gap-1">
                      <AlertCircle className="h-4 w-4" />
                      {errors.responsible}
                    </p>}
                </div>

                {/* Footer Actions */}
                <div className="flex justify-between items-center pt-6 border-t">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setShowPreview(true)}
                    className="fluent-button-secondary"
                  >
                    Preview Changes
                  </Button>
                  <div className="flex gap-3">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={onClose}
                    >
                      Cancel
                    </Button>
                    <Button 
                      onClick={handleSubmit} 
                      disabled={updateChecklistItemMutation.isPending}
                      className="bg-primary hover:bg-primary/90"
                    >
                      {updateChecklistItemMutation.isPending ? 'Updating...' : 'Update Item'}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EditChecklistItemModal;
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
  const [showTA2ApproverConfig, setShowTA2ApproverConfig] = useState<string | null>(null);
  const [showTA2ResponsibleConfig, setShowTA2ResponsibleConfig] = useState<string | null>(null);
  const [showEngrManagerApproverConfig, setShowEngrManagerApproverConfig] = useState<string | null>(null);
  const [showEngrManagerResponsibleConfig, setShowEngrManagerResponsibleConfig] = useState<string | null>(null);
  const [showHSELeadApproverConfig, setShowHSELeadApproverConfig] = useState<string | null>(null);
  const [showHSELeadResponsibleConfig, setShowHSELeadResponsibleConfig] = useState<string | null>(null);
  const [engrManagerApprovers, setEngrManagerApprovers] = useState<Array<{id: string; commission: string; position: string}>>([]);
  const [engrManagerResponsible, setEngrManagerResponsible] = useState<Array<{id: string; commission: string; position: string}>>([]);
  const [hseLeadApprovers, setHSELeadApprovers] = useState<Array<{id: string; commission: string; position: string}>>([]);
  const [hseLeadResponsible, setHSELeadResponsible] = useState<Array<{id: string; commission: string; position: string}>>([]);
  
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

  // Get commission options for Engineering Manager (only P&E and Asset)
  const getEngrManagerCommissionOptions = () => {
    return commissions
      .filter(comm => ['P&E', 'Asset'].includes(comm.name))
      .map(comm => ({ value: comm.name, label: comm.name }));
  };

  // Get commission options for HSE Lead (only P&E and Asset)
  const getHSELeadCommissionOptions = () => {
    return commissions
      .filter(comm => ['P&E', 'Asset'].includes(comm.name))
      .map(comm => ({ value: comm.name, label: comm.name }));
  };

  // Get distinct colors for different approver types
  const getApproverColor = (type: string, position?: string) => {
    if (type === 'regular') {
      return 'bg-purple-50 text-purple-700 border-purple-200';
    } else if (type === 'ta2') {
      // Different colors for different TA2 disciplines
      if (position?.includes('Process')) return 'bg-orange-50 text-orange-700 border-orange-200';
      if (position?.includes('Elect')) return 'bg-amber-50 text-amber-700 border-amber-200';
      if (position?.includes('Tech Safety')) return 'bg-red-50 text-red-700 border-red-200';
      if (position?.includes('Civil')) return 'bg-stone-50 text-stone-700 border-stone-200';
      if (position?.includes('Instrument')) return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      if (position?.includes('Mechanical')) return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      return 'bg-orange-50 text-orange-700 border-orange-200'; // default TA2 color
    } else if (type === 'engrManager') {
      return 'bg-cyan-50 text-cyan-700 border-cyan-200';
    } else if (type === 'hseLead') {
      // Different colors for different HSE Lead commissions
      if (position?.includes('P&E')) return 'bg-pink-50 text-pink-700 border-pink-200';
      if (position?.includes('Asset')) return 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200';
      return 'bg-pink-50 text-pink-700 border-pink-200'; // default HSE Lead color
    }
    return 'bg-gray-50 text-gray-700 border-gray-200';
  };

  const getResponsibleColor = (type: string, position?: string) => {
    if (type === 'regular') {
      return 'bg-blue-50 text-blue-700 border-blue-200';
    } else if (type === 'ta2') {
      // Different colors for different TA2 disciplines
      if (position?.includes('Process')) return 'bg-green-50 text-green-700 border-green-200';
      if (position?.includes('Elect')) return 'bg-lime-50 text-lime-700 border-lime-200';
      if (position?.includes('Tech Safety')) return 'bg-rose-50 text-rose-700 border-rose-200';
      if (position?.includes('Civil')) return 'bg-slate-50 text-slate-700 border-slate-200';
      if (position?.includes('Instrument')) return 'bg-teal-50 text-teal-700 border-teal-200';
      if (position?.includes('Mechanical')) return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      return 'bg-green-50 text-green-700 border-green-200'; // default TA2 color
    } else if (type === 'engrManager') {
      return 'bg-indigo-50 text-indigo-700 border-indigo-200';
    } else if (type === 'hseLead') {
      // Different colors for different HSE Lead commissions
      if (position?.includes('P&E')) return 'bg-violet-50 text-violet-700 border-violet-200';
      if (position?.includes('Asset')) return 'bg-purple-50 text-purple-700 border-purple-200';
      return 'bg-violet-50 text-violet-700 border-violet-200'; // default HSE Lead color
    }
    return 'bg-gray-50 text-gray-700 border-gray-200';
  };
  const validateForm = (): boolean => {
    const newErrors: Partial<NewChecklistItemData> = {};
    if (!formData.description.trim()) {
      newErrors.description = 'Checklist question is required';
    }
    if (!formData.category) {
      newErrors.category = 'Category is required';
    }
    if (formData.approvers.length === 0 && ta2Approvers.length === 0 && engrManagerApprovers.length === 0 && hseLeadApprovers.length === 0) {
      newErrors.approvers = 'At least one approver is required' as any;
    }
    if (formData.responsible.length === 0 && ta2Responsible.length === 0 && engrManagerResponsible.length === 0 && hseLeadResponsible.length === 0) {
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
          ...hseLeadApprovers.map(hse => hse.position)
        ];
        
        // Combine all responsible
        const allResponsible = [
          ...formData.responsible,
          ...ta2Responsible.map(ta2 => ta2.position),
          ...engrManagerResponsible.map(engr => engr.position),
          ...hseLeadResponsible.map(hse => hse.position)
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
    setShowTA2ApproverConfig(newTA2.id);
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
            // Hide config once position is complete
            if (disc) setShowTA2ApproverConfig(null);
          } else if (disc && comm) {
            updated.position = `TA2 ${disc} (${comm})`;
            // Hide config once position is complete
            setShowTA2ApproverConfig(null);
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
    setShowTA2ResponsibleConfig(newTA2.id);
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
            // Hide config once position is complete
            if (disc) setShowTA2ResponsibleConfig(null);
          } else if (disc && comm) {
            updated.position = `TA2 ${disc} (${comm})`;
            // Hide config once position is complete
            setShowTA2ResponsibleConfig(null);
          } else if (disc) {
            updated.position = `TA2 ${disc}`;
          }
        }
        
        return updated;
      }
      return ta2;
    }));
  };

  // Engineering Manager management functions
  const addEngrManagerApprover = () => {
    const newEngrManager = {
      id: Date.now().toString(),
      commission: '',
      position: ''
    };
    setEngrManagerApprovers([...engrManagerApprovers, newEngrManager]);
    setShowEngrManagerApproverConfig(newEngrManager.id);
  };

  const updateEngrManagerApprover = (id: string, field: string, value: string) => {
    setEngrManagerApprovers(prev => prev.map(engr => {
      if (engr.id === id) {
        const updated = { ...engr, [field]: value };
        if (field === 'commission' && value) {
          updated.position = `Engr. Manager (${value})`;
          setShowEngrManagerApproverConfig(null);
        }
        return updated;
      }
      return engr;
    }));
  };

  const removeEngrManagerApprover = (id: string) => {
    setEngrManagerApprovers(prev => prev.filter(engr => engr.id !== id));
  };

  const addEngrManagerResponsible = () => {
    const newEngrManager = {
      id: Date.now().toString(),
      commission: '',
      position: ''
    };
    setEngrManagerResponsible([...engrManagerResponsible, newEngrManager]);
    setShowEngrManagerResponsibleConfig(newEngrManager.id);
  };

  const updateEngrManagerResponsible = (id: string, field: string, value: string) => {
    setEngrManagerResponsible(prev => prev.map(engr => {
      if (engr.id === id) {
        const updated = { ...engr, [field]: value };
        if (field === 'commission' && value) {
          updated.position = `Engr. Manager (${value})`;
          setShowEngrManagerResponsibleConfig(null);
        }
        return updated;
      }
      return engr;
    }));
  };

  // HSE Lead management functions
  const addHSELeadApprover = () => {
    const newHSELead = {
      id: Date.now().toString(),
      commission: '',
      position: ''
    };
    setHSELeadApprovers([...hseLeadApprovers, newHSELead]);
    setShowHSELeadApproverConfig(newHSELead.id);
  };

  const updateHSELeadApprover = (id: string, field: string, value: string) => {
    setHSELeadApprovers(prev => prev.map(hse => {
      if (hse.id === id) {
        const updated = { ...hse, [field]: value };
        if (field === 'commission' && value) {
          updated.position = `HSE Lead (${value})`;
          setShowHSELeadApproverConfig(null);
        }
        return updated;
      }
      return hse;
    }));
  };

  const removeHSELeadApprover = (id: string) => {
    setHSELeadApprovers(prev => prev.filter(hse => hse.id !== id));
  };

  const addHSELeadResponsible = () => {
    const newHSELead = {
      id: Date.now().toString(),
      commission: '',
      position: ''
    };
    setHSELeadResponsible([...hseLeadResponsible, newHSELead]);
    setShowHSELeadResponsibleConfig(newHSELead.id);
  };

  const updateHSELeadResponsible = (id: string, field: string, value: string) => {
    setHSELeadResponsible(prev => prev.map(hse => {
      if (hse.id === id) {
        const updated = { ...hse, [field]: value };
        if (field === 'commission' && value) {
          updated.position = `HSE Lead (${value})`;
          setShowHSELeadResponsibleConfig(null);
        }
        return updated;
      }
      return hse;
    }));
  };

  const removeHSELeadResponsible = (id: string) => {
    setHSELeadResponsible(prev => prev.filter(hse => hse.id !== id));
  };

  const removeEngrManagerResponsible = (id: string) => {
    setEngrManagerResponsible(prev => prev.filter(engr => engr.id !== id));
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
  return <div className="fixed inset-0 bg-background z-50 overflow-y-auto">
      {/* Microsoft Fluent Design Header */}
      <div className="sticky top-0 bg-background/95 backdrop-blur-lg border-b z-10">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button variant="ghost" onClick={onBack} className="fluent-button hover:bg-secondary/50">
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
            <CardTitle>Create New Checklist Item</CardTitle>
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
              <Textarea id="description" placeholder="Enter the checklist question or requirement..." value={formData.description} onChange={e => updateFormData('description', e.target.value)} className="min-h-[100px] resize-none fluent-input" rows={4} />
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
              <Textarea id="evidenceGuidance" placeholder="Describe what evidence or documentation is required (optional)..." value={formData.evidenceGuidance} onChange={e => updateFormData('evidenceGuidance', e.target.value)} className="min-h-[80px] resize-none fluent-input" rows={3} />
              {errors.evidenceGuidance && <p className="text-sm text-destructive flex items-center gap-1">
                  <AlertCircle className="h-4 w-4" />
                  {errors.evidenceGuidance}
                </p>}
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
                <EnhancedSearchableCombobox
                  options={categoryOptions}
                  value={formData.category}
                  onValueChange={value => updateFormData('category', value)}
                  onCreateNew={handleCreateCategory}
                  allowCreate={true}
                  placeholder="Select or create category..."
                  searchPlaceholder="Search categories..."
                  className="fluent-input"
                />
                {errors.category && <p className="text-sm text-destructive flex items-center gap-1">
                    <AlertCircle className="h-4 w-4" />
                    {errors.category}
                  </p>}
              </div>

              <div className="space-y-3">
                <Label className="text-sm font-medium flex items-center gap-2">
                  Topic
                </Label>
                <EnhancedSearchableCombobox
                  options={topicOptions}
                  value={formData.topic}
                  onValueChange={value => updateFormData('topic', value)}
                  onCreateNew={handleCreateTopic}
                  allowCreate={true}
                  placeholder="Select or create topic..."
                  searchPlaceholder="Search topics..."
                  className="fluent-input"
                />
                {errors.topic && <p className="text-sm text-destructive flex items-center gap-1">
                    <AlertCircle className="h-4 w-4" />
                    {errors.topic}
                  </p>}
                <p className="text-xs text-muted-foreground">
                  Choose an existing topic or type to add a new one
                </p>
              </div>
            </div>

            {/* Responsible Parties */}
            <div className="space-y-3">
              <Label className="text-sm font-medium flex items-center gap-2">
                Responsible Parties <span className="text-destructive">*</span>
              </Label>
              
              {/* Regular Roles */}
              <div className="space-y-3">
                <EnhancedSearchableCombobox
                  options={roleOptions}
                  value=""
                  onValueChange={(value) => {
                    if (value === 'TA2') {
                      addTA2Responsible();
                    } else if (value === 'Engr. Manager') {
                      addEngrManagerResponsible();
                    } else if (value === 'HSE Lead') {
                      addHSELeadResponsible();
                    } else if (!formData.responsible.includes(value)) {
                      updateFormData('responsible', [...formData.responsible, value]);
                    }
                  }}
                  placeholder="Select role..."
                  searchPlaceholder="Search roles..."
                  className="fluent-input"
                />
                
                {/* Display all responsible parties together */}
                {(formData.responsible.length > 0 || ta2Responsible.filter(ta2 => ta2.position).length > 0 || engrManagerResponsible.filter(engr => engr.position).length > 0 || hseLeadResponsible.filter(hse => hse.position).length > 0) && (
                  <div className="flex flex-wrap gap-2">
                    {formData.responsible.map(resp => (
                      <Badge key={resp} variant="secondary" className={`gap-1 ${getResponsibleColor('regular')}`}>
                        {resp}
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-4 w-4 p-0 hover:bg-destructive hover:text-destructive-foreground" 
                          onClick={() => updateFormData('responsible', formData.responsible.filter(r => r !== resp))}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </Badge>
                    ))}
                    {ta2Responsible.filter(ta2 => ta2.position).map(ta2 => (
                      <Badge key={ta2.id} variant="secondary" className={`gap-1 ${getResponsibleColor('ta2', ta2.position)}`}>
                        {ta2.position}
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-4 w-4 p-0 hover:bg-destructive hover:text-destructive-foreground" 
                          onClick={() => removeTA2Responsible(ta2.id)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </Badge>
                    ))}
                    {engrManagerResponsible.filter(engr => engr.position).map(engr => (
                      <Badge key={engr.id} variant="secondary" className={`gap-1 ${getResponsibleColor('engrManager')}`}>
                        {engr.position}
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-4 w-4 p-0 hover:bg-destructive hover:text-destructive-foreground" 
                          onClick={() => removeEngrManagerResponsible(engr.id)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </Badge>
                    ))}
                    {hseLeadResponsible.filter(hse => hse.position).map(hse => (
                      <Badge key={hse.id} variant="secondary" className={`gap-1 ${getResponsibleColor('hseLead', hse.position)}`}>
                        {hse.position}
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-4 w-4 p-0 hover:bg-destructive hover:text-destructive-foreground" 
                          onClick={() => removeHSELeadResponsible(hse.id)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </Badge>
                    ))}
                  </div>
                )}
                
                {/* TA2 Responsible Configuration */}
                {ta2Responsible.map((ta2) => (
                  showTA2ResponsibleConfig === ta2.id && (
                    <div key={ta2.id} className="border rounded-lg p-4 bg-green-50/50 space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm font-medium text-green-800">Configure TA2 Responsible</Label>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            removeTA2Responsible(ta2.id);
                            setShowTA2ResponsibleConfig(null);
                          }}
                          className="h-6 w-6 p-0 text-red-600 hover:bg-red-100"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs text-muted-foreground">Discipline</Label>
                          <EnhancedSearchableCombobox
                            options={disciplineOptions}
                            value={ta2.discipline}
                            onValueChange={(value) => updateTA2Responsible(ta2.id, 'discipline', value)}
                            placeholder="Select discipline..."
                            className="h-8"
                          />
                        </div>
                        
                        {ta2.discipline && !['Tech Safety', 'Civil'].includes(ta2.discipline) && (
                          <div>
                            <Label className="text-xs text-muted-foreground">Commission</Label>
                            <EnhancedSearchableCombobox
                              options={getCommissionOptions(ta2.discipline)}
                              value={ta2.commission}
                              onValueChange={(value) => updateTA2Responsible(ta2.id, 'commission', value)}
                              placeholder="Select commission..."
                              className="h-8"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  )
                 ))}
                
                {/* Engineering Manager Responsible Configuration */}
                {engrManagerResponsible.map((engr) => (
                  showEngrManagerResponsibleConfig === engr.id && (
                    <div key={engr.id} className="border rounded-lg p-4 bg-indigo-50/50 space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm font-medium text-indigo-800">Configure Engineering Manager</Label>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            removeEngrManagerResponsible(engr.id);
                            setShowEngrManagerResponsibleConfig(null);
                          }}
                          className="h-6 w-6 p-0 text-red-600 hover:bg-red-100"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      
                      <div>
                        <Label className="text-xs text-muted-foreground">Commission</Label>
                        <EnhancedSearchableCombobox
                          options={getEngrManagerCommissionOptions()}
                          value={engr.commission}
                          onValueChange={(value) => updateEngrManagerResponsible(engr.id, 'commission', value)}
                          placeholder="Select commission..."
                          className="h-8"
                        />
                      </div>
                    </div>
                  )
                ))}
                
                {/* HSE Lead Responsible Configuration */}
                {hseLeadResponsible.map((hse) => (
                  showHSELeadResponsibleConfig === hse.id && (
                    <div key={hse.id} className="border rounded-lg p-4 bg-violet-50/50 space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm font-medium text-violet-800">Configure HSE Lead</Label>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            removeHSELeadResponsible(hse.id);
                            setShowHSELeadResponsibleConfig(null);
                          }}
                          className="h-6 w-6 p-0 text-red-600 hover:bg-red-100"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      
                      <div>
                        <Label className="text-xs text-muted-foreground">Commission</Label>
                        <EnhancedSearchableCombobox
                          options={getHSELeadCommissionOptions()}
                          value={hse.commission}
                          onValueChange={(value) => updateHSELeadResponsible(hse.id, 'commission', value)}
                          placeholder="Select commission..."
                          className="h-8"
                        />
                      </div>
                    </div>
                  )
                ))}
              </div>
              
              {errors.responsible && <p className="text-sm text-destructive flex items-center gap-1">
                  <AlertCircle className="h-4 w-4" />
                  {errors.responsible}
                </p>}
            </div>

            {/* Approvers */}
            <div className="space-y-3">
              <Label className="text-sm font-medium flex items-center gap-2">
                Approvers <span className="text-destructive">*</span>
              </Label>
              
              {/* Regular Roles */}
              <div className="space-y-3">
                <EnhancedSearchableCombobox
                  options={roleOptions}
                  value=""
                  onValueChange={(value) => {
                    if (value === 'TA2') {
                      addTA2Approver();
                    } else if (value === 'Engr. Manager') {
                      addEngrManagerApprover();
                    } else if (value === 'HSE Lead') {
                      addHSELeadApprover();
                    } else if (!formData.approvers.includes(value)) {
                      updateFormData('approvers', [...formData.approvers, value]);
                    }
                  }}
                  placeholder="Select role..."
                  searchPlaceholder="Search roles..."
                  className="fluent-input"
                />
                
                {/* Display all approvers together */}
                {(formData.approvers.length > 0 || ta2Approvers.filter(ta2 => ta2.position).length > 0 || engrManagerApprovers.filter(engr => engr.position).length > 0 || hseLeadApprovers.filter(hse => hse.position).length > 0) && (
                  <div className="flex flex-wrap gap-2">
                    {formData.approvers.map(approver => (
                      <Badge key={approver} variant="secondary" className={`gap-1 ${getApproverColor('regular')}`}>
                        {approver}
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-4 w-4 p-0 hover:bg-destructive hover:text-destructive-foreground" 
                          onClick={() => updateFormData('approvers', formData.approvers.filter(a => a !== approver))}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </Badge>
                    ))}
                    {ta2Approvers.filter(ta2 => ta2.position).map(ta2 => (
                      <Badge key={ta2.id} variant="secondary" className={`gap-1 ${getApproverColor('ta2', ta2.position)}`}>
                        {ta2.position}
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-4 w-4 p-0 hover:bg-destructive hover:text-destructive-foreground" 
                          onClick={() => removeTA2Approver(ta2.id)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </Badge>
                    ))}
                    {engrManagerApprovers.filter(engr => engr.position).map(engr => (
                      <Badge key={engr.id} variant="secondary" className={`gap-1 ${getApproverColor('engrManager')}`}>
                        {engr.position}
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-4 w-4 p-0 hover:bg-destructive hover:text-destructive-foreground" 
                          onClick={() => removeEngrManagerApprover(engr.id)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </Badge>
                    ))}
                    {hseLeadApprovers.filter(hse => hse.position).map(hse => (
                      <Badge key={hse.id} variant="secondary" className={`gap-1 ${getApproverColor('hseLead', hse.position)}`}>
                        {hse.position}
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-4 w-4 p-0 hover:bg-destructive hover:text-destructive-foreground" 
                          onClick={() => removeHSELeadApprover(hse.id)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </Badge>
                    ))}
                  </div>
                )}
                
                {/* TA2 Approver Configuration */}
                {ta2Approvers.map((ta2) => (
                  showTA2ApproverConfig === ta2.id && (
                    <div key={ta2.id} className="border rounded-lg p-4 bg-blue-50/50 space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm font-medium text-blue-800">Configure TA2 Approver</Label>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            removeTA2Approver(ta2.id);
                            setShowTA2ApproverConfig(null);
                          }}
                          className="h-6 w-6 p-0 text-red-600 hover:bg-red-100"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs text-muted-foreground">Discipline</Label>
                          <EnhancedSearchableCombobox
                            options={disciplineOptions}
                            value={ta2.discipline}
                            onValueChange={(value) => updateTA2Approver(ta2.id, 'discipline', value)}
                            placeholder="Select discipline..."
                            className="h-8"
                          />
                        </div>
                        
                        {ta2.discipline && !['Tech Safety', 'Civil'].includes(ta2.discipline) && (
                          <div>
                            <Label className="text-xs text-muted-foreground">Commission</Label>
                            <EnhancedSearchableCombobox
                              options={getCommissionOptions(ta2.discipline)}
                              value={ta2.commission}
                              onValueChange={(value) => updateTA2Approver(ta2.id, 'commission', value)}
                              placeholder="Select commission..."
                              className="h-8"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  )
                ))}
                
                {/* Engineering Manager Approver Configuration */}
                {engrManagerApprovers.map((engr) => (
                  showEngrManagerApproverConfig === engr.id && (
                    <div key={engr.id} className="border rounded-lg p-4 bg-cyan-50/50 space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm font-medium text-cyan-800">Configure Engineering Manager</Label>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            removeEngrManagerApprover(engr.id);
                            setShowEngrManagerApproverConfig(null);
                          }}
                          className="h-6 w-6 p-0 text-red-600 hover:bg-red-100"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      
                      <div>
                        <Label className="text-xs text-muted-foreground">Commission</Label>
                        <EnhancedSearchableCombobox
                          options={getEngrManagerCommissionOptions()}
                          value={engr.commission}
                          onValueChange={(value) => updateEngrManagerApprover(engr.id, 'commission', value)}
                          placeholder="Select commission..."
                          className="h-8"
                        />
                      </div>
                    </div>
                  )
                ))}
                
                {/* HSE Lead Approver Configuration */}
                {hseLeadApprovers.map((hse) => (
                  showHSELeadApproverConfig === hse.id && (
                    <div key={hse.id} className="border rounded-lg p-4 bg-pink-50/50 space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm font-medium text-pink-800">Configure HSE Lead</Label>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            removeHSELeadApprover(hse.id);
                            setShowHSELeadApproverConfig(null);
                          }}
                          className="h-6 w-6 p-0 text-red-600 hover:bg-red-100"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      
                      <div>
                        <Label className="text-xs text-muted-foreground">Commission</Label>
                        <EnhancedSearchableCombobox
                          options={getHSELeadCommissionOptions()}
                          value={hse.commission}
                          onValueChange={(value) => updateHSELeadApprover(hse.id, 'commission', value)}
                          placeholder="Select commission..."
                          className="h-8"
                        />
                      </div>
                    </div>
                  )
                ))}
              </div>
              
              {errors.approvers && <p className="text-sm text-destructive flex items-center gap-1">
                  <AlertCircle className="h-4 w-4" />
                  {errors.approvers}
                </p>}
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 pt-6 border-t">
              <Button variant="outline" onClick={onBack}>
                Cancel
              </Button>
              <Button onClick={() => {
              if (validateForm()) {
                setShowPreview(true);
              }
            }} className="bg-primary hover:bg-primary/90">
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
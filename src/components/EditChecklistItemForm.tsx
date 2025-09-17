import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { EnhancedSearchableCombobox } from '@/components/ui/enhanced-searchable-combobox';
import { ArrowLeft, Plus, CheckCircle, AlertCircle, X, Search, Users, UserCheck, Save } from 'lucide-react';
import { useUpdateChecklistItem } from '@/hooks/useChecklistItems';
import { useChecklistCategories, useCreateChecklistCategory } from '@/hooks/useChecklistCategories';
import { useChecklistTopics, useCreateChecklistTopic } from '@/hooks/useChecklistTopics';
import { useRoles } from '@/hooks/useRoles';
import { useDisciplines } from '@/hooks/useDisciplines';
import { useCommissions } from '@/hooks/useCommissions';
import { toast } from '@/hooks/use-toast';

interface EditChecklistItemFormProps {
  item: any;
  onBack: () => void;
  onComplete: (item: any) => void;
}

interface ChecklistItemData {
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

const EditChecklistItemForm: React.FC<EditChecklistItemFormProps> = ({
  item,
  onBack,
  onComplete
}) => {
  const [formData, setFormData] = useState<ChecklistItemData>({
    description: item.description || '',
    evidenceGuidance: item.required_evidence || '',
    category: item.category || '',
    approvers: item.Approver ? item.Approver.split(', ') : [],
    responsible: item.responsible ? item.responsible.split(', ') : [],
    topic: item.topic || ''
  });
  const [errors, setErrors] = useState<Partial<ChecklistItemData>>({});
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [ta2Approvers, setTA2Approvers] = useState<TA2Approver[]>([]);
  const [ta2Responsible, setTA2Responsible] = useState<TA2Approver[]>([]);
  const [showTA2ApproverConfig, setShowTA2ApproverConfig] = useState<string | null>(null);
  const [showTA2ResponsibleConfig, setShowTA2ResponsibleConfig] = useState<string | null>(null);
  const [showEngrManagerApproverConfig, setShowEngrManagerApproverConfig] = useState<string | null>(null);
  const [showEngrManagerResponsibleConfig, setShowEngrManagerResponsibleConfig] = useState<string | null>(null);
  const [showHSELeadApproverConfig, setShowHSELeadApproverConfig] = useState<string | null>(null);
  const [showHSELeadResponsibleConfig, setShowHSELeadResponsibleConfig] = useState<string | null>(null);
  const [showDirectorApproverConfig, setShowDirectorApproverConfig] = useState<string | null>(null);
  const [showDirectorResponsibleConfig, setShowDirectorResponsibleConfig] = useState<string | null>(null);
  const [engrManagerApprovers, setEngrManagerApprovers] = useState<Array<{id: string; commission: string; position: string}>>([]);
  const [engrManagerResponsible, setEngrManagerResponsible] = useState<Array<{id: string; commission: string; position: string}>>([]);
  const [hseLeadApprovers, setHSELeadApprovers] = useState<Array<{id: string; commission: string; position: string}>>([]);
  const [hseLeadResponsible, setHSELeadResponsible] = useState<Array<{id: string; commission: string; position: string}>>([]);
  const [directorApprovers, setDirectorApprovers] = useState<Array<{id: string; commission: string; position: string}>>([]);
  const [directorResponsible, setDirectorResponsible] = useState<Array<{id: string; commission: string; position: string}>>([]);
  
  const updateChecklistItemMutation = useUpdateChecklistItem();
  
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

  // Get commission options for Director (all commissions)
  const getDirectorCommissionOptions = () => {
    return commissions.map(comm => ({ value: comm.name, label: comm.name }));
  };

  // Get distinct colors for different approver types
  const getApproverColor = (type: string, position?: string) => {
    if (type === 'regular') {
      return 'bg-purple-50 text-purple-700 border-purple-200';
    } else if (type === 'project') {
      if (position === 'Construction Lead') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      if (position === 'Commissioning Lead') return 'bg-teal-50 text-teal-700 border-teal-200';
      if (position === 'Proj Manager') return 'bg-green-50 text-green-700 border-green-200';
      if (position === 'Proj Engr') return 'bg-lime-50 text-lime-700 border-lime-200';
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    } else if (type === 'asset') {
      if (position === 'ORA Engineer') return 'bg-amber-50 text-amber-700 border-amber-200';
      if (position === 'Ops Coach') return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      if (position === 'Site Engineer') return 'bg-orange-50 text-orange-700 border-orange-200';
      if (position === 'Dep. Plant Director') return 'bg-red-50 text-red-700 border-red-200';
      if (position === 'Ops Team Lead') return 'bg-pink-50 text-pink-700 border-pink-200';
      return 'bg-amber-50 text-amber-700 border-amber-200';
    } else if (type === 'ta2') {
      // Different colors for different TA2 disciplines
      if (position?.includes('Process')) return 'bg-blue-50 text-blue-700 border-blue-200';
      if (position?.includes('Elect')) return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      if (position?.includes('Tech Safety')) return 'bg-violet-50 text-violet-700 border-violet-200';
      if (position?.includes('Civil')) return 'bg-purple-50 text-purple-700 border-purple-200';
      if (position?.includes('Instrument')) return 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200';
      if (position?.includes('Mechanical')) return 'bg-rose-50 text-rose-700 border-rose-200';
      return 'bg-blue-50 text-blue-700 border-blue-200'; // default TA2 color
    } else if (type === 'engrManager') {
      return 'bg-cyan-50 text-cyan-700 border-cyan-200';
    } else if (type === 'hse') {
      if (position === 'HSE Manager') return 'bg-violet-50 text-violet-700 border-violet-200';
      if (position === 'HSE Director') return 'bg-purple-50 text-purple-700 border-purple-200';
      if (position === 'ER Lead') return 'bg-pink-50 text-pink-700 border-pink-200';
      return 'bg-violet-50 text-violet-700 border-violet-200';
    } else if (type === 'hseLead') {
      // Different colors for different HSE Lead commissions
      if (position?.includes('P&E')) return 'bg-pink-50 text-pink-700 border-pink-200';
      if (position?.includes('Asset')) return 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200';
      return 'bg-pink-50 text-pink-700 border-pink-200'; // default HSE Lead color
    } else if (type === 'director') {
      // Different colors for different Director commissions
      if (position?.includes('P&E')) return 'bg-sky-50 text-sky-700 border-sky-200';
      if (position?.includes('Asset')) return 'bg-blue-50 text-blue-700 border-blue-200';
      if (position?.includes('HSE')) return 'bg-teal-50 text-teal-700 border-teal-200';
      if (position === 'Plant Director') return 'bg-slate-50 text-slate-700 border-slate-200';
      return 'bg-sky-50 text-sky-700 border-sky-200'; // default Director color
    }
    return 'bg-gray-50 text-gray-700 border-gray-200';
  };

  const getResponsibleColor = (type: string, position?: string) => {
    if (type === 'regular') {
      return 'bg-orange-100 text-orange-800 border-orange-300';
    } else if (type === 'project') {
      if (position === 'Construction Lead') return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      if (position === 'Commissioning Lead') return 'bg-teal-100 text-teal-800 border-teal-300';
      if (position === 'Proj Manager') return 'bg-green-100 text-green-800 border-green-300';
      if (position === 'Proj Engr') return 'bg-lime-100 text-lime-800 border-lime-300';
      return 'bg-emerald-100 text-emerald-800 border-emerald-300';
    } else if (type === 'asset') {
      if (position === 'ORA Engineer') return 'bg-amber-100 text-amber-800 border-amber-300';
      if (position === 'Ops Coach') return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      if (position === 'Site Engineer') return 'bg-orange-100 text-orange-800 border-orange-300';
      if (position === 'Dep. Plant Director') return 'bg-red-100 text-red-800 border-red-300';
      if (position === 'Ops Team Lead') return 'bg-pink-100 text-pink-800 border-pink-300';
      return 'bg-amber-100 text-amber-800 border-amber-300';
    } else if (type === 'ta2') {
      // Distinct colors for different TA2 disciplines
      if (position?.includes('Process')) return 'bg-blue-100 text-blue-800 border-blue-300';
      if (position?.includes('Elect')) return 'bg-indigo-100 text-indigo-800 border-indigo-300';
      if (position?.includes('Tech Safety')) return 'bg-violet-100 text-violet-800 border-violet-300';
      if (position?.includes('Civil')) return 'bg-purple-100 text-purple-800 border-purple-300';
      if (position?.includes('Instrument')) return 'bg-fuchsia-100 text-fuchsia-800 border-fuchsia-300';
      if (position?.includes('Mechanical')) return 'bg-rose-100 text-rose-800 border-rose-300';
      return 'bg-blue-100 text-blue-800 border-blue-300'; // default TA2 color
    } else if (type === 'engrManager') {
      return 'bg-indigo-100 text-indigo-800 border-indigo-300';
    } else if (type === 'hse') {
      if (position === 'HSE Manager') return 'bg-violet-100 text-violet-800 border-violet-300';
      if (position === 'HSE Director') return 'bg-purple-100 text-purple-800 border-purple-300';
      if (position === 'ER Lead') return 'bg-pink-100 text-pink-800 border-pink-300';
      return 'bg-violet-100 text-violet-800 border-violet-300';
    } else if (type === 'hseLead') {
      // Distinct colors for different HSE Lead commissions
      if (position?.includes('P&E')) return 'bg-violet-100 text-violet-800 border-violet-300';
      if (position?.includes('Asset')) return 'bg-purple-100 text-purple-800 border-purple-300';
      return 'bg-pink-100 text-pink-800 border-pink-300'; // default HSE Lead color
    } else if (type === 'director') {
      // Distinct colors for different Director commissions
      if (position?.includes('P&E')) return 'bg-slate-100 text-slate-800 border-slate-300';
      if (position?.includes('Asset')) return 'bg-zinc-100 text-zinc-800 border-zinc-300';
      if (position?.includes('HSE')) return 'bg-stone-100 text-stone-800 border-stone-300';
      if (position === 'Plant Director') return 'bg-slate-200 text-slate-900 border-slate-400';
      return 'bg-neutral-100 text-neutral-800 border-neutral-300'; // default Director color
    }
    return 'bg-orange-100 text-orange-800 border-orange-300';
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<ChecklistItemData> = {};
    if (!formData.description.trim()) {
      newErrors.description = 'Checklist question is required';
    }
    if (!formData.category) {
      newErrors.category = 'Category is required';
    }
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
        
        const updateData = {
          description: formData.description.trim(),
          required_evidence: formData.evidenceGuidance.trim(),
          category: formData.category,
          Approver: allApprovers.join(', '),
          responsible: allResponsible.join(', '),
          topic: formData.topic.trim()
        };
        
        await updateChecklistItemMutation.mutateAsync({ 
          itemId: item.unique_id, 
          updateData 
        });
        
        toast({
          title: "Success",
          description: "Checklist item updated successfully"
        });
        onComplete(updateData);
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to update checklist item",
          variant: "destructive"
        });
      }
    }
  };

  const updateFormData = (field: keyof ChecklistItemData, value: any) => {
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
            <CardTitle className="text-2xl font-bold text-foreground">Edit Checklist Item</CardTitle>
            <CardDescription className="text-base">
              Update the item details below
            </CardDescription>
          </CardHeader>
          
          <CardContent className="p-8 space-y-8">
            {/* Reference ID */}
            <div className="space-y-2">
              <Label className="text-base font-semibold">Reference ID</Label>
              <div className="flex items-center space-x-2">
                <Badge variant="outline" className="text-sm px-3 py-1">
                  {item.unique_id}
                </Badge>
                <span className="text-sm text-muted-foreground">(Auto-assigned, cannot be changed)</span>
              </div>
            </div>

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
                  onCreateNew={async (value) => {
                    try {
                      await createCategoryMutation.mutateAsync({ name: value });
                      updateFormData('category', value);
                      toast({
                        title: "Success",
                        description: `Category "${value}" created successfully`
                      });
                    } catch (error) {
                      toast({
                        title: "Error",
                        description: "Failed to create category",
                        variant: "destructive"
                      });
                    }
                  }}
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
                  onCreateNew={async (value) => {
                    try {
                      await createTopicMutation.mutateAsync({ name: value });
                      updateFormData('topic', value);
                      toast({
                        title: "Success",
                        description: `Topic "${value}" created successfully`
                      });
                    } catch (error) {
                      toast({
                        title: "Error",
                        description: "Failed to create topic",
                        variant: "destructive"
                      });
                    }
                  }}
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
              {errors.evidenceGuidance && (
                <p className="text-sm text-destructive flex items-center">
                  <AlertCircle className="h-4 w-4 mr-1" />
                  {errors.evidenceGuidance}
                </p>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex justify-between pt-6">
              <Button 
                variant="outline" 
                onClick={onBack} 
                disabled={updateChecklistItemMutation.isPending}
                className="px-6 py-2 rounded-lg border-2 border-primary/20 text-primary hover:bg-primary/5 hover:border-primary/40 transition-all duration-200 font-medium"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Manage Checklist
              </Button>
              <Button 
                onClick={handleSubmit} 
                disabled={updateChecklistItemMutation.isPending}
                className="px-8 py-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-lg shadow-lg transition-all duration-200 font-medium"
              >
                {updateChecklistItemMutation.isPending ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Updating...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Update Item
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

export default EditChecklistItemForm;
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { EnhancedSearchableCombobox } from '@/components/ui/enhanced-searchable-combobox';
import { ArrowLeft, Plus, CheckCircle, AlertCircle, X, Search } from 'lucide-react';
import { ChecklistItem, useUpdateChecklistItem } from '@/hooks/useChecklistItems';
import { useChecklistCategories, useCreateChecklistCategory } from '@/hooks/useChecklistCategories';
import { useChecklistTopics, useCreateChecklistTopic } from '@/hooks/useChecklistTopics';
import { useRoles } from '@/hooks/useRoles';
import { useDisciplines } from '@/hooks/useDisciplines';
import { useCommissions } from '@/hooks/useCommissions';
import { toast } from '@/hooks/use-toast';

interface EditChecklistItemFormProps {
  item: ChecklistItem;
  onBack: () => void;
  onComplete: (item: any) => void;
}

interface EditChecklistItemData {
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
  const [formData, setFormData] = useState<EditChecklistItemData>({
    description: item.description || '',
    evidenceGuidance: item.evidenceGuidance || '',
    category: '',
    approvers: [],
    responsible: [],
    topic: ''
  });
  const [errors, setErrors] = useState<Partial<EditChecklistItemData>>({});
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

  // Get commission options for Director (only P&E and Asset)
  const getDirectorCommissionOptions = () => {
    return commissions
      .filter(comm => ['P&E', 'Asset'].includes(comm.name))
      .map(comm => ({ value: comm.name, label: comm.name }));
  };

  // Set position based on discipline and commission
  const setPositionBasedOnDisciplineAndCommission = (discipline: string, commission: string): string => {
    if (discipline === 'Tech Safety') {
      return 'TA2';
    }
    if (discipline === 'Civil') {
      return 'Civil TA2';
    }
    if (commission === 'P&E') {
      return `P&E ${discipline} TA2`;
    }
    if (commission === 'Asset') {
      return `Asset ${discipline} TA2`;
    }
    return `${discipline} TA2`;
  };

  // Set Engineering Manager position based on commission
  const setEngrManagerPosition = (commission: string): string => {
    if (commission === 'P&E') {
      return 'P&E Engineering Manager';
    }
    if (commission === 'Asset') {
      return 'Asset Engineering Manager';
    }
    return 'Engineering Manager';
  };

  // Set HSE Lead position based on commission
  const setHSELeadPosition = (commission: string): string => {
    if (commission === 'P&E') {
      return 'P&E HSE Lead';
    }
    if (commission === 'Asset') {
      return 'Asset HSE Lead';
    }
    return 'HSE Lead';
  };

  // Set Director position based on commission
  const setDirectorPosition = (commission: string): string => {
    if (commission === 'P&E') {
      return 'P&E Director';
    }
    if (commission === 'Asset') {
      return 'Asset Director';
    }
    return 'Director';
  };

  // Validation function
  const validateForm = (): boolean => {
    const newErrors: Partial<EditChecklistItemData> = {};

    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    }

    if (!formData.category.trim()) {
      newErrors.category = 'Category is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = () => {
    if (!validateForm()) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    // Combine all approver data
    const allApprovers = [
      ...ta2Approvers.map(a => `TA2:${a.discipline}:${a.commission}:${a.position}`),
      ...engrManagerApprovers.map(a => `Engineering Manager:${a.commission}:${a.position}`),
      ...hseLeadApprovers.map(a => `HSE Lead:${a.commission}:${a.position}`),
      ...directorApprovers.map(a => `Director:${a.commission}:${a.position}`)
    ];

    // Combine all responsible data
    const allResponsible = [
      ...ta2Responsible.map(r => `TA2:${r.discipline}:${r.commission}:${r.position}`),
      ...engrManagerResponsible.map(r => `Engineering Manager:${r.commission}:${r.position}`),
      ...hseLeadResponsible.map(r => `HSE Lead:${r.commission}:${r.position}`),
      ...directorResponsible.map(r => `Director:${r.commission}:${r.position}`)
    ];

    const updateData = {
      description: formData.description,
      evidence_guidance: formData.evidenceGuidance,
      category: formData.category,
      topic: formData.topic || null,
      approvers: allApprovers,
      responsible: allResponsible,
    };

    updateChecklistItemMutation.mutate({
      itemId: item.id,
      updateData: updateData
    }, {
      onSuccess: (updatedItem) => {
        toast({
          title: "Success",
          description: "Checklist item updated successfully!",
          variant: "default",
        });
        onComplete(updatedItem);
      },
      onError: (error) => {
        console.error('Error updating checklist item:', error);
        toast({
          title: "Error",
          description: "Failed to update checklist item. Please try again.",
          variant: "destructive",
        });
      }
    });
  };

  // Handle category creation
  const handleCreateCategory = async (categoryName: string) => {
    try {
      await createCategoryMutation.mutateAsync({
        name: categoryName,
        description: `Category: ${categoryName}`,
      });
      
      setFormData(prev => ({ ...prev, category: categoryName }));
      
      toast({
        title: "Success",
        description: `Category "${categoryName}" created successfully!`,
        variant: "default",
      });
    } catch (error) {
      console.error('Error creating category:', error);
      toast({
        title: "Error",
        description: "Failed to create category. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Handle topic creation
  const handleCreateTopic = async (topicName: string) => {
    try {
      await createTopicMutation.mutateAsync({
        name: topicName,
        description: `Topic: ${topicName}`,
      });
      
      setFormData(prev => ({ ...prev, topic: topicName }));
      
      toast({
        title: "Success",
        description: `Topic "${topicName}" created successfully!`,
        variant: "default",
      });
    } catch (error) {
      console.error('Error creating topic:', error);
      toast({
        title: "Error",
        description: "Failed to create topic. Please try again.",
        variant: "destructive",
      });
    }
  };

  // TA2 Management Functions
  const addTA2Approver = (discipline: string, commission: string) => {
    const position = setPositionBasedOnDisciplineAndCommission(discipline, commission);
    const newTA2: TA2Approver = {
      id: `ta2-approver-${Date.now()}`,
      discipline,
      commission,
      position
    };
    setTA2Approvers(prev => [...prev, newTA2]);
    setShowTA2ApproverConfig(null);
  };

  const removeTA2Approver = (id: string) => {
    setTA2Approvers(prev => prev.filter(ta2 => ta2.id !== id));
  };

  const updateTA2Approver = (id: string, discipline: string, commission: string) => {
    const position = setPositionBasedOnDisciplineAndCommission(discipline, commission);
    setTA2Approvers(prev => prev.map(ta2 => 
      ta2.id === id ? { ...ta2, discipline, commission, position } : ta2
    ));
  };

  const addTA2Responsible = (discipline: string, commission: string) => {
    const position = setPositionBasedOnDisciplineAndCommission(discipline, commission);
    const newTA2: TA2Approver = {
      id: `ta2-responsible-${Date.now()}`,
      discipline,
      commission,
      position
    };
    setTA2Responsible(prev => [...prev, newTA2]);
    setShowTA2ResponsibleConfig(null);
  };

  const removeTA2Responsible = (id: string) => {
    setTA2Responsible(prev => prev.filter(ta2 => ta2.id !== id));
  };

  const updateTA2Responsible = (id: string, discipline: string, commission: string) => {
    const position = setPositionBasedOnDisciplineAndCommission(discipline, commission);
    setTA2Responsible(prev => prev.map(ta2 => 
      ta2.id === id ? { ...ta2, discipline, commission, position } : ta2
    ));
  };

  // Engineering Manager Management Functions
  const addEngrManagerApprover = (commission: string) => {
    const position = setEngrManagerPosition(commission);
    const newEngrManager = {
      id: `engr-manager-approver-${Date.now()}`,
      commission,
      position
    };
    setEngrManagerApprovers(prev => [...prev, newEngrManager]);
    setShowEngrManagerApproverConfig(null);
  };

  const removeEngrManagerApprover = (id: string) => {
    setEngrManagerApprovers(prev => prev.filter(em => em.id !== id));
  };

  const updateEngrManagerApprover = (id: string, commission: string) => {
    const position = setEngrManagerPosition(commission);
    setEngrManagerApprovers(prev => prev.map(em => 
      em.id === id ? { ...em, commission, position } : em
    ));
  };

  const addEngrManagerResponsible = (commission: string) => {
    const position = setEngrManagerPosition(commission);
    const newEngrManager = {
      id: `engr-manager-responsible-${Date.now()}`,
      commission,
      position
    };
    setEngrManagerResponsible(prev => [...prev, newEngrManager]);
    setShowEngrManagerResponsibleConfig(null);
  };

  const removeEngrManagerResponsible = (id: string) => {
    setEngrManagerResponsible(prev => prev.filter(em => em.id !== id));
  };

  const updateEngrManagerResponsible = (id: string, commission: string) => {
    const position = setEngrManagerPosition(commission);
    setEngrManagerResponsible(prev => prev.map(em => 
      em.id === id ? { ...em, commission, position } : em
    ));
  };

  // HSE Lead Management Functions
  const addHSELeadApprover = (commission: string) => {
    const position = setHSELeadPosition(commission);
    const newHSELead = {
      id: `hse-lead-approver-${Date.now()}`,
      commission,
      position
    };
    setHSELeadApprovers(prev => [...prev, newHSELead]);
    setShowHSELeadApproverConfig(null);
  };

  const removeHSELeadApprover = (id: string) => {
    setHSELeadApprovers(prev => prev.filter(hse => hse.id !== id));
  };

  const updateHSELeadApprover = (id: string, commission: string) => {
    const position = setHSELeadPosition(commission);
    setHSELeadApprovers(prev => prev.map(hse => 
      hse.id === id ? { ...hse, commission, position } : hse
    ));
  };

  const addHSELeadResponsible = (commission: string) => {
    const position = setHSELeadPosition(commission);
    const newHSELead = {
      id: `hse-lead-responsible-${Date.now()}`,
      commission,
      position
    };
    setHSELeadResponsible(prev => [...prev, newHSELead]);
    setShowHSELeadResponsibleConfig(null);
  };

  const removeHSELeadResponsible = (id: string) => {
    setHSELeadResponsible(prev => prev.filter(hse => hse.id !== id));
  };

  const updateHSELeadResponsible = (id: string, commission: string) => {
    const position = setHSELeadPosition(commission);
    setHSELeadResponsible(prev => prev.map(hse => 
      hse.id === id ? { ...hse, commission, position } : hse
    ));
  };

  // Director Management Functions
  const addDirectorApprover = (commission: string) => {
    const position = setDirectorPosition(commission);
    const newDirector = {
      id: `director-approver-${Date.now()}`,
      commission,
      position
    };
    setDirectorApprovers(prev => [...prev, newDirector]);
    setShowDirectorApproverConfig(null);
  };

  const removeDirectorApprover = (id: string) => {
    setDirectorApprovers(prev => prev.filter(dir => dir.id !== id));
  };

  const updateDirectorApprover = (id: string, commission: string) => {
    const position = setDirectorPosition(commission);
    setDirectorApprovers(prev => prev.map(dir => 
      dir.id === id ? { ...dir, commission, position } : dir
    ));
  };

  const addDirectorResponsible = (commission: string) => {
    const position = setDirectorPosition(commission);
    const newDirector = {
      id: `director-responsible-${Date.now()}`,
      commission,
      position
    };
    setDirectorResponsible(prev => [...prev, newDirector]);
    setShowDirectorResponsibleConfig(null);
  };

  const removeDirectorResponsible = (id: string) => {
    setDirectorResponsible(prev => prev.filter(dir => dir.id !== id));
  };

  const updateDirectorResponsible = (id: string, commission: string) => {
    const position = setDirectorPosition(commission);
    setDirectorResponsible(prev => prev.map(dir => 
      dir.id === id ? { ...dir, commission, position } : dir
    ));
  };

  // Get badge color based on role type and position
  const getBadgeColor = (type: string, position: string) => {
    if (type === 'TA2') {
      if (position.includes('P&E')) return 'bg-blue-100 text-blue-800 border-blue-200';
      if (position.includes('Asset')) return 'bg-green-100 text-green-800 border-green-200';
      if (position.includes('Civil')) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      return 'bg-purple-100 text-purple-800 border-purple-200';
    }
    if (type === 'Engineering Manager') {
      if (position.includes('P&E')) return 'bg-indigo-100 text-indigo-800 border-indigo-200';
      if (position.includes('Asset')) return 'bg-teal-100 text-teal-800 border-teal-200';
      return 'bg-cyan-100 text-cyan-800 border-cyan-200';
    }
    if (type === 'HSE Lead') {
      if (position.includes('P&E')) return 'bg-orange-100 text-orange-800 border-orange-200';
      if (position.includes('Asset')) return 'bg-red-100 text-red-800 border-red-200';
      return 'bg-pink-100 text-pink-800 border-pink-200';
    }
    if (type === 'Director') {
      if (position.includes('P&E')) return 'bg-gray-100 text-gray-800 border-gray-200';
      if (position.includes('Asset')) return 'bg-slate-100 text-slate-800 border-slate-200';
      return 'bg-zinc-100 text-zinc-800 border-zinc-200';
    }
    return 'bg-gray-100 text-gray-800 border-gray-200';
  };

  // Preview component
  if (showPreview) {
    const allApprovers = [
      ...ta2Approvers.map(a => ({ type: 'TA2', position: a.position })),
      ...engrManagerApprovers.map(a => ({ type: 'Engineering Manager', position: a.position })),
      ...hseLeadApprovers.map(a => ({ type: 'HSE Lead', position: a.position })),
      ...directorApprovers.map(a => ({ type: 'Director', position: a.position }))
    ];

    const allResponsible = [
      ...ta2Responsible.map(r => ({ type: 'TA2', position: r.position })),
      ...engrManagerResponsible.map(r => ({ type: 'Engineering Manager', position: r.position })),
      ...hseLeadResponsible.map(r => ({ type: 'HSE Lead', position: r.position })),
      ...directorResponsible.map(r => ({ type: 'Director', position: r.position }))
    ];

    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-6">
        <div className="max-w-4xl mx-auto">
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl">
            <CardHeader className="bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-t-lg">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-6 w-6" />
                <div>
                  <CardTitle className="text-xl">Preview Checklist Item</CardTitle>
                  <CardDescription className="text-blue-100">
                    Review your checklist item before saving
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6 p-8">
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Description</h3>
                  <p className="text-gray-900 bg-gray-50 p-3 rounded-lg">{formData.description}</p>
                </div>

                {formData.evidenceGuidance && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-2">Evidence Guidance</h3>
                    <p className="text-gray-900 bg-gray-50 p-3 rounded-lg">{formData.evidenceGuidance}</p>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-2">Category</h3>
                    <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                      {formData.category}
                    </Badge>
                  </div>

                  {formData.topic && (
                    <div>
                      <h3 className="text-sm font-medium text-gray-700 mb-2">Topic</h3>
                      <Badge variant="secondary" className="bg-purple-100 text-purple-800">
                        {formData.topic}
                      </Badge>
                    </div>
                  )}
                </div>

                {allApprovers.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-3">Approvers</h3>
                    <div className="flex flex-wrap gap-2">
                      {allApprovers.map((approver, index) => (
                        <Badge 
                          key={index} 
                          variant="outline" 
                          className={getBadgeColor(approver.type, approver.position)}
                        >
                          {approver.position}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {allResponsible.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-3">Responsible Parties</h3>
                    <div className="flex flex-wrap gap-2">
                      {allResponsible.map((responsible, index) => (
                        <Badge 
                          key={index} 
                          variant="outline" 
                          className={getBadgeColor(responsible.type, responsible.position)}
                        >
                          {responsible.position}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-6 border-t">
                <Button 
                  variant="outline" 
                  onClick={() => setShowPreview(false)}
                  className="flex-1"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Edit
                </Button>
                <Button 
                  onClick={handleSubmit}
                  disabled={updateChecklistItemMutation.isPending}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                >
                  {updateChecklistItemMutation.isPending ? (
                    <>
                      <AlertCircle className="mr-2 h-4 w-4 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="mr-2 h-4 w-4" />
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
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-6">
      <div className="max-w-4xl mx-auto">
        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl">
          <CardHeader className="bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-t-lg">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-6 w-6" />
              <div>
                <CardTitle className="text-xl">Edit Checklist Item</CardTitle>
                <CardDescription className="text-blue-100">
                  Update the details of your checklist item
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-8 p-8">
            {/* Description Section */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="description" className="text-sm font-medium text-gray-700">
                  Checklist Question/Description *
                </Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Enter the checklist question or description..."
                  className="mt-2 min-h-[100px] resize-none border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                />
                {errors.description && (
                  <p className="text-red-500 text-sm mt-1">{errors.description}</p>
                )}
              </div>

              <div>
                <Label htmlFor="evidenceGuidance" className="text-sm font-medium text-gray-700">
                  Evidence Guidance
                </Label>
                <Textarea
                  id="evidenceGuidance"
                  value={formData.evidenceGuidance}
                  onChange={(e) => setFormData(prev => ({ ...prev, evidenceGuidance: e.target.value }))}
                  placeholder="Provide guidance on what evidence is needed to complete this checklist item..."
                  className="mt-2 min-h-[80px] resize-none border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Category and Topic Selection */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label className="text-sm font-medium text-gray-700">Category *</Label>
                <EnhancedSearchableCombobox
                  options={categoryOptions}
                  value={formData.category}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
                  onCreateNew={handleCreateCategory}
                  placeholder="Select or create category..."
                  className="mt-2"
                />
                {errors.category && (
                  <p className="text-red-500 text-sm mt-1">{errors.category}</p>
                )}
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-700">Topic</Label>
                <EnhancedSearchableCombobox
                  options={topicOptions}
                  value={formData.topic}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, topic: value }))}
                  onCreateNew={handleCreateTopic}
                  placeholder="Select or create topic..."
                  className="mt-2"
                />
              </div>
            </div>

            {/* Responsible Parties Section */}
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-700">Responsible Parties</h3>

              {/* TA2 Responsible */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-md font-medium text-gray-600">TA2 Responsible</h4>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowTA2ResponsibleConfig('add')}
                    className="flex items-center gap-1"
                  >
                    <Plus className="w-4 h-4" />
                    Add TA2
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {ta2Responsible.map((ta2) => (
                    <Badge
                      key={ta2.id}
                      variant="outline"
                      className={getBadgeColor('TA2', ta2.position)}
                    >
                      {ta2.position}
                      <X
                        className="ml-1 inline cursor-pointer"
                        onClick={() => removeTA2Responsible(ta2.id)}
                      />
                    </Badge>
                  ))}
                </div>
                {showTA2ResponsibleConfig === 'add' && (
                  <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Select
                      onValueChange={(value) => {
                        if (value) {
                          addTA2Responsible(value, 'P&E');
                        }
                      }}
                      defaultValue=""
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select Discipline" />
                      </SelectTrigger>
                      <SelectContent>
                        {disciplineOptions.map((disc) => (
                          <SelectItem key={disc.value} value={disc.value}>
                            {disc.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select
                      onValueChange={(value) => {
                        if (value) {
                          addTA2Responsible('Tech Safety', value);
                        }
                      }}
                      defaultValue=""
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select Commission" />
                      </SelectTrigger>
                      <SelectContent>
                        {getCommissionOptions('Tech Safety').map((comm) => (
                          <SelectItem key={comm.value} value={comm.value}>
                            {comm.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      variant="outline"
                      onClick={() => setShowTA2ResponsibleConfig(null)}
                      className="col-span-full"
                    >
                      Cancel
                    </Button>
                  </div>
                )}
              </div>

              {/* Engineering Manager Responsible */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-md font-medium text-gray-600">Engineering Manager Responsible</h4>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowEngrManagerResponsibleConfig('add')}
                    className="flex items-center gap-1"
                  >
                    <Plus className="w-4 h-4" />
                    Add Engineering Manager
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {engrManagerResponsible.map((em) => (
                    <Badge
                      key={em.id}
                      variant="outline"
                      className={getBadgeColor('Engineering Manager', em.position)}
                    >
                      {em.position}
                      <X
                        className="ml-1 inline cursor-pointer"
                        onClick={() => removeEngrManagerResponsible(em.id)}
                      />
                    </Badge>
                  ))}
                </div>
                {showEngrManagerResponsibleConfig === 'add' && (
                  <div className="mt-2">
                    <Select
                      onValueChange={(value) => {
                        if (value) {
                          addEngrManagerResponsible(value);
                        }
                      }}
                      defaultValue=""
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select Commission" />
                      </SelectTrigger>
                      <SelectContent>
                        {getEngrManagerCommissionOptions().map((comm) => (
                          <SelectItem key={comm.value} value={comm.value}>
                            {comm.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      variant="outline"
                      onClick={() => setShowEngrManagerResponsibleConfig(null)}
                      className="mt-2 w-full"
                    >
                      Cancel
                    </Button>
                  </div>
                )}
              </div>

              {/* HSE Lead Responsible */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-md font-medium text-gray-600">HSE Lead Responsible</h4>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowHSELeadResponsibleConfig('add')}
                    className="flex items-center gap-1"
                  >
                    <Plus className="w-4 h-4" />
                    Add HSE Lead
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {hseLeadResponsible.map((hse) => (
                    <Badge
                      key={hse.id}
                      variant="outline"
                      className={getBadgeColor('HSE Lead', hse.position)}
                    >
                      {hse.position}
                      <X
                        className="ml-1 inline cursor-pointer"
                        onClick={() => removeHSELeadResponsible(hse.id)}
                      />
                    </Badge>
                  ))}
                </div>
                {showHSELeadResponsibleConfig === 'add' && (
                  <div className="mt-2">
                    <Select
                      onValueChange={(value) => {
                        if (value) {
                          addHSELeadResponsible(value);
                        }
                      }}
                      defaultValue=""
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select Commission" />
                      </SelectTrigger>
                      <SelectContent>
                        {getHSELeadCommissionOptions().map((comm) => (
                          <SelectItem key={comm.value} value={comm.value}>
                            {comm.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      variant="outline"
                      onClick={() => setShowHSELeadResponsibleConfig(null)}
                      className="mt-2 w-full"
                    >
                      Cancel
                    </Button>
                  </div>
                )}
              </div>

              {/* Director Responsible */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-md font-medium text-gray-600">Director Responsible</h4>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowDirectorResponsibleConfig('add')}
                    className="flex items-center gap-1"
                  >
                    <Plus className="w-4 h-4" />
                    Add Director
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {directorResponsible.map((dir) => (
                    <Badge
                      key={dir.id}
                      variant="outline"
                      className={getBadgeColor('Director', dir.position)}
                    >
                      {dir.position}
                      <X
                        className="ml-1 inline cursor-pointer"
                        onClick={() => removeDirectorResponsible(dir.id)}
                      />
                    </Badge>
                  ))}
                </div>
                {showDirectorResponsibleConfig === 'add' && (
                  <div className="mt-2">
                    <Select
                      onValueChange={(value) => {
                        if (value) {
                          addDirectorResponsible(value);
                        }
                      }}
                      defaultValue=""
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select Commission" />
                      </SelectTrigger>
                      <SelectContent>
                        {getDirectorCommissionOptions().map((comm) => (
                          <SelectItem key={comm.value} value={comm.value}>
                            {comm.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      variant="outline"
                      onClick={() => setShowDirectorResponsibleConfig(null)}
                      className="mt-2 w-full"
                    >
                      Cancel
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* Approvers Section */}
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-700">Approvers</h3>

              {/* TA2 Approvers */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-md font-medium text-gray-600">TA2 Approvers</h4>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowTA2ApproverConfig('add')}
                    className="flex items-center gap-1"
                  >
                    <Plus className="w-4 h-4" />
                    Add TA2
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {ta2Approvers.map((ta2) => (
                    <Badge
                      key={ta2.id}
                      variant="outline"
                      className={getBadgeColor('TA2', ta2.position)}
                    >
                      {ta2.position}
                      <X
                        className="ml-1 inline cursor-pointer"
                        onClick={() => removeTA2Approver(ta2.id)}
                      />
                    </Badge>
                  ))}
                </div>
                {showTA2ApproverConfig === 'add' && (
                  <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Select
                      onValueChange={(value) => {
                        if (value) {
                          addTA2Approver(value, 'P&E');
                        }
                      }}
                      defaultValue=""
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select Discipline" />
                      </SelectTrigger>
                      <SelectContent>
                        {disciplineOptions.map((disc) => (
                          <SelectItem key={disc.value} value={disc.value}>
                            {disc.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select
                      onValueChange={(value) => {
                        if (value) {
                          addTA2Approver('Tech Safety', value);
                        }
                      }}
                      defaultValue=""
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select Commission" />
                      </SelectTrigger>
                      <SelectContent>
                        {getCommissionOptions('Tech Safety').map((comm) => (
                          <SelectItem key={comm.value} value={comm.value}>
                            {comm.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      variant="outline"
                      onClick={() => setShowTA2ApproverConfig(null)}
                      className="col-span-full"
                    >
                      Cancel
                    </Button>
                  </div>
                )}
              </div>

              {/* Engineering Manager Approvers */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-md font-medium text-gray-600">Engineering Manager Approvers</h4>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowEngrManagerApproverConfig('add')}
                    className="flex items-center gap-1"
                  >
                    <Plus className="w-4 h-4" />
                    Add Engineering Manager
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {engrManagerApprovers.map((em) => (
                    <Badge
                      key={em.id}
                      variant="outline"
                      className={getBadgeColor('Engineering Manager', em.position)}
                    >
                      {em.position}
                      <X
                        className="ml-1 inline cursor-pointer"
                        onClick={() => removeEngrManagerApprover(em.id)}
                      />
                    </Badge>
                  ))}
                </div>
                {showEngrManagerApproverConfig === 'add' && (
                  <div className="mt-2">
                    <Select
                      onValueChange={(value) => {
                        if (value) {
                          addEngrManagerApprover(value);
                        }
                      }}
                      defaultValue=""
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select Commission" />
                      </SelectTrigger>
                      <SelectContent>
                        {getEngrManagerCommissionOptions().map((comm) => (
                          <SelectItem key={comm.value} value={comm.value}>
                            {comm.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      variant="outline"
                      onClick={() => setShowEngrManagerApproverConfig(null)}
                      className="mt-2 w-full"
                    >
                      Cancel
                    </Button>
                  </div>
                )}
              </div>

              {/* HSE Lead Approvers */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-md font-medium text-gray-600">HSE Lead Approvers</h4>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowHSELeadApproverConfig('add')}
                    className="flex items-center gap-1"
                  >
                    <Plus className="w-4 h-4" />
                    Add HSE Lead
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {hseLeadApprovers.map((hse) => (
                    <Badge
                      key={hse.id}
                      variant="outline"
                      className={getBadgeColor('HSE Lead', hse.position)}
                    >
                      {hse.position}
                      <X
                        className="ml-1 inline cursor-pointer"
                        onClick={() => removeHSELeadApprover(hse.id)}
                      />
                    </Badge>
                  ))}
                </div>
                {showHSELeadApproverConfig === 'add' && (
                  <div className="mt-2">
                    <Select
                      onValueChange={(value) => {
                        if (value) {
                          addHSELeadApprover(value);
                        }
                      }}
                      defaultValue=""
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select Commission" />
                      </SelectTrigger>
                      <SelectContent>
                        {getHSELeadCommissionOptions().map((comm) => (
                          <SelectItem key={comm.value} value={comm.value}>
                            {comm.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      variant="outline"
                      onClick={() => setShowHSELeadApproverConfig(null)}
                      className="mt-2 w-full"
                    >
                      Cancel
                    </Button>
                  </div>
                )}
              </div>

              {/* Director Approvers */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-md font-medium text-gray-600">Director Approvers</h4>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowDirectorApproverConfig('add')}
                    className="flex items-center gap-1"
                  >
                    <Plus className="w-4 h-4" />
                    Add Director
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {directorApprovers.map((dir) => (
                    <Badge
                      key={dir.id}
                      variant="outline"
                      className={getBadgeColor('Director', dir.position)}
                    >
                      {dir.position}
                      <X
                        className="ml-1 inline cursor-pointer"
                        onClick={() => removeDirectorApprover(dir.id)}
                      />
                    </Badge>
                  ))}
                </div>
                {showDirectorApproverConfig === 'add' && (
                  <div className="mt-2">
                    <Select
                      onValueChange={(value) => {
                        if (value) {
                          addDirectorApprover(value);
                        }
                      }}
                      defaultValue=""
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select Commission" />
                      </SelectTrigger>
                      <SelectContent>
                        {getDirectorCommissionOptions().map((comm) => (
                          <SelectItem key={comm.value} value={comm.value}>
                            {comm.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      variant="outline"
                      onClick={() => setShowDirectorApproverConfig(null)}
                      className="mt-2 w-full"
                    >
                      Cancel
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-6 border-t">
              <Button 
                variant="outline" 
                onClick={onBack}
                className="flex-1"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Cancel
              </Button>
              <Button 
                variant="outline"
                onClick={() => setShowPreview(true)}
                className="flex-1"
              >
                <Search className="mr-2 h-4 w-4" />
                Preview
              </Button>
              <Button 
                onClick={handleSubmit}
                disabled={updateChecklistItemMutation.isPending}
                className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              >
                {updateChecklistItemMutation.isPending ? (
                  <>
                    <AlertCircle className="mr-2 h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  <>
                    <CheckCircle className="mr-2 h-4 w-4" />
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

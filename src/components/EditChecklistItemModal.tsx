import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { EnhancedSearchableCombobox } from '@/components/ui/enhanced-searchable-combobox';
import { ArrowLeft, Plus, CheckCircle, AlertCircle, X, Search, Edit, Save } from 'lucide-react';
import { ChecklistItem, useUpdateChecklistItem } from '@/hooks/useChecklistItems';
import { useChecklistCategories, useCreateChecklistCategory } from '@/hooks/useChecklistCategories';
import { useChecklistTopics, useCreateChecklistTopic } from '@/hooks/useChecklistTopics';
import { useRoles } from '@/hooks/useRoles';
import { useDisciplines } from '@/hooks/useDisciplines';
import { useCommissions } from '@/hooks/useCommissions';
import { toast } from '@/hooks/use-toast';

interface EditChecklistItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: ChecklistItem | null;
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

const EditChecklistItemModal: React.FC<EditChecklistItemModalProps> = ({
  isOpen,
  onClose,
  item,
  onComplete
}) => {
  const [formData, setFormData] = useState<EditChecklistItemData>({
    description: '',
    evidenceGuidance: '',
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
    const newErrors: Partial<EditChecklistItemData> = {};
    if (!formData.description.trim()) {
      newErrors.description = 'Checklist question is required';
    }
    if (!formData.category) {
      newErrors.category = 'Category is required';
    }
    // Removed required validation for approvers and responsible fields - they are now optional
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
        
        console.log('Attempting to update item with ID:', item!.id);
        console.log('Update data:', updateData);
        
        await updateChecklistItemMutation.mutateAsync({
          itemId: item!.id,
          updateData: updateData
        });
        toast({
          title: "Success",
          description: "Checklist item updated successfully"
        });
        onComplete(updateData);
        onClose();
      } catch (error) {
        console.error('Update error:', error);
        toast({
          title: "Error",
          description: error instanceof Error ? error.message : "Failed to update checklist item",
          variant: "destructive"
        });
      }
    }
  };

  const updateFormData = (field: keyof EditChecklistItemData, value: any) => {
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
      const created = await createCategoryMutation.mutateAsync({ name: categoryName });
      // Select the newly created category
      updateFormData('category', created.name);

      toast({
        title: "Success",
        description: `Category "${created.name}" created successfully`
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.message || "Failed to create category",
        variant: "destructive"
      });
    }
  };

  const handleCreateTopic = async (topicName: string) => {
    try {
      const created = await createTopicMutation.mutateAsync({ name: topicName });
      // Select the newly created topic
      updateFormData('topic', created.name);

      toast({
        title: "Success",
        description: `Topic "${created.name}" created successfully`
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.message || "Failed to create topic",
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

  // Director management functions
  const addDirectorApprover = () => {
    const newDirector = {
      id: Date.now().toString(),
      commission: '',
      position: ''
    };
    setDirectorApprovers([...directorApprovers, newDirector]);
    setShowDirectorApproverConfig(newDirector.id);
  };

  const updateDirectorApprover = (id: string, field: string, value: string) => {
    setDirectorApprovers(prev => prev.map(dir => {
      if (dir.id === id) {
        const updated = { ...dir, [field]: value };
        if (field === 'commission' && value) {
          updated.position = `${value} Director`;
          setShowDirectorApproverConfig(null);
        }
        return updated;
      }
      return dir;
    }));
  };

  const removeDirectorApprover = (id: string) => {
    setDirectorApprovers(prev => prev.filter(dir => dir.id !== id));
  };

  const addDirectorResponsible = () => {
    const newDirector = {
      id: Date.now().toString(),
      commission: '',
      position: ''
    };
    setDirectorResponsible([...directorResponsible, newDirector]);
    setShowDirectorResponsibleConfig(newDirector.id);
  };

  const updateDirectorResponsible = (id: string, field: string, value: string) => {
    setDirectorResponsible(prev => prev.map(dir => {
      if (dir.id === id) {
        const updated = { ...dir, [field]: value };
        if (field === 'commission' && value) {
          updated.position = `${value} Director`;
          setShowDirectorResponsibleConfig(null);
        }
        return updated;
      }
      return dir;
    }));
  };

  const removeDirectorResponsible = (id: string) => {
    setDirectorResponsible(prev => prev.filter(dir => dir.id !== id));
  };

  const removeEngrManagerResponsible = (id: string) => {
    setEngrManagerResponsible(prev => prev.filter(engr => engr.id !== id));
  };

  const removeTA2Responsible = (id: string) => {
    setTA2Responsible(prev => prev.filter(ta2 => ta2.id !== id));
  };

  useEffect(() => {
    if (item) {
      setFormData({
        description: item.description || '',
        evidenceGuidance: item.required_evidence || '',
        category: item.category || '',
        topic: item.topic || '',
        approvers: [],
        responsible: [],
      });

      // Parse existing approvers and responsible parties
      if (item.Approver) {
        const approvers = item.Approver.split(', ');
        const regularApprovers: string[] = [];
        const ta2Apps: TA2Approver[] = [];
        const engrApps: Array<{id: string; commission: string; position: string}> = [];
        const hseLeadApps: Array<{id: string; commission: string; position: string}> = [];
        const directorApps: Array<{id: string; commission: string; position: string}> = [];

        approvers.forEach((approver, index) => {
          if (approver.startsWith('TA2 ')) {
            const match = approver.match(/TA2 ([^(]+)(?:\s*\(([^)]+)\))?/);
            if (match) {
              const [, discipline, commission] = match;
              ta2Apps.push({
                id: `ta2-${index}`,
                discipline: discipline.trim(),
                commission: commission?.trim() || '',
                position: approver
              });
            }
          } else if (approver.includes('Engr. Manager')) {
            const match = approver.match(/Engr\. Manager\s*\(([^)]+)\)/);
            if (match) {
              const [, commission] = match;
              engrApps.push({
                id: `engr-${index}`,
                commission: commission.trim(),
                position: approver
              });
            }
          } else if (approver.includes('HSE Lead')) {
            const match = approver.match(/HSE Lead\s*\(([^)]+)\)/);
            if (match) {
              const [, commission] = match;
              hseLeadApps.push({
                id: `hse-${index}`,
                commission: commission.trim(),
                position: approver
              });
            }
          } else if (approver.includes('Director')) {
            const match = approver.match(/(.*Director.*?)(?:\s*\(([^)]+)\))?$/);
            if (match) {
              const [, title, commission] = match;
              directorApps.push({
                id: `dir-${index}`,
                commission: commission?.trim() || '',
                position: approver
              });
            }
          } else {
            regularApprovers.push(approver);
          }
        });

        setFormData(prev => ({ ...prev, approvers: regularApprovers }));
        setTA2Approvers(ta2Apps);
        setEngrManagerApprovers(engrApps);
        setHSELeadApprovers(hseLeadApps);
        setDirectorApprovers(directorApps);
      }

      // Parse responsible parties
      if (item.responsible) {
        const responsible = item.responsible.split(', ');
        const regularResponsible: string[] = [];
        const ta2Resp: TA2Approver[] = [];
        const engrResp: Array<{id: string; commission: string; position: string}> = [];
        const hseLeadResp: Array<{id: string; commission: string; position: string}> = [];
        const directorResp: Array<{id: string; commission: string; position: string}> = [];

        responsible.forEach((resp, index) => {
          if (resp.startsWith('TA2 ')) {
            const match = resp.match(/TA2 ([^(]+)(?:\s*\(([^)]+)\))?/);
            if (match) {
              const [, discipline, commission] = match;
              ta2Resp.push({
                id: `ta2-resp-${index}`,
                discipline: discipline.trim(),
                commission: commission?.trim() || '',
                position: resp
              });
            }
          } else if (resp.includes('Engr. Manager')) {
            const match = resp.match(/Engr\. Manager\s*\(([^)]+)\)/);
            if (match) {
              const [, commission] = match;
              engrResp.push({
                id: `engr-resp-${index}`,
                commission: commission.trim(),
                position: resp
              });
            }
          } else if (resp.includes('HSE Lead')) {
            const match = resp.match(/HSE Lead\s*\(([^)]+)\)/);
            if (match) {
              const [, commission] = match;
              hseLeadResp.push({
                id: `hse-resp-${index}`,
                commission: commission.trim(),
                position: resp
              });
            }
          } else if (resp.includes('Director')) {
            const match = resp.match(/(.*Director.*?)(?:\s*\(([^)]+)\))?$/);
            if (match) {
              const [, title, commission] = match;
              directorResp.push({
                id: `dir-resp-${index}`,
                commission: commission?.trim() || '',
                position: resp
              });
            }
          } else {
            regularResponsible.push(resp);
          }
        });

        setFormData(prev => ({ ...prev, responsible: regularResponsible }));
        setTA2Responsible(ta2Resp);
        setEngrManagerResponsible(engrResp);
        setHSELeadResponsible(hseLeadResp);
        setDirectorResponsible(directorResp);
      }
    }
  }, [item]);

  if (!item) return null;

  if (showPreview) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-gradient-to-br from-background via-background/95 to-muted/20 backdrop-blur-sm">
          <DialogHeader className="pb-4 border-b border-border/30">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-xl font-semibold bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text">Preview Changes</DialogTitle>
                <p className="text-sm text-muted-foreground mt-1">Review the updated details before saving</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setShowPreview(false)} className="hover:bg-muted/50 transition-colors">
                <X className="h-4 w-4" />
              </Button>
            </div>
          </DialogHeader>
          <div className="space-y-5 p-1">
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <Badge variant="secondary" className="bg-primary/15 text-primary border border-primary/20 font-medium px-3 py-1.5 rounded-full shadow-sm">
                  {item.unique_id || 'XX-YY'}
                </Badge>
              </div>
              
              <div className="bg-card/60 border border-border/50 rounded-lg p-4 shadow-sm hover:shadow-md transition-all duration-200">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 block">Question</Label>
                <p className="text-sm leading-relaxed bg-gradient-to-r from-foreground to-foreground/90 bg-clip-text">{formData.description}</p>
              </div>
              
              <div className="bg-card/40 border border-border/40 rounded-lg p-4 shadow-sm hover:shadow-md transition-all duration-200">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 block">Evidence Guidance</Label>
                <p className="text-sm leading-relaxed text-foreground/90">{formData.evidenceGuidance || "No guidance provided"}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-card/50 border border-border/40 rounded-lg p-4 shadow-sm hover:shadow-md transition-all duration-200">
                  <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 block">Category</Label>
                  <p className="text-sm font-medium text-foreground/90">{formData.category}</p>
                </div>
                <div className="bg-card/50 border border-border/40 rounded-lg p-4 shadow-sm hover:shadow-md transition-all duration-200">
                  <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 block">Topic</Label>
                  <p className="text-sm font-medium text-foreground/90">{formData.topic || "No topic specified"}</p>
                </div>
              </div>
              
              <div className="bg-card/30 border border-border/30 rounded-lg p-4 shadow-sm hover:shadow-md transition-all duration-200">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3 block">Approvers</Label>
                <div className="flex flex-wrap gap-2">
                  {formData.approvers.map(approver => (
                    <Badge key={approver} variant="outline" className="bg-blue-50/80 text-blue-700 border-blue-200/60 hover:bg-blue-100/80 transition-colors font-medium px-3 py-1 rounded-full shadow-sm">
                      {approver}
                    </Badge>
                  ))}
                  {ta2Approvers.filter(ta2 => ta2.position).map(ta2 => (
                    <Badge key={ta2.id} variant="outline" className="bg-blue-50/80 text-blue-700 border-blue-200/60 hover:bg-blue-100/80 transition-colors font-medium px-3 py-1 rounded-full shadow-sm">
                      {ta2.position}
                    </Badge>
                  ))}
                  {engrManagerApprovers.filter(eng => eng.position).map(eng => (
                    <Badge key={eng.id} variant="outline" className="bg-cyan-50/80 text-cyan-700 border-cyan-200/60 hover:bg-cyan-100/80 transition-colors font-medium px-3 py-1 rounded-full shadow-sm">
                      {eng.position}
                    </Badge>
                  ))}
                  {hseLeadApprovers.filter(hse => hse.position).map(hse => (
                    <Badge key={hse.id} variant="outline" className="bg-violet-50/80 text-violet-700 border-violet-200/60 hover:bg-violet-100/80 transition-colors font-medium px-3 py-1 rounded-full shadow-sm">
                      {hse.position}
                    </Badge>
                  ))}
                  {directorApprovers.filter(dir => dir.position).map(dir => (
                    <Badge key={dir.id} variant="outline" className="bg-slate-50/80 text-slate-700 border-slate-200/60 hover:bg-slate-100/80 transition-colors font-medium px-3 py-1 rounded-full shadow-sm">
                      {dir.position}
                    </Badge>
                  ))}
                </div>
              </div>
              
              <div className="bg-card/30 border border-border/30 rounded-lg p-4 shadow-sm hover:shadow-md transition-all duration-200">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3 block">Responsible Parties</Label>
                <div className="flex flex-wrap gap-2">
                  {formData.responsible.map(resp => (
                    <Badge key={resp} variant="outline" className="bg-orange-50/80 text-orange-700 border-orange-200/60 hover:bg-orange-100/80 transition-colors font-medium px-3 py-1 rounded-full shadow-sm">
                      {resp}
                    </Badge>
                  ))}
                  {ta2Responsible.filter(ta2 => ta2.position).map(ta2 => (
                    <Badge key={ta2.id} variant="outline" className="bg-green-50/80 text-green-700 border-green-200/60 hover:bg-green-100/80 transition-colors font-medium px-3 py-1 rounded-full shadow-sm">
                      {ta2.position}
                    </Badge>
                  ))}
                  {engrManagerResponsible.filter(eng => eng.position).map(eng => (
                    <Badge key={eng.id} variant="outline" className="bg-indigo-50/80 text-indigo-700 border-indigo-200/60 hover:bg-indigo-100/80 transition-colors font-medium px-3 py-1 rounded-full shadow-sm">
                      {eng.position}
                    </Badge>
                  ))}
                  {hseLeadResponsible.filter(hse => hse.position).map(hse => (
                    <Badge key={hse.id} variant="outline" className="bg-purple-50/80 text-purple-700 border-purple-200/60 hover:bg-purple-100/80 transition-colors font-medium px-3 py-1 rounded-full shadow-sm">
                      {hse.position}
                    </Badge>
                  ))}
                  {directorResponsible.filter(dir => dir.position).map(dir => (
                    <Badge key={dir.id} variant="outline" className="bg-neutral-50/80 text-neutral-700 border-neutral-200/60 hover:bg-neutral-100/80 transition-colors font-medium px-3 py-1 rounded-full shadow-sm">
                      {dir.position}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="flex justify-end gap-3 pt-4 border-t border-border/30 bg-gradient-to-r from-background/50 to-muted/30 -mx-1 px-1 rounded-b-lg">
              <Button variant="outline" onClick={() => setShowPreview(false)} className="hover:bg-muted/50 border-border/60 transition-all duration-200">
                Edit
              </Button>
              <Button onClick={handleSubmit} disabled={updateChecklistItemMutation.isPending} className="bg-primary hover:bg-primary/90 shadow-md hover:shadow-lg transition-all duration-200">
                {updateChecklistItemMutation.isPending ? 'Saving...' : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto bg-gradient-to-br from-background via-background to-muted/30">
        <DialogHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Edit className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <DialogTitle className="text-xl font-semibold">Edit Checklist Item</DialogTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  {item.unique_id || 'XX-YY'}
                </p>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-5 bg-card/50 rounded-lg p-4 border border-border/50">
          {/* Checklist Question */}
          <div className="space-y-2">
            <Label htmlFor="description" className="text-sm font-medium flex items-center gap-2">
              Checklist Question <span className="text-destructive">*</span>
            </Label>
            <Textarea 
              id="description" 
              placeholder="Enter the checklist question or requirement..." 
              value={formData.description} 
              onChange={e => {
                updateFormData('description', e.target.value);
                // Auto-adjust height
                const target = e.target;
                target.style.height = 'auto';
                target.style.height = Math.max(60, target.scrollHeight) + 'px';
              }} 
              className="min-h-[60px] resize-none bg-background border-2 border-border focus:border-primary focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/20 transition-all duration-200" 
              style={{
                height: 'auto',
                minHeight: '60px'
              }}
              onInput={(e) => {
                const target = e.target as HTMLTextAreaElement;
                target.style.height = 'auto';
                target.style.height = Math.max(60, target.scrollHeight) + 'px';
              }}
            />
            {errors.description && (
              <p className="text-sm text-destructive flex items-center gap-1">
                <AlertCircle className="h-4 w-4" />
                {errors.description}
              </p>
            )}
          </div>

          {/* Evidence Guidance */}
          <div className="space-y-2">
            <Label htmlFor="evidenceGuidance" className="text-sm font-medium flex items-center gap-2">
              Evidence Guidance
            </Label>
            <Textarea 
              id="evidenceGuidance" 
              placeholder="Help future users understand what documentation or evidence is needed" 
              value={formData.evidenceGuidance} 
              onChange={e => updateFormData('evidenceGuidance', e.target.value)} 
              className="min-h-[40px] resize-none bg-background border-2 border-border focus:border-primary focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/20 transition-all duration-200" 
              rows={2} 
            />
            {errors.evidenceGuidance && (
              <p className="text-sm text-destructive flex items-center gap-1">
                <AlertCircle className="h-4 w-4" />
                {errors.evidenceGuidance}
              </p>
            )}
          </div>

          {/* Category and Topic */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
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
                className="bg-background border-2 border-border focus:border-primary"
              />
              {errors.category && (
                <p className="text-sm text-destructive flex items-center gap-1">
                  <AlertCircle className="h-4 w-4" />
                  {errors.category}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium flex items-center gap-2">
                Topic
              </Label>
              <EnhancedSearchableCombobox
                options={topicOptions}
                value={formData.topic}
                onValueChange={value => updateFormData('topic', value)}
                onCreateNew={handleCreateTopic}
                allowCreate={true}
                placeholder="Choose an existing topic or type to add new one"
                searchPlaceholder="Search topics..."
                className="bg-background border-2 border-border focus:border-primary"
              />
              {errors.topic && (
                <p className="text-sm text-destructive flex items-center gap-1">
                  <AlertCircle className="h-4 w-4" />
                  {errors.topic}
                </p>
              )}
            </div>
          </div>

          {/* Responsible Parties */}
          <div className="space-y-3">
            <Label className="text-sm font-medium flex items-center gap-2">
              Responsible <span className="text-destructive">*</span>
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
                  } else if (value === 'Director') {
                    addDirectorResponsible();
                  } else if (!formData.responsible.includes(value)) {
                    updateFormData('responsible', [...formData.responsible, value]);
                  }
                }}
                placeholder="Select role..."
                searchPlaceholder="Search roles..."
                className="fluent-input"
              />
              
              {/* Display all responsible parties together - organized by categories */}
              {(formData.responsible.length > 0 || ta2Responsible.filter(ta2 => ta2.position).length > 0 || engrManagerResponsible.filter(engr => engr.position).length > 0 || hseLeadResponsible.filter(hse => hse.position).length > 0 || directorResponsible.filter(dir => dir.position).length > 0) && (
                <div className="grid gap-4 p-4 bg-muted/30 rounded-lg border">
                  {/* Directors Section */}
                  {directorResponsible.filter(dir => dir.position).length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Director</Label>
                        <div className="h-px bg-border flex-1 ml-2"></div>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
                        {directorResponsible.filter(dir => dir.position).map(dir => (
                          <div 
                            key={dir.id}
                            className="group relative"
                          >
                            <Badge 
                              variant="secondary" 
                              className={`${getResponsibleColor('director', dir.position)} w-full justify-center py-1.5 px-2 text-xs cursor-pointer border truncate`}
                              onClick={() => setSelectedTag(selectedTag === `dir-resp-${dir.id}` ? null : `dir-resp-${dir.id}`)}
                            >
                              <span className="font-medium truncate">{dir.position}</span>
                              {selectedTag === `dir-resp-${dir.id}` && (
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="absolute -top-1 -right-1 h-4 w-4 p-0 bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-full shadow-lg animate-scale-in" 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    removeDirectorResponsible(dir.id);
                                    setSelectedTag(null);
                                  }}
                                >
                                  <X className="h-2.5 w-2.5" />
                                </Button>
                              )}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Project Section */}
                  {formData.responsible.filter(role => ['Construction Lead', 'Commissioning Lead', 'Proj Manager', 'Proj Engr'].includes(role)).length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Label className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">Project</Label>
                        <div className="h-px bg-border flex-1 ml-2"></div>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
                        {formData.responsible.filter(role => ['Construction Lead', 'Commissioning Lead', 'Proj Manager', 'Proj Engr'].includes(role)).map((role, index) => (
                          <div 
                            key={`project-${role}-${index}`}
                            className="group relative"
                          >
                            <Badge 
                              variant="secondary" 
                              className={`${getResponsibleColor('project', role)} w-full justify-center py-1.5 px-2 text-xs cursor-pointer border truncate`}
                              onClick={() => setSelectedTag(selectedTag === `project-resp-${role}-${index}` ? null : `project-resp-${role}-${index}`)}
                            >
                              <span className="font-medium truncate">{role}</span>
                              {selectedTag === `project-resp-${role}-${index}` && (
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="absolute -top-1 -right-1 h-4 w-4 p-0 bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-full shadow-lg animate-scale-in" 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    updateFormData('responsible', formData.responsible.filter(r => r !== role));
                                    setSelectedTag(null);
                                  }}
                                >
                                  <X className="h-2.5 w-2.5" />
                                </Button>
                              )}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Engineering Section */}
                  {(engrManagerResponsible.filter(engr => engr.position).length > 0 || ta2Responsible.filter(ta2 => ta2.position).length > 0) && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Label className="text-xs font-semibold text-indigo-700 uppercase tracking-wider">Engineering</Label>
                        <div className="h-px bg-border flex-1 ml-2"></div>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
                        {engrManagerResponsible.filter(engr => engr.position).map(engr => (
                          <div 
                            key={engr.id}
                            className="group relative"
                          >
                            <Badge 
                              variant="secondary" 
                              className={`${getResponsibleColor('engrManager')} w-full justify-center py-1.5 px-2 text-xs cursor-pointer border truncate`}
                              onClick={() => setSelectedTag(selectedTag === `engr-resp-${engr.id}` ? null : `engr-resp-${engr.id}`)}
                            >
                              <span className="font-medium truncate">{engr.position}</span>
                              {selectedTag === `engr-resp-${engr.id}` && (
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="absolute -top-1 -right-1 h-4 w-4 p-0 bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-full shadow-lg animate-scale-in" 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    removeEngrManagerResponsible(engr.id);
                                    setSelectedTag(null);
                                  }}
                                >
                                  <X className="h-2.5 w-2.5" />
                                </Button>
                              )}
                            </Badge>
                          </div>
                        ))}
                        {ta2Responsible.filter(ta2 => ta2.position).map(ta2 => (
                          <div 
                            key={ta2.id}
                            className="group relative"
                          >
                            <Badge 
                              variant="secondary" 
                              className={`${getResponsibleColor('ta2', ta2.position)} w-full justify-center py-1.5 px-2 text-xs cursor-pointer border truncate`}
                              onClick={() => setSelectedTag(selectedTag === `ta2-resp-${ta2.id}` ? null : `ta2-resp-${ta2.id}`)}
                            >
                              <span className="font-medium truncate">{ta2.position}</span>
                              {selectedTag === `ta2-resp-${ta2.id}` && (
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="absolute -top-1 -right-1 h-4 w-4 p-0 bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-full shadow-lg animate-scale-in" 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    removeTA2Responsible(ta2.id);
                                    setSelectedTag(null);
                                  }}
                                >
                                  <X className="h-2.5 w-2.5" />
                                </Button>
                              )}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Asset Section */}
                  {formData.responsible.filter(role => ['ORA Engineer', 'ORA Engr', 'Ops Coach', 'Site Engineer', 'Site Engr', 'Dep. Plant Director', 'Dep Plant Director', 'Ops Team Lead'].includes(role)).length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Label className="text-xs font-semibold text-blue-700 uppercase tracking-wider">Asset</Label>
                        <div className="h-px bg-border flex-1 ml-2"></div>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
                        {formData.responsible.filter(role => ['ORA Engineer', 'ORA Engr', 'Ops Coach', 'Site Engineer', 'Site Engr', 'Dep. Plant Director', 'Dep Plant Director', 'Ops Team Lead'].includes(role)).map((role, index) => (
                          <div 
                            key={`asset-${role}-${index}`}
                            className="group relative"
                          >
                            <Badge 
                              variant="secondary" 
                              className={`${getResponsibleColor('asset', role)} w-full justify-center py-1.5 px-2 text-xs cursor-pointer border truncate`}
                              onClick={() => setSelectedTag(selectedTag === `asset-resp-${role}-${index}` ? null : `asset-resp-${role}-${index}`)}
                            >
                              <span className="font-medium truncate">{role}</span>
                              {selectedTag === `asset-resp-${role}-${index}` && (
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="absolute -top-1 -right-1 h-4 w-4 p-0 bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-full shadow-lg animate-scale-in" 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    updateFormData('responsible', formData.responsible.filter(r => r !== role));
                                    setSelectedTag(null);
                                  }}
                                >
                                  <X className="h-2.5 w-2.5" />
                                </Button>
                              )}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* HSE Section */}
                  {(hseLeadResponsible.filter(hse => hse.position).length > 0 || formData.responsible.filter(role => ['HSE Manager', 'HSE Director', 'ER Lead'].includes(role)).length > 0) && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Label className="text-xs font-semibold text-pink-700 uppercase tracking-wider">HSE</Label>
                        <div className="h-px bg-border flex-1 ml-2"></div>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
                        {hseLeadResponsible.filter(hse => hse.position).map(hse => (
                          <div 
                            key={hse.id}
                            className="group relative"
                          >
                            <Badge 
                              variant="secondary" 
                              className={`${getResponsibleColor('hseLead', hse.position)} w-full justify-center py-1.5 px-2 text-xs cursor-pointer border truncate`}
                              onClick={() => setSelectedTag(selectedTag === `hse-resp-${hse.id}` ? null : `hse-resp-${hse.id}`)}
                            >
                              <span className="font-medium truncate">{hse.position}</span>
                              {selectedTag === `hse-resp-${hse.id}` && (
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="absolute -top-1 -right-1 h-4 w-4 p-0 bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-full shadow-lg animate-scale-in" 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    removeHSELeadResponsible(hse.id);
                                    setSelectedTag(null);
                                  }}
                                >
                                  <X className="h-2.5 w-2.5" />
                                </Button>
                              )}
                            </Badge>
                          </div>
                        ))}
                        {formData.responsible.filter(role => ['HSE Manager', 'HSE Director', 'ER Lead'].includes(role)).map((role, index) => (
                          <div 
                            key={`hse-${role}-${index}`}
                            className="group relative"
                          >
                            <Badge 
                              variant="secondary" 
                              className={`${getResponsibleColor('hse', role)} w-full justify-center py-1.5 px-2 text-xs cursor-pointer border truncate`}
                              onClick={() => setSelectedTag(selectedTag === `hse-regular-resp-${role}-${index}` ? null : `hse-regular-resp-${role}-${index}`)}
                            >
                              <span className="font-medium truncate">{role}</span>
                              {selectedTag === `hse-regular-resp-${role}-${index}` && (
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="absolute -top-1 -right-1 h-4 w-4 p-0 bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-full shadow-lg animate-scale-in" 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    updateFormData('responsible', formData.responsible.filter(r => r !== role));
                                    setSelectedTag(null);
                                  }}
                                >
                                  <X className="h-2.5 w-2.5" />
                                </Button>
                              )}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Other Roles Section */}
                  {formData.responsible.filter(role => !['Construction Lead', 'Commissioning Lead', 'Proj Manager', 'Proj Engr', 'ORA Engineer', 'ORA Engr', 'Ops Coach', 'Site Engineer', 'Site Engr', 'Dep. Plant Director', 'Dep Plant Director', 'Ops Team Lead', 'HSE Manager', 'HSE Director', 'ER Lead'].includes(role)).length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Label className="text-xs font-semibold text-orange-700 uppercase tracking-wider">Other Roles</Label>
                        <div className="h-px bg-border flex-1 ml-2"></div>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
                        {formData.responsible.filter(role => !['Construction Lead', 'Commissioning Lead', 'Proj Manager', 'Proj Engr', 'ORA Engineer', 'ORA Engr', 'Ops Coach', 'Site Engineer', 'Site Engr', 'Dep. Plant Director', 'Dep Plant Director', 'Ops Team Lead', 'HSE Manager', 'HSE Director', 'ER Lead'].includes(role)).map((resp, index) => (
                          <div 
                            key={`other-resp-${resp}-${index}`}
                            className="group relative"
                          >
                            <Badge 
                              variant="secondary" 
                              className={`${getResponsibleColor('regular')} w-full justify-center py-1.5 px-2 text-xs cursor-pointer border truncate`}
                              onClick={() => setSelectedTag(selectedTag === `other-resp-${resp}-${index}` ? null : `other-resp-${resp}-${index}`)}
                            >
                              <span className="font-medium truncate">{resp}</span>
                              {selectedTag === `other-resp-${resp}-${index}` && (
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="absolute -top-1 -right-1 h-4 w-4 p-0 bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-full shadow-lg animate-scale-in" 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    updateFormData('responsible', formData.responsible.filter(r => r !== resp));
                                    setSelectedTag(null);
                                  }}
                                >
                                  <X className="h-2.5 w-2.5" />
                                </Button>
                              )}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
              
              {/* TA2 Responsible Configuration */}
              {ta2Responsible.map((ta2) => (
                showTA2ResponsibleConfig === ta2.id && (
                  <div key={ta2.id} className="border rounded-lg p-4 bg-blue-50/50 space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium text-blue-800">Configure TA2 Responsible</Label>
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
                  <div key={engr.id} className="border rounded-lg p-4 bg-cyan-50/50 space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium text-cyan-800">Configure Engineering Manager</Label>
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
                  <div key={hse.id} className="border rounded-lg p-4 bg-pink-50/50 space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium text-pink-800">Configure HSE Lead</Label>
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
              
              {/* Director Responsible Configuration */}
              {directorResponsible.map((dir) => (
                showDirectorResponsibleConfig === dir.id && (
                  <div key={dir.id} className="border rounded-lg p-4 bg-sky-50/50 space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium text-sky-800">Configure Director</Label>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          removeDirectorResponsible(dir.id);
                          setShowDirectorResponsibleConfig(null);
                        }}
                        className="h-6 w-6 p-0 text-red-600 hover:bg-red-100"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    <div>
                      <Label className="text-xs text-muted-foreground">Commission</Label>
                      <EnhancedSearchableCombobox
                        options={getDirectorCommissionOptions()}
                        value={dir.commission}
                        onValueChange={(value) => updateDirectorResponsible(dir.id, 'commission', value)}
                        placeholder="Select commission..."
                        className="h-8"
                      />
                    </div>
                  </div>
                )
              ))}
            </div>
            
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
                  } else if (value === 'Director') {
                    addDirectorApprover();
                  } else if (!formData.approvers.includes(value)) {
                    updateFormData('approvers', [...formData.approvers, value]);
                  }
                }}
                placeholder="Select role..."
                searchPlaceholder="Search roles..."
                className="fluent-input"
              />
              
              {/* Display all approvers together - organized by categories */}
              {(formData.approvers.length > 0 || ta2Approvers.filter(ta2 => ta2.position).length > 0 || engrManagerApprovers.filter(engr => engr.position).length > 0 || hseLeadApprovers.filter(hse => hse.position).length > 0 || directorApprovers.filter(dir => dir.position).length > 0) && (
                <div className="grid gap-4 p-4 bg-muted/30 rounded-lg border">
                  {/* Engineering Section */}
                  {(engrManagerApprovers.filter(engr => engr.position).length > 0 || ta2Approvers.filter(ta2 => ta2.position).length > 0) && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Label className="text-xs font-semibold text-indigo-700 uppercase tracking-wider">Engineering</Label>
                        <div className="h-px bg-border flex-1 ml-2"></div>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
                        {engrManagerApprovers.filter(engr => engr.position).map(engr => (
                          <div 
                            key={engr.id}
                            className="group relative"
                          >
                            <Badge 
                              variant="secondary" 
                              className={`${getApproverColor('engrManager')} w-full justify-center py-1.5 px-2 text-xs cursor-pointer border truncate`}
                              onClick={() => setSelectedTag(selectedTag === `engr-app-${engr.id}` ? null : `engr-app-${engr.id}`)}
                            >
                              <span className="font-medium truncate">{engr.position}</span>
                              {selectedTag === `engr-app-${engr.id}` && (
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="absolute -top-1 -right-1 h-4 w-4 p-0 bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-full shadow-lg animate-scale-in" 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    removeEngrManagerApprover(engr.id);
                                    setSelectedTag(null);
                                  }}
                                >
                                  <X className="h-2.5 w-2.5" />
                                </Button>
                              )}
                            </Badge>
                          </div>
                        ))}
                        {ta2Approvers.filter(ta2 => ta2.position).map(ta2 => (
                          <div 
                            key={ta2.id}
                            className="group relative"
                          >
                            <Badge 
                              variant="secondary" 
                              className={`${getApproverColor('ta2', ta2.position)} w-full justify-center py-1.5 px-2 text-xs cursor-pointer border truncate`}
                              onClick={() => setSelectedTag(selectedTag === `ta2-app-${ta2.id}` ? null : `ta2-app-${ta2.id}`)}
                            >
                              <span className="font-medium truncate">{ta2.position}</span>
                              {selectedTag === `ta2-app-${ta2.id}` && (
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="absolute -top-1 -right-1 h-4 w-4 p-0 bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-full shadow-lg animate-scale-in" 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    removeTA2Approver(ta2.id);
                                    setSelectedTag(null);
                                  }}
                                >
                                  <X className="h-2.5 w-2.5" />
                                </Button>
                              )}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Project Section */}
                  {formData.approvers.filter(role => ['Construction Lead', 'Commissioning Lead', 'Proj Manager', 'Proj Engr'].includes(role)).length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Label className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">Project</Label>
                        <div className="h-px bg-border flex-1 ml-2"></div>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
                        {formData.approvers.filter(role => ['Construction Lead', 'Commissioning Lead', 'Proj Manager', 'Proj Engr'].includes(role)).map((role, index) => (
                          <div 
                            key={`project-app-${role}-${index}`}
                            className="group relative"
                          >
                            <Badge 
                              variant="secondary" 
                              className={`${getApproverColor('project', role)} w-full justify-center py-1.5 px-2 text-xs cursor-pointer border truncate`}
                              onClick={() => setSelectedTag(selectedTag === `project-app-${role}-${index}` ? null : `project-app-${role}-${index}`)}
                            >
                              <span className="font-medium truncate">{role}</span>
                              {selectedTag === `project-app-${role}-${index}` && (
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="absolute -top-1 -right-1 h-4 w-4 p-0 bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-full shadow-lg animate-scale-in" 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    updateFormData('approvers', formData.approvers.filter(a => a !== role));
                                    setSelectedTag(null);
                                  }}
                                >
                                  <X className="h-2.5 w-2.5" />
                                </Button>
                              )}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Asset Section */}
                  {formData.approvers.filter(role => ['ORA Engineer', 'ORA Engr', 'Ops Coach', 'Site Engineer', 'Site Engr', 'Dep. Plant Director', 'Dep Plant Director', 'Ops Team Lead'].includes(role)).length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Label className="text-xs font-semibold text-blue-700 uppercase tracking-wider">Asset</Label>
                        <div className="h-px bg-border flex-1 ml-2"></div>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
                        {formData.approvers.filter(role => ['ORA Engineer', 'ORA Engr', 'Ops Coach', 'Site Engineer', 'Site Engr', 'Dep. Plant Director', 'Dep Plant Director', 'Ops Team Lead'].includes(role)).map((role, index) => (
                          <div 
                            key={`asset-app-${role}-${index}`}
                            className="group relative"
                          >
                            <Badge 
                              variant="secondary" 
                              className={`${getApproverColor('asset', role)} w-full justify-center py-1.5 px-2 text-xs cursor-pointer border truncate`}
                              onClick={() => setSelectedTag(selectedTag === `asset-app-${role}-${index}` ? null : `asset-app-${role}-${index}`)}
                            >
                              <span className="font-medium truncate">{role}</span>
                              {selectedTag === `asset-app-${role}-${index}` && (
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="absolute -top-1 -right-1 h-4 w-4 p-0 bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-full shadow-lg animate-scale-in" 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    updateFormData('approvers', formData.approvers.filter(a => a !== role));
                                    setSelectedTag(null);
                                  }}
                                >
                                  <X className="h-2.5 w-2.5" />
                                </Button>
                              )}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* HSE Section */}
                  {(hseLeadApprovers.filter(hse => hse.position).length > 0 || formData.approvers.filter(role => ['HSE Manager', 'HSE Director', 'ER Lead'].includes(role)).length > 0) && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Label className="text-xs font-semibold text-pink-700 uppercase tracking-wider">HSE</Label>
                        <div className="h-px bg-border flex-1 ml-2"></div>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
                        {hseLeadApprovers.filter(hse => hse.position).map(hse => (
                          <div 
                            key={hse.id}
                            className="group relative"
                          >
                            <Badge 
                              variant="secondary" 
                              className={`${getApproverColor('hseLead', hse.position)} w-full justify-center py-1.5 px-2 text-xs cursor-pointer border truncate`}
                              onClick={() => setSelectedTag(selectedTag === `hse-app-${hse.id}` ? null : `hse-app-${hse.id}`)}
                            >
                              <span className="font-medium truncate">{hse.position}</span>
                              {selectedTag === `hse-app-${hse.id}` && (
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="absolute -top-1 -right-1 h-4 w-4 p-0 bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-full shadow-lg animate-scale-in" 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    removeHSELeadApprover(hse.id);
                                    setSelectedTag(null);
                                  }}
                                >
                                  <X className="h-2.5 w-2.5" />
                                </Button>
                              )}
                            </Badge>
                          </div>
                        ))}
                        {formData.approvers.filter(role => ['HSE Manager', 'HSE Director', 'ER Lead'].includes(role)).map((role, index) => (
                          <div 
                            key={`hse-app-${role}-${index}`}
                            className="group relative"
                          >
                            <Badge 
                              variant="secondary" 
                              className={`${getApproverColor('hse', role)} w-full justify-center py-1.5 px-2 text-xs cursor-pointer border truncate`}
                              onClick={() => setSelectedTag(selectedTag === `hse-regular-app-${role}-${index}` ? null : `hse-regular-app-${role}-${index}`)}
                            >
                              <span className="font-medium truncate">{role}</span>
                              {selectedTag === `hse-regular-app-${role}-${index}` && (
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="absolute -top-1 -right-1 h-4 w-4 p-0 bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-full shadow-lg animate-scale-in" 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    updateFormData('approvers', formData.approvers.filter(a => a !== role));
                                    setSelectedTag(null);
                                  }}
                                >
                                  <X className="h-2.5 w-2.5" />
                                </Button>
                              )}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Directors Section */}
                  {(directorApprovers.filter(dir => dir.position).length > 0 || formData.approvers.filter(role => ['Plant Director'].includes(role)).length > 0) && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Director</Label>
                        <div className="h-px bg-border flex-1 ml-2"></div>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
                        {directorApprovers.filter(dir => dir.position).map(dir => (
                          <div 
                            key={dir.id}
                            className="group relative"
                          >
                            <Badge 
                              variant="secondary" 
                              className={`${getApproverColor('director', dir.position)} w-full justify-center py-1.5 px-2 text-xs cursor-pointer border truncate`}
                              onClick={() => setSelectedTag(selectedTag === `dir-app-${dir.id}` ? null : `dir-app-${dir.id}`)}
                            >
                              <span className="font-medium truncate">{dir.position}</span>
                              {selectedTag === `dir-app-${dir.id}` && (
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="absolute -top-1 -right-1 h-4 w-4 p-0 bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-full shadow-lg animate-scale-in" 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    removeDirectorApprover(dir.id);
                                    setSelectedTag(null);
                                  }}
                                >
                                  <X className="h-2.5 w-2.5" />
                                </Button>
                              )}
                            </Badge>
                          </div>
                        ))}
                        {formData.approvers.filter(role => ['Plant Director'].includes(role)).map((role, index) => (
                          <div 
                            key={`director-app-${role}-${index}`}
                            className="group relative"
                          >
                            <Badge 
                              variant="secondary" 
                              className={`${getApproverColor('director', role)} w-full justify-center py-1.5 px-2 text-xs cursor-pointer border truncate`}
                              onClick={() => setSelectedTag(selectedTag === `director-regular-app-${role}-${index}` ? null : `director-regular-app-${role}-${index}`)}
                            >
                              <span className="font-medium truncate">{role}</span>
                              {selectedTag === `director-regular-app-${role}-${index}` && (
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="absolute -top-1 -right-1 h-4 w-4 p-0 bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-full shadow-lg animate-scale-in" 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    updateFormData('approvers', formData.approvers.filter(a => a !== role));
                                    setSelectedTag(null);
                                  }}
                                >
                                  <X className="h-2.5 w-2.5" />
                                </Button>
                              )}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Other Roles Section */}
                  {formData.approvers.filter(role => !['Construction Lead', 'Commissioning Lead', 'Proj Manager', 'Proj Engr', 'ORA Engineer', 'ORA Engr', 'Ops Coach', 'Site Engineer', 'Site Engr', 'Dep. Plant Director', 'Dep Plant Director', 'Ops Team Lead', 'HSE Manager', 'HSE Director', 'ER Lead', 'Plant Director'].includes(role)).length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Label className="text-xs font-semibold text-orange-700 uppercase tracking-wider">Other Roles</Label>
                        <div className="h-px bg-border flex-1 ml-2"></div>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
                        {formData.approvers.filter(role => !['Construction Lead', 'Commissioning Lead', 'Proj Manager', 'Proj Engr', 'ORA Engineer', 'ORA Engr', 'Ops Coach', 'Site Engineer', 'Site Engr', 'Dep. Plant Director', 'Dep Plant Director', 'Ops Team Lead', 'HSE Manager', 'HSE Director', 'ER Lead', 'Plant Director'].includes(role)).map((approver, index) => (
                          <div 
                            key={`other-app-${approver}-${index}`}
                            className="group relative"
                          >
                            <Badge 
                              variant="secondary" 
                              className={`${getApproverColor('regular')} w-full justify-center py-1.5 px-2 text-xs cursor-pointer border truncate`}
                              onClick={() => setSelectedTag(selectedTag === `other-app-${approver}-${index}` ? null : `other-app-${approver}-${index}`)}
                            >
                              <span className="font-medium truncate">{approver}</span>
                              {selectedTag === `other-app-${approver}-${index}` && (
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="absolute -top-1 -right-1 h-4 w-4 p-0 bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-full shadow-lg animate-scale-in" 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    updateFormData('approvers', formData.approvers.filter(a => a !== approver));
                                    setSelectedTag(null);
                                  }}
                                >
                                  <X className="h-2.5 w-2.5" />
                                </Button>
                              )}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
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
              
              {/* Director Approver Configuration */}
              {directorApprovers.map((dir) => (
                showDirectorApproverConfig === dir.id && (
                  <div key={dir.id} className="border rounded-lg p-4 bg-sky-50/50 space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium text-sky-800">Configure Director</Label>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          removeDirectorApprover(dir.id);
                          setShowDirectorApproverConfig(null);
                        }}
                        className="h-6 w-6 p-0 text-red-600 hover:bg-red-100"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    <div>
                      <Label className="text-xs text-muted-foreground">Commission</Label>
                      <EnhancedSearchableCombobox
                        options={getDirectorCommissionOptions()}
                        value={dir.commission}
                        onValueChange={(value) => updateDirectorApprover(dir.id, 'commission', value)}
                        placeholder="Select commission..."
                        className="h-8"
                      />
                    </div>
                  </div>
                )
              ))}
            </div>
            
            {errors.approvers && (
              <p className="text-sm text-destructive flex items-center gap-1">
                <AlertCircle className="h-4 w-4" />
                {errors.approvers}
              </p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t border-border/50 mt-4">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={() => {
              if (validateForm()) {
                setShowPreview(true);
              }
            }} className="bg-primary hover:bg-primary/90">
              <Plus className="h-4 w-4 mr-2" />
              Preview & Save
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EditChecklistItemModal;

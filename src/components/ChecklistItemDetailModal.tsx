import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { EnhancedSearchableCombobox } from '@/components/ui/enhanced-searchable-combobox';
import { ChecklistItem, useUpdateChecklistItem } from '@/hooks/useChecklistItems';
import { useChecklistCategories, useCreateChecklistCategory } from '@/hooks/useChecklistCategories';
import { useChecklistTopics, useCreateChecklistTopic } from '@/hooks/useChecklistTopics';
import { useRoles } from '@/hooks/useRoles';
import { useDisciplines } from '@/hooks/useDisciplines';
import { useCommissions } from '@/hooks/useCommissions';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Plus, CheckCircle, AlertCircle, X, Search, FileText, Users, Shield, Save } from 'lucide-react';

interface ChecklistItemDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: ChecklistItem | null;
  mode: 'view' | 'edit';
}

interface TA2Selection {
  id: string;
  discipline: string;
  commission: string;
  position: string;
}

interface EngrManagerSelection {
  id: string;
  commission: string;
  position: string;
}

interface HSELeadSelection {
  id: string;
  commission: string;
  position: string;
}

interface DirectorSelection {
  id: string;
  commission: string;
  position: string;
}

interface FormData {
  description: string;
  evidenceGuidance: string;
  category: string;
  topic: string;
  approvers: string[];
  responsible: string[];
}

const ChecklistItemDetailModal: React.FC<ChecklistItemDetailModalProps> = ({
  isOpen,
  onClose,
  item,
  mode: initialMode,
}) => {
  const [mode, setMode] = useState<'view' | 'edit'>(initialMode);
  const [formData, setFormData] = useState<FormData>({
    description: '',
    evidenceGuidance: '',
    category: '',
    topic: '',
    approvers: [],
    responsible: [],
  });
  
  const [errors, setErrors] = useState<Partial<FormData>>({});
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  
  // TA2 States
  const [ta2Approvers, setTA2Approvers] = useState<TA2Selection[]>([]);
  const [ta2Responsible, setTA2Responsible] = useState<TA2Selection[]>([]);
  const [showTA2ApproverConfig, setShowTA2ApproverConfig] = useState<string | null>(null);
  const [showTA2ResponsibleConfig, setShowTA2ResponsibleConfig] = useState<string | null>(null);
  
  // Engineering Manager States
  const [engrManagerApprovers, setEngrManagerApprovers] = useState<EngrManagerSelection[]>([]);
  const [engrManagerResponsible, setEngrManagerResponsible] = useState<EngrManagerSelection[]>([]);
  const [showEngrManagerApproverConfig, setShowEngrManagerApproverConfig] = useState<string | null>(null);
  const [showEngrManagerResponsibleConfig, setShowEngrManagerResponsibleConfig] = useState<string | null>(null);
  
  // HSE Lead States  
  const [hseLeadApprovers, setHSELeadApprovers] = useState<HSELeadSelection[]>([]);
  const [hseLeadResponsible, setHSELeadResponsible] = useState<HSELeadSelection[]>([]);
  const [showHSELeadApproverConfig, setShowHSELeadApproverConfig] = useState<string | null>(null);
  const [showHSELeadResponsibleConfig, setShowHSELeadResponsibleConfig] = useState<string | null>(null);
  
  // Director States
  const [directorApprovers, setDirectorApprovers] = useState<DirectorSelection[]>([]);
  const [directorResponsible, setDirectorResponsible] = useState<DirectorSelection[]>([]);
  const [showDirectorApproverConfig, setShowDirectorApproverConfig] = useState<string | null>(null);
  const [showDirectorResponsibleConfig, setShowDirectorResponsibleConfig] = useState<string | null>(null);

  const { toast } = useToast();
  const updateMutation = useUpdateChecklistItem();
  
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

  useEffect(() => {
    setMode(initialMode);
  }, [initialMode]);

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
        const ta2Apps: TA2Selection[] = [];
        const engrApps: EngrManagerSelection[] = [];
        const hseLeadApps: HSELeadSelection[] = [];
        const directorApps: DirectorSelection[] = [];

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
          } else if (approver.includes('Engineering Manager')) {
            const match = approver.match(/Engineering Manager\s*\(([^)]+)\)/);
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
        const ta2Resp: TA2Selection[] = [];
        const engrResp: EngrManagerSelection[] = [];
        const hseLeadResp: HSELeadSelection[] = [];
        const directorResp: DirectorSelection[] = [];

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
          } else if (resp.includes('Engineering Manager')) {
            const match = resp.match(/Engineering Manager\s*\(([^)]+)\)/);
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

  const validateForm = (): boolean => {
    const newErrors: Partial<FormData> = {};
    if (!formData.description.trim()) {
      newErrors.description = 'Checklist question is required';
    }
    if (!formData.category) {
      newErrors.category = 'Category is required';
    }
    
    const hasApprovers = formData.approvers.length > 0 || ta2Approvers.length > 0 || 
                        engrManagerApprovers.length > 0 || hseLeadApprovers.length > 0 || 
                        directorApprovers.length > 0;
    if (!hasApprovers) {
      newErrors.approvers = 'At least one approver is required' as any;
    }
    
    const hasResponsible = formData.responsible.length > 0 || ta2Responsible.length > 0 || 
                          engrManagerResponsible.length > 0 || hseLeadResponsible.length > 0 || 
                          directorResponsible.length > 0;
    if (!hasResponsible) {
      newErrors.responsible = 'At least one responsible party is required' as any;
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
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
          topic: formData.topic.trim(),
          Approver: allApprovers.length > 0 ? allApprovers.join(', ') : null,
          responsible: allResponsible.length > 0 ? allResponsible.join(', ') : null,
        };

        await updateMutation.mutateAsync({ itemId: item.id, updateData });
        
        toast({
          title: "✅ Success",
          description: "Checklist item updated successfully.",
        });
        setMode('view');
      } catch (error) {
        console.error('Failed to update checklist item:', error);
        toast({
          title: "❌ Error",
          description: "Failed to update checklist item. Please try again.",
          variant: "destructive",
        });
      }
    }
  };

  const handleCancel = () => {
    if (mode === 'edit') {
      setMode('view');
      // Reset form data
      if (item) {
        setFormData({
          description: item.description || '',
          evidenceGuidance: item.required_evidence || '',
          category: item.category || '',
          topic: item.topic || '',
          approvers: [],
          responsible: [],
        });
      }
    } else {
      onClose();
    }
  };

  const updateFormData = (field: keyof FormData, value: any) => {
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
    const newTA2: TA2Selection = {
      id: Date.now().toString(),
      discipline: '',
      commission: '',
      position: ''
    };
    setTA2Approvers([...ta2Approvers, newTA2]);
    setShowTA2ApproverConfig(newTA2.id);
  };

  const updateTA2Approver = (id: string, field: keyof TA2Selection, value: string) => {
    setTA2Approvers(prev => prev.map(ta2 => {
      if (ta2.id === id) {
        const updated = { ...ta2, [field]: value };
        
        // Update position based on discipline and commission
        if (field === 'discipline' || field === 'commission') {
          const disc = field === 'discipline' ? value : ta2.discipline;
          const comm = field === 'commission' ? value : ta2.commission;
          
          if (disc === 'Tech Safety' || disc === 'Civil') {
            updated.position = `TA2 ${disc}`;
            if (disc) setShowTA2ApproverConfig(null);
          } else if (disc && comm) {
            updated.position = `TA2 ${disc} (${comm})`;
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
    const newTA2: TA2Selection = {
      id: Date.now().toString(),
      discipline: '',
      commission: '',
      position: ''
    };
    setTA2Responsible([...ta2Responsible, newTA2]);
    setShowTA2ResponsibleConfig(newTA2.id);
  };

  const updateTA2Responsible = (id: string, field: keyof TA2Selection, value: string) => {
    setTA2Responsible(prev => prev.map(ta2 => {
      if (ta2.id === id) {
        const updated = { ...ta2, [field]: value };
        
        if (field === 'discipline' || field === 'commission') {
          const disc = field === 'discipline' ? value : ta2.discipline;
          const comm = field === 'commission' ? value : ta2.commission;
          
          if (disc === 'Tech Safety' || disc === 'Civil') {
            updated.position = `TA2 ${disc}`;
            if (disc) setShowTA2ResponsibleConfig(null);
          } else if (disc && comm) {
            updated.position = `TA2 ${disc} (${comm})`;
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

  const removeTA2Responsible = (id: string) => {
    setTA2Responsible(prev => prev.filter(ta2 => ta2.id !== id));
  };

  // Engineering Manager functions
  const addEngrManagerApprover = () => {
    const newEngr: EngrManagerSelection = {
      id: Date.now().toString(),
      commission: '',
      position: ''
    };
    setEngrManagerApprovers([...engrManagerApprovers, newEngr]);
    setShowEngrManagerApproverConfig(newEngr.id);
  };

  const updateEngrManagerApprover = (id: string, field: keyof EngrManagerSelection, value: string) => {
    setEngrManagerApprovers(prev => prev.map(engr => {
      if (engr.id === id) {
        const updated = { ...engr, [field]: value };
        
        if (field === 'commission' && value) {
          updated.position = `Engineering Manager (${value})`;
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
    const newEngr: EngrManagerSelection = {
      id: Date.now().toString(),
      commission: '',
      position: ''
    };
    setEngrManagerResponsible([...engrManagerResponsible, newEngr]);
    setShowEngrManagerResponsibleConfig(newEngr.id);
  };

  const updateEngrManagerResponsible = (id: string, field: keyof EngrManagerSelection, value: string) => {
    setEngrManagerResponsible(prev => prev.map(engr => {
      if (engr.id === id) {
        const updated = { ...engr, [field]: value };
        
        if (field === 'commission' && value) {
          updated.position = `Engineering Manager (${value})`;
          setShowEngrManagerResponsibleConfig(null);
        }
        
        return updated;
      }
      return engr;
    }));
  };

  const removeEngrManagerResponsible = (id: string) => {
    setEngrManagerResponsible(prev => prev.filter(engr => engr.id !== id));
  };

  // HSE Lead functions
  const addHSELeadApprover = () => {
    const newHSE: HSELeadSelection = {
      id: Date.now().toString(),
      commission: '',
      position: ''
    };
    setHSELeadApprovers([...hseLeadApprovers, newHSE]);
    setShowHSELeadApproverConfig(newHSE.id);
  };

  const updateHSELeadApprover = (id: string, field: keyof HSELeadSelection, value: string) => {
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
    const newHSE: HSELeadSelection = {
      id: Date.now().toString(),
      commission: '',
      position: ''
    };
    setHSELeadResponsible([...hseLeadResponsible, newHSE]);
    setShowHSELeadResponsibleConfig(newHSE.id);
  };

  const updateHSELeadResponsible = (id: string, field: keyof HSELeadSelection, value: string) => {
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

  // Director functions
  const addDirectorApprover = () => {
    const newDir: DirectorSelection = {
      id: Date.now().toString(),
      commission: '',
      position: ''
    };
    setDirectorApprovers([...directorApprovers, newDir]);
    setShowDirectorApproverConfig(newDir.id);
  };

  const updateDirectorApprover = (id: string, field: keyof DirectorSelection, value: string) => {
    setDirectorApprovers(prev => prev.map(dir => {
      if (dir.id === id) {
        const updated = { ...dir, [field]: value };
        
        if (field === 'commission' && value) {
          if (value === 'Plant Director') {
            updated.position = 'Plant Director';
          } else {
            updated.position = `${value} Director`;
          }
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
    const newDir: DirectorSelection = {
      id: Date.now().toString(),
      commission: '',
      position: ''
    };
    setDirectorResponsible([...directorResponsible, newDir]);
    setShowDirectorResponsibleConfig(newDir.id);
  };

  const updateDirectorResponsible = (id: string, field: keyof DirectorSelection, value: string) => {
    setDirectorResponsible(prev => prev.map(dir => {
      if (dir.id === id) {
        const updated = { ...dir, [field]: value };
        
        if (field === 'commission' && value) {
          if (value === 'Plant Director') {
            updated.position = 'Plant Director';
          } else {
            updated.position = `${value} Director`;
          }
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

  if (showPreview) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[95vh] p-0 overflow-hidden" aria-describedby="checklist-item-preview-description">
          <DialogHeader className="p-6 border-b">
            <DialogTitle className="text-xl font-semibold">Preview Checklist Item</DialogTitle>
            <DialogDescription id="checklist-item-preview-description">
              Review the checklist item before saving changes
            </DialogDescription>
          </DialogHeader>

          <div className="p-6 overflow-y-auto max-h-[calc(95vh-180px)]">
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="px-3 py-1 bg-blue-100 text-blue-800 rounded-lg font-medium">
                  ID: {item?.unique_id}
                </div>
                <div className="px-3 py-1 bg-purple-100 text-purple-800 rounded-lg">
                  {formData.category}
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Checklist Question</h3>
                <p className="text-gray-700">{formData.description}</p>
              </div>

              {formData.evidenceGuidance && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Evidence Guidance</h3>
                  <p className="text-gray-700">{formData.evidenceGuidance}</p>
                </div>
              )}

              {formData.topic && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Topic</h3>
                  <p className="text-gray-700">{formData.topic}</p>
                </div>
              )}

              <div>
                <h3 className="font-semibold text-gray-900 mb-3">Responsible Parties</h3>
                <div className="flex flex-wrap gap-2">
                  {formData.responsible.map((resp, index) => (
                    <Badge key={index} className={getResponsibleColor('regular')}>
                      {resp}
                    </Badge>
                  ))}
                  {ta2Responsible.map(ta2 => (
                    <Badge key={ta2.id} className={getResponsibleColor('ta2', ta2.position)}>
                      {ta2.position}
                    </Badge>
                  ))}
                  {engrManagerResponsible.map(engr => (
                    <Badge key={engr.id} className={getResponsibleColor('engrManager', engr.position)}>
                      {engr.position}
                    </Badge>
                  ))}
                  {hseLeadResponsible.map(hse => (
                    <Badge key={hse.id} className={getResponsibleColor('hseLead', hse.position)}>
                      {hse.position}
                    </Badge>
                  ))}
                  {directorResponsible.map(dir => (
                    <Badge key={dir.id} className={getResponsibleColor('director', dir.position)}>
                      {dir.position}
                    </Badge>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-3">Approvers</h3>
                <div className="flex flex-wrap gap-2">
                  {formData.approvers.map((approver, index) => (
                    <Badge key={index} className={getApproverColor('regular')}>
                      {approver}
                    </Badge>
                  ))}
                  {ta2Approvers.map(ta2 => (
                    <Badge key={ta2.id} className={getApproverColor('ta2', ta2.position)}>
                      {ta2.position}
                    </Badge>
                  ))}
                  {engrManagerApprovers.map(engr => (
                    <Badge key={engr.id} className={getApproverColor('engrManager', engr.position)}>
                      {engr.position}
                    </Badge>
                  ))}
                  {hseLeadApprovers.map(hse => (
                    <Badge key={hse.id} className={getApproverColor('hseLead', hse.position)}>
                      {hse.position}
                    </Badge>
                  ))}
                  {directorApprovers.map(dir => (
                    <Badge key={dir.id} className={getApproverColor('director', dir.position)}>
                      {dir.position}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-between p-4 border-t bg-gray-50">
            <Button variant="outline" onClick={() => setShowPreview(false)}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Edit
            </Button>
            <Button onClick={handleSave} disabled={updateMutation.isPending}>
              <Save className="h-4 w-4 mr-2" />
              {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[95vh] p-0 overflow-hidden" aria-describedby="edit-checklist-item-description">
        <DialogHeader className="p-6 border-b bg-gradient-to-r from-blue-50 to-indigo-50">
          <DialogTitle className="text-xl font-semibold text-gray-900">
            Edit Checklist Item
          </DialogTitle>
          <DialogDescription id="edit-checklist-item-description">
            {item?.unique_id ? `ID: ${item.unique_id}` : 'An ID will be auto-assigned.'}
          </DialogDescription>
        </DialogHeader>

        <div className="p-6 overflow-y-auto max-h-[calc(95vh-180px)]">
          <div className="space-y-6">
            {/* Checklist Question */}
            <div className="space-y-2">
              <Label htmlFor="description" className="text-sm font-medium text-gray-900">
                Checklist Question <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => updateFormData('description', e.target.value)}
                placeholder="Enter the checklist question or requirement..."
                rows={3}
                className="resize-none"
              />
              {errors.description && (
                <p className="text-sm text-red-600">{errors.description}</p>
              )}
            </div>

            {/* Evidence Guidance */}
            <div className="space-y-2">
              <Label htmlFor="evidenceGuidance" className="text-sm font-medium text-gray-900">
                Evidence Guidance
              </Label>
              <Textarea
                id="evidenceGuidance"
                value={formData.evidenceGuidance}
                onChange={(e) => updateFormData('evidenceGuidance', e.target.value)}
                placeholder="Describe what evidence or documentation is required (optional)..."
                rows={2}
                className="resize-none"
              />
              <p className="text-xs text-gray-500">
                Help future users understand what documentation or evidence is needed
              </p>
            </div>

            {/* Category and Topic */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-900">
                  Category <span className="text-red-500">*</span>
                </Label>
                <EnhancedSearchableCombobox
                  options={categoryOptions}
                  value={formData.category}
                  onValueChange={(value) => updateFormData('category', value)}
                  onCreateNew={handleCreateCategory}
                  placeholder="Select or create category..."
                  searchPlaceholder="Search categories..."
                />
                {errors.category && (
                  <p className="text-sm text-red-600">{errors.category}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-900">Topic</Label>
                <EnhancedSearchableCombobox
                  options={topicOptions}
                  value={formData.topic}
                  onValueChange={(value) => updateFormData('topic', value)}
                  onCreateNew={handleCreateTopic}
                  placeholder="Select or create topic..."
                  searchPlaceholder="Search topics..."
                />
                <p className="text-xs text-gray-500">
                  Choose an existing topic or type to add a new one
                </p>
              </div>
            </div>

            {/* Responsible Parties Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Label className="text-sm font-medium text-gray-900">
                  Responsible <span className="text-red-500">*</span>
                </Label>
                {errors.responsible && (
                  <p className="text-sm text-red-600">{errors.responsible}</p>
                )}
              </div>

              {/* Regular Responsible Selection */}
              <div className="space-y-2">
                <EnhancedSearchableCombobox
                  options={roleOptions}
                  value=""
                  onValueChange={(value) => {
                    if (value && !formData.responsible.includes(value)) {
                      updateFormData('responsible', [...formData.responsible, value]);
                    }
                  }}
                  placeholder="Select role..."
                  searchPlaceholder="Search roles..."
                />
              </div>

              {/* TA2 Responsible Options */}
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addTA2Responsible}
                  className="text-blue-600 border-blue-200 hover:bg-blue-50"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add TA2
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addEngrManagerResponsible}
                  className="text-cyan-600 border-cyan-200 hover:bg-cyan-50"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Engineering Manager
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addHSELeadResponsible}
                  className="text-pink-600 border-pink-200 hover:bg-pink-50"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add HSE Lead
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addDirectorResponsible}
                  className="text-slate-600 border-slate-200 hover:bg-slate-50"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Director
                </Button>
              </div>

              {/* Display Selected Responsible Parties */}
              <div className="flex flex-wrap gap-2">
                {formData.responsible.map((resp, index) => (
                  <Badge key={index} className={`${getResponsibleColor('regular')} flex items-center gap-1`}>
                    {resp}
                    <X
                      className="h-3 w-3 cursor-pointer hover:bg-orange-200 rounded"
                      onClick={() => {
                        updateFormData('responsible', formData.responsible.filter((_, i) => i !== index));
                      }}
                    />
                  </Badge>
                ))}
                {ta2Responsible.map(ta2 => (
                  <Badge key={ta2.id} className={`${getResponsibleColor('ta2', ta2.position)} flex items-center gap-1`}>
                    {ta2.position || 'TA2 (Configuring...)'}
                    <X
                      className="h-3 w-3 cursor-pointer hover:bg-blue-200 rounded"
                      onClick={() => removeTA2Responsible(ta2.id)}
                    />
                  </Badge>
                ))}
                {engrManagerResponsible.map(engr => (
                  <Badge key={engr.id} className={`${getResponsibleColor('engrManager', engr.position)} flex items-center gap-1`}>
                    {engr.position || 'Engineering Manager (Configuring...)'}
                    <X
                      className="h-3 w-3 cursor-pointer hover:bg-indigo-200 rounded"
                      onClick={() => removeEngrManagerResponsible(engr.id)}
                    />
                  </Badge>
                ))}
                {hseLeadResponsible.map(hse => (
                  <Badge key={hse.id} className={`${getResponsibleColor('hseLead', hse.position)} flex items-center gap-1`}>
                    {hse.position || 'HSE Lead (Configuring...)'}
                    <X
                      className="h-3 w-3 cursor-pointer hover:bg-pink-200 rounded"
                      onClick={() => removeHSELeadResponsible(hse.id)}
                    />
                  </Badge>
                ))}
                {directorResponsible.map(dir => (
                  <Badge key={dir.id} className={`${getResponsibleColor('director', dir.position)} flex items-center gap-1`}>
                    {dir.position || 'Director (Configuring...)'}
                    <X
                      className="h-3 w-3 cursor-pointer hover:bg-neutral-200 rounded"
                      onClick={() => removeDirectorResponsible(dir.id)}
                    />
                  </Badge>
                ))}
              </div>

              {/* TA2 Responsible Configuration */}
              {ta2Responsible.map(ta2 => (
                showTA2ResponsibleConfig === ta2.id && (
                  <Card key={ta2.id} className="p-4 border-blue-200">
                    <div className="space-y-3">
                      <h4 className="font-medium text-blue-900">Configure TA2 Responsible</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <Label className="text-sm">Discipline</Label>
                          <Select
                            value={ta2.discipline}
                            onValueChange={(value) => updateTA2Responsible(ta2.id, 'discipline', value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select discipline" />
                            </SelectTrigger>
                            <SelectContent>
                              {disciplineOptions.map(disc => (
                                <SelectItem key={disc.value} value={disc.value}>
                                  {disc.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        {ta2.discipline && ta2.discipline !== 'Tech Safety' && ta2.discipline !== 'Civil' && (
                          <div>
                            <Label className="text-sm">Commission</Label>
                            <Select
                              value={ta2.commission}
                              onValueChange={(value) => updateTA2Responsible(ta2.id, 'commission', value)}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select commission" />
                              </SelectTrigger>
                              <SelectContent>
                                {getCommissionOptions(ta2.discipline).map(comm => (
                                  <SelectItem key={comm.value} value={comm.value}>
                                    {comm.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                )
              ))}

              {/* Engineering Manager Responsible Configuration */}
              {engrManagerResponsible.map(engr => (
                showEngrManagerResponsibleConfig === engr.id && (
                  <Card key={engr.id} className="p-4 border-cyan-200">
                    <div className="space-y-3">
                      <h4 className="font-medium text-cyan-900">Configure Engineering Manager Responsible</h4>
                      <div>
                        <Label className="text-sm">Commission</Label>
                        <Select
                          value={engr.commission}
                          onValueChange={(value) => updateEngrManagerResponsible(engr.id, 'commission', value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select commission" />
                          </SelectTrigger>
                          <SelectContent>
                            {getEngrManagerCommissionOptions().map(comm => (
                              <SelectItem key={comm.value} value={comm.value}>
                                {comm.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </Card>
                )
              ))}

              {/* HSE Lead Responsible Configuration */}
              {hseLeadResponsible.map(hse => (
                showHSELeadResponsibleConfig === hse.id && (
                  <Card key={hse.id} className="p-4 border-pink-200">
                    <div className="space-y-3">
                      <h4 className="font-medium text-pink-900">Configure HSE Lead Responsible</h4>
                      <div>
                        <Label className="text-sm">Commission</Label>
                        <Select
                          value={hse.commission}
                          onValueChange={(value) => updateHSELeadResponsible(hse.id, 'commission', value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select commission" />
                          </SelectTrigger>
                          <SelectContent>
                            {getHSELeadCommissionOptions().map(comm => (
                              <SelectItem key={comm.value} value={comm.value}>
                                {comm.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </Card>
                )
              ))}

              {/* Director Responsible Configuration */}
              {directorResponsible.map(dir => (
                showDirectorResponsibleConfig === dir.id && (
                  <Card key={dir.id} className="p-4 border-slate-200">
                    <div className="space-y-3">
                      <h4 className="font-medium text-slate-900">Configure Director Responsible</h4>
                      <div>
                        <Label className="text-sm">Commission/Role</Label>
                        <Select
                          value={dir.commission}
                          onValueChange={(value) => updateDirectorResponsible(dir.id, 'commission', value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select director type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Plant Director">Plant Director</SelectItem>
                            {getDirectorCommissionOptions().map(comm => (
                              <SelectItem key={comm.value} value={comm.value}>
                                {comm.label} Director
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </Card>
                )
              ))}
            </div>

            {/* Approvers Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Label className="text-sm font-medium text-gray-900">
                  Approvers <span className="text-red-500">*</span>
                </Label>
                {errors.approvers && (
                  <p className="text-sm text-red-600">{errors.approvers}</p>
                )}
              </div>

              {/* Regular Approver Selection */}
              <div className="space-y-2">
                <EnhancedSearchableCombobox
                  options={roleOptions}
                  value=""
                  onValueChange={(value) => {
                    if (value && !formData.approvers.includes(value)) {
                      updateFormData('approvers', [...formData.approvers, value]);
                    }
                  }}
                  placeholder="Select role..."
                  searchPlaceholder="Search roles..."
                />
              </div>

              {/* TA2 Approver Options */}
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addTA2Approver}
                  className="text-blue-600 border-blue-200 hover:bg-blue-50"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add TA2
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addEngrManagerApprover}
                  className="text-cyan-600 border-cyan-200 hover:bg-cyan-50"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Engineering Manager
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addHSELeadApprover}
                  className="text-pink-600 border-pink-200 hover:bg-pink-50"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add HSE Lead
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addDirectorApprover}
                  className="text-slate-600 border-slate-200 hover:bg-slate-50"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Director
                </Button>
              </div>

              {/* Display Selected Approvers */}
              <div className="flex flex-wrap gap-2">
                {formData.approvers.map((approver, index) => (
                  <Badge key={index} className={`${getApproverColor('regular')} flex items-center gap-1`}>
                    {approver}
                    <X
                      className="h-3 w-3 cursor-pointer hover:bg-purple-200 rounded"
                      onClick={() => {
                        updateFormData('approvers', formData.approvers.filter((_, i) => i !== index));
                      }}
                    />
                  </Badge>
                ))}
                {ta2Approvers.map(ta2 => (
                  <Badge key={ta2.id} className={`${getApproverColor('ta2', ta2.position)} flex items-center gap-1`}>
                    {ta2.position || 'TA2 (Configuring...)'}
                    <X
                      className="h-3 w-3 cursor-pointer hover:bg-blue-200 rounded"
                      onClick={() => removeTA2Approver(ta2.id)}
                    />
                  </Badge>
                ))}
                {engrManagerApprovers.map(engr => (
                  <Badge key={engr.id} className={`${getApproverColor('engrManager', engr.position)} flex items-center gap-1`}>
                    {engr.position || 'Engineering Manager (Configuring...)'}
                    <X
                      className="h-3 w-3 cursor-pointer hover:bg-cyan-200 rounded"
                      onClick={() => removeEngrManagerApprover(engr.id)}
                    />
                  </Badge>
                ))}
                {hseLeadApprovers.map(hse => (
                  <Badge key={hse.id} className={`${getApproverColor('hseLead', hse.position)} flex items-center gap-1`}>
                    {hse.position || 'HSE Lead (Configuring...)'}
                    <X
                      className="h-3 w-3 cursor-pointer hover:bg-pink-200 rounded"
                      onClick={() => removeHSELeadApprover(hse.id)}
                    />
                  </Badge>
                ))}
                {directorApprovers.map(dir => (
                  <Badge key={dir.id} className={`${getApproverColor('director', dir.position)} flex items-center gap-1`}>
                    {dir.position || 'Director (Configuring...)'}
                    <X
                      className="h-3 w-3 cursor-pointer hover:bg-neutral-200 rounded"
                      onClick={() => removeDirectorApprover(dir.id)}
                    />
                  </Badge>
                ))}
              </div>

              {/* TA2 Approver Configuration */}
              {ta2Approvers.map(ta2 => (
                showTA2ApproverConfig === ta2.id && (
                  <Card key={ta2.id} className="p-4 border-blue-200">
                    <div className="space-y-3">
                      <h4 className="font-medium text-blue-900">Configure TA2 Approver</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <Label className="text-sm">Discipline</Label>
                          <Select
                            value={ta2.discipline}
                            onValueChange={(value) => updateTA2Approver(ta2.id, 'discipline', value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select discipline" />
                            </SelectTrigger>
                            <SelectContent>
                              {disciplineOptions.map(disc => (
                                <SelectItem key={disc.value} value={disc.value}>
                                  {disc.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        {ta2.discipline && ta2.discipline !== 'Tech Safety' && ta2.discipline !== 'Civil' && (
                          <div>
                            <Label className="text-sm">Commission</Label>
                            <Select
                              value={ta2.commission}
                              onValueChange={(value) => updateTA2Approver(ta2.id, 'commission', value)}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select commission" />
                              </SelectTrigger>
                              <SelectContent>
                                {getCommissionOptions(ta2.discipline).map(comm => (
                                  <SelectItem key={comm.value} value={comm.value}>
                                    {comm.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                )
              ))}

              {/* Engineering Manager Approver Configuration */}
              {engrManagerApprovers.map(engr => (
                showEngrManagerApproverConfig === engr.id && (
                  <Card key={engr.id} className="p-4 border-cyan-200">
                    <div className="space-y-3">
                      <h4 className="font-medium text-cyan-900">Configure Engineering Manager Approver</h4>
                      <div>
                        <Label className="text-sm">Commission</Label>
                        <Select
                          value={engr.commission}
                          onValueChange={(value) => updateEngrManagerApprover(engr.id, 'commission', value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select commission" />
                          </SelectTrigger>
                          <SelectContent>
                            {getEngrManagerCommissionOptions().map(comm => (
                              <SelectItem key={comm.value} value={comm.value}>
                                {comm.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </Card>
                )
              ))}

              {/* HSE Lead Approver Configuration */}
              {hseLeadApprovers.map(hse => (
                showHSELeadApproverConfig === hse.id && (
                  <Card key={hse.id} className="p-4 border-pink-200">
                    <div className="space-y-3">
                      <h4 className="font-medium text-pink-900">Configure HSE Lead Approver</h4>
                      <div>
                        <Label className="text-sm">Commission</Label>
                        <Select
                          value={hse.commission}
                          onValueChange={(value) => updateHSELeadApprover(hse.id, 'commission', value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select commission" />
                          </SelectTrigger>
                          <SelectContent>
                            {getHSELeadCommissionOptions().map(comm => (
                              <SelectItem key={comm.value} value={comm.value}>
                                {comm.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </Card>
                )
              ))}

              {/* Director Approver Configuration */}
              {directorApprovers.map(dir => (
                showDirectorApproverConfig === dir.id && (
                  <Card key={dir.id} className="p-4 border-slate-200">
                    <div className="space-y-3">
                      <h4 className="font-medium text-slate-900">Configure Director Approver</h4>
                      <div>
                        <Label className="text-sm">Commission/Role</Label>
                        <Select
                          value={dir.commission}
                          onValueChange={(value) => updateDirectorApprover(dir.id, 'commission', value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select director type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Plant Director">Plant Director</SelectItem>
                            {getDirectorCommissionOptions().map(comm => (
                              <SelectItem key={comm.value} value={comm.value}>
                                {comm.label} Director
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </Card>
                )
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-between p-4 border-t bg-gray-50">
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setShowPreview(true)}
              className="text-blue-600 border-blue-200 hover:bg-blue-50"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Preview & Save
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ChecklistItemDetailModal;
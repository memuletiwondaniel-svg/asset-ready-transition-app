import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Combobox, MultiSelectCombobox, ComboboxOption } from '@/components/ui/combobox';
import { Users, Shield, Save, User, Edit3, FileText, X, Plus, Award } from 'lucide-react';
import { ChecklistItem, useUpdateChecklistItem, UpdateChecklistItemData } from '@/hooks/useChecklistItems';
import { useUsers } from '@/hooks/useUsers';
import { useCommissions, useDisciplines, useTopics } from '@/hooks/useRoleData';
import { useToast } from '@/hooks/use-toast';

interface EditChecklistItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: ChecklistItem;
  onSaveComplete?: () => void;
}

interface TA2Approver {
  id: string;
  commission: string;
  discipline: string;
}

interface CustomPerson {
  id: string;
  name: string;
  role: string;
}

const EditChecklistItemModal: React.FC<EditChecklistItemModalProps> = ({
  isOpen,
  onClose,
  item,
  onSaveComplete,
}) => {
  const [formData, setFormData] = useState<UpdateChecklistItemData>({});
  const [selectedResponsibleParty, setSelectedResponsibleParty] = useState<string>('');
  const [selectedApprovers, setSelectedApprovers] = useState<string[]>([]);
  const [ta2Approvers, setTA2Approvers] = useState<TA2Approver[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { toast } = useToast();
  const { users } = useUsers();
  const { data: commissions } = useCommissions();
  const { data: disciplines } = useDisciplines();
  const { data: topics } = useTopics();
  const { mutate: updateChecklistItem, isPending } = useUpdateChecklistItem();

  // Categories with enhanced styling
  const categories = [
    'General',
    'Process Safety',
    'Emergency Systems', 
    'Technical Integrity',
    'Start-Up Readiness',
    'Health & Safety',
    'Environmental',
    'Operations'
  ];

  // Enhanced responsible party options with better organization
  const responsiblePartyOptions: ComboboxOption[] = [
    { value: 'Area Engineer', label: '🔧 Area Engineer (Default Role)' },
    { value: 'Control System Engineer', label: '💻 Control System Engineer (Default Role)' },
    { value: 'Electrical Engineer', label: '⚡ Electrical Engineer (Default Role)' },
    { value: 'Instrument Engineer', label: '🔬 Instrument Engineer (Default Role)' },
    { value: 'Mechanical Engineer', label: '⚙️ Mechanical Engineer (Default Role)' },
    { value: 'Process Engineer', label: '🧪 Process Engineer (Default Role)' },
    { value: 'Safety Engineer', label: '🛡️ Safety Engineer (Default Role)' },
    { value: 'Commissioning Engineer', label: '🔨 Commissioning Engineer (Default Role)' },
    ...users
      .filter(user => user.status === 'active')
      .map(user => ({
        value: `${user.firstName} ${user.lastName}`,
        label: `👤 ${user.firstName} ${user.lastName} - ${user.role} (${user.company})`
      }))
  ];

  // Enhanced approver options with better visual distinction
  const approverOptions: ComboboxOption[] = [
    { value: 'Area Authority', label: '🏢 Area Authority (Default Role)' },
    { value: 'Control System Authority', label: '💻 Control System Authority (Default Role)' },
    { value: 'Electrical Authority', label: '⚡ Electrical Authority (Default Role)' },
    { value: 'Instrument Authority', label: '🔬 Instrument Authority (Default Role)' },
    { value: 'Mechanical Authority', label: '⚙️ Mechanical Authority (Default Role)' },
    { value: 'Process Authority', label: '🧪 Process Authority (Default Role)' },
    { value: 'Safety Authority', label: '🛡️ Safety Authority (Default Role)' },
    { value: 'Operations Authority', label: '🏭 Operations Authority (Default Role)' },
    { value: 'Plant Director', label: '👨‍💼 Plant Director (Default Role)' },
    { value: 'Technical Authority (TA2)', label: '🎖️ Technical Authority (TA2) (Configure Below)' },
    ...users
      .filter(user => user.status === 'active' && (
        user.privileges.includes('Edit PSSR Checklist item Default approvers and PSSR Approvers') ||
        user.role.toLowerCase().includes('director') ||
        user.role.toLowerCase().includes('authority') ||
        user.role.toLowerCase().includes('manager') ||
        user.role.toLowerCase().includes('lead')
      ))
      .map(user => ({
        value: `${user.firstName} ${user.lastName}`,
        label: `👤 ${user.firstName} ${user.lastName} - ${user.role} (${user.company})`
      }))
  ];

  // Enhanced initialization with TA2 parsing
  useEffect(() => {
    if (item) {
      setFormData({
        description: item.description,
        category: item.category,
        topic: item.topic || '',
        supporting_evidence: item.supporting_evidence || '',
        is_active: item.is_active,
      });
      
      setSelectedResponsibleParty(item.responsible_party || '');
      
      // Parse existing approvers and extract TA2 entries
      if (item.approving_authority) {
        const approvers = item.approving_authority.split(', ');
        const regularApprovers: string[] = [];
        const ta2List: TA2Approver[] = [];
        
        approvers.forEach(approver => {
          if (approver.startsWith('TA2 ')) {
            // Parse TA2 format: "TA2 Discipline (Commission)"
            const match = approver.match(/TA2 ([^(]+) \(([^)]+)\)/);
            if (match) {
              ta2List.push({
                id: `ta2-${Date.now()}-${Math.random()}`,
                discipline: match[1].trim(),
                commission: match[2].trim()
              });
            }
          } else if (approver !== 'Technical Authority (TA2)') {
            regularApprovers.push(approver);
          }
        });
        
        setSelectedApprovers(regularApprovers);
        setTA2Approvers(ta2List);
      }
    }
  }, [item]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.description?.trim()) {
      newErrors.description = 'Description is required';
    }

    if (!formData.category?.trim()) {
      newErrors.category = 'Category is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (!validateForm()) return;

    // Combine regular approvers with TA2 approvers
    const allApprovers = [...selectedApprovers];
    
    // Add TA2 approvers in the format "TA2 Discipline (Commission)"
    ta2Approvers.forEach(ta2 => {
      allApprovers.push(`TA2 ${ta2.discipline} (${ta2.commission})`);
    });

    const updateData: UpdateChecklistItemData = {
      ...formData,
      responsible_party: selectedResponsibleParty || null,
      approving_authority: allApprovers.length > 0 ? allApprovers.join(', ') : null,
    };

    updateChecklistItem(
      { itemId: item.id, updateData },
      {
        onSuccess: () => {
          toast({
            title: "✅ Success",
            description: "Checklist item updated successfully.",
          });
          onClose();
          onSaveComplete?.();
        },
        onError: (error) => {
          console.error('Failed to update checklist item:', error);
          toast({
            title: "❌ Error",
            description: "Failed to update checklist item. Please try again.",
            variant: "destructive",
          });
        }
      }
    );
  };

  const updateFormData = (field: keyof UpdateChecklistItemData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const removeApprover = (approverToRemove: string) => {
    setSelectedApprovers(prev => prev.filter(approver => approver !== approverToRemove));
  };

  const clearResponsibleParty = () => {
    setSelectedResponsibleParty('');
  };

  // TA2 Management Functions
  const addTA2Approver = () => {
    const newTA2: TA2Approver = {
      id: `ta2-${Date.now()}-${Math.random()}`,
      commission: '',
      discipline: ''
    };
    setTA2Approvers(prev => [...prev, newTA2]);
  };

  const removeTA2Approver = (id: string) => {
    setTA2Approvers(prev => prev.filter(ta2 => ta2.id !== id));
  };

  const updateTA2Approver = (id: string, field: 'commission' | 'discipline', value: string) => {
    setTA2Approvers(prev => prev.map(ta2 => 
      ta2.id === id ? { ...ta2, [field]: value } : ta2
    ));
  };

  const handleApproverChange = (newApprovers: string[]) => {
    setSelectedApprovers(newApprovers);
    
    // If TA2 is selected, ensure we have at least one TA2 entry
    if (newApprovers.includes('Technical Authority (TA2)') && ta2Approvers.length === 0) {
      addTA2Approver();
    }
    
    // If TA2 is deselected, clear all TA2 entries
    if (!newApprovers.includes('Technical Authority (TA2)')) {
      setTA2Approvers([]);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[95vh] border-0 p-0 overflow-hidden bg-background/95 backdrop-blur-sm shadow-2xl">
        {/* Fluent Design Header */}
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/8 via-accent/4 to-secondary/6"></div>
          <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent"></div>
          
          <DialogHeader className="relative px-8 py-8 border-b border-border/5">
            <div className="flex items-start gap-6">
              <div className="flex-shrink-0">
                <div className="relative w-14 h-14 rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 flex items-center justify-center backdrop-blur-sm border border-primary/10">
                  <Edit3 className="h-7 w-7 text-primary" />
                  <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-white/5 to-transparent"></div>
                </div>
              </div>
              <div className="flex-grow space-y-2">
                <DialogTitle className="text-2xl font-semibold text-foreground tracking-tight">
                  Edit Checklist Item
                </DialogTitle>
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-muted/50">
                    <FileText className="h-3.5 w-3.5" />
                    <span className="font-medium">ID: {item?.id}</span>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground/80 leading-relaxed">
                  Modify item specifications, assign responsibilities, and configure approval workflows
                </p>
              </div>
            </div>
          </DialogHeader>
        </div>

        <ScrollArea className="flex-1 px-6 py-4">
          <div className="space-y-6 pr-4">
            {/* Item Details Section */}
            <div className="space-y-4">
              <div className="relative">
                <div className="flex items-center gap-3 pb-3">
                  <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500/15 to-indigo-500/15 border border-blue-200/40">
                    <FileText className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-foreground tracking-tight">Item Specification</h3>
                    <p className="text-xs text-muted-foreground">Define core requirements and details</p>
                  </div>
                </div>
                <div className="absolute left-4 top-12 bottom-0 w-px bg-gradient-to-b from-blue-200/60 to-transparent"></div>
              </div>
              
              {/* Description */}
              <div className="space-y-3 ml-12">
                <div className="space-y-1">
                  <Label htmlFor="description" className="text-sm font-medium text-foreground flex items-center gap-2">
                    <span className="w-1 h-4 bg-gradient-to-b from-blue-500 to-blue-600 rounded-full"></span>
                    Description <span className="text-destructive text-xs">*</span>
                  </Label>
                  <p className="text-xs text-muted-foreground pl-3">Clear description of completion requirements</p>
                </div>
                <Textarea
                  id="description"
                  value={formData.description || ''}
                  onChange={(e) => updateFormData('description', e.target.value)}
                  placeholder="Describe what needs to be completed for this checklist item..."
                  rows={3}
                  className={`resize-none transition-all duration-200 ${errors.description ? 'border-destructive focus:border-destructive ring-destructive/20' : 'focus:ring-blue-500/20'} rounded-lg border-border/50 focus:border-blue-500 bg-gradient-to-br from-blue-50/30 to-transparent`}
                />
                {errors.description && (
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-destructive/5 border border-destructive/20">
                    <X className="h-3 w-3 text-destructive flex-shrink-0" />
                    <p className="text-xs text-destructive">{errors.description}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Classification Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 ml-12">
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label htmlFor="category" className="text-sm font-medium text-foreground flex items-center gap-2">
                    <span className="w-1 h-4 bg-gradient-to-b from-purple-500 to-purple-600 rounded-full"></span>
                    Category <span className="text-destructive text-xs">*</span>
                  </Label>
                  <p className="text-xs text-muted-foreground pl-3">Primary classification</p>
                </div>
                <Select 
                  value={formData.category || ''} 
                  onValueChange={(value) => updateFormData('category', value)}
                >
                  <SelectTrigger className={`h-10 transition-all duration-200 ${errors.category ? 'border-destructive focus:border-destructive ring-destructive/20' : 'focus:ring-purple-500/20'} rounded-lg border-border/50 focus:border-purple-500 bg-gradient-to-br from-purple-50/30 to-transparent`}>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent className="rounded-lg border-border/50 bg-white/95 backdrop-blur-sm z-50">
                    {categories.map((category) => (
                      <SelectItem key={category} value={category} className="rounded-md hover:bg-purple-50/50">
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.category && (
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-destructive/5 border border-destructive/20">
                    <X className="h-3 w-3 text-destructive flex-shrink-0" />
                    <p className="text-xs text-destructive">{errors.category}</p>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <div className="space-y-1">
                  <Label htmlFor="topic" className="text-sm font-medium text-foreground flex items-center gap-2">
                    <span className="w-1 h-4 bg-gradient-to-b from-green-500 to-green-600 rounded-full"></span>
                    Topic
                  </Label>
                  <p className="text-xs text-muted-foreground pl-3">Specific subject area</p>
                </div>
                <Combobox
                  options={topics || []}
                  value={formData.topic || ''}
                  onValueChange={(value) => updateFormData('topic', value)}
                  placeholder="Select or enter topic..."
                  searchPlaceholder="Search topics..."
                />
              </div>
            </div>

            {/* Supporting Evidence Section */}
            <div className="space-y-3 ml-12">
              <div className="space-y-1">
                <Label htmlFor="supporting_evidence" className="text-sm font-medium text-foreground flex items-center gap-2">
                  <span className="w-1 h-4 bg-gradient-to-b from-orange-500 to-orange-600 rounded-full"></span>
                  Supporting Evidence
                </Label>
                <p className="text-xs text-muted-foreground pl-3">Required documentation and proof</p>
              </div>
              <Textarea
                id="supporting_evidence"
                value={formData.supporting_evidence || ''}
                onChange={(e) => updateFormData('supporting_evidence', e.target.value)}
                placeholder="Describe required evidence or documentation..."
                rows={2}
                className="resize-none transition-all duration-200 rounded-lg border-border/50 focus:border-orange-500 focus:ring-orange-500/20 bg-gradient-to-br from-orange-50/30 to-transparent"
              />
            </div>

            {/* Assignments Section */}
            <div className="space-y-4">
              <div className="relative">
                <div className="flex items-center gap-3 pb-3">
                  <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500/15 to-teal-500/15 border border-emerald-200/40">
                    <Users className="h-4 w-4 text-emerald-600" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-foreground tracking-tight">Role Assignments</h3>
                    <p className="text-xs text-muted-foreground">Configure responsibilities and approvals</p>
                  </div>
                </div>
                <div className="absolute left-4 top-12 bottom-0 w-px bg-gradient-to-b from-emerald-200/60 to-transparent"></div>
              </div>
              
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 ml-12">
                {/* Responsible Party */}
                <div className="space-y-3">
                  <div className="space-y-1">
                    <Label className="text-sm font-medium text-foreground flex items-center gap-2">
                      <div className="w-4 h-4 rounded-md bg-gradient-to-br from-emerald-500/20 to-emerald-600/20 flex items-center justify-center">
                        <User className="h-2.5 w-2.5 text-emerald-600" />
                      </div>
                      Responsible Party
                    </Label>
                    <p className="text-xs text-muted-foreground pl-6">Individual accountable for completion</p>
                  </div>
                  
                  <Combobox
                    options={responsiblePartyOptions}
                    value={selectedResponsibleParty}
                    onValueChange={setSelectedResponsibleParty}
                    placeholder="Select responsible party..."
                    searchPlaceholder="Search roles or users..."
                  />
                  
                  {selectedResponsibleParty && (
                    <div className="p-3 bg-gradient-to-r from-emerald-50/50 to-emerald-100/50 rounded-lg border border-emerald-200/40">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                          <span className="text-xs font-medium text-emerald-700">Assigned</span>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={clearResponsibleParty}
                          className="h-6 w-6 p-0 rounded-lg hover:bg-destructive/10 hover:text-destructive transition-colors"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                      <p className="text-xs text-emerald-800 mt-1 font-medium truncate">{selectedResponsibleParty.replace(/^[^\s]+ /, '')}</p>
                    </div>
                  )}
                </div>

                {/* Approving Authority */}
                <div className="space-y-3">
                  <div className="space-y-1">
                    <Label className="text-sm font-medium text-foreground flex items-center gap-2">
                      <div className="w-4 h-4 rounded-md bg-gradient-to-br from-indigo-500/20 to-indigo-600/20 flex items-center justify-center">
                        <Shield className="h-2.5 w-2.5 text-indigo-600" />
                      </div>
                      Approving Authority
                    </Label>
                    <p className="text-xs text-muted-foreground pl-6">Required authorities for approval</p>
                  </div>
                  
                  <MultiSelectCombobox
                    value={selectedApprovers}
                    onValueChange={handleApproverChange}
                    options={approverOptions}
                    placeholder="Select approving authorities..."
                    searchPlaceholder="Search authority roles or users..."
                  />
                  
                  {selectedApprovers.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between p-2 bg-indigo-50/30 rounded-lg">
                        <div className="flex items-center gap-2">
                          <Shield className="h-3 w-3 text-indigo-600" />
                          <span className="text-xs font-medium text-indigo-800">
                            {selectedApprovers.length} authority{selectedApprovers.length !== 1 ? 'ies' : 'y'} selected
                          </span>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedApprovers([])}
                          className="h-5 text-xs text-muted-foreground hover:text-destructive transition-colors"
                        >
                          Clear all
                        </Button>
                      </div>
                      
                      <div className="space-y-1 max-h-20 overflow-y-auto">
                        {selectedApprovers.map((approver, index) => (
                          <div key={index} className="flex items-center justify-between p-2 bg-gradient-to-r from-indigo-50/30 to-indigo-100/30 rounded-lg border border-indigo-200/30">
                            <span className="text-xs text-indigo-800 font-medium truncate flex-1">{approver.replace(/^[^\s]+ /, '')}</span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeApprover(approver)}
                              className="h-5 w-5 p-0 rounded-lg hover:bg-destructive/10 hover:text-destructive transition-colors ml-2"
                            >
                              <X className="h-2.5 w-2.5" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* TA2 Configuration Section */}
              {selectedApprovers.includes('Technical Authority (TA2)') && (
                <div className="space-y-3 ml-12 mt-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Label className="text-sm font-medium text-foreground flex items-center gap-2">
                        <div className="w-4 h-4 rounded-md bg-gradient-to-br from-amber-500/20 to-amber-600/20 flex items-center justify-center">
                          <Award className="h-2.5 w-2.5 text-amber-600" />
                        </div>
                        TA2 Authorities Configuration
                      </Label>
                      <p className="text-xs text-muted-foreground pl-6">Configure commission and discipline for each TA2</p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addTA2Approver}
                      className="h-7 px-3 text-xs border-amber-200 text-amber-700 hover:bg-amber-50"
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Add TA2
                    </Button>
                  </div>
                  
                  {ta2Approvers.length === 0 && (
                    <div className="p-3 bg-amber-50/30 rounded-lg border border-amber-200/40 text-center">
                      <p className="text-xs text-amber-700">Click "Add TA2" to configure Technical Authority approvers</p>
                    </div>
                  )}
                  
                  <div className="space-y-2">
                    {ta2Approvers.map((ta2, index) => (
                      <div key={ta2.id} className="p-3 bg-gradient-to-r from-amber-50/40 to-amber-100/40 rounded-lg border border-amber-200/40">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-medium text-amber-800">TA2 Authority #{index + 1}</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeTA2Approver(ta2.id)}
                            className="h-5 w-5 p-0 rounded-lg hover:bg-destructive/10 hover:text-destructive transition-colors"
                          >
                            <X className="h-2.5 w-2.5" />
                          </Button>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <Label className="text-xs text-amber-700 mb-1 block">Commission</Label>
                            <Select
                              value={ta2.commission}
                              onValueChange={(value) => updateTA2Approver(ta2.id, 'commission', value)}
                            >
                              <SelectTrigger className="h-8 text-xs bg-white/50 border-amber-200/50 focus:border-amber-400 focus:ring-amber-400/20">
                                <SelectValue placeholder="Select commission" />
                              </SelectTrigger>
                              <SelectContent className="bg-white/95 backdrop-blur-sm z-50">
                                {commissions?.map((commission) => (
                                  <SelectItem key={commission.value} value={commission.value} className="text-xs">
                                    {commission.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label className="text-xs text-amber-700 mb-1 block">Discipline</Label>
                            <Select
                              value={ta2.discipline}
                              onValueChange={(value) => updateTA2Approver(ta2.id, 'discipline', value)}
                            >
                              <SelectTrigger className="h-8 text-xs bg-white/50 border-amber-200/50 focus:border-amber-400 focus:ring-amber-400/20">
                                <SelectValue placeholder="Select discipline" />
                              </SelectTrigger>
                              <SelectContent className="bg-white/95 backdrop-blur-sm z-50">
                                {disciplines?.map((discipline) => (
                                  <SelectItem key={discipline.value} value={discipline.value} className="text-xs">
                                    {discipline.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        {ta2.commission && ta2.discipline && (
                          <div className="mt-2 p-2 bg-amber-100/50 rounded border border-amber-200/50">
                            <p className="text-xs text-amber-800 font-medium">
                              Preview: TA2 {ta2.discipline} ({ta2.commission})
                            </p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </ScrollArea>

        {/* Enhanced Footer */}
        <div className="relative border-t border-border/10 bg-gradient-to-r from-slate-50/60 via-white/80 to-slate-50/60 backdrop-blur-sm">
          <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-border/30 to-transparent"></div>
          
          <DialogFooter className="p-4">
            <div className="flex gap-3 w-full justify-end">
              <Button 
                type="button"
                variant="outline" 
                onClick={onClose}
                className="h-9 px-4 rounded-lg border-border/50 hover:bg-slate-100/60 transition-all duration-200 text-sm"
              >
                Cancel
              </Button>
              <Button 
                type="button"
                onClick={handleSave} 
                disabled={isPending}
                className="h-9 px-6 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white shadow-lg shadow-emerald-500/20 transition-all duration-200 text-sm font-medium"
              >
                {isPending ? (
                  <>
                    <div className="animate-spin rounded-full h-3 w-3 border-2 border-white/30 border-t-white mr-2"></div>
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Save className="h-3 w-3 mr-2" />
                    <span>Save Changes</span>
                  </>
                )}
              </Button>
            </div>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EditChecklistItemModal;
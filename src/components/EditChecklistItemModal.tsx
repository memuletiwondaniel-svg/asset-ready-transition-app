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
import { Users, Shield, Save, User, Edit3, FileText, X } from 'lucide-react';
import { ChecklistItem, useUpdateChecklistItem, UpdateChecklistItemData } from '@/hooks/useChecklistItems';
import { useUsers } from '@/hooks/useUsers';
import { useToast } from '@/hooks/use-toast';

interface EditChecklistItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: ChecklistItem;
  onSaveComplete?: () => void; // New callback for after successful save
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
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { toast } = useToast();
  const { users } = useUsers();
  const { mutate: updateChecklistItem, isPending } = useUpdateChecklistItem();

  // Categories for the select dropdown
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

  // Create options for dropdowns with enhanced user data
  const responsiblePartyOptions: ComboboxOption[] = [
    // Default engineering roles
    { value: 'Area Engineer', label: 'Area Engineer (Default Role)' },
    { value: 'Control System Engineer', label: 'Control System Engineer (Default Role)' },
    { value: 'Electrical Engineer', label: 'Electrical Engineer (Default Role)' },
    { value: 'Instrument Engineer', label: 'Instrument Engineer (Default Role)' },
    { value: 'Mechanical Engineer', label: 'Mechanical Engineer (Default Role)' },
    { value: 'Process Engineer', label: 'Process Engineer (Default Role)' },
    { value: 'Safety Engineer', label: 'Safety Engineer (Default Role)' },
    { value: 'Commissioning Engineer', label: 'Commissioning Engineer (Default Role)' },
    // Active users from the microservice
    ...users
      .filter(user => user.status === 'active')
      .map(user => ({
        value: `${user.firstName} ${user.lastName}`,
        label: `${user.firstName} ${user.lastName} - ${user.role} (${user.company})`
      }))
  ];

  const approverOptions: ComboboxOption[] = [
    // Default authority roles
    { value: 'Area Authority', label: 'Area Authority (Default Role)' },
    { value: 'Control System Authority', label: 'Control System Authority (Default Role)' },
    { value: 'Electrical Authority', label: 'Electrical Authority (Default Role)' },
    { value: 'Instrument Authority', label: 'Instrument Authority (Default Role)' },
    { value: 'Mechanical Authority', label: 'Mechanical Authority (Default Role)' },
    { value: 'Process Authority', label: 'Process Authority (Default Role)' },
    { value: 'Safety Authority', label: 'Safety Authority (Default Role)' },
    { value: 'Operations Authority', label: 'Operations Authority (Default Role)' },
    { value: 'Plant Director', label: 'Plant Director (Default Role)' },
    { value: 'Technical Authority (TA2)', label: 'Technical Authority (TA2) (Default Role)' },
    // Active users from the microservice with authority privileges
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
        label: `${user.firstName} ${user.lastName} - ${user.role} (${user.company})`
      }))
  ];

  // Initialize form data when item changes
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
      setSelectedApprovers(item.approving_authority ? item.approving_authority.split(', ') : []);
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

    const updateData: UpdateChecklistItemData = {
      ...formData,
      responsible_party: selectedResponsibleParty || null,
      approving_authority: selectedApprovers.join(', ') || null,
    };

    updateChecklistItem(
      { itemId: item.id, updateData },
      {
        onSuccess: () => {
          toast({
            title: "Success",
            description: "Checklist item updated successfully.",
          });
          onClose();
          onSaveComplete?.(); // Navigate back to category view
        },
        onError: (error) => {
          console.error('Failed to update checklist item:', error);
          toast({
            title: "Error",
            description: "Failed to update checklist item. Please try again.",
            variant: "destructive",
          });
        }
      }
    );
  };

  const updateFormData = (field: keyof UpdateChecklistItemData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
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

        <ScrollArea className="flex-1 px-8 py-6">
          <div className="space-y-10 pr-6">
            {/* Item Details Section */}
            <div className="space-y-6">
              <div className="relative">
                <div className="flex items-center gap-4 pb-4">
                  <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 border border-primary/10">
                    <FileText className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-foreground tracking-tight">Item Specification</h3>
                    <p className="text-sm text-muted-foreground">Define the core requirements and details</p>
                  </div>
                </div>
                <div className="absolute left-5 top-14 bottom-0 w-px bg-gradient-to-b from-border/40 to-transparent"></div>
              </div>
              
              {/* Description */}
              <div className="space-y-4 ml-14">
                <div className="space-y-2">
                  <Label htmlFor="description" className="text-sm font-semibold text-foreground flex items-center gap-2">
                    Description <span className="text-destructive text-xs">*</span>
                  </Label>
                  <p className="text-xs text-muted-foreground">Clear description of what needs to be completed</p>
                </div>
                <Textarea
                  id="description"
                  value={formData.description || ''}
                  onChange={(e) => updateFormData('description', e.target.value)}
                  placeholder="Describe what needs to be completed for this checklist item..."
                  rows={4}
                  className={`resize-none transition-all duration-200 ${errors.description ? 'border-destructive focus:border-destructive ring-destructive/20' : 'focus:ring-primary/20'} rounded-lg border-border/50 focus:border-primary`}
                />
                {errors.description && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/5 border border-destructive/20">
                    <X className="h-4 w-4 text-destructive flex-shrink-0" />
                    <p className="text-sm text-destructive">{errors.description}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Classification Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 ml-14">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="category" className="text-sm font-semibold text-foreground flex items-center gap-2">
                    Category <span className="text-destructive text-xs">*</span>
                  </Label>
                  <p className="text-xs text-muted-foreground">Primary classification for this item</p>
                </div>
                <Select 
                  value={formData.category || ''} 
                  onValueChange={(value) => updateFormData('category', value)}
                >
                  <SelectTrigger className={`h-11 transition-all duration-200 ${errors.category ? 'border-destructive focus:border-destructive ring-destructive/20' : 'focus:ring-primary/20'} rounded-lg border-border/50 focus:border-primary`}>
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent className="rounded-lg border-border/50">
                    {categories.map((category) => (
                      <SelectItem key={category} value={category} className="rounded-md">
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.category && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/5 border border-destructive/20">
                    <X className="h-4 w-4 text-destructive flex-shrink-0" />
                    <p className="text-sm text-destructive">{errors.category}</p>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="topic" className="text-sm font-semibold text-foreground">
                    Topic
                  </Label>
                  <p className="text-xs text-muted-foreground">Specific area or subject matter</p>
                </div>
                <Input
                  id="topic"
                  value={formData.topic || ''}
                  onChange={(e) => updateFormData('topic', e.target.value)}
                  placeholder="Enter specific topic or area"
                  className="h-11 transition-all duration-200 rounded-lg border-border/50 focus:border-primary focus:ring-primary/20"
                />
              </div>
            </div>

            {/* Supporting Evidence Section */}
            <div className="space-y-4 ml-14">
              <div className="space-y-2">
                <Label htmlFor="supporting_evidence" className="text-sm font-semibold text-foreground">
                  Supporting Evidence
                </Label>
                <p className="text-xs text-muted-foreground">Documentation and proof required for verification</p>
              </div>
              <Textarea
                id="supporting_evidence"
                value={formData.supporting_evidence || ''}
                onChange={(e) => updateFormData('supporting_evidence', e.target.value)}
                placeholder="Describe what evidence or documentation is required..."
                rows={3}
                className="resize-none transition-all duration-200 rounded-lg border-border/50 focus:border-primary focus:ring-primary/20"
              />
            </div>

            {/* Assignments Section */}
            <div className="space-y-6">
              <div className="relative">
                <div className="flex items-center gap-4 pb-4">
                  <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-secondary/15 to-secondary/5 border border-secondary/10">
                    <Users className="h-5 w-5 text-secondary-foreground" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-foreground tracking-tight">Role Assignments</h3>
                    <p className="text-sm text-muted-foreground">Configure responsibilities and approvals</p>
                  </div>
                </div>
                <div className="absolute left-5 top-14 bottom-0 w-px bg-gradient-to-b from-border/40 to-transparent"></div>
              </div>
              
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 ml-14">
                {/* Responsible Party */}
                <div className="space-y-5">
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-foreground flex items-center gap-3">
                      <div className="w-5 h-5 rounded-md bg-accent/20 flex items-center justify-center">
                        <User className="h-3 w-3 text-accent-foreground" />
                      </div>
                      Responsible Party
                    </Label>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Individual or role accountable for completing this item
                    </p>
                  </div>
                  
                  <Combobox
                    options={responsiblePartyOptions}
                    value={selectedResponsibleParty}
                    onValueChange={setSelectedResponsibleParty}
                    placeholder="Select responsible party..."
                    searchPlaceholder="Search roles or users..."
                  />
                  
                  {selectedResponsibleParty && (
                    <div className="p-4 bg-gradient-to-r from-accent/5 to-accent/10 rounded-xl border border-accent/20">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-2 h-2 bg-accent rounded-full animate-pulse"></div>
                          <span className="text-sm font-medium text-accent-foreground">Assignment Active</span>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={clearResponsibleParty}
                          className="h-7 w-7 p-0 rounded-lg hover:bg-destructive/10 hover:text-destructive transition-colors"
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                      <p className="text-sm text-foreground mt-2 font-medium truncate">{selectedResponsibleParty}</p>
                    </div>
                  )}
                </div>

                {/* Approving Authority */}
                <div className="space-y-5">
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-foreground flex items-center gap-3">
                      <div className="w-5 h-5 rounded-md bg-primary/20 flex items-center justify-center">
                        <Shield className="h-3 w-3 text-primary" />
                      </div>
                      Approving Authority
                    </Label>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Authorities required to approve completion (multiple selections allowed)
                    </p>
                  </div>
                  
                  <MultiSelectCombobox
                    value={selectedApprovers}
                    onValueChange={setSelectedApprovers}
                    options={approverOptions}
                    placeholder="Select approving authorities..."
                    searchPlaceholder="Search authority roles or users..."
                  />
                  
                  {selectedApprovers.length > 0 && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                        <div className="flex items-center gap-2">
                          <Shield className="h-4 w-4 text-primary" />
                          <span className="text-sm font-medium text-foreground">
                            {selectedApprovers.length} approver{selectedApprovers.length !== 1 ? 's' : ''} configured
                          </span>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedApprovers([])}
                          className="h-7 text-xs text-muted-foreground hover:text-destructive transition-colors"
                        >
                          Clear all
                        </Button>
                      </div>
                      
                      <div className="space-y-2 max-h-28 overflow-y-auto scrollbar-thin">
                        {selectedApprovers.map((approver, index) => (
                          <div key={index} className="flex items-center justify-between p-3 bg-gradient-to-r from-primary/5 to-primary/10 rounded-lg border border-primary/10">
                            <span className="text-sm text-foreground font-medium truncate flex-1">{approver}</span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeApprover(approver)}
                              className="h-7 w-7 p-0 rounded-lg hover:bg-destructive/10 hover:text-destructive transition-colors ml-3"
                            >
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>

        {/* Enhanced Footer */}
        <div className="relative border-t border-border/10 bg-gradient-to-r from-muted/20 via-muted/10 to-muted/20">
          <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-border/30 to-transparent"></div>
          
          <DialogFooter className="p-8">
            <div className="flex gap-4 w-full justify-end">
              <Button 
                type="button"
                variant="outline" 
                onClick={onClose}
                className="h-11 px-6 rounded-lg border-border/50 hover:bg-muted/50 transition-all duration-200"
              >
                Cancel
              </Button>
              <Button 
                type="button"
                onClick={handleSave} 
                disabled={isPending}
                className="h-11 px-8 rounded-lg bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-lg shadow-primary/20 transition-all duration-200"
              >
                {isPending ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white mr-3"></div>
                    <span>Saving Changes...</span>
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-3" />
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
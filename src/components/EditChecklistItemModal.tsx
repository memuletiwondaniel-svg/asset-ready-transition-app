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
      <DialogContent className="max-w-4xl max-h-[90vh] border-0 p-0 overflow-hidden bg-background shadow-2xl">
        {/* Modern Fluent Design Header */}
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-primary/5 to-secondary/10"></div>
          <DialogHeader className="relative px-6 py-6 border-b border-border/10">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Edit3 className="h-6 w-6 text-primary" />
                </div>
              </div>
              <div className="flex-grow space-y-1">
                <DialogTitle className="text-xl font-semibold text-foreground">
                  Edit Checklist Item
                </DialogTitle>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <FileText className="h-4 w-4" />
                  <span>Item ID: {item?.id}</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Update item details, assignments, and approval requirements
                </p>
              </div>
            </div>
          </DialogHeader>
        </div>

        <ScrollArea className="flex-1 px-6 py-6">
          <div className="space-y-8 pr-4">
            {/* Item Details Section */}
            <div className="space-y-6">
              <div className="flex items-center gap-3 pb-2 border-b border-border/20">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <FileText className="h-4 w-4 text-primary" />
                </div>
                <h3 className="text-lg font-semibold text-foreground">Item Details</h3>
              </div>
              
              {/* Description */}
              <div className="space-y-3">
                <Label htmlFor="description" className="text-sm font-medium text-foreground">
                  Description <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  id="description"
                  value={formData.description || ''}
                  onChange={(e) => updateFormData('description', e.target.value)}
                  placeholder="Describe what needs to be completed for this checklist item..."
                  rows={3}
                  className={`resize-none ${errors.description ? 'border-destructive focus:border-destructive' : ''}`}
                />
                {errors.description && (
                  <p className="text-sm text-destructive flex items-center gap-1">
                    <X className="h-3 w-3" />
                    {errors.description}
                  </p>
                )}
              </div>
            </div>

            {/* Classification Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <Label htmlFor="category" className="text-sm font-medium text-foreground">
                  Category <span className="text-destructive">*</span>
                </Label>
                <Select 
                  value={formData.category || ''} 
                  onValueChange={(value) => updateFormData('category', value)}
                >
                  <SelectTrigger className={errors.category ? 'border-destructive focus:border-destructive' : ''}>
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.category && (
                  <p className="text-sm text-destructive flex items-center gap-1">
                    <X className="h-3 w-3" />
                    {errors.category}
                  </p>
                )}
              </div>

              <div className="space-y-3">
                <Label htmlFor="topic" className="text-sm font-medium text-foreground">
                  Topic
                </Label>
                <Input
                  id="topic"
                  value={formData.topic || ''}
                  onChange={(e) => updateFormData('topic', e.target.value)}
                  placeholder="Enter specific topic or area"
                />
              </div>
            </div>

            {/* Supporting Evidence Section */}
            <div className="space-y-3">
              <Label htmlFor="supporting_evidence" className="text-sm font-medium text-foreground">
                Supporting Evidence
              </Label>
              <Textarea
                id="supporting_evidence"
                value={formData.supporting_evidence || ''}
                onChange={(e) => updateFormData('supporting_evidence', e.target.value)}
                placeholder="Describe what evidence or documentation is required..."
                rows={3}
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground">
                Specify any documentation, approvals, or evidence needed to verify completion
              </p>
            </div>

            {/* Assignments Section */}
            <div className="space-y-6">
              <div className="flex items-center gap-3 pb-2 border-b border-border/20">
                <div className="w-8 h-8 rounded-lg bg-secondary/10 flex items-center justify-center">
                  <Users className="h-4 w-4 text-secondary-foreground" />
                </div>
                <h3 className="text-lg font-semibold text-foreground">Assignments</h3>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Responsible Party */}
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium text-foreground flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Responsible Party
                    </Label>
                    <p className="text-xs text-muted-foreground mt-1">
                      Who will complete this item
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
                    <div className="p-3 bg-muted/50 rounded-lg border">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          <span className="text-sm font-medium">Selected</span>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={clearResponsibleParty}
                          className="h-6 w-6 p-0 hover:bg-destructive hover:text-destructive-foreground"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                      <p className="text-sm text-foreground mt-1 truncate">{selectedResponsibleParty}</p>
                    </div>
                  )}
                </div>

                {/* Approving Authority */}
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium text-foreground flex items-center gap-2">
                      <Shield className="h-4 w-4" />
                      Approving Authority
                    </Label>
                    <p className="text-xs text-muted-foreground mt-1">
                      Who must approve this item (multiple allowed)
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
                    <div className="space-y-3 mt-4">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-muted-foreground">
                          {selectedApprovers.length} approver{selectedApprovers.length !== 1 ? 's' : ''} selected
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedApprovers([])}
                          className="h-6 text-xs text-muted-foreground hover:text-destructive"
                        >
                          Clear all
                        </Button>
                      </div>
                      
                      <div className="space-y-2 max-h-24 overflow-y-auto">
                        {selectedApprovers.map((approver, index) => (
                          <div key={index} className="flex items-center justify-between p-2 bg-muted/50 rounded border">
                            <span className="text-sm truncate flex-1">{approver}</span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeApprover(approver)}
                              className="h-6 w-6 p-0 hover:bg-destructive hover:text-destructive-foreground ml-2"
                            >
                              <X className="h-3 w-3" />
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

        {/* Footer */}
        <DialogFooter className="p-6 border-t bg-muted/20">
          <div className="flex gap-3 w-full sm:w-auto">
            <Button 
              type="button"
              variant="outline" 
              onClick={onClose}
              className="flex-1 sm:flex-none"
            >
              Cancel
            </Button>
            <Button 
              type="button"
              onClick={handleSave} 
              disabled={isPending}
              className="flex-1 sm:flex-none"
            >
              {isPending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent mr-2"></div>
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EditChecklistItemModal;
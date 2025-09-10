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
import { Users, Shield, Save, User } from 'lucide-react';
import { ChecklistItem, useUpdateChecklistItem, UpdateChecklistItemData } from '@/hooks/useChecklistItems';
import { useUsers } from '@/hooks/useUsers';
import { useToast } from '@/hooks/use-toast';

interface EditChecklistItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: ChecklistItem;
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

  // Create options for dropdowns
  const responsiblePartyOptions: ComboboxOption[] = [
    // Default options
    { value: 'Area Engineer', label: 'Area Engineer' },
    { value: 'Control System Engineer', label: 'Control System Engineer' },
    { value: 'Electrical Engineer', label: 'Electrical Engineer' },
    { value: 'Instrument Engineer', label: 'Instrument Engineer' },
    { value: 'Mechanical Engineer', label: 'Mechanical Engineer' },
    { value: 'Process Engineer', label: 'Process Engineer' },
    { value: 'Safety Engineer', label: 'Safety Engineer' },
    // User options
    ...users.map(user => ({
      value: `${user.firstName} ${user.lastName}`,
      label: `${user.firstName} ${user.lastName} (${user.role})`
    }))
  ];

  const approverOptions: ComboboxOption[] = [
    // Default options
    { value: 'Area Authority', label: 'Area Authority' },
    { value: 'Control System Authority', label: 'Control System Authority' },
    { value: 'Electrical Authority', label: 'Electrical Authority' },
    { value: 'Instrument Authority', label: 'Instrument Authority' },
    { value: 'Mechanical Authority', label: 'Mechanical Authority' },
    { value: 'Process Authority', label: 'Process Authority' },
    { value: 'Safety Authority', label: 'Safety Authority' },
    // User options
    ...users.map(user => ({
      value: `${user.firstName} ${user.lastName}`,
      label: `${user.firstName} ${user.lastName} (${user.role})`
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


  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-3">
            <Badge variant="outline" className="font-mono text-xs px-2 py-1">
              {item?.id}
            </Badge>
            <span className="text-lg font-semibold">Edit Item</span>
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh]">
          <div className="space-y-4 pr-4">
            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description" className="text-sm font-medium">
                Description *
              </Label>
              <Textarea
                id="description"
                value={formData.description || ''}
                onChange={(e) => updateFormData('description', e.target.value)}
                placeholder="Enter the checklist item description..."
                rows={3}
                className={errors.description ? 'border-destructive' : ''}
              />
              {errors.description && (
                <p className="text-sm text-destructive mt-1">{errors.description}</p>
              )}
            </div>

            {/* Category & Topic */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category" className="text-sm font-medium">
                  Category *
                </Label>
                <Select 
                  value={formData.category || ''} 
                  onValueChange={(value) => updateFormData('category', value)}
                >
                  <SelectTrigger className={errors.category ? 'border-destructive' : ''}>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent className="bg-background z-50">
                    {categories.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.category && (
                  <p className="text-sm text-destructive mt-1">{errors.category}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="topic" className="text-sm font-medium">
                  Topic
                </Label>
                <Input
                  id="topic"
                  value={formData.topic || ''}
                  onChange={(e) => updateFormData('topic', e.target.value)}
                  placeholder="Enter topic..."
                />
              </div>
            </div>

            {/* Supporting Evidence */}
            <div className="space-y-2">
              <Label htmlFor="supporting_evidence" className="text-sm font-medium">
                Supporting Evidence
              </Label>
              <Input
                id="supporting_evidence"
                value={formData.supporting_evidence || ''}
                onChange={(e) => updateFormData('supporting_evidence', e.target.value)}
                placeholder="Enter supporting evidence requirements..."
              />
            </div>

            {/* Responsible Party */}
            <div className="space-y-2">
              <Label className="text-sm font-medium flex items-center gap-2">
                <User className="h-4 w-4" />
                Responsible Party
              </Label>
              <Combobox
                options={responsiblePartyOptions}
                value={selectedResponsibleParty}
                onValueChange={setSelectedResponsibleParty}
                placeholder="Select responsible party..."
                searchPlaceholder="Search responsible parties..."
              />
            </div>

            {/* Approving Authority */}
            <div className="space-y-2">
              <Label className="text-sm font-medium flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Approving Authority (Multiple Selection)
              </Label>
              <MultiSelectCombobox
                options={approverOptions}
                values={selectedApprovers}
                onValuesChange={setSelectedApprovers}
                placeholder="Select approving authorities..."
                searchPlaceholder="Search approvers..."
              />
              {selectedApprovers.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {selectedApprovers.map((approver) => (
                    <Badge key={approver} variant="secondary" className="text-xs">
                      {approver}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="pt-4">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isPending}>
            {isPending ? (
              <>
                <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></span>
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EditChecklistItemModal;
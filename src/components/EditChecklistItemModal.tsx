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
import { Users, Shield, Save, User, Edit3, FileText } from 'lucide-react';
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
      <DialogContent className="max-w-4xl max-h-[90vh] border-0 p-0 overflow-hidden bg-transparent">
        {/* Microsoft Fluent Background Layer */}
        <div className="absolute inset-0 bg-gradient-to-br from-background/95 via-background/90 to-card/85 backdrop-blur-2xl"></div>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/5 via-transparent to-secondary/5"></div>
        
        {/* Glass layer */}
        <div className="absolute inset-0 bg-gradient-to-t from-white/10 via-white/5 to-transparent rounded-xl"></div>
        
        {/* Content Layer */}
        <div className="relative z-10 flex flex-col h-full">
          <DialogHeader className="p-8 pb-6 border-b border-border/20 bg-gradient-to-r from-card/20 to-card/10 backdrop-blur-sm">
            <DialogTitle className="flex items-center space-x-4">
              <div className="relative">
                <Badge variant="outline" className="font-mono text-lg px-4 py-2 bg-primary/10 border-primary/30 text-primary font-semibold backdrop-blur-sm shadow-lg">
                  {item?.id}
                </Badge>
                <div className="absolute inset-0 bg-primary/5 rounded-md blur-sm"></div>
              </div>
              <div>
                <h3 className="text-3xl font-bold bg-gradient-to-r from-foreground to-primary bg-clip-text text-transparent">Edit Item Details</h3>
                <p className="text-lg text-muted-foreground mt-2">Modify the checklist item information and assignments</p>
              </div>
            </DialogTitle>
          </DialogHeader>

        <ScrollArea className="flex-1 px-8 py-6">
          <div className="space-y-8 pr-4">
            {/* Description */}
            <div className="space-y-4">
              <Label htmlFor="description" className="text-xl font-semibold flex items-center gap-3">
                <div className="p-3 bg-primary/10 rounded-lg backdrop-blur-sm shadow-md">
                  <Edit3 className="h-6 w-6 text-primary" />
                </div>
                Description *
              </Label>
              <div className="relative">
                <Textarea
                  id="description"
                  value={formData.description || ''}
                  onChange={(e) => updateFormData('description', e.target.value)}
                  placeholder="Enter the checklist item description..."
                  rows={4}
                  className={`min-h-[140px] border-2 border-border/30 bg-card/40 backdrop-blur-sm focus:border-primary/50 focus:bg-card/60 transition-all duration-300 text-lg p-6 ${errors.description ? 'border-destructive' : ''}`}
                />
                <div className="absolute inset-0 rounded-md bg-gradient-to-br from-primary/5 to-transparent pointer-events-none"></div>
              </div>
              {errors.description && (
                <p className="text-sm text-destructive mt-1">{errors.description}</p>
              )}
            </div>

            {/* Category & Topic Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <Label htmlFor="category" className="text-xl font-semibold flex items-center gap-3">
                  <div className="p-3 bg-secondary/20 rounded-lg backdrop-blur-sm shadow-md">
                    <Shield className="h-6 w-6 text-secondary-foreground" />
                  </div>
                  Category *
                </Label>
                <div className="relative">
                  <Select 
                    value={formData.category || ''} 
                    onValueChange={(value) => updateFormData('category', value)}
                  >
                    <SelectTrigger className={`h-14 border-2 border-border/30 bg-card/40 backdrop-blur-sm focus:border-primary/50 transition-all duration-300 text-lg ${errors.category ? 'border-destructive' : ''}`}>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent className="bg-card/95 backdrop-blur-xl border-border/30 z-50">
                      {categories.map((category) => (
                        <SelectItem key={category} value={category} className="focus:bg-primary/10 text-lg py-3">
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {errors.category && (
                  <p className="text-sm text-destructive mt-1">{errors.category}</p>
                )}
              </div>

              <div className="space-y-4">
                <Label htmlFor="topic" className="text-xl font-semibold flex items-center gap-3">
                  <div className="p-3 bg-accent/20 rounded-lg backdrop-blur-sm shadow-md">
                    <User className="h-6 w-6 text-accent-foreground" />
                  </div>
                  Topic
                </Label>
                <div className="relative">
                  <Input
                    id="topic"
                    value={formData.topic || ''}
                    onChange={(e) => updateFormData('topic', e.target.value)}
                    placeholder="Enter topic..."
                    className="h-14 border-2 border-border/30 bg-card/40 backdrop-blur-sm focus:border-primary/50 transition-all duration-300 text-lg"
                  />
                  <div className="absolute inset-0 rounded-md bg-gradient-to-br from-accent/5 to-transparent pointer-events-none"></div>
                </div>
              </div>
            </div>

            {/* Supporting Evidence */}
            <div className="space-y-4">
              <Label htmlFor="supporting_evidence" className="text-xl font-semibold flex items-center gap-3">
                <div className="p-3 bg-blue-100/50 rounded-lg backdrop-blur-sm shadow-md">
                  <Shield className="h-6 w-6 text-blue-600" />
                </div>
                Supporting Evidence
              </Label>
              <div className="relative">
                <Textarea
                  id="supporting_evidence"
                  value={formData.supporting_evidence || ''}
                  onChange={(e) => updateFormData('supporting_evidence', e.target.value)}
                  placeholder="Enter supporting evidence requirements..."
                  rows={3}
                  className="border-2 border-border/30 bg-card/40 backdrop-blur-sm focus:border-primary/50 transition-all duration-300 text-lg p-4"
                />
                <div className="absolute inset-0 rounded-md bg-gradient-to-br from-blue-500/5 to-transparent pointer-events-none"></div>
              </div>
            </div>

            {/* User Assignment Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Responsible Party */}
              <div className="space-y-4">
                <Label className="text-xl font-semibold flex items-center gap-3">
                  <div className="p-3 bg-green-100/50 rounded-lg backdrop-blur-sm shadow-md">
                    <User className="h-6 w-6 text-green-600" />
                  </div>
                  Responsible Party
                </Label>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Select from default engineering roles or choose an active user from the system
                  </p>
                  <div className="relative">
                    <Combobox
                      options={responsiblePartyOptions}
                      value={selectedResponsibleParty}
                      onValueChange={setSelectedResponsibleParty}
                      placeholder="Search and select responsible party..."
                      searchPlaceholder="Type to search roles or users..."
                      className="h-14 text-lg border-2 border-border/30 bg-card/40 backdrop-blur-sm"
                    />
                    <div className="absolute inset-0 rounded-md bg-gradient-to-br from-green-500/5 to-transparent pointer-events-none"></div>
                  </div>
                  {selectedResponsibleParty && (
                    <div className="mt-3 p-3 bg-green-50/50 border border-green-200/50 rounded-lg">
                      <p className="text-sm font-medium text-green-800">Selected:</p>
                      <p className="text-sm text-green-700">{selectedResponsibleParty}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Approving Authority */}
              <div className="space-y-4">
                <Label className="text-xl font-semibold flex items-center gap-3">
                  <div className="p-3 bg-purple-100/50 rounded-lg backdrop-blur-sm shadow-md">
                    <Shield className="h-6 w-6 text-purple-600" />
                  </div>
                  Approving Authority (Multiple Selection)
                </Label>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Select from default authority roles or choose active users with approval privileges
                  </p>
                  <div className="relative">
                    <MultiSelectCombobox
                      options={approverOptions}
                      values={selectedApprovers}
                      onValuesChange={setSelectedApprovers}
                      placeholder="Search and select approving authorities..."
                      searchPlaceholder="Type to search authorities or users..."
                      className="h-14 text-lg border-2 border-border/30 bg-card/40 backdrop-blur-sm"
                    />
                    <div className="absolute inset-0 rounded-md bg-gradient-to-br from-purple-500/5 to-transparent pointer-events-none"></div>
                  </div>
                  {selectedApprovers.length > 0 && (
                    <div className="mt-4 space-y-2">
                      <p className="text-sm font-medium text-muted-foreground">Selected Approvers:</p>
                      <div className="flex flex-wrap gap-3">
                        {selectedApprovers.map((approver, index) => (
                          <Badge key={index} variant="secondary" className="text-sm px-3 py-2 bg-purple-100/80 text-purple-800 border border-purple-200/50 backdrop-blur-sm shadow-md">
                            {approver}
                          </Badge>
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {selectedApprovers.length} approver{selectedApprovers.length !== 1 ? 's' : ''} selected
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="p-8 pt-6 border-t border-border/20 bg-gradient-to-r from-card/10 to-card/5 backdrop-blur-sm">
          <Button variant="outline" onClick={onClose} className="px-8 py-3 text-lg">
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isPending} className="px-8 py-3 text-lg bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary shadow-lg shadow-primary/20">
            {isPending ? (
              <>
                <span className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-3"></span>
                Saving...
              </>
            ) : (
              <>
                <Save className="h-5 w-5 mr-3" />
                Save Changes
              </>
            )}
          </Button>
        </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EditChecklistItemModal;
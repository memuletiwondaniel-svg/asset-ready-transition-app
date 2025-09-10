import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { X, Plus, Trash2, Users, Shield, Save, AlertCircle } from 'lucide-react';
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
  const [customResponsibleParties, setCustomResponsibleParties] = useState<CustomPerson[]>([]);
  const [customApprovers, setCustomApprovers] = useState<CustomPerson[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [newResponsibleParty, setNewResponsibleParty] = useState({ name: '', role: '' });
  const [newApprover, setNewApprover] = useState({ name: '', role: '' });

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

  // Default authorities and responsible parties
  const defaultAuthorities = [
    'Area Authority',
    'Control System Authority', 
    'Electrical Authority',
    'Instrument Authority',
    'Mechanical Authority',
    'Process Authority',
    'Safety Authority'
  ];

  const defaultResponsibleParties = [
    'Area Engineer',
    'Control System Engineer',
    'Electrical Engineer', 
    'Instrument Engineer',
    'Mechanical Engineer',
    'Process Engineer',
    'Safety Engineer'
  ];

  // Initialize form data when item changes
  useEffect(() => {
    if (item) {
      setFormData({
        description: item.description,
        category: item.category,
        topic: item.topic || '',
        supporting_evidence: item.supporting_evidence || '',
        responsible_party: item.responsible_party || '',
        approving_authority: item.approving_authority || '',
        is_active: item.is_active,
      });
      
      // Parse existing custom people if they exist
      setCustomResponsibleParties([]);
      setCustomApprovers([]);
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

    // Combine default and custom responsible parties
    const allResponsibleParties = [
      formData.responsible_party,
      ...customResponsibleParties.map(p => `${p.name} (${p.role})`)
    ].filter(Boolean).join(', ');

    // Combine default and custom approvers
    const allApprovers = [
      formData.approving_authority,
      ...customApprovers.map(p => `${p.name} (${p.role})`)
    ].filter(Boolean).join(', ');

    const updateData: UpdateChecklistItemData = {
      ...formData,
      responsible_party: allResponsibleParties || null,
      approving_authority: allApprovers || null,
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

  const addCustomResponsibleParty = () => {
    if (newResponsibleParty.name.trim() && newResponsibleParty.role.trim()) {
      setCustomResponsibleParties(prev => [...prev, {
        id: Date.now().toString(),
        name: newResponsibleParty.name.trim(),
        role: newResponsibleParty.role.trim()
      }]);
      setNewResponsibleParty({ name: '', role: '' });
    }
  };

  const removeCustomResponsibleParty = (id: string) => {
    setCustomResponsibleParties(prev => prev.filter(p => p.id !== id));
  };

  const addCustomApprover = () => {
    if (newApprover.name.trim() && newApprover.role.trim()) {
      setCustomApprovers(prev => [...prev, {
        id: Date.now().toString(),
        name: newApprover.name.trim(),
        role: newApprover.role.trim()
      }]);
      setNewApprover({ name: '', role: '' });
    }
  };

  const removeCustomApprover = (id: string) => {
    setCustomApprovers(prev => prev.filter(p => p.id !== id));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                <span className="text-sm font-bold text-primary">{item?.id}</span>
              </div>
              <div>
                <h3 className="text-lg font-semibold">Edit Checklist Item</h3>
                <p className="text-sm text-muted-foreground">Modify the checklist item details and assignments</p>
              </div>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h4 className="font-medium text-foreground flex items-center space-x-2">
              <AlertCircle className="h-4 w-4" />
              <span>Basic Information</span>
            </h4>
            
            <div className="space-y-3">
              <div>
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
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
                    <SelectContent>
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

                <div>
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

              <div>
                <Label htmlFor="supporting_evidence" className="text-sm font-medium">
                  Supporting Evidence
                </Label>
                <Textarea
                  id="supporting_evidence"
                  value={formData.supporting_evidence || ''}
                  onChange={(e) => updateFormData('supporting_evidence', e.target.value)}
                  placeholder="Enter supporting evidence requirements..."
                  rows={2}
                />
              </div>
            </div>
          </div>

          {/* Responsible Party Section */}
          <div className="space-y-4">
            <h4 className="font-medium text-foreground flex items-center space-x-2">
              <Users className="h-4 w-4" />
              <span>Responsible Party</span>
            </h4>
            
            <div className="space-y-3">
              <div>
                <Label className="text-sm font-medium">Default Responsible Party</Label>
                <Select 
                  value={formData.responsible_party || ''} 
                  onValueChange={(value) => updateFormData('responsible_party', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select responsible party" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None</SelectItem>
                    {defaultResponsibleParties.map((party) => (
                      <SelectItem key={party} value={party}>
                        {party}
                      </SelectItem>
                    ))}
                    {users.map((user) => (
                      <SelectItem key={user.id} value={`${user.firstName} ${user.lastName} (${user.role})`}>
                        {user.firstName} {user.lastName} - {user.role}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Custom Responsible Parties */}
              <div>
                <Label className="text-sm font-medium">Add Custom Responsible Party</Label>
                <div className="flex space-x-2">
                  <Input
                    placeholder="Name"
                    value={newResponsibleParty.name}
                    onChange={(e) => setNewResponsibleParty(prev => ({ ...prev, name: e.target.value }))}
                  />
                  <Input
                    placeholder="Role"
                    value={newResponsibleParty.role}
                    onChange={(e) => setNewResponsibleParty(prev => ({ ...prev, role: e.target.value }))}
                  />
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm"
                    onClick={addCustomResponsibleParty}
                    disabled={!newResponsibleParty.name.trim() || !newResponsibleParty.role.trim()}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Display Custom Responsible Parties */}
              {customResponsibleParties.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Custom Responsible Parties</Label>
                  <div className="space-y-2">
                    {customResponsibleParties.map((party) => (
                      <div key={party.id} className="flex items-center justify-between bg-secondary/50 p-2 rounded-lg">
                        <Badge variant="secondary">
                          {party.name} ({party.role})
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeCustomResponsibleParty(party.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Approving Authority Section */}
          <div className="space-y-4">
            <h4 className="font-medium text-foreground flex items-center space-x-2">
              <Shield className="h-4 w-4" />
              <span>Approving Authority</span>
            </h4>
            
            <div className="space-y-3">
              <div>
                <Label className="text-sm font-medium">Default Approving Authority</Label>
                <Select 
                  value={formData.approving_authority || ''} 
                  onValueChange={(value) => updateFormData('approving_authority', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select approving authority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None</SelectItem>
                    {defaultAuthorities.map((authority) => (
                      <SelectItem key={authority} value={authority}>
                        {authority}
                      </SelectItem>
                    ))}
                    {users.map((user) => (
                      <SelectItem key={user.id} value={`${user.firstName} ${user.lastName} (${user.role})`}>
                        {user.firstName} {user.lastName} - {user.role}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Custom Approvers */}
              <div>
                <Label className="text-sm font-medium">Add Custom Approver</Label>
                <div className="flex space-x-2">
                  <Input
                    placeholder="Name"
                    value={newApprover.name}
                    onChange={(e) => setNewApprover(prev => ({ ...prev, name: e.target.value }))}
                  />
                  <Input
                    placeholder="Role"
                    value={newApprover.role}
                    onChange={(e) => setNewApprover(prev => ({ ...prev, role: e.target.value }))}
                  />
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm"
                    onClick={addCustomApprover}
                    disabled={!newApprover.name.trim() || !newApprover.role.trim()}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Display Custom Approvers */}
              {customApprovers.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Custom Approvers</Label>
                  <div className="space-y-2">
                    {customApprovers.map((approver) => (
                      <div key={approver.id} className="flex items-center justify-between bg-secondary/50 p-2 rounded-lg">
                        <Badge variant="secondary">
                          {approver.name} ({approver.role})
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeCustomApprover(approver.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
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
                Save Changes
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EditChecklistItemModal;
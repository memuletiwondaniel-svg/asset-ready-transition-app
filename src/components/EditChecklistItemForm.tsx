import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Save, AlertCircle, Plus, Trash2, X } from 'lucide-react';
import { ChecklistItem } from '@/hooks/useChecklistItems';

interface EditChecklistItemFormProps {
  item: ChecklistItem;
  onBack: () => void;
  onSave: (updatedItem: ChecklistItem) => void;
  onDelete?: (itemId: string) => void;
  availableUsers?: Array<{ id: string; name: string; role: string; }>;
}

interface CustomPerson {
  id: string;
  name: string;
  role: string;
}

const EditChecklistItemForm: React.FC<EditChecklistItemFormProps> = ({ 
  item, 
  onBack, 
  onSave, 
  onDelete,
  availableUsers = []
}) => {
  const [formData, setFormData] = useState({
    description: item.description,
    supportingEvidence: item.supporting_evidence || '',
    category: item.category,
    approvingAuthority: item.approving_authority || ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [customAuthorities, setCustomAuthorities] = useState<CustomPerson[]>([]);
  const [customResponsibleParties, setCustomResponsibleParties] = useState<CustomPerson[]>([]);
  const [newAuthorityName, setNewAuthorityName] = useState('');
  const [newAuthorityRole, setNewAuthorityRole] = useState('');
  const [newPartyName, setNewPartyName] = useState('');
  const [newPartyRole, setNewPartyRole] = useState('');

  // Predefined categories
  const categories = [
    'General',
    'Technical Integrity', 
    'Health & Safety',
    'Start-Up Readiness',
    'Plant Integrity',
    'Process Safety',
    'People',
    'Documentation',
    'PSSR Walkdown'
  ];

  // Common approving authorities
  const defaultAuthorities = [
    'PSSR Lead',
    'Operations Manager',
    'Engineering Manager', 
    'Safety Manager',
    'Plant Manager',
    'Technical Authority',
    'Process Engineer',
    'Mechanical Engineer',
    'Electrical Engineer',
    'HSE Coordinator',
    'Maintenance Supervisor',
    'Quality Assurance Manager'
  ];

  // Common responsible parties
  const defaultResponsibleParties = [
    'Operations Team',
    'Engineering Team',
    'Maintenance Team',
    'HSE Team',
    'Project Team',
    'Quality Team',
    'Technical Team',
    'Safety Team',
    'Process Team',
    'Mechanical Team',
    'Electrical Team',
    'Instrumentation Team'
  ];

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.description.trim()) {
      newErrors.description = 'Question/Description is required';
    }

    if (!formData.supportingEvidence.trim()) {
      newErrors.supportingEvidence = 'Evidence guidance is required';
    }

    if (!formData.category) {
      newErrors.category = 'Category is required';
    }

    if (!formData.approvingAuthority.trim()) {
      newErrors.approvingAuthority = 'Approving authority is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (validateForm()) {
      const updatedItem: ChecklistItem = {
        ...item,
        description: formData.description.trim(),
        supporting_evidence: formData.supportingEvidence.trim(),
        category: formData.category,
        approving_authority: formData.approvingAuthority.trim()
      };
      onSave(updatedItem);
    }
  };

  const updateFormData = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const addCustomAuthority = () => {
    if (newAuthorityName.trim() && newAuthorityRole.trim()) {
      const newAuthority: CustomPerson = {
        id: `auth-${Date.now()}`,
        name: newAuthorityName.trim(),
        role: newAuthorityRole.trim()
      };
      setCustomAuthorities(prev => [...prev, newAuthority]);
      setFormData(prev => ({ ...prev, approvingAuthority: `${newAuthority.name} (${newAuthority.role})` }));
      setNewAuthorityName('');
      setNewAuthorityRole('');
    }
  };

  const removeCustomAuthority = (id: string) => {
    setCustomAuthorities(prev => prev.filter(auth => auth.id !== id));
  };

  const addCustomResponsibleParty = () => {
    if (newPartyName.trim() && newPartyRole.trim()) {
      const newParty: CustomPerson = {
        id: `party-${Date.now()}`,
        name: newPartyName.trim(),
        role: newPartyRole.trim()
      };
      setCustomResponsibleParties(prev => [...prev, newParty]);
      setNewPartyName('');
      setNewPartyRole('');
    }
  };

  const removeCustomResponsibleParty = (id: string) => {
    setCustomResponsibleParties(prev => prev.filter(party => party.id !== id));
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-background border border-border rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="border-b border-border p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">Edit Checklist Item</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Modify the details of checklist item {item.id}
              </p>
            </div>
            <div className="flex space-x-3">
              {onDelete && (
                <Button 
                  variant="outline"
                  onClick={() => onDelete(item.id)}
                  className="text-destructive hover:bg-destructive/10 border-destructive/20"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Item
                </Button>
              )}
              <Button variant="outline" onClick={onBack}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          <div className="space-y-6">
            {/* Item ID (Read-only) */}
            <div className="space-y-2">
              <Label className="text-base font-semibold">Reference ID</Label>
              <div className="flex items-center space-x-2">
                <Badge variant="outline" className="text-sm px-3 py-1">
                  {item.id}
                </Badge>
                <span className="text-sm text-muted-foreground">(Auto-assigned, cannot be changed)</span>
              </div>
            </div>

            {/* Question/Description */}
            <div className="space-y-2">
              <Label htmlFor="description" className="text-base font-semibold">
                Question/Description <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => updateFormData('description', e.target.value)}
                className="min-h-[100px] resize-none"
                rows={4}
              />
              {errors.description && (
                <p className="text-sm text-destructive flex items-center">
                  <AlertCircle className="h-4 w-4 mr-1" />
                  {errors.description}
                </p>
              )}
            </div>

            {/* Evidence Guidance */}
            <div className="space-y-2">
              <Label htmlFor="supportingEvidence" className="text-base font-semibold">
                Evidence Guidance <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="supportingEvidence"
                value={formData.supportingEvidence}
                onChange={(e) => updateFormData('supportingEvidence', e.target.value)}
                className="min-h-[80px] resize-none"
                rows={3}
              />
              {errors.supportingEvidence && (
                <p className="text-sm text-destructive flex items-center">
                  <AlertCircle className="h-4 w-4 mr-1" />
                  {errors.supportingEvidence}
                </p>
              )}
            </div>

            {/* Category */}
            <div className="space-y-2">
              <Label className="text-base font-semibold">
                Category <span className="text-destructive">*</span>
              </Label>
              <Select value={formData.category} onValueChange={(value) => updateFormData('category', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover border border-border shadow-lg z-50">
                  {categories.map((category) => (
                    <SelectItem key={category} value={category} className="cursor-pointer">
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.category && (
                <p className="text-sm text-destructive flex items-center">
                  <AlertCircle className="h-4 w-4 mr-1" />
                  {errors.category}
                </p>
              )}
            </div>

            {/* Approving Authority */}
            <div className="space-y-4">
              <Label className="text-base font-semibold">
                Approving Authority <span className="text-destructive">*</span>
              </Label>
              
              <Select value={formData.approvingAuthority} onValueChange={(value) => updateFormData('approvingAuthority', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover border border-border shadow-lg z-50 max-h-60">
                  {defaultAuthorities.map((authority) => (
                    <SelectItem key={authority} value={authority} className="cursor-pointer">
                      {authority}
                    </SelectItem>
                  ))}
                  {availableUsers.map((user) => (
                    <SelectItem key={user.id} value={`${user.name} (${user.role})`} className="cursor-pointer">
                      {user.name} ({user.role})
                    </SelectItem>
                  ))}
                  {customAuthorities.map((authority) => (
                    <SelectItem key={authority.id} value={`${authority.name} (${authority.role})`} className="cursor-pointer">
                      {authority.name} ({authority.role})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Custom Authorities */}
              {customAuthorities.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Custom Approving Authorities</Label>
                  <div className="space-y-2">
                    {customAuthorities.map((authority) => (
                      <div key={authority.id} className="flex items-center justify-between p-3 bg-muted/20 rounded-lg">
                        <div>
                          <span className="font-medium">{authority.name}</span>
                          <span className="text-sm text-muted-foreground ml-2">({authority.role})</span>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => removeCustomAuthority(authority.id)}
                          className="text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Add New Authority */}
              <div className="border border-border/50 rounded-lg p-4 space-y-3">
                <Label className="text-sm font-medium">Add New Approving Authority</Label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <Input
                    placeholder="Name"
                    value={newAuthorityName}
                    onChange={(e) => setNewAuthorityName(e.target.value)}
                  />
                  <Input
                    placeholder="Role/Title"
                    value={newAuthorityRole}
                    onChange={(e) => setNewAuthorityRole(e.target.value)}
                  />
                  <Button 
                    variant="outline" 
                    onClick={addCustomAuthority}
                    disabled={!newAuthorityName.trim() || !newAuthorityRole.trim()}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add
                  </Button>
                </div>
              </div>

              {errors.approvingAuthority && (
                <p className="text-sm text-destructive flex items-center">
                  <AlertCircle className="h-4 w-4 mr-1" />
                  {errors.approvingAuthority}
                </p>
              )}
            </div>

            {/* Responsible Parties (Additional) */}
            <div className="space-y-4">
              <Label className="text-base font-semibold">Additional Responsible Parties</Label>
              <p className="text-sm text-muted-foreground">
                Add additional teams or individuals responsible for this checklist item
              </p>

              {/* Custom Responsible Parties */}
              {customResponsibleParties.length > 0 && (
                <div className="space-y-2">
                  {customResponsibleParties.map((party) => (
                    <div key={party.id} className="flex items-center justify-between p-3 bg-muted/20 rounded-lg">
                      <div>
                        <span className="font-medium">{party.name}</span>
                        <span className="text-sm text-muted-foreground ml-2">({party.role})</span>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => removeCustomResponsibleParty(party.id)}
                        className="text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {/* Add New Responsible Party */}
              <div className="border border-border/50 rounded-lg p-4 space-y-3">
                <Label className="text-sm font-medium">Add Responsible Party</Label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <Input
                    placeholder="Name/Team"
                    value={newPartyName}
                    onChange={(e) => setNewPartyName(e.target.value)}
                  />
                  <Input
                    placeholder="Role/Department"
                    value={newPartyRole}
                    onChange={(e) => setNewPartyRole(e.target.value)}
                  />
                  <Button 
                    variant="outline" 
                    onClick={addCustomResponsibleParty}
                    disabled={!newPartyName.trim() || !newPartyRole.trim()}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-border p-6">
          <div className="flex justify-end space-x-3">
            <Button variant="outline" onClick={onBack}>
              Cancel
            </Button>
            <Button 
              onClick={handleSave}
              className="bg-primary hover:bg-primary-hover"
            >
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditChecklistItemForm;
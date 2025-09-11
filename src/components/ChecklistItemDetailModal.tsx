import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Combobox } from '@/components/ui/combobox';
import { ChecklistItem, useUpdateChecklistItem } from '@/hooks/useChecklistItems';
import { useToast } from '@/hooks/use-toast';
import { useRoles, useCommissions, useDisciplines, useTA2Options } from '@/hooks/useRoleData';
import { Save, X, Plus } from 'lucide-react';

interface ChecklistItemDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: ChecklistItem | null;
  mode: 'view' | 'edit';
}

const ChecklistItemDetailModal: React.FC<ChecklistItemDetailModalProps> = ({
  isOpen,
  onClose,
  item,
  mode: initialMode
}) => {
  const [mode, setMode] = useState<'view' | 'edit'>(initialMode);
  const [formData, setFormData] = useState({
    description: '',
    category: '',
    topic: '',
    required_evidence: '',
    responsible: '',
    Approver: ''
  });
  
  const [selectedApprovers, setSelectedApprovers] = useState<string[]>([]);
  const [ta2Selections, setTA2Selections] = useState<{[key: string]: {commission: string, discipline: string}}>({});
  const [showTA2Fields, setShowTA2Fields] = useState<{[key: string]: boolean}>({});

  const { toast } = useToast();
  const updateMutation = useUpdateChecklistItem();
  
  // Fetch role data
  const { data: roles = [] } = useRoles();
  const { data: commissions = [] } = useCommissions();
  const { data: disciplines = [] } = useDisciplines();
  const { data: ta2Options = [] } = useTA2Options();

  useEffect(() => {
    if (item) {
      setFormData({
        description: item.description || '',
        category: item.category || '',
        topic: item.topic || '',
        required_evidence: item.required_evidence || '',
        responsible: item.responsible || '',
        Approver: item.Approver || ''
      });
      
      // Parse existing approvers
      const approvers = item.Approver ? item.Approver.split(',').map(a => a.trim()).filter(Boolean) : [];
      setSelectedApprovers(approvers);
      
      // Initialize TA2 fields state
      const newTA2Selections: {[key: string]: {commission: string, discipline: string}} = {};
      const newShowTA2Fields: {[key: string]: boolean} = {};
      
      approvers.forEach(approver => {
        if (approver.includes('TA2')) {
          newShowTA2Fields[approver] = true;
          // Try to parse existing TA2 format
          const match = approver.match(/TA2\s+(\w+)\s+\(([^)]+)\)/);
          if (match) {
            newTA2Selections[approver] = {
              discipline: match[1],
              commission: match[2]
            };
          }
        }
      });
      
      setTA2Selections(newTA2Selections);
      setShowTA2Fields(newShowTA2Fields);
    }
  }, [item]);

  useEffect(() => {
    setMode(initialMode);
  }, [initialMode]);

  if (!item) return null;

  const handleSave = async () => {
    try {
      // Prepare approvers string
      const approversString = selectedApprovers.map(approver => {
        if (approver === 'technical_authority' && ta2Selections[approver]) {
          const { discipline, commission } = ta2Selections[approver];
          return `TA2 ${discipline} (${commission})`;
        }
        return approver;
      }).join(', ');

      const updateData = {
        ...formData,
        Approver: approversString
      };

      await updateMutation.mutateAsync({
        itemId: item.unique_id,
        updateData
      });
      
      toast({
        title: "Success",
        description: "Checklist item updated successfully",
      });
      
      setMode('view');
      onClose();
    } catch (error) {
      console.error('Error updating item:', error);
      toast({
        title: "Error",
        description: "Failed to update checklist item",
        variant: "destructive",
      });
    }
  };

  const handleCancel = () => {
    if (mode === 'edit') {
      // Reset form data to original values
      setFormData({
        description: item.description || '',
        category: item.category || '',
        topic: item.topic || '',
        required_evidence: item.required_evidence || '',
        responsible: item.responsible || '',
        Approver: item.Approver || ''
      });
      
      // Reset approvers
      const approvers = item?.Approver ? item.Approver.split(',').map(a => a.trim()).filter(Boolean) : [];
      setSelectedApprovers(approvers);
      
      setMode('view');
    } else {
      onClose();
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleApproverAdd = (approver: string) => {
    if (!selectedApprovers.includes(approver)) {
      const newApprovers = [...selectedApprovers, approver];
      setSelectedApprovers(newApprovers);
      
      if (approver === 'technical_authority') {
        setShowTA2Fields(prev => ({ ...prev, [approver]: true }));
      }
    }
  };

  const handleApproverRemove = (approver: string) => {
    setSelectedApprovers(prev => prev.filter(a => a !== approver));
    setShowTA2Fields(prev => ({ ...prev, [approver]: false }));
    setTA2Selections(prev => {
      const newSelections = { ...prev };
      delete newSelections[approver];
      return newSelections;
    });
  };

  const handleTA2Change = (approver: string, field: 'commission' | 'discipline', value: string) => {
    setTA2Selections(prev => ({
      ...prev,
      [approver]: {
        ...prev[approver],
        [field]: value
      }
    }));
  };

  const formatApproverDisplay = (approver: string) => {
    if (approver === 'technical_authority' && ta2Selections[approver]) {
      const { discipline, commission } = ta2Selections[approver];
      if (discipline && commission) {
        return `TA2 ${discipline} (${commission})`;
      }
    }
    return roles.find(r => r.value === approver)?.label || approver;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span className="text-xl font-semibold bg-gradient-to-r from-blue-700 to-purple-700 bg-clip-text text-transparent">
              {mode === 'view' ? 'View' : 'Edit'} Checklist Item
            </span>
            <div className="flex items-center space-x-2">
              {mode === 'view' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setMode('edit')}
                  className="text-blue-600 border-blue-200 hover:bg-blue-50"
                >
                  Edit
                </Button>
              )}
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 pt-4">
          {/* Unique ID - Always read-only */}
          <div className="space-y-2">
            <Label htmlFor="unique_id" className="text-sm font-medium text-gray-700">
              Unique ID
            </Label>
            <Input
              id="unique_id"
              value={item.unique_id}
              readOnly
              className="bg-gray-50 text-gray-600 cursor-not-allowed"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description" className="text-sm font-medium text-gray-700">
              Description *
            </Label>
            {mode === 'edit' ? (
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Enter checklist item description"
                className="min-h-[100px] resize-none"
                required
              />
            ) : (
              <div className="p-3 bg-gray-50 rounded-md text-sm text-gray-700 min-h-[100px] whitespace-pre-wrap">
                {item.description || 'No description provided'}
              </div>
            )}
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label htmlFor="category" className="text-sm font-medium text-gray-700">
              Category *
            </Label>
            {mode === 'edit' ? (
              <Input
                id="category"
                value={formData.category}
                onChange={(e) => handleInputChange('category', e.target.value)}
                placeholder="Enter category"
                required
              />
            ) : (
              <div className="p-3 bg-gray-50 rounded-md text-sm text-gray-700">
                {item.category || 'No category specified'}
              </div>
            )}
          </div>

          {/* Topic */}
          <div className="space-y-2">
            <Label htmlFor="topic" className="text-sm font-medium text-gray-700">
              Topic
            </Label>
            {mode === 'edit' ? (
              <Input
                id="topic"
                value={formData.topic}
                onChange={(e) => handleInputChange('topic', e.target.value)}
                placeholder="Enter topic"
              />
            ) : (
              <div className="p-3 bg-gray-50 rounded-md text-sm text-gray-700">
                {item.topic || 'No topic specified'}
              </div>
            )}
          </div>

          {/* Required Evidence */}
          <div className="space-y-2">
            <Label htmlFor="required_evidence" className="text-sm font-medium text-gray-700">
              Required Evidence
            </Label>
            {mode === 'edit' ? (
              <Textarea
                id="required_evidence"
                value={formData.required_evidence}
                onChange={(e) => handleInputChange('required_evidence', e.target.value)}
                placeholder="Enter required evidence details"
                className="min-h-[80px] resize-none"
              />
            ) : (
              <div className="p-3 bg-gray-50 rounded-md text-sm text-gray-700 min-h-[80px] whitespace-pre-wrap">
                {item.required_evidence || 'No evidence requirements specified'}
              </div>
            )}
          </div>

          {/* Responsible */}
          <div className="space-y-2">
            <Label htmlFor="responsible" className="text-sm font-medium text-gray-700">
              Responsible
            </Label>
            {mode === 'edit' ? (
              <Combobox
                options={roles}
                value={formData.responsible}
                onValueChange={(value) => handleInputChange('responsible', value)}
                placeholder="Select responsible role..."
                searchPlaceholder="Search roles..."
                emptyText="No role found."
              />
            ) : (
              <div className="p-3 bg-gray-50 rounded-md text-sm text-gray-700">
                {roles.find(r => r.value === formData.responsible)?.label || formData.responsible || 'No responsible party specified'}
              </div>
            )}
          </div>

          {/* Approvers */}
          <div className="space-y-4">
            <Label className="text-sm font-medium text-gray-700">
              Approvers
            </Label>
            
            {mode === 'edit' ? (
              <div className="space-y-4">
                {/* Selected Approvers */}
                {selectedApprovers.length > 0 && (
                  <div className="space-y-3">
                    {selectedApprovers.map((approver, index) => (
                      <div key={index} className="border rounded-lg p-4 bg-gray-50">
                        <div className="flex items-center justify-between mb-3">
                          <Badge variant="secondary" className="text-sm">
                            {formatApproverDisplay(approver)}
                          </Badge>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleApproverRemove(approver)}
                            className="text-red-600 hover:text-red-800 hover:bg-red-50"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                        
                        {/* TA2 Fields */}
                        {approver === 'technical_authority' && showTA2Fields[approver] && (
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-2">
                              <Label className="text-xs font-medium text-gray-600">Commission</Label>
                              <Combobox
                                options={commissions}
                                value={ta2Selections[approver]?.commission || ''}
                                onValueChange={(value) => handleTA2Change(approver, 'commission', value)}
                                placeholder="Select commission..."
                                searchPlaceholder="Search commissions..."
                              />
                            </div>
                            <div className="space-y-2">
                              <Label className="text-xs font-medium text-gray-600">Discipline</Label>
                              <Combobox
                                options={disciplines}
                                value={ta2Selections[approver]?.discipline || ''}
                                onValueChange={(value) => handleTA2Change(approver, 'discipline', value)}
                                placeholder="Select discipline..."
                                searchPlaceholder="Search disciplines..."
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                
                {/* Add New Approver */}
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <Combobox
                      options={roles.filter(role => !selectedApprovers.includes(role.value))}
                      value=""
                      onValueChange={handleApproverAdd}
                      placeholder="Add approver role..."
                      searchPlaceholder="Search roles..."
                      emptyText="No available roles."
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="px-3"
                      disabled={roles.filter(role => !selectedApprovers.includes(role.value)).length === 0}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-3 bg-gray-50 rounded-md text-sm text-gray-700">
                {selectedApprovers.length > 0 ? (
                  <div className="space-y-2">
                    {selectedApprovers.map((approver, index) => (
                      <Badge key={index} variant="secondary" className="mr-2">
                        {formatApproverDisplay(approver)}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  'No approvers specified'
                )}
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end space-x-3 pt-6 border-t">
          <Button
            variant="outline"
            onClick={handleCancel}
            className="px-6"
          >
            <X className="w-4 h-4 mr-2" />
            {mode === 'edit' ? 'Cancel' : 'Close'}
          </Button>
          
          {mode === 'edit' && (
            <Button
              onClick={handleSave}
              disabled={updateMutation.isPending || !formData.description.trim() || !formData.category.trim()}
              className="px-6 bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Save className="w-4 h-4 mr-2" />
              {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ChecklistItemDetailModal;
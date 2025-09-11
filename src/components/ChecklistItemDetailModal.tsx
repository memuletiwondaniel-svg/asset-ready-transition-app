import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ChecklistItem, useUpdateChecklistItem } from '@/hooks/useChecklistItems';
import { useToast } from '@/hooks/use-toast';
import { Save, X } from 'lucide-react';

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

  const { toast } = useToast();
  const updateMutation = useUpdateChecklistItem();

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
    }
  }, [item]);

  useEffect(() => {
    setMode(initialMode);
  }, [initialMode]);

  if (!item) return null;

  const handleSave = async () => {
    try {
      await updateMutation.mutateAsync({
        itemId: item.unique_id,
        updateData: formData
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
              <Input
                id="responsible"
                value={formData.responsible}
                onChange={(e) => handleInputChange('responsible', e.target.value)}
                placeholder="Enter responsible party"
              />
            ) : (
              <div className="p-3 bg-gray-50 rounded-md text-sm text-gray-700">
                {item.responsible || 'No responsible party specified'}
              </div>
            )}
          </div>

          {/* Approver */}
          <div className="space-y-2">
            <Label htmlFor="Approver" className="text-sm font-medium text-gray-700">
              Approver
            </Label>
            {mode === 'edit' ? (
              <Input
                id="Approver"
                value={formData.Approver}
                onChange={(e) => handleInputChange('Approver', e.target.value)}
                placeholder="Enter approver"
              />
            ) : (
              <div className="p-3 bg-gray-50 rounded-md text-sm text-gray-700">
                {item.Approver || 'No approver specified'}
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
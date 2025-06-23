
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Upload, X, Users } from 'lucide-react';
import { ChecklistItem } from '@/data/pssrChecklistData';

interface ChecklistItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: ChecklistItem | null;
  response: 'N/A' | 'YES' | 'NO' | null;
  onSave: (itemId: string, response: 'N/A' | 'YES' | 'NO', data: any) => void;
}

const ChecklistItemModal: React.FC<ChecklistItemModalProps> = ({
  isOpen,
  onClose,
  item,
  response,
  onSave
}) => {
  const [formData, setFormData] = useState({
    justification: '',
    narrative: '',
    deviationReason: '',
    potentialRisk: '',
    mitigations: '',
    files: [] as File[]
  });

  const [customApprovers, setCustomApprovers] = useState<string[]>([]);

  if (!item || !response) return null;

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setFormData(prev => ({
      ...prev,
      files: [...prev.files, ...files]
    }));
  };

  const removeFile = (index: number) => {
    setFormData(prev => ({
      ...prev,
      files: prev.files.filter((_, i) => i !== index)
    }));
  };

  const handleSave = () => {
    onSave(item.id, response, formData);
    onClose();
  };

  const handleSubmit = () => {
    // Same as save but with submit status
    onSave(item.id, response, { ...formData, submitted: true });
    onClose();
  };

  const renderContent = () => {
    switch (response) {
      case 'N/A':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="justification">Justification for N/A *</Label>
              <Textarea
                id="justification"
                value={formData.justification}
                onChange={(e) => setFormData(prev => ({ ...prev, justification: e.target.value }))}
                placeholder="Explain why this item is not applicable..."
                rows={4}
              />
            </div>
          </div>
        );

      case 'YES':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="narrative">Narrative/Comments</Label>
              <Textarea
                id="narrative"
                value={formData.narrative}
                onChange={(e) => setFormData(prev => ({ ...prev, narrative: e.target.value }))}
                placeholder="Provide comments or narrative..."
                rows={4}
              />
            </div>

            <div>
              <Label>Default Approvers</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {item.approvingAuthority.split(', ').map((approver, index) => (
                  <Badge key={index} variant="secondary">{approver}</Badge>
                ))}
              </div>
            </div>
          </div>
        );

      case 'NO':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="deviationReason">Reason for Deviation *</Label>
              <Textarea
                id="deviationReason"
                value={formData.deviationReason}
                onChange={(e) => setFormData(prev => ({ ...prev, deviationReason: e.target.value }))}
                placeholder="Explain why a deviation is required..."
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="potentialRisk">Potential Risk *</Label>
              <Textarea
                id="potentialRisk"
                value={formData.potentialRisk}
                onChange={(e) => setFormData(prev => ({ ...prev, potentialRisk: e.target.value }))}
                placeholder="Describe potential risks..."
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="mitigations">Mitigations *</Label>
              <Textarea
                id="mitigations"
                value={formData.mitigations}
                onChange={(e) => setFormData(prev => ({ ...prev, mitigations: e.target.value }))}
                placeholder="Describe mitigation measures..."
                rows={3}
              />
            </div>

            <div>
              <Label>Deviation Approvers</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {item.approvingAuthority.split(', ').map((approver, index) => (
                  <Badge key={index} variant="destructive">{approver}</Badge>
                ))}
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {item.id} - {response} Response
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-medium mb-2">Checklist Item</h4>
            <p className="text-sm text-gray-700 mb-2">{item.description}</p>
            {item.supportingEvidence && (
              <div>
                <span className="text-xs font-medium text-gray-600">Supporting Evidence: </span>
                <span className="text-xs text-gray-600">{item.supportingEvidence}</span>
              </div>
            )}
          </div>

          {renderContent()}

          {/* File Upload Section */}
          <div>
            <Label>Supporting Documents</Label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center mt-2">
              <Upload className="mx-auto h-8 w-8 text-gray-400" />
              <p className="mt-2 text-sm text-gray-600">
                Upload supporting documents
              </p>
              <input
                type="file"
                multiple
                onChange={handleFileUpload}
                className="hidden"
                id="file-upload-checklist"
              />
              <Button 
                variant="outline" 
                size="sm"
                className="mt-2"
                onClick={() => document.getElementById('file-upload-checklist')?.click()}
              >
                Choose Files
              </Button>
            </div>
            
            {formData.files.length > 0 && (
              <div className="mt-3 space-y-2">
                {formData.files.map((file, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <span className="text-sm">{file.name}</span>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => removeFile(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end space-x-2 pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button variant="outline" onClick={handleSave}>
              Save Draft
            </Button>
            {response === 'YES' && (
              <Button onClick={handleSubmit}>
                Submit for Review
              </Button>
            )}
            {response === 'NO' && (
              <Button variant="destructive" onClick={handleSubmit}>
                Submit Deviation Request
              </Button>
            )}
            {response === 'N/A' && (
              <Button onClick={handleSubmit}>
                Mark as N/A
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ChecklistItemModal;

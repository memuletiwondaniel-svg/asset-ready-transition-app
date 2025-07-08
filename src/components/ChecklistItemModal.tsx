
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Upload, X, Users, Plus, Trash2, UserCheck } from 'lucide-react';
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

  // Mock approver data with images
  const getApproverData = (name: string) => {
    const approverImages: { [key: string]: string } = {
      'Technical Authority': 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
      'Asset Manager': 'https://images.unsplash.com/photo-1494790108755-2616b612b77c?w=150&h=150&fit=crop&crop=face',
      'Operations Manager': 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
      'HSSE Manager': 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face',
      'Project Manager': 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face',
      'Engineering Manager': 'https://images.unsplash.com/photo-1507591064344-4c6ce005b128?w=150&h=150&fit=crop&crop=face'
    };
    
    return {
      name,
      image: approverImages[name] || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&h=150&fit=crop&crop=face',
      initials: name.split(' ').map(n => n[0]).join('')
    };
  };

  const getDocumentGuidance = (item: ChecklistItem) => {
    const guidanceMap: { [key: string]: string } = {
      'G.1': 'Upload supporting documents such as HEMP Close-out Report',
      'G.2': 'Upload supporting documents such as signed-off Cause & Effect Chart',
      'G.3': 'Upload supporting documents such as Process Safety Management Plan',
      'G.4': 'Upload supporting documents such as Emergency Response Procedures',
      'G.5': 'Upload supporting documents such as Training Records and Competency Matrix'
    };
    
    return guidanceMap[item.id] || `Upload supporting documents such as ${item.supportingEvidence || 'relevant documentation'}`;
  };

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
    onSave(item.id, response, { ...formData, submitted: true });
    onClose();
  };

  const addCustomApprover = () => {
    setCustomApprovers(prev => [...prev, '']);
  };

  const removeCustomApprover = (index: number) => {
    setCustomApprovers(prev => prev.filter((_, i) => i !== index));
  };

  const renderContent = () => {
    switch (response) {
      case 'N/A':
        return (
          <div className="space-y-6">
            <div className="bg-gray-50 rounded-lg p-4">
              <Label htmlFor="justification" className="text-sm font-semibold text-gray-700">
                Justification for N/A *
              </Label>
              <Textarea
                id="justification"
                value={formData.justification}
                onChange={(e) => setFormData(prev => ({ ...prev, justification: e.target.value }))}
                placeholder="Explain why this item is not applicable..."
                rows={4}
                className="mt-2"
              />
            </div>
          </div>
        );

      case 'YES':
        const defaultApprovers = item.approvingAuthority.split(', ').map(name => getApproverData(name.trim()));
        
        return (
          <div className="space-y-6">
            <div className="bg-green-50 rounded-lg p-4 border border-green-200">
              <Label htmlFor="narrative" className="text-sm font-semibold text-gray-700">
                Narrative/Comments
              </Label>
              <Textarea
                id="narrative"
                value={formData.narrative}
                onChange={(e) => setFormData(prev => ({ ...prev, narrative: e.target.value }))}
                placeholder="Provide comments or narrative..."
                rows={4}
                className="mt-2"
              />
            </div>

            <div className="bg-white rounded-lg border p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <UserCheck className="h-5 w-5 text-blue-600" />
                  <Label className="text-sm font-semibold text-gray-700">Default Approvers</Label>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={addCustomApprover}
                  className="text-blue-600 border-blue-200 hover:bg-blue-50"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Approver
                </Button>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                {defaultApprovers.map((approver, index) => (
                  <div key={index} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={approver.image} alt={approver.name} />
                      <AvatarFallback className="bg-blue-100 text-blue-700 text-sm font-semibold">
                        {approver.initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{approver.name}</p>
                      <Badge variant="secondary" className="text-xs">Default</Badge>
                    </div>
                  </div>
                ))}
                
                {customApprovers.map((approver, index) => (
                  <div key={index} className="flex items-center space-x-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-blue-200 text-blue-700">
                        <Users className="h-5 w-5" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <Input
                        placeholder="Enter approver name..."
                        value={approver}
                        onChange={(e) => {
                          const newApprovers = [...customApprovers];
                          newApprovers[index] = e.target.value;
                          setCustomApprovers(newApprovers);
                        }}
                        className="text-sm"
                      />
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeCustomApprover(index)}
                      className="text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case 'NO':
        const deviationApprovers = item.approvingAuthority.split(', ').map(name => getApproverData(name.trim()));
        
        return (
          <div className="space-y-6">
            <div className="bg-red-50 rounded-lg p-4 border border-red-200 space-y-4">
              <div>
                <Label htmlFor="deviationReason" className="text-sm font-semibold text-gray-700">
                  Reason for Deviation *
                </Label>
                <Textarea
                  id="deviationReason"
                  value={formData.deviationReason}
                  onChange={(e) => setFormData(prev => ({ ...prev, deviationReason: e.target.value }))}
                  placeholder="Explain why a deviation is required..."
                  rows={3}
                  className="mt-2"
                />
              </div>

              <div>
                <Label htmlFor="potentialRisk" className="text-sm font-semibold text-gray-700">
                  Potential Risk *
                </Label>
                <Textarea
                  id="potentialRisk"
                  value={formData.potentialRisk}
                  onChange={(e) => setFormData(prev => ({ ...prev, potentialRisk: e.target.value }))}
                  placeholder="Describe potential risks..."
                  rows={3}
                  className="mt-2"
                />
              </div>

              <div>
                <Label htmlFor="mitigations" className="text-sm font-semibold text-gray-700">
                  Mitigations *
                </Label>
                <Textarea
                  id="mitigations"
                  value={formData.mitigations}
                  onChange={(e) => setFormData(prev => ({ ...prev, mitigations: e.target.value }))}
                  placeholder="Describe mitigation measures..."
                  rows={3}
                  className="mt-2"
                />
              </div>
            </div>

            <div className="bg-white rounded-lg border p-4">
              <div className="flex items-center space-x-2 mb-4">
                <UserCheck className="h-5 w-5 text-red-600" />
                <Label className="text-sm font-semibold text-gray-700">Deviation Approvers</Label>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                {deviationApprovers.map((approver, index) => (
                  <div key={index} className="flex items-center space-x-3 p-3 bg-red-50 rounded-lg border border-red-200">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={approver.image} alt={approver.name} />
                      <AvatarFallback className="bg-red-100 text-red-700 text-sm font-semibold">
                        {approver.initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{approver.name}</p>
                      <Badge variant="destructive" className="text-xs">Required</Badge>
                    </div>
                  </div>
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
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            {item.id} - {response} Response
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <h4 className="font-semibold mb-2 text-gray-900">Checklist Item</h4>
            <p className="text-sm text-gray-700 leading-relaxed">{item.description}</p>
          </div>

          {renderContent()}

          {/* Enhanced File Upload Section */}
          <div className="bg-white rounded-lg border p-4">
            <Label className="text-sm font-semibold text-gray-700 mb-3 block">Supporting Documents</Label>
            <div className="border-2 border-dashed border-blue-200 rounded-xl p-6 text-center bg-blue-50/30 hover:bg-blue-50/50 transition-colors">
              <div className="p-3 bg-blue-100 rounded-full w-fit mx-auto mb-3">
                <Upload className="h-6 w-6 text-blue-600" />
              </div>
              <p className="text-gray-600 text-sm mb-2">
                {response === 'YES' ? getDocumentGuidance(item) : 'Upload supporting documents'}
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
                className="border-blue-200 text-blue-700 hover:bg-blue-50"
                onClick={() => document.getElementById('file-upload-checklist')?.click()}
              >
                Choose Files
              </Button>
            </div>
            
            {formData.files.length > 0 && (
              <div className="mt-4 space-y-2">
                <h5 className="text-sm font-medium text-gray-700">Uploaded Files</h5>
                {formData.files.map((file, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-blue-100 rounded">
                        <Upload className="h-4 w-4 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{file.name}</p>
                        <p className="text-xs text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                      </div>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => removeFile(index)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end space-x-3 pt-6 border-t">
            <Button variant="outline" onClick={onClose} className="px-6">
              Cancel
            </Button>
            <Button variant="outline" onClick={handleSave} className="px-6">
              Save Draft
            </Button>
            {response === 'YES' && (
              <Button onClick={handleSubmit} className="bg-green-600 hover:bg-green-700 text-white px-6">
                Submit for Review
              </Button>
            )}
            {response === 'NO' && (
              <Button variant="destructive" onClick={handleSubmit} className="px-6">
                Submit Deviation Request
              </Button>
            )}
            {response === 'N/A' && (
              <Button onClick={handleSubmit} className="bg-gray-600 hover:bg-gray-700 text-white px-6">
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

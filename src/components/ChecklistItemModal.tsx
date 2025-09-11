
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
      <DialogContent className="max-w-5xl max-h-[92vh] border-0 p-0 overflow-hidden bg-transparent">
        {/* Microsoft Fluent Background Layer */}
        <div className="absolute inset-0 bg-gradient-to-br from-background/95 via-background/90 to-card/85 backdrop-blur-2xl"></div>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/5 via-transparent to-secondary/5"></div>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-accent/5 via-transparent to-primary/5"></div>
        
        {/* Acrylic noise texture */}
        <div className="absolute inset-0 opacity-[0.02]" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='0.4'%3E%3Ccircle cx='7' cy='7' r='1'/%3E%3Ccircle cx='27' cy='7' r='1'/%3E%3Ccircle cx='47' cy='7' r='1'/%3E%3Ccircle cx='7' cy='27' r='1'/%3E%3Ccircle cx='27' cy='27' r='1'/%3E%3Ccircle cx='47' cy='27' r='1'/%3E%3Ccircle cx='7' cy='47' r='1'/%3E%3Ccircle cx='27' cy='47' r='1'/%3E%3Ccircle cx='47' cy='47' r='1'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
        }}></div>
        
        {/* Glass layer */}
        <div className="absolute inset-0 bg-gradient-to-t from-white/10 via-white/5 to-transparent rounded-xl"></div>
        
        {/* Content Layer */}
        <div className="relative z-10 flex flex-col h-full">
          {/* Header */}
          <div className="flex-shrink-0 p-8 pb-6 border-b border-border/20 bg-gradient-to-r from-card/20 to-card/10 backdrop-blur-sm">
            <DialogTitle className="text-3xl font-bold bg-gradient-to-r from-foreground to-primary bg-clip-text text-transparent">
              {item.id} - {response} Response
            </DialogTitle>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-hidden">
            <div className="h-full px-8 py-6 overflow-y-auto">
              <div className="space-y-8">
                <div className="relative p-6 bg-gradient-to-br from-primary/10 to-primary/5 rounded-xl border border-primary/20 backdrop-blur-sm overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent"></div>
                  <h4 className="font-bold mb-3 text-foreground text-lg relative z-10">Checklist Item</h4>
                  <p className="text-sm text-foreground leading-relaxed relative z-10">{item.description}</p>
                </div>

                {renderContent()}

                {/* Enhanced File Upload Section */}
                <div className="relative bg-gradient-to-br from-card/60 to-card/40 rounded-xl border border-border/20 p-6 backdrop-blur-sm overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-secondary/5 to-transparent"></div>
                  <div className="relative z-10">
                    <Label className="text-lg font-semibold text-foreground mb-4 block">Supporting Documents</Label>
                    <div className="relative border-2 border-dashed border-primary/30 rounded-xl p-8 text-center bg-gradient-to-br from-primary/5 to-primary/10 hover:from-primary/10 hover:to-primary/15 transition-all duration-300 backdrop-blur-sm overflow-hidden group">
                      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                      <div className="relative z-10">
                        <div className="p-4 bg-primary/20 rounded-full w-fit mx-auto mb-4 backdrop-blur-sm">
                          <Upload className="h-8 w-8 text-primary" />
                        </div>
                        <p className="text-foreground text-sm mb-3 font-medium">
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
                          className="relative overflow-hidden border-2 border-primary/30 bg-primary/10 text-primary hover:bg-primary hover:text-white transition-all duration-300 backdrop-blur-sm group"
                          onClick={() => document.getElementById('file-upload-checklist')?.click()}
                        >
                          <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                          <span className="relative z-10">Choose Files</span>
                        </Button>
                      </div>
                    </div>
                    
                    {formData.files.length > 0 && (
                      <div className="mt-6 space-y-3">
                        <h5 className="text-sm font-semibold text-foreground">Uploaded Files</h5>
                        {formData.files.map((file, index) => (
                          <div key={index} className="relative flex items-center justify-between p-4 bg-gradient-to-r from-card/60 to-card/40 rounded-lg border border-border/20 backdrop-blur-sm overflow-hidden group hover:from-card/80 hover:to-card/60 transition-all duration-300">
                            <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                            <div className="relative z-10 flex items-center space-x-4">
                              <div className="p-2 bg-primary/20 rounded-lg backdrop-blur-sm">
                                <Upload className="h-5 w-5 text-primary" />
                              </div>
                              <div>
                                <p className="text-sm font-semibold text-foreground">{file.name}</p>
                                <p className="text-xs text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                              </div>
                            </div>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => removeFile(index)}
                              className="relative z-10 text-destructive hover:text-white hover:bg-destructive/90 transition-all duration-300"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex-shrink-0 p-8 pt-6 border-t border-border/20 bg-gradient-to-r from-card/10 to-card/5 backdrop-blur-sm">
            <div className="flex justify-end space-x-4">
              <Button 
                variant="outline" 
                onClick={onClose} 
                className="relative overflow-hidden px-6 border-2 border-border/30 hover:border-muted-foreground/40 transition-all duration-300 backdrop-blur-sm"
              >
                Cancel
              </Button>
              <Button 
                variant="outline" 
                onClick={handleSave} 
                className="relative overflow-hidden px-6 border-2 border-primary/30 bg-primary/5 text-primary hover:bg-primary hover:text-white transition-all duration-300 backdrop-blur-sm"
              >
                Save Draft
              </Button>
              {response === 'YES' && (
                <Button 
                  onClick={handleSubmit} 
                  className="relative overflow-hidden px-6 bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 text-white shadow-lg shadow-green-500/20 transition-all duration-300"
                >
                  Submit for Review
                </Button>
              )}
              {response === 'NO' && (
                <Button 
                  onClick={handleSubmit} 
                  className="relative overflow-hidden px-6 bg-gradient-to-r from-destructive to-destructive/80 hover:from-destructive/90 hover:to-destructive shadow-lg shadow-destructive/20 transition-all duration-300"
                >
                  Submit Deviation Request
                </Button>
              )}
              {response === 'N/A' && (
                <Button 
                  onClick={handleSubmit} 
                  className="relative overflow-hidden px-6 bg-gradient-to-r from-muted-foreground to-muted-foreground/80 hover:from-muted-foreground/90 hover:to-muted-foreground text-white shadow-lg shadow-muted-foreground/20 transition-all duration-300"
                >
                  Mark as N/A
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ChecklistItemModal;

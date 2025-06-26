
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  CheckCircle, 
  XCircle, 
  MinusCircle,
  AlertTriangle,
  Users,
  FileText,
  Upload,
  MessageSquare,
  ThumbsUp,
  Clock
} from 'lucide-react';
import { ChecklistItem } from '@/data/pssrChecklistData';

interface ChecklistItemDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: ChecklistItem | null;
  currentResponse?: 'N/A' | 'YES' | 'NO';
  currentData?: any;
  onSave: (itemId: string, response: 'N/A' | 'YES' | 'NO', data: any) => void;
}

// Mock approver data
const getApprovers = (approvingAuthority: string) => {
  const approversList = approvingAuthority.split(',').map(auth => auth.trim());
  return approversList.map((approver, index) => ({
    name: approver,
    avatar: `https://images.unsplash.com/photo-${1581090464777 + index}-f3220bbe1b8b?w=100&h=100&fit=crop&crop=face`,
    approved: Math.random() > 0.6,
    approvedDate: Math.random() > 0.6 ? '2024-01-15' : null
  }));
};

const ChecklistItemDetailModal: React.FC<ChecklistItemDetailModalProps> = ({
  isOpen,
  onClose,
  item,
  currentResponse,
  currentData,
  onSave
}) => {
  const [response, setResponse] = useState<'N/A' | 'YES' | 'NO' | ''>(currentResponse || '');
  const [comments, setComments] = useState(currentData?.comments || '');
  const [files, setFiles] = useState<File[]>(currentData?.files || []);
  const [justification, setJustification] = useState(currentData?.justification || '');
  const [showWarning, setShowWarning] = useState(false);

  const approvers = item ? getApprovers(item.approvingAuthority) : [];
  const approvedCount = approvers.filter(a => a.approved).length;
  const pendingCount = approvers.length - approvedCount;
  const hasApprovals = approvedCount > 0;

  useEffect(() => {
    if (isOpen && item) {
      setResponse(currentResponse || '');
      setComments(currentData?.comments || '');
      setFiles(currentData?.files || []);
      setJustification(currentData?.justification || '');
      setShowWarning(false);
    }
  }, [isOpen, item, currentResponse, currentData]);

  const handleResponseChange = (value: string) => {
    if (value && (value === 'N/A' || value === 'YES' || value === 'NO')) {
      setResponse(value as 'N/A' | 'YES' | 'NO');
      // Show warning if there are existing approvals and response is changing
      if (hasApprovals && currentResponse && value !== currentResponse) {
        setShowWarning(true);
      } else {
        setShowWarning(false);
      }
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      setFiles(prev => [...prev, ...Array.from(event.target.files!)]);
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    if (!item || !response) return;
    
    const data = {
      comments,
      files,
      justification: response === 'NO' ? justification : '',
      submitted: true,
      submittedDate: new Date().toISOString()
    };
    
    onSave(item.id, response, data);
    onClose();
  };

  const handleCancel = () => {
    setShowWarning(false);
    setResponse(currentResponse || '');
  };

  if (!item) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-3">
            <span className="text-xl font-bold">{item.id}</span>
            <Badge variant="outline" className="text-sm">
              {item.category}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Question Description */}
          <div>
            <Label className="text-base font-semibold text-gray-900">Question</Label>
            <p className="text-gray-700 mt-2 leading-relaxed">{item.description}</p>
          </div>

          {/* Supporting Evidence */}
          {item.supportingEvidence && (
            <div>
              <Label className="text-sm font-medium text-gray-700">Supporting Evidence Required</Label>
              <p className="text-sm text-gray-600 mt-1">{item.supportingEvidence}</p>
            </div>
          )}

          {/* Approvers Status */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <Label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <Users className="h-4 w-4 text-blue-600" />
                Approvers ({approvers.length})
              </Label>
              <div className="flex items-center space-x-4 text-sm">
                <div className="flex items-center space-x-1">
                  <ThumbsUp className="h-4 w-4 text-green-600" />
                  <span className="text-green-600 font-medium">{approvedCount} Approved</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Clock className="h-4 w-4 text-orange-600" />
                  <span className="text-orange-600 font-medium">{pendingCount} Pending</span>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {approvers.map((approver, index) => (
                <div key={index} className="flex items-center space-x-3 p-2 bg-white rounded border">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={approver.avatar} alt={approver.name} />
                    <AvatarFallback className="text-xs bg-blue-100 text-blue-700">
                      {approver.name.split(' ').map(n => n[0]).join('').substring(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{approver.name}</p>
                  </div>
                  <div className="flex items-center">
                    {approver.approved ? (
                      <div className="flex items-center space-x-1">
                        <ThumbsUp className="h-4 w-4 text-green-600" />
                        <span className="text-xs text-green-600">Approved</span>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-1">
                        <Clock className="h-4 w-4 text-orange-600" />
                        <span className="text-xs text-orange-600">Pending</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Warning for changing response */}
          {showWarning && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
                <div>
                  <h4 className="text-sm font-medium text-amber-800">Response Change Warning</h4>
                  <p className="text-sm text-amber-700 mt-1">
                    Changing your response will require re-approval from all approvers. 
                    {approvedCount > 0 && ` ${approvedCount} existing approval(s) will be reset.`}
                  </p>
                  <div className="flex space-x-3 mt-3">
                    <Button size="sm" onClick={() => setShowWarning(false)} className="bg-amber-600 hover:bg-amber-700">
                      Continue with Change
                    </Button>
                    <Button size="sm" variant="outline" onClick={handleCancel}>
                      Cancel Change
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Response Selection */}
          <div>
            <Label className="text-sm font-medium text-gray-700">Response *</Label>
            <Select value={response} onValueChange={handleResponseChange}>
              <SelectTrigger className="w-full mt-1">
                <SelectValue placeholder="Select your response..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="N/A">
                  <div className="flex items-center space-x-2">
                    <MinusCircle className="h-4 w-4 text-gray-600" />
                    <span>N/A - Not Applicable</span>
                  </div>
                </SelectItem>
                <SelectItem value="YES">
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span>YES - Compliant</span>
                  </div>
                </SelectItem>
                <SelectItem value="NO">
                  <div className="flex items-center space-x-2">
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                    <span>NO - Request Deviation</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Justification for NO response */}
          {response === 'NO' && (
            <div>
              <Label className="text-sm font-medium text-gray-700">Justification for Deviation *</Label>
              <Textarea
                placeholder="Please provide detailed justification for requesting a deviation..."
                value={justification}
                onChange={(e) => setJustification(e.target.value)}
                className="mt-1"
                rows={3}
              />
            </div>
          )}

          {/* Comments */}
          <div>
            <Label className="text-sm font-medium text-gray-700">Comments</Label>
            <Textarea
              placeholder="Add any additional comments or notes..."
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              className="mt-1"
              rows={3}
            />
          </div>

          {/* File Upload */}
          <div>
            <Label className="text-sm font-medium text-gray-700">Supporting Documents</Label>
            <div className="mt-1">
              <label className="flex items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <Upload className="w-8 h-8 mb-4 text-gray-500" />
                  <p className="mb-2 text-sm text-gray-500">
                    <span className="font-semibold">Click to upload</span> or drag and drop
                  </p>
                  <p className="text-xs text-gray-500">PDF, DOC, DOCX, XLS, XLSX, PNG, JPG up to 10MB</p>
                </div>
                <input type="file" className="hidden" onChange={handleFileUpload} multiple />
              </label>
            </div>
            
            {/* Uploaded Files */}
            {files.length > 0 && (
              <div className="mt-3 space-y-2">
                {files.map((file, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded border">
                    <div className="flex items-center space-x-2">
                      <FileText className="h-4 w-4 text-blue-600" />
                      <span className="text-sm text-gray-700">{file.name}</span>
                      <span className="text-xs text-gray-500">({(file.size / 1024).toFixed(1)} KB)</span>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => removeFile(index)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <XCircle className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              onClick={handleSave}
              disabled={!response || (response === 'NO' && !justification.trim())}
            >
              Save Response
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ChecklistItemDetailModal;

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  CheckCircle2, 
  Clock, 
  FileText, 
  Upload, 
  X, 
  Plus, 
  Minus,
  AlertTriangle,
  FileCheck,
  HourglassIcon
} from 'lucide-react';
import { useChecklistItems } from '@/hooks/useChecklistItems';

interface PSSRStepFiveProps {
  data: any;
  onDataUpdate: (data: any) => void;
  onNext: () => void;
  onBack: () => void;
  onSave: () => void;
}

interface ChecklistResponse {
  id: string;
  response: 'YES' | 'NO' | 'N/A' | null;
  narrative?: string;
  deviationReason?: string;
  potentialRisk?: string;
  mitigations?: string;
  followUpAction?: string;
  actionOwner?: string;
  justification?: string;
  supportingDocuments?: File[];
  approvers?: any[];
  status: 'NOT_SUBMITTED' | 'UNDER_REVIEW' | 'APPROVED';
  submittedAt?: Date;
}

const PSSRStepFive: React.FC<PSSRStepFiveProps> = ({ 
  data, 
  onDataUpdate, 
  onNext, 
  onBack, 
  onSave 
}) => {
  const { data: checklistData = [], isLoading } = useChecklistItems();
  const [checklistResponses, setChecklistResponses] = useState<ChecklistResponse[]>([]);

  // Initialize responses when checklist data loads
  React.useEffect(() => {
    if (checklistData.length > 0) {
      setChecklistResponses(
        checklistData.map(item => ({
          id: item.unique_id,
          response: null,
          status: 'NOT_SUBMITTED',
          approvers: []
        }))
      );
    }
  }, [checklistData]);
  
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [responseModalOpen, setResponseModalOpen] = useState(false);
  const [responseType, setResponseType] = useState<'YES' | 'NO' | 'N/A' | null>(null);
  const [completionModalOpen, setCompletionModalOpen] = useState(false);
  const [confirmationModalOpen, setConfirmationModalOpen] = useState(false);
  const [selectedForSubmission, setSelectedForSubmission] = useState<string[]>([]);
  
  // Form states for modals
  const [narrative, setNarrative] = useState('');
  const [deviationData, setDeviationData] = useState({
    reason: '',
    potentialRisk: '',
    mitigations: '',
    followUpAction: '',
    actionOwner: ''
  });
  const [justification, setJustification] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [customApprovers, setCustomApprovers] = useState<any[]>([]);

  const handleResponseSelect = (item: any, response: 'YES' | 'NO' | 'N/A') => {
    setSelectedItem(item);
    setResponseType(response);
    setResponseModalOpen(true);
    
    // Load existing data if any
    const existing = checklistResponses.find(r => r.id === item.id);
    if (existing) {
      setNarrative(existing.narrative || '');
      setDeviationData({
        reason: existing.deviationReason || '',
        potentialRisk: existing.potentialRisk || '',
        mitigations: existing.mitigations || '',
        followUpAction: existing.followUpAction || '',
        actionOwner: existing.actionOwner || ''
      });
      setJustification(existing.justification || '');
      setUploadedFiles(existing.supportingDocuments || []);
      setCustomApprovers(existing.approvers || []);
    } else {
      // Reset form
      setNarrative('');
      setDeviationData({
        reason: '',
        potentialRisk: '',
        mitigations: '',
        followUpAction: '',
        actionOwner: ''
      });
      setJustification('');
      setUploadedFiles([]);
      setCustomApprovers([]);
    }
  };

  const handleSaveResponse = () => {
    if (!selectedItem || !responseType) return;

    const updatedResponses = checklistResponses.map(response => {
      if (response.id === selectedItem.id) {
        return {
          ...response,
          response: responseType,
          narrative: responseType === 'YES' ? narrative : undefined,
          deviationReason: responseType === 'NO' ? deviationData.reason : undefined,
          potentialRisk: responseType === 'NO' ? deviationData.potentialRisk : undefined,
          mitigations: responseType === 'NO' ? deviationData.mitigations : undefined,
          followUpAction: responseType === 'NO' ? deviationData.followUpAction : undefined,
          actionOwner: responseType === 'NO' ? deviationData.actionOwner : undefined,
          justification: responseType === 'N/A' ? justification : undefined,
          supportingDocuments: uploadedFiles,
          approvers: customApprovers
        };
      }
      return response;
    });

    setChecklistResponses(updatedResponses);
    onDataUpdate({ checklistResponses: updatedResponses });
    setResponseModalOpen(false);
    resetModalState();
  };

  const resetModalState = () => {
    setSelectedItem(null);
    setResponseType(null);
    setNarrative('');
    setDeviationData({
      reason: '',
      potentialRisk: '',
      mitigations: '',
      followUpAction: '',
      actionOwner: ''
    });
    setJustification('');
    setUploadedFiles([]);
    setCustomApprovers([]);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setUploadedFiles(prev => [...prev, ...files]);
  };

  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case 'UNDER_REVIEW':
        return <HourglassIcon className="h-4 w-4 text-amber-600" />;
      default:
        return <FileText className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Approved</Badge>;
      case 'UNDER_REVIEW':
        return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">Under Review</Badge>;
      default:
        return <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">Not Submitted</Badge>;
    }
  };

  const handleCompleteChecklist = () => {
    // Filter items that have responses
    const itemsWithResponses = checklistResponses.filter(r => r.response !== null);
    setSelectedForSubmission(itemsWithResponses.map(r => r.id));
    setCompletionModalOpen(true);
  };

  const handleConfirmSubmission = () => {
    setCompletionModalOpen(false);
    setConfirmationModalOpen(true);
  };

  const handleFinalSubmission = () => {
    // Update status of selected items to UNDER_REVIEW
    const updatedResponses = checklistResponses.map(response => {
      if (selectedForSubmission.includes(response.id)) {
        return {
          ...response,
          status: 'UNDER_REVIEW' as const,
          submittedAt: new Date()
        };
      }
      return response;
    });

    setChecklistResponses(updatedResponses);
    onDataUpdate({ checklistResponses: updatedResponses });
    setConfirmationModalOpen(false);
    setSelectedForSubmission([]);
    
    // Show success notification
    alert(`${selectedForSubmission.length} checklist items have been submitted for approval.`);
    onNext(); // Return to summary
  };

  const categorizedItems = checklistData.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, any[]>);

  const categories = Object.keys(categorizedItems);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Complete PSSR Checklist</h2>
          <p className="text-gray-600 mt-1">Respond to checklist items and submit for approval</p>
        </div>
        <Button onClick={handleCompleteChecklist} className="bg-blue-600 hover:bg-blue-700">
          <FileCheck className="h-4 w-4 mr-2" />
          Complete PSSR
        </Button>
      </div>

      {/* Checklist Items by Category */}
      <Tabs defaultValue={categories[0]} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          {categories.map((category) => (
            <TabsTrigger key={category} value={category} className="text-xs">
              {category}
            </TabsTrigger>
          ))}
        </TabsList>

        {categories.map((category) => (
          <TabsContent key={category} value={category} className="space-y-4">
            {categorizedItems[category].map((item) => {
              const response = checklistResponses.find(r => r.id === item.id);
              return (
                <Card key={item.id} className="border-l-4 border-l-blue-200">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start space-x-4">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          {getStatusIcon(response?.status || 'NOT_SUBMITTED')}
                          <span className="font-medium text-sm text-gray-600">{item.id}</span>
                          {getStatusBadge(response?.status || 'NOT_SUBMITTED')}
                        </div>
                        <h3 className="font-semibold text-gray-900 mb-2">{item.description}</h3>
                        {response?.response && (
                          <div className="mt-2">
                            <Badge 
                              variant="outline" 
                              className={
                                response.response === 'YES' ? 'bg-green-50 text-green-700 border-green-200' :
                                response.response === 'NO' ? 'bg-red-50 text-red-700 border-red-200' :
                                'bg-gray-50 text-gray-700 border-gray-200'
                              }
                            >
                              {response.response === 'NO' ? 'NO - Request Deviation' : response.response}
                            </Badge>
                          </div>
                        )}
                      </div>
                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleResponseSelect(item, 'N/A')}
                          className="text-xs"
                        >
                          Not Applicable
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleResponseSelect(item, 'YES')}
                          className="text-xs bg-green-50 text-green-700 border-green-200 hover:bg-green-100"
                        >
                          YES
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleResponseSelect(item, 'NO')}
                          className="text-xs bg-red-50 text-red-700 border-red-200 hover:bg-red-100"
                        >
                          NO - Request Deviation
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </TabsContent>
        ))}
      </Tabs>

      {/* Response Modal */}
      <Dialog open={responseModalOpen} onOpenChange={setResponseModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              {responseType === 'YES' && <CheckCircle2 className="h-5 w-5 text-green-600" />}
              {responseType === 'NO' && <AlertTriangle className="h-5 w-5 text-red-600" />}
              {responseType === 'N/A' && <X className="h-5 w-5 text-gray-600" />}
              <span>
                {responseType === 'YES' && 'Confirm Compliance'}
                {responseType === 'NO' && 'Request Deviation'}
                {responseType === 'N/A' && 'Not Applicable Justification'}
              </span>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="bg-gray-50 p-3 rounded-lg">
              <p className="text-sm font-medium text-gray-900">{selectedItem?.description}</p>
            </div>

            {responseType === 'YES' && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="narrative">Narrative/Comments</Label>
                  <Textarea
                    id="narrative"
                    value={narrative}
                    onChange={(e) => setNarrative(e.target.value)}
                    placeholder="Provide details about compliance..."
                    className="mt-1"
                  />
                </div>
              </div>
            )}

            {responseType === 'NO' && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="reason">Reason for Deviation</Label>
                  <Textarea
                    id="reason"
                    value={deviationData.reason}
                    onChange={(e) => setDeviationData(prev => ({ ...prev, reason: e.target.value }))}
                    placeholder="Explain why deviation is required..."
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="risk">Potential Risk</Label>
                  <Textarea
                    id="risk"
                    value={deviationData.potentialRisk}
                    onChange={(e) => setDeviationData(prev => ({ ...prev, potentialRisk: e.target.value }))}
                    placeholder="Identify potential risks..."
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="mitigations">Mitigations</Label>
                  <Textarea
                    id="mitigations"
                    value={deviationData.mitigations}
                    onChange={(e) => setDeviationData(prev => ({ ...prev, mitigations: e.target.value }))}
                    placeholder="Describe mitigation measures..."
                    className="mt-1"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="followup">Follow-up Action</Label>
                    <Input
                      id="followup"
                      value={deviationData.followUpAction}
                      onChange={(e) => setDeviationData(prev => ({ ...prev, followUpAction: e.target.value }))}
                      placeholder="Required actions..."
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="owner">Action Owner</Label>
                    <Input
                      id="owner"
                      value={deviationData.actionOwner}
                      onChange={(e) => setDeviationData(prev => ({ ...prev, actionOwner: e.target.value }))}
                      placeholder="Responsible person..."
                      className="mt-1"
                    />
                  </div>
                </div>
              </div>
            )}

            {responseType === 'N/A' && (
              <div>
                <Label htmlFor="justification">Justification</Label>
                <Textarea
                  id="justification"
                  value={justification}
                  onChange={(e) => setJustification(e.target.value)}
                  placeholder="Explain why this item is not applicable..."
                  className="mt-1"
                />
              </div>
            )}

            {/* File Upload Section */}
            <div>
              <Label>Supporting Documents</Label>
              <div className="mt-2 border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <input
                  type="file"
                  multiple
                  onChange={handleFileUpload}
                  className="hidden"
                  id="file-upload"
                />
                <label htmlFor="file-upload" className="cursor-pointer">
                  <span className="text-sm text-blue-600 hover:text-blue-500">
                    Click to upload files
                  </span>
                  <span className="text-sm text-gray-500"> or drag and drop</span>
                </label>
              </div>
              {uploadedFiles.length > 0 && (
                <div className="mt-2 space-y-1">
                  {uploadedFiles.map((file, index) => (
                    <div key={index} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                      <span className="text-sm">{file.name}</span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => removeFile(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Approvers Section */}
            <div>
              <Label>Approving Authorities</Label>
              <div className="mt-2 space-y-2">
                {customApprovers.map((approver, index) => (
                  <div key={index} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                    <span className="text-sm">{approver.name} - {approver.role}</span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setCustomApprovers(prev => prev.filter((_, i) => i !== index))}
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    // Mock adding approver
                    const newApprover = { name: 'New Approver', role: 'Technical Authority' };
                    setCustomApprovers(prev => [...prev, newApprover]);
                  }}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Approver
                </Button>
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <Button variant="outline" onClick={() => setResponseModalOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveResponse}>
                Save Response
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Completion Modal */}
      <Dialog open={completionModalOpen} onOpenChange={setCompletionModalOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Complete PSSR - Review Responses</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="font-semibold text-blue-900">PSSR Summary</h3>
              <div className="grid grid-cols-2 gap-4 mt-2 text-sm">
                <div><strong>PSSR ID:</strong> {data.pssrId || 'PSSR-2024-001'}</div>
                <div><strong>Plant:</strong> {data.plant || 'Not specified'}</div>
                <div><strong>Project:</strong> {data.projectName || 'Not specified'}</div>
                <div><strong>Scope:</strong> {data.scope || 'Not specified'}</div>
              </div>
            </div>

            <div>
              <h4 className="font-semibold mb-3">Select items to submit for approval:</h4>
              <div className="max-h-96 overflow-y-auto space-y-2">
                {checklistResponses
                  .filter(r => r.response !== null)
                  .map((response) => {
                    const item = checklistData.find(i => i.id === response.id);
                    return (
                      <div key={response.id} className="flex items-center space-x-3 p-3 border rounded-lg">
                        <Checkbox
                          checked={selectedForSubmission.includes(response.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedForSubmission(prev => [...prev, response.id]);
                            } else {
                              setSelectedForSubmission(prev => prev.filter(id => id !== response.id));
                            }
                          }}
                        />
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <span className="text-sm font-medium">{item?.id}</span>
                            <Badge 
                              variant="outline"
                              className={
                                response.response === 'YES' ? 'bg-green-50 text-green-700 border-green-200' :
                                response.response === 'NO' ? 'bg-red-50 text-red-700 border-red-200' :
                                'bg-gray-50 text-gray-700 border-gray-200'
                              }
                            >
                              {response.response === 'NO' ? 'Request Deviation' : response.response}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600 mt-1">{item?.description}</p>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <Button variant="outline" onClick={() => setCompletionModalOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleConfirmSubmission}
                disabled={selectedForSubmission.length === 0}
              >
                Confirm ({selectedForSubmission.length} items)
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Final Confirmation Modal */}
      <Dialog open={confirmationModalOpen} onOpenChange={setConfirmationModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              <span>Confirm Submission</span>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <p className="text-gray-700">
              Once you click "OK", all selected checklist items ({selectedForSubmission.length}) will be sent to the applicable approvers for review and cannot be modified.
            </p>
            
            <div className="bg-amber-50 p-3 rounded-lg">
              <p className="text-sm text-amber-800">
                <strong>Note:</strong> This action cannot be undone. Make sure all responses are complete and accurate.
              </p>
            </div>

            <div className="flex justify-end space-x-3">
              <Button variant="outline" onClick={() => setConfirmationModalOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleFinalSubmission} className="bg-blue-600 hover:bg-blue-700">
                OK - Submit for Approval
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PSSRStepFive;
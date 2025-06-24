import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, ArrowRight, Save, Upload, X, CheckCircle, ClipboardCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import PSSRChecklist from './PSSRChecklist';

interface CreatePSSRFlowProps {
  onBack: () => void;
}

const CreatePSSRFlow: React.FC<CreatePSSRFlowProps> = ({ onBack }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [formData, setFormData] = useState({
    asset: '',
    reason: '',
    projectId: '',
    projectName: '',
    scope: '',
    files: [] as File[],
    teamMembers: {
      technicalAuthorities: {},
      assetTeam: {},
      projectTeam: {},
      hsse: {}
    }
  });

  const assets = [
    'KAZ',
    'NRNGL',
    'UQ',
    'Compressor Station (CS)',
    'BNGL'
  ];

  const reasons = [
    'Start-up or Commissioning of a new Asset',
    'Restart following significant modification to an existing Asset\'s Hardware, Safeguarding or Operating Philosophy',
    'Restart following a process safety incident',
    'Others (Specify)'
  ];

  const projects = [
    { id: 'BGC-2024-001', name: 'Phase 3 Expansion Project' },
    { id: 'BGC-2024-002', name: 'Safety Systems Upgrade' },
    { id: 'BGC-2024-003', name: 'Compression Station Enhancement' }
  ];

  const handleContinue = () => {
    setShowConfirmDialog(true);
  };

  const handleConfirm = () => {
    setCurrentStep(2);
    setShowConfirmDialog(false);
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

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>PSSR Information</CardTitle>
                <CardDescription>
                  The PSSR process manages the safe introduction of hydrocarbons into newly constructed facilities. 
                  This requires proper assurance and checks by an integrated team from Project, Asset, Engineering and Contractor teams.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="asset">Select Asset *</Label>
                  <Select value={formData.asset} onValueChange={(value) => setFormData(prev => ({...prev, asset: value}))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose an asset" />
                    </SelectTrigger>
                    <SelectContent>
                      {assets.map((asset) => (
                        <SelectItem key={asset} value={asset}>{asset}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="reason">Reason for PSSR *</Label>
                  <Select value={formData.reason} onValueChange={(value) => setFormData(prev => ({...prev, reason: value}))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select reason" />
                    </SelectTrigger>
                    <SelectContent>
                      {reasons.map((reason) => (
                        <SelectItem key={reason} value={reason}>{reason}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {formData.reason === 'Start-up or Commissioning of a new Asset' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="projectId">Project ID</Label>
                      <Select value={formData.projectId} onValueChange={(value) => setFormData(prev => ({...prev, projectId: value}))}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select project" />
                        </SelectTrigger>
                        <SelectContent>
                          {projects.map((project) => (
                            <SelectItem key={project.id} value={project.id}>{project.id}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="projectName">Project Name</Label>
                      <Input 
                        value={formData.projectName} 
                        onChange={(e) => setFormData(prev => ({...prev, projectName: e.target.value}))}
                        placeholder="Project name"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <Label htmlFor="scope">Scope Description *</Label>
                  <Textarea 
                    value={formData.scope}
                    onChange={(e) => setFormData(prev => ({...prev, scope: e.target.value}))}
                    placeholder="Describe the scope of the PSSR..."
                    rows={4}
                  />
                </div>

                <div>
                  <Label>Supporting Documents</Label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                    <Upload className="mx-auto h-12 w-12 text-gray-400" />
                    <p className="mt-2 text-sm text-gray-600">
                      Click to upload files or drag and drop
                    </p>
                    <input
                      type="file"
                      multiple
                      onChange={handleFileUpload}
                      className="hidden"
                      id="file-upload"
                    />
                    <Button 
                      variant="outline" 
                      className="mt-2"
                      onClick={() => document.getElementById('file-upload')?.click()}
                    >
                      Choose Files
                    </Button>
                  </div>
                  
                  {formData.files.length > 0 && (
                    <div className="mt-4 space-y-2">
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
              </CardContent>
            </Card>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>PSSR Created Successfully</CardTitle>
                <CardDescription>
                  Your PSSR has been created with ID: PSSR-2024-004
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-center py-8">
                  <div className="text-center">
                    <CheckCircle className="mx-auto h-16 w-16 text-green-600 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">PSSR Created</h3>
                    <p className="text-gray-600 mb-4">
                      You can now proceed to complete the PSSR checklist.
                    </p>
                    <div className="space-y-2">
                      <Button onClick={() => setCurrentStep(3)}>
                        <ClipboardCheck className="h-4 w-4 mr-2" />
                        Continue to Checklist
                      </Button>
                      <Button variant="outline" onClick={onBack}>
                        Return to PSSR List
                      </Button>
                    </div>
                  </div>
                </div>
                
                <div className="border-t pt-4 mt-4">
                  <h4 className="font-medium mb-2">PSSR Summary</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Asset:</span>
                      <span className="ml-2 font-medium">{formData.asset}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Reason:</span>
                      <span className="ml-2 font-medium">{formData.reason}</span>
                    </div>
                    {formData.projectId && (
                      <div>
                        <span className="text-gray-600">Project ID:</span>
                        <span className="ml-2 font-medium">{formData.projectId}</span>
                      </div>
                    )}
                    <div>
                      <span className="text-gray-600">Files:</span>
                      <span className="ml-2 font-medium">{formData.files.length} uploaded</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case 3:
        return <PSSRChecklist />;

      default:
        return null;
    }
  };

  const getStepTitle = () => {
    switch (currentStep) {
      case 1: return "PSSR Information";
      case 2: return "Confirmation";
      case 3: return "PSSR Checklist";
      default: return "";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Button variant="ghost" onClick={onBack}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to PSSR List
              </Button>
              <h1 className="text-xl font-bold text-gray-900">
                {currentStep === 1 ? "Create New PSSR" : currentStep === 2 ? "PSSR Created" : "PSSR Checklist"}
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <Button variant="outline">
                <Save className="h-4 w-4 mr-2" />
                Save Draft
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Progress Steps */}
        {currentStep <= 2 && (
          <div className="mb-8">
            <div className="flex items-center">
              <div className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  currentStep >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-300 text-gray-600'
                }`}>
                  1
                </div>
                <span className="ml-2 text-sm font-medium">PSSR Information</span>
              </div>
              <div className={`flex-1 h-1 mx-4 ${currentStep >= 2 ? 'bg-blue-600' : 'bg-gray-300'}`}></div>
              <div className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  currentStep >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-300 text-gray-600'
                }`}>
                  2
                </div>
                <span className="ml-2 text-sm font-medium">Confirmation</span>
              </div>
            </div>
          </div>
        )}

        {renderStepContent()}

        {/* Navigation */}
        {currentStep === 1 && (
          <div className="flex justify-between mt-8">
            <Button variant="outline" onClick={onBack}>
              Cancel
            </Button>
            
            <Button onClick={handleContinue} disabled={!formData.asset || !formData.reason || !formData.scope}>
              Continue
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        )}
      </main>

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create PSSR</DialogTitle>
            <DialogDescription>
              Are you ready to create this PSSR? Once created, a unique ID will be generated and you can proceed to complete the checklist.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end space-x-2 mt-4">
            <Button variant="outline" onClick={() => setShowConfirmDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleConfirm}>
              Continue
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CreatePSSRFlow;

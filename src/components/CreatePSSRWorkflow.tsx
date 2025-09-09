import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, ArrowRight, CheckCircle2 } from 'lucide-react';
import PSSRStepOne from './PSSRStepOne';
import PSSRStepTwo from './PSSRStepTwo';

interface CreatePSSRWorkflowProps {
  onBack: () => void;
  onComplete?: () => void;
}

interface PSSRData {
  // Compatible with existing FormData structure
  asset?: string;
  reason?: string;
  projectId?: string;
  projectName?: string;
  scope?: string;
  files?: File[];
  teamMembers?: {
    technicalAuthorities: any;
    assetTeam: any;
    projectTeam: any;
    hsse: any;
  };
  
  // Additional PSSR workflow data
  plant?: string;
  csLocation?: string;
  project?: string;
  supportingDocuments?: File[];
  selectedChecklist?: string;
  checklistItems?: any[];
  approvers?: any[];
  scheduledActivities?: any[];
  checklistResponses?: any[];
  linkedPSSRs?: any[];
  approvalStatus?: string;
}

const CreatePSSRWorkflow: React.FC<CreatePSSRWorkflowProps> = ({ onBack, onComplete }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [pssrData, setPssrData] = useState<PSSRData>({});
  const [pssrId, setPssrId] = useState<string | null>(null);

  const steps = [
    { number: 1, title: 'Enter PSSR Information', description: 'Basic PSSR details and scope' },
    { number: 2, title: 'Select Checklist Items', description: 'Choose applicable checklist items' },
    { number: 3, title: 'Review PSSR Approvers', description: 'Configure approval workflow' },
    { number: 4, title: 'Schedule PSSR Activity', description: 'Plan kick-off and walkdown events' },
    { number: 5, title: 'Complete Checklist Item', description: 'Fill out checklist responses' },
    { number: 6, title: 'Link a PSSR', description: 'Connect related PSSRs' },
    { number: 7, title: 'Approve Checklist Item', description: 'Review and approve items' },
    { number: 8, title: 'Approve PSSR', description: 'Final PSSR approval' }
  ];

  const handleNext = () => {
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
    } else if (onComplete) {
      onComplete();
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    } else {
      onBack();
    }
  };

  const handleDataUpdate = (stepData: any) => {
    setPssrData(prev => ({ ...prev, ...stepData }));
  };

  const handleSave = () => {
    // Generate PSSR ID if not already generated
    if (!pssrId) {
      const newPssrId = `PSSR-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`;
      setPssrId(newPssrId);
      // Show notification that PSSR ID has been assigned
      alert(`PSSR ID ${newPssrId} has been automatically assigned`);
    }
    
    // In a real app, this would save to the backend
    console.log('Saving PSSR data:', { id: pssrId, ...pssrData });
    onBack(); // Return to summary page
  };

  const progressPercentage = (currentStep / steps.length) * 100;

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <PSSRStepOne
            formData={{
              asset: pssrData.asset || '',
              reason: pssrData.reason || '',
              projectId: pssrData.projectId || '',
              projectName: pssrData.projectName || '',
              scope: pssrData.scope || '',
              files: pssrData.files || [],
              teamMembers: pssrData.teamMembers || {
                technicalAuthorities: {},
                assetTeam: {},
                projectTeam: {},
                hsse: {}
              }
            }}
            setFormData={handleDataUpdate}
            projects={[]}
            setProjects={() => {}}
            assets={['KAZ', 'NRNGL', 'UQ', 'BNGL', 'CS']}
            reasons={[
              'Start-up or Commissioning of a new Asset',
              'Restart following significant modification',
              'Restart following a process safety incident',
              'Restart following a Turn Around (TAR) Event',
              'Others (Specify)'
            ]}
            projectSearchOpen={false}
            setProjectSearchOpen={() => {}}
            showAddProjectWidget={false}
            setShowAddProjectWidget={() => {}}
            onProjectSelect={() => {}}
            onFileUpload={() => {}}
            onRemoveFile={() => {}}
            onContextAction={() => {}}
          />
        );
      case 2:
        return (
          <PSSRStepTwo
            formData={{
              asset: pssrData.asset || '',
              reason: pssrData.reason || '',
              projectId: pssrData.projectId || '',
              projectName: pssrData.projectName || '',
              scope: pssrData.scope || '',
              files: pssrData.files || [],
              teamMembers: pssrData.teamMembers || {
                technicalAuthorities: {},
                assetTeam: {},
                projectTeam: {},
                hsse: {}
              }
            }}
            onBack={handleBack}
            onContinueToChecklist={handleNext}
          />
        );
      default:
        return (
          <div className="text-center py-8">
            <p className="text-lg font-medium text-gray-600">
              Step {currentStep} implementation coming soon...
            </p>
            <p className="text-sm text-gray-500 mt-2">
              This step will be available in the next update.
            </p>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Button variant="ghost" onClick={onBack} size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to PSSR List
              </Button>
              <div>
                <h1 className="text-xl font-bold text-gray-900">
                  Create New PSSR
                  {pssrId && <span className="text-blue-600 ml-2">({pssrId})</span>}
                </h1>
                <p className="text-sm text-gray-600">Step {currentStep} of {steps.length}</p>
              </div>
            </div>
            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
              {Math.round(progressPercentage)}% Complete
            </Badge>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Progress Bar */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold text-gray-900">Progress</h2>
                <span className="text-sm text-gray-600">{currentStep} of {steps.length} steps</span>
              </div>
              <Progress value={progressPercentage} className="w-full h-3" />
              
              {/* Step indicators */}
              <div className="grid grid-cols-4 md:grid-cols-8 gap-2 mt-4">
                {steps.map((step) => (
                  <div 
                    key={step.number} 
                    className={`text-center p-2 rounded-lg border transition-colors ${
                      step.number < currentStep 
                        ? 'bg-green-50 border-green-200 text-green-700'
                        : step.number === currentStep
                        ? 'bg-blue-50 border-blue-200 text-blue-700'
                        : 'bg-gray-50 border-gray-200 text-gray-500'
                    }`}
                  >
                    <div className="flex items-center justify-center mb-1">
                      {step.number < currentStep ? (
                        <CheckCircle2 className="h-4 w-4" />
                      ) : (
                        <span className="text-xs font-bold">{step.number}</span>
                      )}
                    </div>
                    <p className="text-xs font-medium">{step.title}</p>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Current Step Content */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-3">
              <Badge variant="outline" className="bg-blue-100 text-blue-800">
                Step {currentStep}
              </Badge>
              <span>{steps[currentStep - 1].title}</span>
            </CardTitle>
            <p className="text-sm text-gray-600 mt-2">
              {steps[currentStep - 1].description}
            </p>
          </CardHeader>
          <CardContent>
            {renderStepContent()}
          </CardContent>
        </Card>

        {/* Navigation Buttons */}
        <div className="flex justify-between mt-6">
          <Button 
            variant="outline" 
            onClick={handleBack}
            className="flex items-center space-x-2"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>{currentStep === 1 ? 'Cancel' : 'Previous'}</span>
          </Button>
          
          <div className="flex space-x-3">
            <Button 
              variant="outline" 
              onClick={handleSave}
              className="px-6"
            >
              Save
            </Button>
            <Button 
              onClick={handleNext}
              className="flex items-center space-x-2 px-6"
            >
              <span>{currentStep === steps.length ? 'Complete' : 'Next'}</span>
              {currentStep < steps.length && <ArrowRight className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreatePSSRWorkflow;
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, ArrowRight, CheckCircle, Circle } from 'lucide-react';
import PSSRStepOne from './PSSRStepOne';
import PSSRStepTwo from './PSSRStepTwo';
import PSSRStepThree from './PSSRStepThree';
import PSSRStepFour from './PSSRStepFour';
import PSSRStepFive from './PSSRStepFive';
import PSSRStepSix from './PSSRStepSix';
import PSSRStepSeven from './PSSRStepSeven';
import PSSRStepEight from './PSSRStepEight';

interface CreatePSSRWorkflowProps {
  onBack: () => void;
  onPSSRCreated: (pssr: any) => void;
}

interface PSSRData {
  // Step 1 data
  reason: string;
  plant?: string;
  project?: any;
  scope: string;
  supportingDocuments: File[];
  
  // Step 2 data
  checklist: string;
  selectedItems: string[];
  
  // Step 3 data
  approvers: {
    level1: any[];
    level2: any[];
    level3: any[];
  };
  
  // Additional metadata
  id?: string;
  status: string;
  createdDate: string;
  createdBy: string;
}

const CreatePSSRWorkflow: React.FC<CreatePSSRWorkflowProps> = ({ onBack, onPSSRCreated }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [pssrData, setPssrData] = useState<PSSRData>({
    reason: '',
    scope: '',
    supportingDocuments: [],
    checklist: '',
    selectedItems: [],
    approvers: {
      level1: [],
      level2: [],
      level3: []
    },
    status: 'Draft',
    createdDate: new Date().toISOString(),
    createdBy: 'Current User' // This would come from auth context
  });

  const steps = [
    { number: 1, title: 'Enter PSSR Information', description: 'Basic project and scope details' },
    { number: 2, title: 'Select Checklist Items', description: 'Choose applicable checklist items' },
    { number: 3, title: 'Review PSSR Approvers', description: 'Set up approval hierarchy' },
    { number: 4, title: 'Schedule PSSR Activities', description: 'Plan kick-off and walkdown' },
    { number: 5, title: 'Complete Checklist Items', description: 'Fill out safety review items' },
    { number: 6, title: 'Link Related PSSRs', description: 'Connect to prerequisite reviews' },
    { number: 7, title: 'Approve Checklist Items', description: 'Authority approval process' },
    { number: 8, title: 'Final PSSR Approval', description: 'Multi-tier approval workflow' }
  ];

  const progress = (currentStep / steps.length) * 100;

  const handleStepDataUpdate = (stepData: any) => {
    setPssrData(prev => ({ ...prev, ...stepData }));
  };

  const handleNextStep = () => {
    if (currentStep < steps.length) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handlePreviousStep = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleFinalizePSSR = () => {
    // Generate PSSR ID
    const pssrId = `PSSR-${new Date().getFullYear()}-${String(Date.now()).slice(-3)}`;
    
    const finalPSSR = {
      ...pssrData,
      id: pssrId,
      projectId: pssrData.project?.id || 'N/A',
      projectName: pssrData.project?.name || 'N/A',
      asset: pssrData.plant || 'N/A',
      priority: 'Medium', // Default priority
      progress: 0,
      created: new Date().toISOString().split('T')[0],
      pssrLead: pssrData.createdBy,
      pssrLeadAvatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
      teamStatus: 'green',
      pendingApprovals: 0,
      completedDate: null,
      riskLevel: 'Low',
      nextReview: null,
      teamMembers: 1,
      lastActivity: 'Created',
      location: pssrData.plant || 'N/A',
      initiator: pssrData.createdBy,
      totalItems: pssrData.selectedItems.length,
      completedItems: 0,
      approvedItems: 0
    };

    onPSSRCreated(finalPSSR);
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <PSSRStepOne
            data={pssrData}
            onDataUpdate={handleStepDataUpdate}
            onNext={handleNextStep}
            onBack={onBack}
          />
        );
      case 2:
        return (
          <PSSRStepTwo
            data={pssrData}
            onDataUpdate={handleStepDataUpdate}
            onNext={handleNextStep}
            onBack={handlePreviousStep}
          />
        );
      case 3:
        return (
          <PSSRStepThree
            data={pssrData}
            onDataUpdate={handleStepDataUpdate}
            onNext={handleNextStep}
            onBack={handlePreviousStep}
            onFinalize={handleFinalizePSSR}
          />
        );
      default:
        return (
          <div className="text-center py-12">
            <h3 className="text-lg font-semibold mb-4">Step {currentStep} - {steps[currentStep - 1]?.title}</h3>
            <p className="text-muted-foreground mb-6">This step is under development.</p>
            <div className="flex gap-4 justify-center">
              {currentStep > 1 && (
                <Button variant="outline" onClick={handlePreviousStep}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Previous
                </Button>
              )}
              {currentStep < steps.length ? (
                <Button onClick={handleNextStep}>
                  Next
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              ) : (
                <Button onClick={handleFinalizePSSR} className="bg-success hover:bg-success/90">
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Complete PSSR
                </Button>
              )}
            </div>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-secondary/20">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-7xl mx-auto px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-6">
              <Button variant="ghost" onClick={onBack} className="hover:bg-secondary/80 group">
                <ArrowLeft className="h-4 w-4 mr-3 group-hover:-translate-x-1 transition-transform duration-200" />
                <span className="font-medium">Back to Summary</span>
              </Button>
              
              <div className="h-8 w-px bg-border"></div>
              
              <div>
                <h1 className="text-2xl font-bold text-foreground">Create New PSSR</h1>
                <p className="text-sm text-muted-foreground font-medium">Step {currentStep} of {steps.length}</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <Badge variant="outline" className="px-3 py-1">
                {Math.round(progress)}% Complete
              </Badge>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mt-6">
            <Progress value={progress} className="h-2" />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Steps Sidebar */}
          <div className="lg:col-span-1">
            <Card className="sticky top-32">
              <CardHeader>
                <CardTitle className="text-lg">PSSR Creation Steps</CardTitle>
                <CardDescription>Track your progress through the process</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {steps.map((step) => (
                  <div 
                    key={step.number}
                    className={`flex items-start gap-3 p-3 rounded-lg transition-colors ${
                      currentStep === step.number 
                        ? 'bg-primary/10 border border-primary/20' 
                        : currentStep > step.number 
                          ? 'bg-success/10 border border-success/20' 
                          : 'bg-muted/20'
                    }`}
                  >
                    <div className="flex-shrink-0 mt-0.5">
                      {currentStep > step.number ? (
                        <CheckCircle className="h-5 w-5 text-success" />
                      ) : (
                        <Circle className={`h-5 w-5 ${
                          currentStep === step.number ? 'text-primary' : 'text-muted-foreground'
                        }`} />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={`text-sm font-medium ${
                        currentStep === step.number 
                          ? 'text-primary' 
                          : currentStep > step.number 
                            ? 'text-success' 
                            : 'text-muted-foreground'
                      }`}>
                        {step.title}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {step.description}
                      </p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {renderStepContent()}
          </div>
        </div>
      </main>
    </div>
  );
};

export default CreatePSSRWorkflow;
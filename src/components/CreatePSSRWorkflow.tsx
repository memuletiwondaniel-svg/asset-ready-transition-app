import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, ArrowRight, CheckCircle2 } from 'lucide-react';
import PSSRStepOne from './PSSRStepOne';
import PSSRStepTwo from './PSSRStepTwo';
import PSSRStepThree from './PSSRStepThree';
import PSSRStepFour from './PSSRStepFour';
import PSSRStepSix from './PSSRStepSix';
interface CreatePSSRWorkflowProps {
  onBack: () => void;
  onComplete?: () => void;
}
interface PSSRData {
  // Compatible with existing FormData structure
  asset?: string;
  reason?: string;
  reasonSubOption?: string;
  tieInScopes?: string[];
  mocNumber?: string;
  mocScope?: string;
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
const CreatePSSRWorkflow: React.FC<CreatePSSRWorkflowProps> = ({
  onBack,
  onComplete
}) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [pssrData, setPssrData] = useState<PSSRData>({});
  const [pssrId, setPssrId] = useState<string | null>(null);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const steps = [{
    number: 1,
    title: 'Enter PSSR Information',
    description: 'Basic PSSR details and scope'
  }, {
    number: 2,
    title: 'Select Checklist Items',
    description: 'Choose applicable checklist items'
  }, {
    number: 3,
    title: 'Review PSSR Approvers',
    description: 'Configure approval workflow'
  }, {
    number: 4,
    title: 'Link a PSSR',
    description: 'Connect related PSSRs'
  }, {
    number: 5,
    title: 'Schedule PSSR Activity',
    description: 'Plan kick-off and walkdown events'
  }];
  const checkStepCompletion = (step: number): boolean => {
    switch (step) {
      case 1:
        return !!(pssrData.reason && pssrData.plant && pssrData.projectId && pssrData.projectName && pssrData.asset);
      case 2:
        return !!(pssrData.checklistItems && pssrData.checklistItems.length > 0);
      case 3:
        return !!(pssrData.approvers && pssrData.approvers.length > 0);
      case 4:
        return true;
      // Optional step
      case 5:
        return !!(pssrData.scheduledActivities && pssrData.scheduledActivities.length > 0);
      default:
        return false;
    }
  };
  const handleNext = () => {
    if (checkStepCompletion(currentStep)) {
      setCompletedSteps(prev => new Set([...prev, currentStep]));
    }
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
    setPssrData(prev => ({
      ...prev,
      ...stepData
    }));
  };

  // Adapter to match PSSRStepOne's setFormData signature
  const setFormDataAdapter: React.Dispatch<React.SetStateAction<any>> = updater => {
    setPssrData(prev => {
      const current = {
        asset: prev.asset || '',
        reason: prev.reason || '',
        projectId: prev.projectId || '',
        projectName: prev.projectName || '',
        scope: prev.scope || '',
        files: prev.files || [],
        teamMembers: prev.teamMembers || {
          technicalAuthorities: {},
          assetTeam: {},
          projectTeam: {},
          hsse: {}
        }
      };
      const next = typeof updater === 'function' ? (updater as any)(current) : updater;
      return {
        ...prev,
        ...next
      };
    });
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
    console.log('Saving PSSR data:', {
      id: pssrId,
      ...pssrData
    });
    onBack(); // Return to summary page
  };
  const progressPercentage = currentStep / steps.length * 100;
  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return <PSSRStepOne formData={{
          asset: pssrData.asset || '',
          reason: pssrData.reason || '',
          reasonSubOption: pssrData.reasonSubOption || '',
          tieInScopes: pssrData.tieInScopes || [],
          mocNumber: pssrData.mocNumber || '',
          mocScope: pssrData.mocScope || '',
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
        }} setFormData={setFormDataAdapter} projects={[]} setProjects={() => {}} assets={['Umm Qasr (UQ)', 'KAZ', 'NRNGL', 'BNGL', 'Compression Station (CS)']} reasons={['Start-up or Commissioning of a new Asset', 'Restart following significant modification to existing Hardware, Safeguarding or Operating Philosophy', 'Restart following a process safety incident', 'Restart following a Turn Around (TAR) Event or Major Maintenance Activity', 'Others (Specify)']} projectSearchOpen={false} setProjectSearchOpen={() => {}} showAddProjectWidget={false} setShowAddProjectWidget={() => {}} onProjectSelect={() => {}} onFileUpload={e => {
          const files = Array.from(e.target.files || []);
          setPssrData(prev => ({
            ...prev,
            files: [...(prev.files || []), ...files]
          }));
        }} onRemoveFile={index => {
          setPssrData(prev => ({
            ...prev,
            files: (prev.files || []).filter((_, i) => i !== index)
          }));
        }} onContextAction={() => {}} />;
      case 2:
        return <PSSRStepTwo formData={{
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
        }} onBack={handleBack} onContinueToChecklist={handleNext} />;
      case 3:
        return <PSSRStepThree data={pssrData} onDataUpdate={handleDataUpdate} onNext={handleNext} onBack={handleBack} onSave={handleSave} />;
      case 4:
        return <PSSRStepSix data={pssrData} onDataUpdate={handleDataUpdate} onNext={handleNext} onBack={handleBack} onSave={handleSave} currentPssrId={pssrId} />;
      case 5:
        return <PSSRStepFour data={pssrData} onDataUpdate={handleDataUpdate} onNext={handleNext} onBack={handleBack} onSave={handleSave} />;
      default:
        return <div className="text-center py-8">
            <p className="text-lg font-medium text-gray-600">
              Step {currentStep} implementation coming soon...
            </p>
            <p className="text-sm text-gray-500 mt-2">
              This step will be available in the next update.
            </p>
          </div>;
    }
  };
  return <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
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
                
                
              </div>
            </div>
            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
              {Math.round(progressPercentage)}% Complete
            </Badge>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Modern Progress Bar - Sticky */}
        <Card className="mb-6 bg-card/60 backdrop-blur-sm border-border/40 sticky top-4 z-10">
          <CardContent className="p-8">
            <div className="space-y-6">
              {/* Header */}
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                    PSSR Creation Progress
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    {completedSteps.size} of {steps.length} steps completed
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-4xl font-bold text-primary">{Math.round(progressPercentage)}%</div>
                  <p className="text-xs text-muted-foreground">Complete</p>
                </div>
              </div>
              
              {/* Progress Bar */}
              <div className="relative">
                <Progress value={progressPercentage} className="h-4" />
              </div>
              
              {/* Step indicators - Modern clickable cards */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                {steps.map(step => {
                const isComplete = completedSteps.has(step.number);
                const isCurrent = step.number === currentStep;
                return <button key={step.number} onClick={() => setCurrentStep(step.number)} className={`relative group text-center p-4 rounded-xl border-2 transition-all duration-300 hover:scale-105 hover:shadow-lg ${isComplete ? 'bg-primary/10 border-primary text-primary shadow-md' : isCurrent ? 'bg-gradient-to-br from-blue-500/20 via-purple-500/15 to-indigo-500/20 border-blue-500 shadow-lg ring-2 ring-blue-400/30' : 'bg-background/40 border-border/40 text-muted-foreground hover:border-primary/30'}`}>
                      {/* Step Number/Icon */}
                      <div className={`flex items-center justify-center mx-auto w-10 h-10 rounded-full mb-2 transition-all ${isComplete ? 'bg-primary text-primary-foreground' : isCurrent ? 'bg-gradient-to-br from-blue-500 via-purple-500 to-indigo-600 text-white font-bold shadow-md' : 'bg-muted/50 text-muted-foreground'}`}>
                        {isComplete ? <CheckCircle2 className="h-5 w-5" /> : <span className="text-sm font-bold">{step.number}</span>}
                      </div>
                      
                      {/* Step Title - without step number */}
                      <p className={`text-xs font-semibold leading-tight line-clamp-2 ${isCurrent ? 'text-blue-700 dark:text-blue-400' : ''}`}>
                        {step.title}
                      </p>
                      
                      {/* Current Indicator */}
                      {isCurrent && <>
                          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-gradient-to-r from-blue-500 via-purple-500 to-indigo-500 animate-pulse shadow-md" />
                          <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-blue-500/5 via-purple-500/5 to-indigo-500/5 animate-pulse pointer-events-none" />
                        </>}
                    </button>;
              })}
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
          <Button variant="outline" onClick={handleBack} className="flex items-center space-x-2">
            <ArrowLeft className="h-4 w-4" />
            <span>{currentStep === 1 ? 'Cancel' : 'Previous'}</span>
          </Button>
          
          <div className="flex space-x-3">
            <Button variant="outline" onClick={handleSave} className="px-6">
              Save
            </Button>
            <Button onClick={handleNext} className="flex items-center space-x-2 px-6">
              <span>{currentStep === steps.length ? 'Complete' : 'Next'}</span>
              {currentStep < steps.length && <ArrowRight className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </div>
    </div>;
};
export default CreatePSSRWorkflow;
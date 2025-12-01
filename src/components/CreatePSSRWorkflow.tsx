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
import { useProjects } from '@/hooks/useProjects';
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
  
  // Fetch projects from database
  const { projects: dbProjects, isLoading: isLoadingProjects } = useProjects();
  
  // Map projects to expected format - include full project data
  const projects = React.useMemo(() => 
    dbProjects?.map(p => ({
      id: p.id,
      name: `${p.project_id_prefix}${p.project_id_number} - ${p.project_title}`,
      plant: p.plant_name || '',
      subdivision: p.station_name || '',
      scope: p.project_scope || '',
      hubLead: { name: 'Hub Lead', email: '', avatar: '', status: 'green' as const },
      others: [],
      rawData: p // Store full project data for fetching related info
    })) || [], 
  [dbProjects]);
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
        }} setFormData={setFormDataAdapter} projects={projects} assets={['Umm Qasr (UQ)', 'KAZ', 'NRNGL', 'BNGL', 'Compression Station (CS)']} reasons={['Start-up or Commissioning of a new Asset', 'Restart following significant modification to existing Hardware, Safeguarding or Operating Philosophy', 'Restart following a process safety incident', 'Restart following a Turn Around (TAR) Event or Major Maintenance Activity', 'Others (Specify)']} projectSearchOpen={false} setProjectSearchOpen={() => {}} showAddProjectWidget={false} setShowAddProjectWidget={() => {}} onProjectSelect={(projectId) => {
          const selectedProject = projects.find(p => p.id === projectId);
          if (selectedProject) {
            setPssrData(prev => ({
              ...prev,
              projectId: selectedProject.id,
              projectName: selectedProject.name,
              asset: selectedProject.plant || prev.asset
            }));
          }
        }} onFileUpload={e => {
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
        }} onContextAction={() => {}} onNewProjectCreate={() => {}} />;
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
          <CardContent className="p-4">
            <div className="space-y-3">
              {/* Compact Header - Single Row */}
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">
                  Step {currentStep} of {steps.length}
                </span>
                <div className="flex items-center gap-2">
                  <Progress value={progressPercentage} className="h-2 w-32" />
                  <span className="text-sm font-semibold text-primary">
                    {Math.round(progressPercentage)}%
                  </span>
                </div>
              </div>
              
              {/* Compact Step Indicators - Horizontal Line */}
              <div className="flex items-center justify-between">
                {steps.map((step, index) => {
                  const isComplete = completedSteps.has(step.number);
                  const isCurrent = step.number === currentStep;
                  
                  return (
                    <React.Fragment key={step.number}>
                      <button
                        onClick={() => setCurrentStep(step.number)}
                        className="flex flex-col items-center gap-1"
                      >
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium transition-all ${
                          isComplete 
                            ? 'bg-primary text-primary-foreground' 
                            : isCurrent 
                              ? 'bg-primary text-primary-foreground ring-2 ring-primary/30' 
                              : 'bg-muted text-muted-foreground'
                        }`}>
                          {isComplete ? <CheckCircle2 className="h-4 w-4" /> : step.number}
                        </div>
                        <span className={`text-[10px] font-medium max-w-16 text-center leading-tight ${
                          isCurrent ? 'text-primary' : 'text-muted-foreground'
                        }`}>
                          {step.title.replace('Enter ', '').replace('PSSR ', '')}
                        </span>
                      </button>
                      
                      {/* Connecting line */}
                      {index < steps.length - 1 && (
                        <div className={`flex-1 h-0.5 mx-2 ${
                          completedSteps.has(step.number) ? 'bg-primary' : 'bg-muted'
                        }`} />
                      )}
                    </React.Fragment>
                  );
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
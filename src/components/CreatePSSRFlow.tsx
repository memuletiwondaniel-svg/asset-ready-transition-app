import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Save, CheckCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import PSSRChecklist from './PSSRChecklist';
import AddNewProjectWidget from './AddNewProjectWidget';
import ProgressSteps from './ProgressSteps';
import PSSRStepOne from './PSSRStepOne';
import PSSRStepTwo from './PSSRStepTwo';
import PSSRFlowNavigation from './PSSRFlowNavigation';
import { useProjectsData } from '@/hooks/useProjectsData';
import { usePSSRFormData } from '@/hooks/usePSSRFormData';
import { ASSETS, REASONS } from '@/constants/pssrConstants';
import { handleContextAction } from '@/utils/contextActions';

interface CreatePSSRFlowProps {
  onBack: () => void;
}

const CreatePSSRFlow: React.FC<CreatePSSRFlowProps> = ({ onBack }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showAddProjectWidget, setShowAddProjectWidget] = useState(false);
  const [projectSearchOpen, setProjectSearchOpen] = useState(false);
  
  const { projects, setProjects, handleNewProjectAdded } = useProjectsData();
  const { formData, setFormData, handleFileUpload, removeFile } = usePSSRFormData();

  const handleContinue = () => {
    setShowConfirmDialog(true);
  };

  const handleConfirm = () => {
    setCurrentStep(2);
    setShowConfirmDialog(false);
  };

  const handleProjectSelect = (value: string) => {
    if (value === 'add-new') {
      setShowAddProjectWidget(true);
      setProjectSearchOpen(false);
    } else {
      const selectedProject = projects.find(p => p.id === value);
      setFormData(prev => ({
        ...prev,
        projectId: value,
        projectName: selectedProject?.name || ''
      }));
      setProjectSearchOpen(false);
    }
  };

  const handleNewProjectCreate = (projectData: any) => {
    console.log('New project data received:', projectData);
    
    const newProject = handleNewProjectAdded(projectData);
    
    // Set the form data to use this new project
    setFormData(prev => ({
      ...prev,
      projectId: projectData.projectId,
      projectName: projectData.projectTitle
    }));
    
    setShowAddProjectWidget(false);
  };

  const canContinue = formData.reason && formData.scope && 
    (formData.reason === 'Start-up or Commissioning of a new Asset' || formData.asset);

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <PSSRStepOne
            formData={formData}
            setFormData={setFormData}
            projects={projects}
            setProjects={setProjects}
            assets={ASSETS}
            reasons={REASONS}
            projectSearchOpen={projectSearchOpen}
            setProjectSearchOpen={setProjectSearchOpen}
            showAddProjectWidget={showAddProjectWidget}
            setShowAddProjectWidget={setShowAddProjectWidget}
            onProjectSelect={handleProjectSelect}
            onFileUpload={handleFileUpload}
            onRemoveFile={removeFile}
            onContextAction={handleContextAction}
          />
        );

      case 2:
        return (
          <PSSRStepTwo
            formData={formData}
            onBack={onBack}
            onContinueToChecklist={() => setCurrentStep(3)}
          />
        );

      case 3:
        return <PSSRChecklist />;

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <header className="bg-white/80 backdrop-blur-lg shadow-sm border-b border-gray-200/50 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Button variant="ghost" onClick={onBack} className="hover:bg-gray-100">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to PSSR List
              </Button>
              <div className="h-6 w-px bg-gray-300"></div>
              <h1 className="text-xl font-bold text-gray-900">
                {currentStep === 1 ? "Create New PSSR" : currentStep === 2 ? "PSSR Created" : "PSSR Checklist"}
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <Button variant="outline" className="border-gray-300 hover:bg-gray-50">
                <Save className="h-4 w-4 mr-2" />
                Save Draft
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <ProgressSteps currentStep={currentStep} />
        {renderStepContent()}

        <PSSRFlowNavigation
          currentStep={currentStep}
          onBack={onBack}
          onContinue={handleContinue}
          canContinue={canContinue}
        />
      </main>

      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="mx-auto mb-4 p-3 bg-blue-100 rounded-full w-fit">
              <CheckCircle className="h-8 w-8 text-blue-600" />
            </div>
            <DialogTitle className="text-center text-xl">Create PSSR</DialogTitle>
            <DialogDescription className="text-center text-gray-600">
              Are you ready to create this PSSR? Once created, a unique ID will be generated and you can proceed to complete the checklist.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-center space-x-3 mt-6">
            <Button 
              variant="outline" 
              onClick={() => setShowConfirmDialog(false)}
              className="px-6"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleConfirm}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6"
            >
              Continue
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AddNewProjectWidget
        open={showAddProjectWidget}
        onClose={() => setShowAddProjectWidget(false)}
        onSubmit={handleNewProjectCreate}
      />
    </div>
  );
};

export default CreatePSSRFlow;

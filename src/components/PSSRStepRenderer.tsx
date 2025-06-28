
import React from 'react';
import PSSRStepOne from './PSSRStepOne';
import PSSRStepTwo from './PSSRStepTwo';
import PSSRChecklist from './PSSRChecklist';
import { PSSRData } from '@/hooks/usePSSRFormData';

interface Project {
  id: string;
  name: string;
  plant: string;
  subdivision?: string;
  scope: string;
  hubLead: any;
  others: any[];
}

interface PSSRStepRendererProps {
  currentStep: number;
  formData: PSSRData;
  updateFormData: (updates: Partial<PSSRData>) => void;
  handleFileUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  removeFile: (index: number) => void;
  onReturnToList: () => void;
  onContinueToChecklist: () => void;
  onComplete: () => void;
  projects: Project[];
  onNewProjectAdded: (projectData: any) => Project;
  onProjectUpdate: (project: Project) => void;
  onProjectDelete: (projectId: string) => void;
}

const PSSRStepRenderer: React.FC<PSSRStepRendererProps> = ({
  currentStep,
  formData,
  updateFormData,
  handleFileUpload,
  removeFile,
  onReturnToList,
  onContinueToChecklist,
  onComplete,
  projects,
  onNewProjectAdded,
  onProjectUpdate,
  onProjectDelete
}) => {
  switch (currentStep) {
    case 1:
      return (
        <PSSRStepOne 
          formData={formData} 
          setFormData={updateFormData}
          onFileUpload={handleFileUpload}
          onRemoveFile={removeFile}
          projects={projects}
          onNewProjectAdded={onNewProjectAdded}
          onProjectUpdate={onProjectUpdate}
          onProjectDelete={onProjectDelete}
        />
      );
    case 2:
      return (
        <PSSRStepTwo 
          formData={formData} 
          onBack={onReturnToList}
          onContinueToChecklist={onContinueToChecklist}
        />
      );
    case 3:
      return (
        <PSSRChecklist 
          onSaveDraft={onComplete}
        />
      );
    default:
      return null;
  }
};

export default PSSRStepRenderer;

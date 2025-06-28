
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import PSSRStepRenderer from './PSSRStepRenderer';
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

interface CreatePSSRFlowContentProps {
  currentStep: number;
  formData: PSSRData;
  updateFormData: (updates: Partial<PSSRData>) => void;
  handleFileUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  removeFile: (index: number) => void;
  onReturnToList: () => void;
  onContinueToChecklist: () => void;
  onComplete: () => void;
  getStepTitle: () => string;
  getStepDescription: () => string;
  projects: Project[];
  onNewProjectAdded: (projectData: any) => Project;
  onProjectUpdate: (project: Project) => void;
  onProjectDelete: (projectId: string) => void;
}

const CreatePSSRFlowContent: React.FC<CreatePSSRFlowContentProps> = ({
  currentStep,
  formData,
  updateFormData,
  handleFileUpload,
  removeFile,
  onReturnToList,
  onContinueToChecklist,
  onComplete,
  getStepTitle,
  getStepDescription,
  projects,
  onNewProjectAdded,
  onProjectUpdate,
  onProjectDelete
}) => {
  return (
    <div className="flex-1 flex flex-col min-h-0">
      {currentStep < 3 ? (
        <ScrollArea className="flex-1">
          <div className="p-6">
            <Card>
              <CardHeader>
                <CardTitle>{getStepTitle()}</CardTitle>
                <CardDescription>{getStepDescription()}</CardDescription>
              </CardHeader>
              <CardContent>
                <PSSRStepRenderer
                  currentStep={currentStep}
                  formData={formData}
                  updateFormData={updateFormData}
                  handleFileUpload={handleFileUpload}
                  removeFile={removeFile}
                  onReturnToList={onReturnToList}
                  onContinueToChecklist={onContinueToChecklist}
                  onComplete={onComplete}
                  projects={projects}
                  onNewProjectAdded={onNewProjectAdded}
                  onProjectUpdate={onProjectUpdate}
                  onProjectDelete={onProjectDelete}
                />
              </CardContent>
            </Card>
          </div>
        </ScrollArea>
      ) : (
        <ScrollArea className="flex-1">
          <PSSRStepRenderer
            currentStep={currentStep}
            formData={formData}
            updateFormData={updateFormData}
            handleFileUpload={handleFileUpload}
            removeFile={removeFile}
            onReturnToList={onReturnToList}
            onContinueToChecklist={onContinueToChecklist}
            onComplete={onComplete}
            projects={projects}
            onNewProjectAdded={onNewProjectAdded}
            onProjectUpdate={onProjectUpdate}
            onProjectDelete={onProjectDelete}
          />
        </ScrollArea>
      )}
    </div>
  );
};

export default CreatePSSRFlowContent;

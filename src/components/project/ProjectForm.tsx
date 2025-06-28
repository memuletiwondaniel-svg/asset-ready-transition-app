
import React from 'react';
import { ProjectInformationSection } from './ProjectInformationSection';
import { TeamMembersSection } from './TeamMembersSection';
import { ProjectDocumentsSection } from './ProjectDocumentsSection';

interface ProjectFormProps {
  formData: any;
  setFormData: React.Dispatch<React.SetStateAction<any>>;
  documentFilters: any;
  setDocumentFilters: React.Dispatch<React.SetStateAction<any>>;
  onSubmit: (e: React.FormEvent) => void;
}

export const ProjectForm: React.FC<ProjectFormProps> = ({
  formData,
  setFormData,
  documentFilters,
  setDocumentFilters,
  onSubmit
}) => {
  return (
    <div className="p-6 space-y-6">
      <form onSubmit={onSubmit} className="space-y-6">
        <ProjectInformationSection formData={formData} setFormData={setFormData} />
        <TeamMembersSection formData={formData} setFormData={setFormData} />
        <ProjectDocumentsSection 
          formData={formData} 
          setFormData={setFormData}
          documentFilters={documentFilters}
          setDocumentFilters={setDocumentFilters}
        />
      </form>
    </div>
  );
};

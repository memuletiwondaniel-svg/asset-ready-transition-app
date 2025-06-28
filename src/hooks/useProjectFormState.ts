
import { useState, useEffect } from 'react';

interface TeamMember {
  name: string;
  email: string;
}

interface AdditionalPerson {
  name: string;
  email: string;
  role: string;
}

interface DocumentFilter {
  project: string;
  originator: string;
  plant: string;
  site: string;
  unit: string;
  discipline: string;
  docType: string;
  sequence: string;
}

interface ProjectFormData {
  projectId: string;
  projectTitle: string;
  projectScope: string;
  projectMilestone: string;
  milestoneDate: undefined | Date;
  plant: string;
  csLocation: string;
  scorecardProject: string;
  projectHubLead: TeamMember;
  commissioningLead: TeamMember;
  constructionLead: TeamMember;
  additionalPersons: AdditionalPerson[];
  supportingDocs: File[];
}

export const useProjectFormState = (editMode: boolean, existingProject: any, open: boolean) => {
  const [formData, setFormData] = useState<ProjectFormData>({
    projectId: '',
    projectTitle: '',
    projectScope: '',
    projectMilestone: '',
    milestoneDate: undefined,
    plant: '',
    csLocation: '',
    scorecardProject: '',
    projectHubLead: { name: '', email: '' },
    commissioningLead: { name: '', email: '' },
    constructionLead: { name: '', email: '' },
    additionalPersons: [],
    supportingDocs: []
  });

  const [documentFilters, setDocumentFilters] = useState<DocumentFilter>({
    project: '',
    originator: '',
    plant: '',
    site: '',
    unit: '',
    discipline: '',
    docType: '',
    sequence: ''
  });

  // Initialize form data when in edit mode
  useEffect(() => {
    if (editMode && existingProject) {
      setFormData(existingProject);
    } else if (!editMode) {
      // Reset form for new project
      setFormData({
        projectId: '',
        projectTitle: '',
        projectScope: '',
        projectMilestone: '',
        milestoneDate: undefined,
        plant: '',
        csLocation: '',
        scorecardProject: '',
        projectHubLead: { name: '', email: '' },
        commissioningLead: { name: '', email: '' },
        constructionLead: { name: '', email: '' },
        additionalPersons: [],
        supportingDocs: []
      });
    }
  }, [editMode, existingProject, open]);

  const resetForm = () => {
    setFormData({
      projectId: '',
      projectTitle: '',
      projectScope: '',
      projectMilestone: '',
      milestoneDate: undefined,
      plant: '',
      csLocation: '',
      scorecardProject: '',
      projectHubLead: { name: '', email: '' },
      commissioningLead: { name: '', email: '' },
      constructionLead: { name: '', email: '' },
      additionalPersons: [],
      supportingDocs: []
    });
  };

  return {
    formData,
    setFormData,
    documentFilters,
    setDocumentFilters,
    resetForm
  };
};

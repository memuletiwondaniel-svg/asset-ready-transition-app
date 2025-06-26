
import { useState } from 'react';

export interface PSSRData {
  assetName: string;
  asset: string;
  reason: string;
  projectId: string;
  projectName: string;
  scope: string;
  files: File[];
  coreTeam: {
    projectManager: {
      name: string;
      email: string;
    };
  };
  projectHubLead?: {
    name: string;
    email: string;
  };
  commissioningLead?: {
    name: string;
    email: string;
  };
  constructionLead?: {
    name: string;
    email: string;
  };
  additionalPersons?: Array<{
    name: string;
    email: string;
    role: string;
  }>;
  teamMembers: {
    technicalAuthorities: {};
    assetTeam: {};
    projectTeam: {};
    hsse: {};
  };
}

export const usePSSRFormData = () => {
  const [formData, setFormData] = useState<PSSRData>({
    assetName: '',
    asset: '',
    reason: '',
    projectId: '',
    projectName: '',
    scope: '',
    files: [] as File[],
    coreTeam: {
      projectManager: {
        name: '',
        email: ''
      }
    },
    teamMembers: {
      technicalAuthorities: {},
      assetTeam: {},
      projectTeam: {},
      hsse: {}
    }
  });

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

  const updateFormData = (updates: Partial<PSSRData>) => {
    setFormData(prev => ({ ...prev, ...updates }));
  };

  const resetFormData = () => {
    setFormData({
      assetName: '',
      asset: '',
      reason: '',
      projectId: '',
      projectName: '',
      scope: '',
      files: [],
      coreTeam: {
        projectManager: {
          name: '',
          email: ''
        }
      },
      teamMembers: {
        technicalAuthorities: {},
        assetTeam: {},
        projectTeam: {},
        hsse: {}
      }
    });
  };

  return {
    formData,
    setFormData,
    handleFileUpload,
    removeFile,
    updateFormData,
    resetFormData
  };
};

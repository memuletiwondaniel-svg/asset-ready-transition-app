
import { useState } from 'react';

export interface PSSRFormData {
  asset: string;
  reason: string;
  projectId: string;
  projectName: string;
  scope: string;
  files: File[];
  teamMembers: {
    technicalAuthorities: {};
    assetTeam: {};
    projectTeam: {};
    hsse: {};
  };
}

export const usePSSRFormData = () => {
  const [formData, setFormData] = useState<PSSRFormData>({
    asset: '',
    reason: '',
    projectId: '',
    projectName: '',
    scope: '',
    files: [] as File[],
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

  const updateFormData = (updates: Partial<PSSRFormData>) => {
    setFormData(prev => ({ ...prev, ...updates }));
  };

  return {
    formData,
    setFormData,
    handleFileUpload,
    removeFile,
    updateFormData
  };
};

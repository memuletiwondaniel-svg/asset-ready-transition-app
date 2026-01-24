import React from 'react';
import { P2AHandoverWorkspace } from '@/components/p2a-workspace/P2AHandoverWorkspace';

interface ORAHandoverTabProps {
  oraPlanId: string;
  projectName?: string;
  projectNumber?: string;
}

export const ORAHandoverTab: React.FC<ORAHandoverTabProps> = ({ 
  oraPlanId,
  projectName,
  projectNumber,
}) => {
  return (
    <P2AHandoverWorkspace 
      oraPlanId={oraPlanId}
      projectName={projectName}
      projectNumber={projectNumber}
    />
  );
};

import React from 'react';
import { ProjectMilestonesSection } from '../ProjectMilestonesSection';
import { EnhancedProjectDocumentsSection } from '../EnhancedProjectDocumentsSection';

interface Milestone {
  id: string;
  milestone_name: string;
  milestone_date: string;
  is_scorecard_project: boolean;
  milestone_type_id?: string;
}

interface Document {
  id: string;
  document_name: string;
  document_type: string;
  file_path?: string;
  link_url?: string;
  link_type?: string;
  file_extension?: string;
  file_size?: number;
}

interface WizardStepMilestonesDocumentsProps {
  milestones: Milestone[];
  setMilestones: React.Dispatch<React.SetStateAction<Milestone[]>>;
  documents: Document[];
  setDocuments: React.Dispatch<React.SetStateAction<Document[]>>;
}

const WizardStepMilestonesDocuments: React.FC<WizardStepMilestonesDocumentsProps> = ({
  milestones,
  setMilestones,
  documents,
  setDocuments,
}) => {
  return (
    <div className="space-y-8">
      <ProjectMilestonesSection
        milestones={milestones}
        setMilestones={setMilestones}
      />

      <EnhancedProjectDocumentsSection
        documents={documents}
        setDocuments={setDocuments}
      />
    </div>
  );
};

export default WizardStepMilestonesDocuments;

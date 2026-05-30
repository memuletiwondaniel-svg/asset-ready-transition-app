import React from 'react';
import { Lightbulb } from 'lucide-react';
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
    <div className="space-y-5">
      <div>
        <h3 className="text-lg font-medium mb-1">Milestones & Documents</h3>
        <p className="text-xs text-muted-foreground flex items-start gap-1.5">
          <Lightbulb className="h-3.5 w-3.5 mt-0.5 shrink-0 text-amber-500 fill-amber-100 dark:fill-amber-900/40" />
          <span>Add project milestones and attach relevant documents or links.</span>
        </p>
      </div>

      <div className="space-y-6">
        <ProjectMilestonesSection
          milestones={milestones}
          setMilestones={setMilestones}
        />

        <EnhancedProjectDocumentsSection
          documents={documents}
          setDocuments={setDocuments}
        />
      </div>
    </div>
  );
};

export default WizardStepMilestonesDocuments;

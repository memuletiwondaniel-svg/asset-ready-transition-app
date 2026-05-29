import React from 'react';
import RichTextEditor, { Attachment } from '@/components/ui/RichTextEditor';

interface WizardStepProjectScopeProps {
  scopeDescription: string;
  scopeAttachments: Attachment[];
  onScopeChange: (value: string) => void;
  onAttachmentsChange: (attachments: Attachment[]) => void;
}

const WizardStepProjectScope: React.FC<WizardStepProjectScopeProps> = ({
  scopeDescription,
  scopeAttachments,
  onScopeChange,
  onAttachmentsChange,
}) => {
  return (
    <div className="space-y-3">
      <h3 className="text-lg font-medium">
        Project Scope <span className="text-destructive">*</span>
      </h3>

      <RichTextEditor
        value={scopeDescription}
        onChange={onScopeChange}
        attachments={scopeAttachments}
        onAttachmentsChange={onAttachmentsChange}
        placeholder="Describe the scope of the project. Format text, paste images, or attach supporting documents."
        storageBucket="project-attachments"
        storagePath="scope"
      />
    </div>
  );
};

export default WizardStepProjectScope;

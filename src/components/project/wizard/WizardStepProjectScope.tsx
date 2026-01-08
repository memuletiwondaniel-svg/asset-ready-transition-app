import React from 'react';
import { Label } from '@/components/ui/label';
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
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium mb-1">Project Scope</h3>
        <p className="text-sm text-muted-foreground">
          Describe the scope of the project. You can add text formatting, paste images directly, 
          and attach supporting documents.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="scope">Scope Description</Label>
        <RichTextEditor
          value={scopeDescription}
          onChange={onScopeChange}
          attachments={scopeAttachments}
          onAttachmentsChange={onAttachmentsChange}
          placeholder="Describe the project scope... You can paste images and attach files."
          storageBucket="project-attachments"
          storagePath="scope"
        />
      </div>
    </div>
  );
};

export default WizardStepProjectScope;

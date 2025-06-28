
import React from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus } from 'lucide-react';
import { useProjectFormState } from '@/hooks/useProjectFormState';
import { ProjectForm } from './project/ProjectForm';
import { ProjectFormActions } from './project/ProjectFormActions';
import { ScrollIndicator } from './project/ScrollIndicator';

interface AddNewProjectWidgetProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (projectData: any) => void;
  editMode?: boolean;
  existingProject?: any;
}

const AddNewProjectWidget: React.FC<AddNewProjectWidgetProps> = ({ 
  open, 
  onClose, 
  onSubmit, 
  editMode = false, 
  existingProject 
}) => {
  const {
    formData,
    setFormData,
    documentFilters,
    setDocumentFilters,
    resetForm
  } = useProjectFormState(editMode, existingProject, open);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
    if (!editMode) {
      resetForm();
    }
  };

  const handleFormSubmit = () => {
    onSubmit(formData);
    if (!editMode) {
      resetForm();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl h-[90vh] p-0 bg-gradient-to-br from-slate-50 to-blue-50/30 flex flex-col">
        <DialogHeader className="px-6 py-4 border-b border-slate-200 bg-white/95 backdrop-blur-sm flex-shrink-0">
          <DialogTitle className="text-xl font-semibold text-gray-900 flex items-center gap-3">
            <div className="p-2 bg-blue-500 rounded-lg shadow-sm">
              <Plus className="h-5 w-5 text-white" />
            </div>
            {editMode ? 'Edit Project' : 'Create New Project'}
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 min-h-0">
          <ScrollArea className="h-full">
            <ProjectForm
              formData={formData}
              setFormData={setFormData}
              documentFilters={documentFilters}
              setDocumentFilters={setDocumentFilters}
              onSubmit={handleSubmit}
            />
          </ScrollArea>

          <ScrollIndicator open={open} />
        </div>

        <ProjectFormActions
          editMode={editMode}
          onCancel={onClose}
          onSubmit={handleFormSubmit}
        />
      </DialogContent>
    </Dialog>
  );
};

export default AddNewProjectWidget;

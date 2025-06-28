
import React from 'react';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

interface ProjectFormActionsProps {
  editMode: boolean;
  onCancel: () => void;
  onSubmit: () => void;
}

export const ProjectFormActions: React.FC<ProjectFormActionsProps> = ({
  editMode,
  onCancel,
  onSubmit
}) => {
  return (
    <div className="flex justify-end space-x-3 p-6 border-t border-slate-200 bg-white/95 backdrop-blur-sm flex-shrink-0">
      <Button 
        type="button" 
        variant="outline" 
        onClick={onCancel} 
        className="px-6 py-2 border-gray-300 text-gray-700 hover:bg-gray-50"
      >
        Cancel
      </Button>
      <Button 
        onClick={onSubmit}
        className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-6 py-2 shadow-lg"
      >
        <Plus className="h-4 w-4 mr-2" />
        {editMode ? 'Update Project' : 'Create Project'}
      </Button>
    </div>
  );
};

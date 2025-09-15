import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileText, Calendar, Users, Image, MapPin, Building } from 'lucide-react';

interface ViewProjectModalProps {
  open: boolean;
  onClose: () => void;
  project: any;
  plantName?: string;
  stationName?: string;
  hubName?: string;
}

export const ViewProjectModal: React.FC<ViewProjectModalProps> = ({ 
  open, 
  onClose, 
  project,
  plantName,
  stationName,
  hubName
}) => {
  if (!project) return null;

  const getProjectId = () => {
    return `${project.project_id_prefix}${project.project_id_number}`;
  };

  return (
    <Dialog open={open} onOpenChange={onClose} modal={true}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Project Details
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center text-lg">
                <FileText className="h-5 w-5 mr-2" />
                Project Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <span className="text-sm font-medium text-gray-500">Project ID</span>
                  <Badge variant="outline" className="bg-blue-100/80 text-blue-700 border-blue-200/60">
                    {getProjectId()}
                  </Badge>
                </div>
                <div className="space-y-2">
                  <span className="text-sm font-medium text-gray-500">Status</span>
                  <Badge variant="outline" className="bg-green-100/80 text-green-700 border-green-200/60">
                    Active
                  </Badge>
                </div>
              </div>

              <div className="space-y-2">
                <span className="text-sm font-medium text-gray-500">Project Title</span>
                <p className="text-gray-900 font-medium">{project.project_title}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <span className="text-sm font-medium text-gray-500">Plant</span>
                  <div className="flex items-center">
                    <Building className="h-4 w-4 mr-2 text-gray-400" />
                    <span className="text-gray-700">{plantName || 'Not assigned'}</span>
                  </div>
                </div>
                {stationName && (
                  <div className="space-y-2">
                    <span className="text-sm font-medium text-gray-500">Station</span>
                    <div className="flex items-center">
                      <MapPin className="h-4 w-4 mr-2 text-gray-400" />
                      <span className="text-gray-700">{stationName}</span>
                    </div>
                  </div>
                )}
                <div className="space-y-2">
                  <span className="text-sm font-medium text-gray-500">Hub</span>
                  <div className="flex items-center">
                    <MapPin className="h-4 w-4 mr-2 text-gray-400" />
                    <span className="text-gray-700">{hubName || 'Not assigned'}</span>
                  </div>
                </div>
              </div>

              {project.project_scope && (
                <div className="space-y-2">
                  <span className="text-sm font-medium text-gray-500">Project Scope</span>
                  <p className="text-gray-700 whitespace-pre-wrap">{project.project_scope}</p>
                </div>
              )}

              {project.project_scope_image_url && (
                <div className="space-y-2">
                  <span className="text-sm font-medium text-gray-500">Project Scope Image</span>
                  <div className="border rounded-lg p-4 bg-gray-50">
                    <img 
                      src={project.project_scope_image_url} 
                      alt="Project Scope" 
                      className="w-full max-h-64 object-contain rounded-lg"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <span className="text-sm font-medium text-gray-500">Created</span>
                <p className="text-gray-700">{new Date(project.created_at).toLocaleDateString()}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button 
            type="button" 
            variant="outline" 
            onClick={onClose}
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
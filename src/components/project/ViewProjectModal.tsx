import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FileText, Calendar, Users, MapPin, Building, Target, FileCheck } from 'lucide-react';

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
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl h-[90vh] p-0 flex flex-col">
        <DialogHeader className="px-6 pt-6 pb-4 border-b shrink-0">
          <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            {getProjectId()} - {project.project_title}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 px-6">
          <div className="py-6 space-y-6">
            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-lg">
                  <FileText className="h-5 w-5 mr-2 text-primary" />
                  Project Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <span className="text-sm font-medium text-muted-foreground">Project ID</span>
                    <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                      {getProjectId()}
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    <span className="text-sm font-medium text-muted-foreground">Status</span>
                    <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 border-emerald-500/20">
                      Active
                    </Badge>
                  </div>
                </div>

                <div className="space-y-2">
                  <span className="text-sm font-medium text-muted-foreground">Project Title</span>
                  <p className="text-foreground font-medium text-lg">{project.project_title}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <span className="text-sm font-medium text-muted-foreground">Plant</span>
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/30">
                      <Building className="h-4 w-4 text-muted-foreground" />
                      <span className="text-foreground font-medium">{plantName || 'Not assigned'}</span>
                    </div>
                  </div>
                  {stationName && (
                    <div className="space-y-2">
                      <span className="text-sm font-medium text-muted-foreground">Station</span>
                      <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/30">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span className="text-foreground font-medium">{stationName}</span>
                      </div>
                    </div>
                  )}
                  <div className="space-y-2">
                    <span className="text-sm font-medium text-muted-foreground">Hub</span>
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/30">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span className="text-foreground font-medium">{hubName || 'Not assigned'}</span>
                    </div>
                  </div>
                </div>

                {project.project_scope && (
                  <div className="space-y-2">
                    <span className="text-sm font-medium text-muted-foreground">Project Scope</span>
                    <div className="p-4 rounded-lg bg-muted/30">
                      <p className="text-foreground whitespace-pre-wrap">{project.project_scope}</p>
                    </div>
                  </div>
                )}

                {project.project_scope_image_url && (
                  <div className="space-y-2">
                    <span className="text-sm font-medium text-muted-foreground">Project Scope Image</span>
                    <div className="border rounded-lg p-4 bg-muted/30">
                      <img 
                        src={project.project_scope_image_url} 
                        alt="Project Scope" 
                        className="w-full max-h-96 object-contain rounded-lg"
                      />
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
                  <div className="space-y-2">
                    <span className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Created Date
                    </span>
                    <p className="text-foreground font-medium">{new Date(project.created_at).toLocaleDateString()}</p>
                  </div>
                  {project.updated_at && (
                    <div className="space-y-2">
                      <span className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        Last Updated
                      </span>
                      <p className="text-foreground font-medium">{new Date(project.updated_at).toLocaleDateString()}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Team Members Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-lg">
                  <Users className="h-5 w-5 mr-2 text-primary" />
                  Team Members
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="p-8 text-center text-muted-foreground bg-muted/30 rounded-lg">
                  <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>Team member information will be available in future updates</p>
                </div>
              </CardContent>
            </Card>

            {/* Milestones Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-lg">
                  <Target className="h-5 w-5 mr-2 text-primary" />
                  Project Milestones
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="p-8 text-center text-muted-foreground bg-muted/30 rounded-lg">
                  <Target className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>Project milestones will be available in future updates</p>
                </div>
              </CardContent>
            </Card>

            {/* Documents Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-lg">
                  <FileCheck className="h-5 w-5 mr-2 text-primary" />
                  Documents & Attachments
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="p-8 text-center text-muted-foreground bg-muted/30 rounded-lg">
                  <FileCheck className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>Project documents will be available in future updates</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </ScrollArea>

        {/* Actions */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t shrink-0 bg-card">
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
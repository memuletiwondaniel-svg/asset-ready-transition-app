import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { FileText, Calendar, Users, Image, Building, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';

interface ProjectSummaryModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  formData: {
    project_id_prefix: string;
    project_id_number: string;
    project_title: string;
    plant_id: string;
    station_id: string;
    project_scope: string;
    project_scope_image_url: string;
    hub_id: string;
  };
  teamMembers: any[];
  milestones: any[];
  documents: any[];
  plants: any[];
  stations: any[];
  hubs: any[];
  isCreating: boolean;
}

export const ProjectSummaryModal: React.FC<ProjectSummaryModalProps> = ({
  open,
  onClose,
  onConfirm,
  formData,
  teamMembers,
  milestones,
  documents,
  plants,
  stations,
  hubs,
  isCreating
}) => {
  const plant = plants.find(p => p.id === formData.plant_id);
  const station = stations.find(s => s.id === formData.station_id);
  const hub = hubs.find(h => h.id === formData.hub_id);

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return format(date, 'do MMMM yyyy');
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">
            Project Summary - Confirm Creation
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Project Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center text-lg">
                <FileText className="h-5 w-5 mr-2" />
                Project Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Project ID</label>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className="bg-blue-100/80 text-blue-700 border-blue-200/60">
                      {formData.project_id_prefix}{formData.project_id_number}
                    </Badge>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Project Title</label>
                  <p className="mt-1 font-medium">{formData.project_title}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {plant && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Plant</label>
                    <p className="mt-1">{plant.name}</p>
                  </div>
                )}
                {station && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Station</label>
                    <p className="mt-1">{station.name}</p>
                  </div>
                )}
                {hub && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Hub</label>
                    <p className="mt-1">{hub.name}</p>
                  </div>
                )}
              </div>

              {formData.project_scope && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Project Scope</label>
                  <p className="mt-1 text-sm text-gray-700 whitespace-pre-wrap">{formData.project_scope}</p>
                  {formData.project_scope_image_url && (
                    <div className="mt-3">
                      <img 
                        src={formData.project_scope_image_url} 
                        alt="Project Scope" 
                        className="max-w-md max-h-48 object-contain rounded-lg border"
                      />
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Team Members */}
          {teamMembers.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-lg">
                  <Users className="h-5 w-5 mr-2" />
                  Project Team ({teamMembers.length} members)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {teamMembers.map((member, index) => (
                    <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={member.avatar_url} alt={member.user_name} />
                        <AvatarFallback className="text-sm">
                          {member.user_name ? member.user_name.split(' ').map((n: string) => n[0]).join('').toUpperCase() : '?'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="default" className="text-sm">
                            {member.user_name || 'Unknown User'}
                          </Badge>
                          <Badge variant="outline" className="bg-blue-100/80 text-blue-700 border-blue-200/60 text-sm">
                            {member.role}
                          </Badge>
                          {member.position && (
                            <Badge variant="outline" className="bg-gray-100/80 text-gray-700 border-gray-200/60 text-sm">
                              {member.position}
                            </Badge>
                          )}
                          {member.is_lead && (
                            <Badge variant="outline" className="bg-yellow-100 text-yellow-700 border-yellow-200 text-sm">
                              Lead
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Milestones */}
          {milestones.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-lg">
                  <Calendar className="h-5 w-5 mr-2" />
                  Project Milestones ({milestones.length} milestones)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {milestones.map((milestone, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div>
                          <h4 className="font-medium">{milestone.milestone_name}</h4>
                          <p className="text-sm text-muted-foreground">{formatDate(milestone.milestone_date)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {milestone.is_scorecard_project && (
                          <Badge variant="outline" className="bg-yellow-100 text-yellow-700 border-yellow-200 text-sm">
                            ⭐ Scorecard
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Documents */}
          {documents.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-lg">
                  <FileText className="h-5 w-5 mr-2" />
                  Supporting Documents ({documents.length} documents)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {documents.map((doc, index) => (
                    <div key={index} className="flex items-center gap-3 p-2 bg-gray-50 rounded">
                      <Badge variant="outline" className="text-xs">
                        {doc.document_type === 'file' ? 'File' : 'Link'}
                      </Badge>
                      <span className="flex-1 text-sm">{doc.document_name}</span>
                      {doc.link_type && (
                        <Badge variant="outline" className="text-xs">
                          {doc.link_type.toUpperCase()}
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Confirmation */}
          <Card className="bg-green-50 border-green-200">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 text-center justify-center">
                <CheckCircle className="h-6 w-6 text-green-600" />
                <div>
                  <h3 className="font-semibold text-green-900">Ready to Create Project</h3>
                  <p className="text-sm text-green-700 mt-1">
                    Please review all information above and confirm to create the project.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button 
              type="button" 
              variant="outline" 
              onClick={onClose}
              disabled={isCreating}
            >
              Back to Edit
            </Button>
            <Button 
              onClick={onConfirm}
              disabled={isCreating}
              className="bg-gradient-to-r from-green-600 to-blue-600 text-white hover:from-green-700 hover:to-blue-700"
            >
              {isCreating ? 'Creating Project...' : 'Confirm & Create Project'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
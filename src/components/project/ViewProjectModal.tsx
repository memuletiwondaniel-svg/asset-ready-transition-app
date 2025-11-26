import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { FileText, Calendar, Users, MapPin, Building, Target, FileCheck, UserCircle, ExternalLink } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

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
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [milestones, setMilestones] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && project?.id) {
      fetchProjectData();
    }
  }, [open, project?.id]);

  const fetchProjectData = async () => {
    if (!project?.id) return;
    
    setLoading(true);
    try {
      // Fetch team members
      const { data: teamData, error: teamError } = await (supabase as any)
        .from('project_team_members')
        .select('*')
        .eq('project_id', project.id);
      
      if (teamError) {
        console.error('Error fetching team members:', teamError);
      } else if (teamData) {
        setTeamMembers(teamData);
      }

      // Fetch milestones
      const { data: milestonesData, error: milestonesError } = await (supabase as any)
        .from('project_milestones')
        .select('*')
        .eq('project_id', project.id)
        .order('target_completion_date', { ascending: true });
      
      if (milestonesError) {
        console.error('Error fetching milestones:', milestonesError);
      } else if (milestonesData) {
        setMilestones(milestonesData);
      }

      // Fetch documents
      const { data: documentsData, error: documentsError } = await (supabase as any)
        .from('project_documents')
        .select('*')
        .eq('project_id', project.id)
        .order('created_at', { ascending: false });
      
      if (documentsError) {
        console.error('Error fetching documents:', documentsError);
      } else if (documentsData) {
        setDocuments(documentsData);
      }
    } catch (error) {
      console.error('Error fetching project data:', error);
    } finally {
      setLoading(false);
    }
  };

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

        <Tabs defaultValue="overview" className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="shrink-0 mx-6 mt-4 grid w-auto grid-cols-4">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Overview</span>
            </TabsTrigger>
            <TabsTrigger value="team" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Team</span>
            </TabsTrigger>
            <TabsTrigger value="milestones" className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              <span className="hidden sm:inline">Milestones</span>
            </TabsTrigger>
            <TabsTrigger value="documents" className="flex items-center gap-2">
              <FileCheck className="h-4 w-4" />
              <span className="hidden sm:inline">Documents</span>
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="flex-1 mt-0 overflow-hidden">
            <ScrollArea className="h-full px-6 py-4">
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
            </ScrollArea>
          </TabsContent>

          {/* Team Tab */}
          <TabsContent value="team" className="flex-1 mt-0 overflow-hidden">
            <ScrollArea className="h-full px-6 py-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center text-lg">
                    <Users className="h-5 w-5 mr-2 text-primary" />
                    Team Members
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <p className="text-muted-foreground text-center py-8">Loading team members...</p>
                  ) : teamMembers.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground bg-muted/30 rounded-lg">
                      <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p>No team members assigned yet</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {teamMembers.map((member) => (
                        <div key={member.id} className="flex items-center gap-4 p-4 border rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                          <Avatar className="h-12 w-12">
                            {member.avatar_url ? (
                              <AvatarImage src={member.avatar_url} alt={member.user_name} />
                            ) : (
                              <AvatarFallback className="bg-primary/10">
                                <UserCircle className="h-6 w-6 text-primary" />
                              </AvatarFallback>
                            )}
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-foreground">{member.user_name || 'Unassigned'}</p>
                            <p className="text-sm text-muted-foreground">{member.position || 'No position'}</p>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            <Badge variant="outline" className="shrink-0">
                              {member.role}
                            </Badge>
                            {member.is_lead && (
                              <Badge className="shrink-0 bg-primary text-xs">Lead</Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </ScrollArea>
          </TabsContent>

          {/* Milestones Tab */}
          <TabsContent value="milestones" className="flex-1 mt-0 overflow-hidden">
            <ScrollArea className="h-full px-6 py-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center text-lg">
                    <Target className="h-5 w-5 mr-2 text-primary" />
                    Project Milestones
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <p className="text-muted-foreground text-center py-8">Loading milestones...</p>
                  ) : milestones.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground bg-muted/30 rounded-lg">
                      <Target className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p>No milestones defined yet</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {milestones.map((milestone) => (
                        <div key={milestone.id} className="p-4 border rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                          <div className="flex items-start justify-between mb-2">
                            <h4 className="font-medium text-foreground text-lg">{milestone.milestone_name}</h4>
                            <Badge 
                              variant="outline" 
                              className={
                                milestone.status === 'completed' ? 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20' :
                                milestone.status === 'in_progress' ? 'bg-blue-500/10 text-blue-700 border-blue-500/20' :
                                'bg-muted text-muted-foreground'
                              }
                            >
                              {milestone.status || 'pending'}
                            </Badge>
                          </div>
                          {milestone.description && (
                            <p className="text-sm text-muted-foreground mb-3">{milestone.description}</p>
                          )}
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              <span>
                                {milestone.target_completion_date 
                                  ? new Date(milestone.target_completion_date).toLocaleDateString()
                                  : 'No date set'}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </ScrollArea>
          </TabsContent>

          {/* Documents Tab */}
          <TabsContent value="documents" className="flex-1 mt-0 overflow-hidden">
            <ScrollArea className="h-full px-6 py-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center text-lg">
                    <FileCheck className="h-5 w-5 mr-2 text-primary" />
                    Documents & Attachments
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <p className="text-muted-foreground text-center py-8">Loading documents...</p>
                  ) : documents.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground bg-muted/30 rounded-lg">
                      <FileCheck className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p>No documents uploaded yet</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {documents.map((doc) => (
                        <div key={doc.id} className="p-4 border rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium text-foreground truncate mb-1">{doc.document_name}</h4>
                              {doc.description && (
                                <p className="text-sm text-muted-foreground mb-2">{doc.description}</p>
                              )}
                              <div className="flex items-center gap-3 text-sm text-muted-foreground flex-wrap">
                                <Badge variant="outline" className="text-xs">
                                  {doc.document_type || 'Document'}
                                </Badge>
                                <span className="text-xs">
                                  {new Date(doc.created_at).toLocaleDateString()}
                                </span>
                                {doc.file_size && (
                                  <span className="text-xs">
                                    {(doc.file_size / 1024).toFixed(2)} KB
                                  </span>
                                )}
                              </div>
                            </div>
                            {doc.file_url && (
                              <Button
                                variant="outline"
                                size="sm"
                                asChild
                                className="shrink-0"
                              >
                                <a href={doc.file_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
                                  <ExternalLink className="h-4 w-4" />
                                  View
                                </a>
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </ScrollArea>
          </TabsContent>
        </Tabs>

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
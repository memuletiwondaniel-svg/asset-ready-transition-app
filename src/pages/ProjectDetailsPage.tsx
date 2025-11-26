import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ArrowLeft, FileText, Calendar, Users, MapPin, Building, Target, FileCheck, UserCircle, ExternalLink, Edit } from 'lucide-react';
import { OrshSidebar } from '@/components/OrshSidebar';
import { AnimatedBackground } from '@/components/ui/AnimatedBackground';
import { BreadcrumbNavigation } from '@/components/BreadcrumbNavigation';
import { useBreadcrumb } from '@/contexts/BreadcrumbContext';
import { useProjects } from '@/hooks/useProjects';
import { usePlants } from '@/hooks/usePlants';
import { useStations } from '@/hooks/useStations';
import { useHubs } from '@/hooks/useHubs';
import { EditProjectModal } from '@/components/project/EditProjectModal';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';

export const ProjectDetailsPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { updateMetadata } = useBreadcrumb();
  const { projects, isLoading } = useProjects();
  const { plants } = usePlants();
  const { stations } = useStations();
  const { data: hubs = [] } = useHubs();

  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [milestones, setMilestones] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [dataLoading, setDataLoading] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);

  const project = projects.find(p => p.id === id);
  const plant = plants.find(p => p.id === project?.plant_id);
  const station = stations.find(s => s.id === project?.station_id);
  const hub = hubs.find(h => h.id === project?.hub_id);

  useEffect(() => {
    if (project) {
      updateMetadata('title', `${project.project_id_prefix}${project.project_id_number} - ${project.project_title}`);
    }
  }, [project, updateMetadata]);

  useEffect(() => {
    if (id) {
      fetchProjectData();
    }
  }, [id]);

  const fetchProjectData = async () => {
    if (!id) return;
    
    setDataLoading(true);
    try {
      // Fetch team members
      const { data: teamData, error: teamError } = await (supabase as any)
        .from('project_team_members')
        .select('*')
        .eq('project_id', id);
      
      if (!teamError && teamData) {
        setTeamMembers(teamData);
      }

      // Fetch milestones
      const { data: milestonesData, error: milestonesError } = await (supabase as any)
        .from('project_milestones')
        .select('*')
        .eq('project_id', id)
        .order('target_date', { ascending: true });
      
      if (!milestonesError && milestonesData) {
        setMilestones(milestonesData);
      }

      // Fetch documents
      const { data: documentsData, error: documentsError } = await (supabase as any)
        .from('project_documents')
        .select('*')
        .eq('project_id', id)
        .order('created_at', { ascending: false });
      
      if (!documentsError && documentsData) {
        setDocuments(documentsData);
      }
    } catch (error) {
      console.error('Error fetching project data:', error);
    } finally {
      setDataLoading(false);
    }
  };

  if (isLoading) {
    return (
      <AnimatedBackground>
        <div className="flex h-screen">
          <OrshSidebar />
          <div className="flex-1 overflow-auto">
            <div className="container mx-auto p-6 space-y-6">
              <Skeleton className="h-8 w-64" />
              <Skeleton className="h-96 w-full" />
            </div>
          </div>
        </div>
      </AnimatedBackground>
    );
  }

  if (!project) {
    return (
      <AnimatedBackground>
        <div className="flex h-screen">
          <OrshSidebar />
          <div className="flex-1 overflow-auto">
            <div className="container mx-auto p-6">
              <Card>
                <CardContent className="p-12 text-center">
                  <FileText className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                  <h2 className="text-2xl font-bold mb-2">Project Not Found</h2>
                  <p className="text-muted-foreground mb-6">The project you're looking for doesn't exist.</p>
                  <Button onClick={() => navigate('/projects')}>
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Projects
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </AnimatedBackground>
    );
  }

  const getProjectId = () => {
    return `${project.project_id_prefix}${project.project_id_number}`;
  };

  return (
    <AnimatedBackground>
      <div className="flex h-screen">
        <OrshSidebar />
        <div className="flex-1 overflow-auto">
          <div className="container mx-auto p-6 space-y-6">
            <BreadcrumbNavigation currentPageLabel={project ? `${getProjectId()}` : 'Project'} />

            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button
                  variant="ghost"
                  onClick={() => navigate('/projects')}
                  className="gap-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to Projects
                </Button>
                <div>
                  <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                    {getProjectId()} - {project.project_title}
                  </h1>
                  <p className="text-muted-foreground mt-1">Project Details</p>
                </div>
              </div>
              <Button onClick={() => setEditModalOpen(true)} className="gap-2">
                <Edit className="h-4 w-4" />
                Edit Project
              </Button>
            </div>

            {/* Tabs */}
            <Tabs defaultValue="overview" className="space-y-6">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="overview" className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Overview
                </TabsTrigger>
                <TabsTrigger value="team" className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Team
                </TabsTrigger>
                <TabsTrigger value="milestones" className="flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  Milestones
                </TabsTrigger>
                <TabsTrigger value="documents" className="flex items-center gap-2">
                  <FileCheck className="h-4 w-4" />
                  Documents
                </TabsTrigger>
              </TabsList>

              {/* Overview Tab */}
              <TabsContent value="overview">
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
                          <span className="text-foreground font-medium">{plant?.name || 'Not assigned'}</span>
                        </div>
                      </div>
                      {station && (
                        <div className="space-y-2">
                          <span className="text-sm font-medium text-muted-foreground">Station</span>
                          <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/30">
                            <MapPin className="h-4 w-4 text-muted-foreground" />
                            <span className="text-foreground font-medium">{station.name}</span>
                          </div>
                        </div>
                      )}
                      {hub && (
                        <div className="space-y-2">
                          <span className="text-sm font-medium text-muted-foreground">Hub</span>
                          <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/30">
                            <MapPin className="h-4 w-4 text-muted-foreground" />
                            <span className="text-foreground font-medium">{hub.name}</span>
                          </div>
                        </div>
                      )}
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
              </TabsContent>

              {/* Team Tab */}
              <TabsContent value="team">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center text-lg">
                      <Users className="h-5 w-5 mr-2 text-primary" />
                      Team Members
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {dataLoading ? (
                      <div className="space-y-3">
                        {[1, 2, 3].map((i) => (
                          <Skeleton key={i} className="h-20 w-full" />
                        ))}
                      </div>
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
              </TabsContent>

              {/* Milestones Tab */}
              <TabsContent value="milestones">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center text-lg">
                      <Target className="h-5 w-5 mr-2 text-primary" />
                      Project Milestones
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {dataLoading ? (
                      <div className="space-y-3">
                        {[1, 2, 3].map((i) => (
                          <Skeleton key={i} className="h-24 w-full" />
                        ))}
                      </div>
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
                                  {milestone.target_date 
                                    ? new Date(milestone.target_date).toLocaleDateString()
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
              </TabsContent>

              {/* Documents Tab */}
              <TabsContent value="documents">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center text-lg">
                      <FileCheck className="h-5 w-5 mr-2 text-primary" />
                      Documents & Attachments
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {dataLoading ? (
                      <div className="space-y-3">
                        {[1, 2, 3].map((i) => (
                          <Skeleton key={i} className="h-20 w-full" />
                        ))}
                      </div>
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
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      <EditProjectModal 
        open={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        project={project}
      />
    </AnimatedBackground>
  );
};

export default ProjectDetailsPage;

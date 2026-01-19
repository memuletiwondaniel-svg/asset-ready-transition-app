import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ProjectIdBadge } from '@/components/ui/project-id-badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { FileText, Calendar, Users, MapPin, Building, Briefcase, UserCircle, ExternalLink, Edit, Link as LinkIcon, File, FileSpreadsheet, FileImage, Presentation, FileCode } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

interface ViewProjectModalProps {
  open: boolean;
  onClose: () => void;
  onEdit?: () => void;
  project: any;
  regionName?: string;
  hubName?: string;
}

interface ProjectLocation {
  id: string;
  stationName: string;
}

export const ViewProjectModal: React.FC<ViewProjectModalProps> = ({ 
  open, 
  onClose,
  onEdit,
  project,
  regionName,
  hubName
}) => {
  const navigate = useNavigate();
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [milestones, setMilestones] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [locations, setLocations] = useState<ProjectLocation[]>([]);
  const [loading, setLoading] = useState(false);

  // Helper function to convert relative avatar paths to full Supabase storage URLs
  const getAvatarUrl = (avatarUrl: string | null | undefined): string | null => {
    if (!avatarUrl) return null;
    if (avatarUrl.startsWith('http')) return avatarUrl;
    return supabase.storage.from('user-avatars').getPublicUrl(avatarUrl).data.publicUrl;
  };

  // Helper function to get file type-specific icons
  const getFileIcon = (extension: string) => {
    const ext = extension?.toLowerCase() || '';
    
    switch (ext) {
      case 'pdf':
        return <FileText className="h-5 w-5 text-red-500" />;
      case 'doc':
      case 'docx':
        return <FileText className="h-5 w-5 text-blue-600" />;
      case 'xls':
      case 'xlsx':
        return <FileSpreadsheet className="h-5 w-5 text-green-600" />;
      case 'ppt':
      case 'pptx':
        return <Presentation className="h-5 w-5 text-orange-500" />;
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
      case 'webp':
      case 'svg':
        return <FileImage className="h-5 w-5 text-purple-500" />;
      case 'csv':
      case 'txt':
      case 'js':
      case 'ts':
      case 'jsx':
      case 'tsx':
      case 'html':
      case 'css':
      case 'json':
      case 'xml':
        return <FileCode className="h-5 w-5 text-gray-600" />;
      default:
        return <File className="h-5 w-5 text-muted-foreground" />;
    }
  };

  // Helper function to get link type-specific icons
  const getLinkIcon = (linkType: string) => {
    return <LinkIcon className="h-5 w-5 text-blue-500" />;
  };

  // Helper function to format short date
  const formatShortDate = (dateString: string) => {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleDateString('en-US', { 
      day: 'numeric',
      month: 'short', 
      year: 'numeric' 
    });
  };

  useEffect(() => {
    if (open && project?.id) {
      // Clear previous state to ensure fresh data
      setTeamMembers([]);
      setMilestones([]);
      setDocuments([]);
      setLocations([]);
      fetchProjectData();
    }
  }, [open, project?.id, project?.updated_at]);

  const fetchProjectData = async () => {
    if (!project?.id) return;
    
    setLoading(true);
    try {
      // Fetch team members
      const { data: teamData, error: teamError } = await supabase
        .from('project_team_members')
        .select('*')
        .eq('project_id', project.id);
      
      if (teamError) {
        console.error('Error fetching team members:', teamError);
      } else if (teamData) {
        // Fetch profiles separately
        const userIds = teamData.map(m => m.user_id);
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('user_id, full_name, avatar_url, position')
          .in('user_id', userIds);
        
        // Merge team data with profiles
        const enrichedTeamData = teamData.map(member => ({
          ...member,
          profiles: profilesData?.find(p => p.user_id === member.user_id)
        }));
        
        setTeamMembers(enrichedTeamData);
      }

      // Fetch milestones
      const { data: milestonesData, error: milestonesError } = await supabase
        .from('project_milestones')
        .select('*')
        .eq('project_id', project.id)
        .order('milestone_date', { ascending: true });
      
      if (milestonesError) {
        console.error('Error fetching milestones:', milestonesError);
      } else if (milestonesData) {
        setMilestones(milestonesData);
      }

      // Fetch documents
      const { data: documentsData, error: documentsError } = await supabase
        .from('project_documents')
        .select('*')
        .eq('project_id', project.id)
        .order('created_at', { ascending: false });
      
      if (documentsError) {
        console.error('Error fetching documents:', documentsError);
      } else if (documentsData) {
        setDocuments(documentsData);
      }

      // Fetch project locations with station names
      const { data: locationsData, error: locationsError } = await supabase
        .from('project_locations')
        .select('id, station_id')
        .eq('project_id', project.id);

      if (locationsError) {
        console.error('Error fetching locations:', locationsError);
      } else if (locationsData && locationsData.length > 0) {
        // Fetch station names
        const stationIds = locationsData.map(l => l.station_id);
        const { data: stationsData } = await supabase
          .from('station')
          .select('id, name')
          .in('id', stationIds);

        const enrichedLocations = locationsData.map(loc => ({
          id: loc.id,
          stationName: stationsData?.find(s => s.id === loc.station_id)?.name || 'Unknown'
        }));
        setLocations(enrichedLocations);
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

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleDateString('en-US', { 
      day: 'numeric',
      month: 'long', 
      year: 'numeric' 
    });
  };

  // Separate required roles from additional members
  const REQUIRED_ROLES = ['Project Manager', 'Project Engineer', 'Commissioning Lead', 'Construction Lead', 'ORA Lead'];
  const requiredRoleMembers = teamMembers.filter(m => REQUIRED_ROLES.includes(m.role));
  const additionalMembers = teamMembers.filter(m => !REQUIRED_ROLES.includes(m.role));

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b shrink-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              {getProjectId()} - {project.project_title}
            </DialogTitle>
            <div className="flex gap-2">
              {onEdit && (
                <Button variant="default" size="sm" onClick={onEdit}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Project
                </Button>
              )}
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 px-6 py-4">
          <div className="space-y-6">
            {/* Project Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-lg gap-2">
                  <FileText className="h-5 w-5" />
                  Project Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-muted-foreground">Project ID:</span>
                    <ProjectIdBadge>
                      {getProjectId()}
                    </ProjectIdBadge>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-muted-foreground">Status:</span>
                    <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 border-emerald-500/20">
                      Active
                    </Badge>
                  </div>
                </div>

                <div className="space-y-2">
                  <span className="text-sm font-medium text-muted-foreground">Project Title</span>
                  <p className="text-foreground font-medium text-lg">{project.project_title}</p>
                </div>

                {/* Portfolio and Hub - 2 columns */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <span className="text-sm font-medium text-muted-foreground">Portfolio (Region)</span>
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/30">
                      <Briefcase className="h-4 w-4 text-muted-foreground" />
                      <span className="text-foreground font-medium">{regionName || 'Not assigned'}</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <span className="text-sm font-medium text-muted-foreground">Project Hub</span>
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/30">
                      <Building className="h-4 w-4 text-muted-foreground" />
                      <span className="text-foreground font-medium">{hubName || 'Not assigned'}</span>
                    </div>
                  </div>
                </div>

                {/* Locations - full width */}
                <div className="space-y-2">
                  <span className="text-sm font-medium text-muted-foreground">Locations</span>
                  <div className="flex flex-wrap gap-2 p-3 rounded-lg bg-muted/30 min-h-[44px]">
                    {locations.length > 0 ? (
                      locations.map(loc => (
                        <Badge key={loc.id} variant="secondary" className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {loc.stationName}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-muted-foreground">No locations assigned</span>
                    )}
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
                    <p className="text-foreground font-medium">{formatDate(project.created_at)}</p>
                  </div>
                  {project.updated_at && (
                    <div className="space-y-2">
                      <span className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        Last Updated
                      </span>
                      <p className="text-foreground font-medium">{formatDate(project.updated_at)}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Project Team - Always show */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-lg gap-2">
                  <Users className="h-5 w-5" />
                  Project Team
                  <Badge variant="secondary" className="ml-1 h-6 w-6 rounded-full p-0 flex items-center justify-center text-xs font-medium">
                    {teamMembers.length}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {teamMembers.length === 0 ? (
                  <p className="text-muted-foreground text-sm text-center py-8">
                    No team members assigned to this project yet.
                  </p>
                ) : (
                  <>
                    {/* Required Roles */}
                    <div className="space-y-3">
                      <h4 className="font-medium text-foreground">Required Roles</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {requiredRoleMembers.map((member) => {
                          const profile = member.profiles;
                          return (
                              <div key={member.id} className="p-3 border rounded-lg bg-muted/30">
                              <div className="flex items-center gap-3">
                                <Avatar className="h-10 w-10">
                                  {getAvatarUrl(profile?.avatar_url) ? (
                                    <AvatarImage src={getAvatarUrl(profile?.avatar_url)!} alt={profile?.full_name || 'Team member'} />
                                  ) : (
                                    <AvatarFallback className="bg-primary/10">
                                      <UserCircle className="h-5 w-5 text-primary" />
                                    </AvatarFallback>
                                  )}
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-foreground text-sm">{profile?.full_name || 'Unassigned'}</p>
                                  <p className="text-xs text-muted-foreground">{member.role}</p>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Additional Members */}
                    {additionalMembers.length > 0 && (
                      <div className="space-y-3 pt-3 border-t">
                        <h4 className="font-medium text-foreground">Additional Team Members</h4>
                        <div className="space-y-2">
                          {additionalMembers.map((member) => {
                            const profile = member.profiles;
                            return (
                              <div key={member.id} className="flex items-center gap-3 p-3 border rounded-lg bg-muted/30">
                                <Avatar className="h-10 w-10">
                                  {getAvatarUrl(profile?.avatar_url) ? (
                                    <AvatarImage src={getAvatarUrl(profile?.avatar_url)!} alt={profile?.full_name || 'Team member'} />
                                  ) : (
                                    <AvatarFallback className="bg-primary/10">
                                      <UserCircle className="h-5 w-5 text-primary" />
                                    </AvatarFallback>
                                  )}
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-foreground text-sm">{profile?.full_name || 'Unassigned'}</p>
                                  <p className="text-xs text-muted-foreground">{profile?.position || 'No position'}</p>
                                </div>
                                <Badge variant="outline" className="shrink-0 text-xs">
                                  {member.role}
                                </Badge>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>

            {/* Project Milestones - Always show */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-lg gap-2">
                  <Calendar className="h-5 w-5" />
                  Project Milestones
                  <Badge variant="secondary" className="ml-1 h-6 w-6 rounded-full p-0 flex items-center justify-center text-xs font-medium">
                    {milestones.length}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {milestones.length === 0 ? (
                  <p className="text-muted-foreground text-sm text-center py-8">
                    No milestones defined for this project yet.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {milestones.map((milestone) => (
                      <div 
                        key={milestone.id} 
                        className="relative p-4 border rounded-xl bg-gradient-to-br from-background to-muted/30 hover:shadow-md transition-all group"
                      >
                        {/* Status indicator dot */}
                        <div 
                          className={`absolute top-4 right-4 h-3 w-3 rounded-full ${
                            milestone.status === 'completed' ? 'bg-emerald-500' :
                            milestone.status === 'in_progress' ? 'bg-blue-500' :
                            'bg-muted-foreground/30'
                          }`} 
                        />
                        
                        {/* Date chip at top */}
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                          <Calendar className="h-3 w-3" />
                          {formatShortDate(milestone.milestone_date)}
                        </div>
                        
                        {/* Milestone name */}
                        <h4 className="font-semibold text-foreground text-sm mb-2 pr-6">
                          {milestone.milestone_name}
                        </h4>
                        
                        {/* Footer with status and scorecard */}
                        <div className="flex items-center gap-2 mt-auto flex-wrap">
                          <span 
                            className={`text-xs px-2 py-0.5 rounded-full ${
                              milestone.status === 'completed' ? 'bg-emerald-500/10 text-emerald-700' :
                              milestone.status === 'in_progress' ? 'bg-blue-500/10 text-blue-700' :
                              'bg-muted text-muted-foreground'
                            }`}
                          >
                            {milestone.status || 'pending'}
                          </span>
                          {milestone.is_scorecard_project && (
                            <Badge className="text-xs bg-amber-100 text-amber-800 border border-amber-300 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-700">
                              Scorecard
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Supporting Documents - Always show */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-lg gap-2">
                  <FileText className="h-5 w-5" />
                  Supporting Documents
                  <Badge variant="secondary" className="ml-1 h-6 w-6 rounded-full p-0 flex items-center justify-center text-xs font-medium">
                    {documents.length}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {documents.length === 0 ? (
                  <p className="text-muted-foreground text-sm text-center py-8">
                    No documents uploaded for this project yet.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {documents.map((doc) => (
                      <div key={doc.id} className="p-4 border rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-start gap-3 flex-1 min-w-0">
                            <div className="shrink-0 mt-0.5">
                              {doc.document_type === 'file' ? getFileIcon(doc.file_extension) : getLinkIcon(doc.link_type)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium text-foreground truncate">{doc.document_name}</h4>
                              {doc.file_extension && (
                                <span className="text-xs text-muted-foreground uppercase mt-1 block">
                                  {doc.file_extension} file
                                </span>
                              )}
                            </div>
                          </div>
                          {doc.link_url && (
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => window.open(doc.link_url, '_blank')}
                              className="shrink-0"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

          </div>
        </ScrollArea>

        <div className="px-6 py-4 border-t shrink-0 flex justify-end">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};